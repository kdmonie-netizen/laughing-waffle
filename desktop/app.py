"""KJM GPS Conditions - desktop server (Python standard library only).

The office copy runs this with pythonw from "Launch KJM GPS Conditions.vbs".
It does what server.js does for `npm start`, plus what every KJM Dropbox app
needs (see Dropbox\\Apps\\_APP STANDARD\\APP PACKAGING PROTOCOL.txt):

  /                 the dashboard (files in public\\)
  /api/version      plain-text APP_VERSION; the launcher compares it with this
                    file on disk and restarts an older server
  /api/health       "ok" - the page probes it before using the proxy
  /api/proxy?url=   fetches an allow-listed data host for the page when the
                    browser can't reach it directly (CORS stripped, etc.)

Release seal: package_to_dropbox.py writes release.json beside this file with
the size and SHA-256 of every file it shipped. Dropbox delivers a release file
by file in no set order, so until every listed file matches, the page is a
short "finishing an update" notice that reloads itself, and /api/version
answers "<version>-updating" so the next icon click restarts the server.

A listed file that differs and is dated more than 60 s AFTER release.json is
ambiguous: a hand edit, or the first file of the NEXT release whose
release.json hasn't arrived yet (Dropbox keeps each file's own date). So it
holds the page too, but only until the server has watched that same state for
10 minutes (counted while someone is looking, so a sleeping PC doesn't count);
after that it is taken as a hand edit and the page opens, so one edited file
can never lock every PC. Missing files, files dated before release.json, and
an app.py whose version differs from release.json always hold the page. No
release.json (the git dev tree) means no seal.
"""

APP_VERSION = "1.4.0"

import hashlib
import json
import mimetypes
import os
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

APP_NAME = "KJM GPS Conditions"
PORT = int(os.environ.get("GPSDASH_PORT", "5560"))
HOST = "127.0.0.1"  # IPv4 only: the launcher probes 127.0.0.1, never localhost

HERE = Path(__file__).resolve().parent
# Office copy: app\public\. Git dev tree: desktop\app.py next to ..\public\.
PUBLIC = Path(os.environ.get("GPSDASH_PUBLIC") or (HERE / "public" if (HERE / "public").is_dir() else HERE.parent / "public")).resolve()
RELEASE = HERE / "release.json"

# Keep in step with ALLOWED_HOSTS in server.js (a test compares them).
ALLOWED_HOSTS = {
    "services.swpc.noaa.gov",
    "celestrak.org",
    "api.nasa.gov",
    "kauai.ccmc.gsfc.nasa.gov",
    "navcen.uscg.gov",  # GPS outage file + advisory (no CORS)
    "www.gsc-europa.eu",  # Galileo constellation status (no CORS)
    "services2.arcgis.com",  # NOAA CORS stations (has CORS; proxy is only a fallback)
    "api.weather.gov",  # NWS forecast grid + alerts for the job site (NWS asks for a User-Agent)
    "www.spc.noaa.gov",  # SPC convective outlooks
}
PROXY_CACHE_S = 120
HAND_EDIT_LATE_S = 60  # a mismatched file this much newer than release.json may be a hand edit...
HAND_EDIT_WAIT_S = 600  # ...once this much watched time has passed with no new release.json
WATCH_GAP_CAP_S = 15  # at most this much counts between two checks (sleep, nobody looking)

TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".md": "text/markdown; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
}


def state_dir():
    base = os.environ.get("LOCALAPPDATA") or str(Path.home())
    d = Path(base) / APP_NAME
    d.mkdir(parents=True, exist_ok=True)
    return d


# ------------------------------------------------------------------ release seal
_seal_lock = threading.Lock()
_seal_cache = {"key": None, "hard": [], "late": []}
_late_watch = {"key": None, "waited": 0.0, "last": 0.0}


def _seal_problems():
    """(key, hard problems, late problems) for the files on disk now, or None if no release.json."""
    if not RELEASE.is_file():
        return None
    try:
        rel_stat = RELEASE.stat()
        manifest = json.loads(RELEASE.read_text(encoding="utf-8"))
        files = manifest["files"]
    except (OSError, ValueError, KeyError) as e:
        return ("unreadable", str(e)), [f"release.json unreadable: {e}"], []
    root = HERE.parent  # release.json paths are relative to the app folder root
    stats = []
    for rel in sorted(files):
        try:
            st = (root / rel).stat()
            stats.append((rel, st.st_size, st.st_mtime_ns))
        except OSError:
            stats.append((rel, None, None))
    key = (rel_stat.st_mtime_ns, rel_stat.st_size, tuple(stats))
    with _seal_lock:
        if _seal_cache["key"] == key:
            return key, list(_seal_cache["hard"]), list(_seal_cache["late"])
    hard, late = [], []
    # app.py must be the version release.json names. Whichever arrives first,
    # a half-delivered release has the two disagree.
    disk_version = _version_in(HERE / "app.py")
    if manifest.get("version") and disk_version != manifest["version"]:
        hard.append(f"app.py is {disk_version or '?'}, release.json is {manifest['version']}")
    for rel, size, mtime_ns in stats:
        want = files[rel]
        if size is None:
            hard.append(f"{rel}: not here yet")
        elif size == want["size"] and _sha256(root / rel) == want["sha256"]:
            continue
        elif mtime_ns / 1e9 > rel_stat.st_mtime + HAND_EDIT_LATE_S:
            late.append(f"{rel}: newer than the release (an update arriving, or a hand edit)")
        else:
            hard.append(f"{rel}: still downloading")
    with _seal_lock:
        _seal_cache.update(key=key, hard=hard, late=late)
    return key, hard, late


def seal_status():
    """(ok, problems). ok is True when there is no release.json (dev tree)."""
    found = _seal_problems()
    if found is None:
        return True, []
    key, hard, late = found
    if hard:
        return False, hard + late
    if not late:
        return True, []
    # Only files dated after release.json differ. Wait before calling them hand
    # edits: the next release's release.json may still be on its way.
    now = time.monotonic()
    with _seal_lock:
        if _late_watch["key"] != key:
            _late_watch.update(key=key, waited=0.0, last=now)
        else:
            _late_watch["waited"] += min(max(0.0, now - _late_watch["last"]), WATCH_GAP_CAP_S)
            _late_watch["last"] = now
        waited = _late_watch["waited"]
    if waited >= HAND_EDIT_WAIT_S:
        return True, []
    return False, late


def _version_in(path):
    """APP_VERSION as written in a file on disk ("" if unreadable)."""
    try:
        for line in Path(path).read_text(encoding="utf-8").splitlines():
            if line.startswith("APP_VERSION"):
                return line.split('"')[1]
    except (OSError, IndexError):
        pass
    return ""


def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


UPDATING_PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="5"><title>GPS Conditions - finishing an update</title>
<style>body{{background:#0a0e17;color:#e6ebf3;font:16px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0}}
main{{max-width:520px;padding:24px;text-align:center}}h1{{font-size:1.3rem}}p{{color:#8b97ab}}</style></head>
<body><main><h1>Dropbox is still downloading an update</h1>
<p>GPS Conditions {version} is arriving on this computer. This page checks again every few seconds and opens
the dashboard as soon as every file is here.</p><p style="font-size:.8rem">{count} file(s) still on the way.</p></main></body></html>"""


# ------------------------------------------------------------------------ proxy
_proxy_cache = {}


class _CheckedRedirect(urllib.request.HTTPRedirectHandler):
    """Follow a redirect only to another allow-listed https URL."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        _, err = check_proxy_target(newurl)
        if err:
            raise urllib.error.HTTPError(newurl, 502, f"redirect to a host that isn't allowed: {urllib.parse.urlsplit(newurl).hostname}", headers, fp)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_urlopen = urllib.request.build_opener(_CheckedRedirect).open  # one seam for tests
_proxy_lock = threading.Lock()


def fetch_upstream(url):
    """(status, content_type, body) for an allow-listed https URL."""
    now = time.time()
    with _proxy_lock:
        hit = _proxy_cache.get(url)
        if hit and now - hit[0] < PROXY_CACHE_S:
            return hit[1], hit[2], hit[3], "HIT"
    req = urllib.request.Request(url, headers={"User-Agent": "(KJM GPS Conditions dashboard, office app)", "Accept-Encoding": "identity"})
    try:
        with _urlopen(req, timeout=30) as r:
            body = r.read()
            status = r.status
            ctype = r.headers.get("Content-Type", "application/octet-stream")
    except urllib.error.HTTPError as e:
        return e.code, "text/plain; charset=utf-8", f"Upstream HTTP {e.code}".encode(), "MISS"
    except (urllib.error.URLError, OSError, TimeoutError) as e:
        return 502, "text/plain; charset=utf-8", f"Upstream error: {e}".encode(), "MISS"
    if 200 <= status < 300:
        with _proxy_lock:
            _proxy_cache[url] = (now, status, ctype, body)
            if len(_proxy_cache) > 200:
                for k in sorted(_proxy_cache, key=lambda k: _proxy_cache[k][0])[:50]:
                    _proxy_cache.pop(k, None)
    return status, ctype, body, "MISS"


def check_proxy_target(raw):
    """(url, None) if allowed, else (None, (status, message))."""
    try:
        u = urllib.parse.urlsplit(raw)
    except ValueError:
        return None, (400, "Bad url")
    if not u.scheme or not u.hostname:
        return None, (400, "Bad url")
    if u.scheme != "https" or u.hostname not in ALLOWED_HOSTS or u.username or u.password or (u.port not in (None, 443)):
        return None, (403, f"Host not allowed: {u.hostname}")
    return raw, None


# ---------------------------------------------------------------------- handler
class Handler(BaseHTTPRequestHandler):
    server_version = "KJMGPSConditions/" + APP_VERSION

    def log_message(self, fmt, *args):  # quiet; errors still reach log_error
        pass

    def log_error(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (time.strftime("%Y-%m-%d %H:%M:%S"), fmt % args))

    def _send(self, status, body, ctype="text/plain; charset=utf-8", extra=None):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        self._send(405, "Method not allowed")

    def do_GET(self):
        parts = urllib.parse.urlsplit(self.path)
        path = parts.path
        if path == "/api/version":
            ok, _ = seal_status()
            return self._send(200, APP_VERSION if ok else APP_VERSION + "-updating")
        if path == "/api/health":
            return self._send(200, "ok")
        if path == "/api/proxy":
            raw = urllib.parse.parse_qs(parts.query).get("url", [""])[0]
            url, err = check_proxy_target(raw)
            if err:
                return self._send(*err)
            status, ctype, body, cache = fetch_upstream(url)
            # The page reads these with fetch(); never let an upstream HTML or
            # SVG body run as a page on this app's own origin.
            return self._send(status, body, ctype, {"X-Cache": cache, "Content-Security-Policy": "sandbox", "Content-Disposition": "attachment"})
        return self.serve_static(path)

    def serve_static(self, path):
        rel = urllib.parse.unquote(path).lstrip("/\\")
        if rel in ("", "index.html"):
            ok, problems = seal_status()
            if not ok:
                return self._send(200, UPDATING_PAGE.format(version=APP_VERSION, count=len(problems)), "text/html; charset=utf-8")
        target = (PUBLIC / (rel or "index.html")).resolve()
        try:
            target.relative_to(PUBLIC)
        except ValueError:
            return self._send(403, "Forbidden")
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            return self._send(404, "Not found")
        try:
            body = target.read_bytes()
        except OSError:
            return self._send(404, "Not found")
        ctype = TYPES.get(target.suffix.lower()) or mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        return self._send(200, body, ctype)


class _Server(ThreadingHTTPServer):
    # HTTPServer sets SO_REUSEADDR, which on Windows lets a second copy bind
    # the same port; then the "already running" check below never fires.
    allow_reuse_address = False
    daemon_threads = True


def make_server(port=PORT):
    return _Server((HOST, port), Handler)


def main():
    if sys.stdout is None or sys.stderr is None:  # pythonw: no console
        log = state_dir() / "server.log"
        try:
            if log.exists() and log.stat().st_size > 1_000_000:
                log.replace(log.with_suffix(".old.log"))
        except OSError:
            pass
        stream = open(log, "a", encoding="utf-8", buffering=1)
        sys.stdout = sys.stdout or stream
        sys.stderr = sys.stderr or stream
    try:
        httpd = make_server()
    except OSError as e:  # port already taken: another copy is running
        print(f"{APP_NAME}: port {PORT} busy ({e}); not starting a second copy", file=sys.stderr)
        return 1
    print(f"{time.strftime('%Y-%m-%d %H:%M:%S')} {APP_NAME} {APP_VERSION} on http://{HOST}:{PORT}/ serving {PUBLIC}", file=sys.stderr)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
