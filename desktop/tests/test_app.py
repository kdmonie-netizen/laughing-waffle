"""Tests for the desktop server (desktop/app.py) and the Dropbox packager.

    python -B -m unittest discover -s desktop/tests

Standard library only. The seal tests ship a rehearsal copy into a temp
folder with the real packager, then load THAT copy's app.py, so they test
exactly what an office PC runs.
"""

import importlib.util
import json
import os
import re
import shutil
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest import mock

sys.dont_write_bytecode = True
REPO = Path(__file__).resolve().parents[2]
DESKTOP = REPO / "desktop"
sys.path.insert(0, str(DESKTOP))
import package_to_dropbox as pkg  # noqa: E402


def load_app(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class Served:
    """Run a loaded app module's server on a free port in a thread."""

    def __init__(self, mod):
        self.mod = mod
        self.httpd = mod.make_server(0)
        self.base = f"http://127.0.0.1:{self.httpd.server_address[1]}"
        self.t = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.t.start()

    def get(self, path, method="GET"):
        req = urllib.request.Request(self.base + path, method=method)
        try:
            with urllib.request.urlopen(req, timeout=5) as r:
                return r.status, r.headers.get("Content-Type", ""), r.read(), r.headers
        except urllib.error.HTTPError as e:
            return e.code, e.headers.get("Content-Type", ""), e.read(), e.headers

    def close(self):
        self.httpd.shutdown()
        self.httpd.server_close()


class DevServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = load_app(DESKTOP / "app.py", "gps_dev_app")
        cls.s = Served(cls.app)

    @classmethod
    def tearDownClass(cls):
        cls.s.close()

    def test_version_health_and_page(self):
        st, ct, body, _ = self.s.get("/api/version")
        self.assertEqual((st, body.decode()), (200, self.app.APP_VERSION))
        self.assertEqual(self.s.get("/api/health")[2], b"ok")
        st, ct, body, _ = self.s.get("/")
        self.assertEqual(st, 200)
        self.assertIn("text/html", ct)
        self.assertIn(b"GPS Conditions", body)
        st, ct, _, _ = self.s.get("/js/app.js")
        self.assertEqual((st, ct), (200, "text/javascript; charset=utf-8"))
        self.assertEqual(self.s.get("/css/styles.css")[1], "text/css; charset=utf-8")

    def test_no_way_out_of_public(self):
        for p in ("/../package.json", "/%2e%2e/package.json", "/..%2fpackage.json", "/%2e%2e%5cpackage.json", "/js/../../server.js"):
            st, _, body, _ = self.s.get(p)
            self.assertIn(st, (403, 404), p)
            self.assertNotIn(b'"name"', body, p)

    def test_methods(self):
        self.assertEqual(self.s.get("/", "POST")[0], 405)
        st, _, body, _ = self.s.get("/api/version", "HEAD")
        self.assertEqual((st, body), (200, b""))
        self.assertEqual(self.s.get("/nope.js")[0], 404)

    def test_proxy_refuses_other_hosts(self):
        cases = {
            "https://example.com/x": 403,
            "http://services.swpc.noaa.gov/products/alerts.json": 403,  # not https
            "https://services.swpc.noaa.gov.evil.com/x": 403,
            "https://user@services.swpc.noaa.gov/x": 403,
            "https://services.swpc.noaa.gov:8443/x": 403,
            "not a url": 400,
            "": 400,
        }
        for url, want in cases.items():
            st = self.s.get("/api/proxy?url=" + urllib.request.quote(url, safe=""))[0]
            self.assertEqual(st, want, url)

    def test_proxy_fetches_and_caches_allowed_hosts(self):
        calls = []

        class Fake:
            status = 200
            headers = {"Content-Type": "application/json"}

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                return b'{"ok": 1}'

        def fake_urlopen(req, timeout):
            calls.append(req.full_url)
            return Fake()

        url = "https://services.swpc.noaa.gov/products/noaa-scales.json?test=" + str(time.time())
        with mock.patch.object(self.app, "_urlopen", fake_urlopen):
            a = self.s.get("/api/proxy?url=" + urllib.request.quote(url, safe=""))
            b = self.s.get("/api/proxy?url=" + urllib.request.quote(url, safe=""))
        self.assertEqual((a[0], a[2]), (200, b'{"ok": 1}'))
        self.assertEqual(a[3]["X-Cache"], "MISS")
        self.assertEqual(b[3]["X-Cache"], "HIT")
        self.assertEqual(calls, [url])

    def test_proxy_bodies_cannot_run_as_pages(self):
        class Fake:
            status = 200
            headers = {"Content-Type": "text/html"}

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                return b"<script>alert(1)</script>"

        url = "https://navcen.uscg.gov/x.html?t=" + str(time.time())
        with mock.patch.object(self.app, "_urlopen", lambda req, timeout: Fake()):
            st, ct, body, headers = self.s.get("/api/proxy?url=" + urllib.request.quote(url, safe=""))
        self.assertEqual(st, 200)
        self.assertEqual(headers["Content-Security-Policy"], "sandbox")
        self.assertEqual(headers["Content-Disposition"], "attachment")

    def test_redirect_off_the_allow_list_is_refused(self):
        h = self.app._CheckedRedirect()
        req = urllib.request.Request("https://navcen.uscg.gov/a")
        with self.assertRaises(urllib.error.HTTPError) as cm:
            h.redirect_request(req, None, 302, "Found", {}, "https://evil.example.com/a")
        self.assertEqual(cm.exception.code, 502)
        with self.assertRaises(urllib.error.HTTPError):
            h.redirect_request(req, None, 302, "Found", {}, "http://navcen.uscg.gov/a")  # downgrade to http
        ok = h.redirect_request(req, None, 302, "Found", {}, "https://navcen.uscg.gov/b")
        self.assertEqual(ok.full_url, "https://navcen.uscg.gov/b")

    def test_second_copy_cannot_bind_the_same_port(self):
        port = self.s.httpd.server_address[1]
        with self.assertRaises(OSError):
            self.app.make_server(port)

    def test_allow_list_matches_server_js(self):
        js = (REPO / "server.js").read_text(encoding="utf-8")
        block = re.search(r"ALLOWED_HOSTS = new Set\(\[(.*?)\]\)", js, re.S).group(1)
        self.assertEqual(set(re.findall(r"'([^']+)'", block)), self.app.ALLOWED_HOSTS)

    def test_version_matches_package_json(self):
        pkgv = json.loads((REPO / "package.json").read_text(encoding="utf-8"))["version"]
        self.assertEqual(self.app.APP_VERSION, pkgv)

    def test_no_release_json_means_no_seal(self):
        self.assertFalse((DESKTOP / "release.json").exists())
        self.assertEqual(self.app.seal_status(), (True, []))


class ShippedCopyTests(unittest.TestCase):
    """Ship a rehearsal copy with the real packager, then test that copy."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="gpsdash_rehearsal_"))
        self.target = self.tmp / "KJM GPS Conditions"
        rc = self.ship()
        self.assertEqual(rc, 0, self.out)
        self.app = load_app(self.target / "app" / "app.py", f"gps_shipped_{id(self)}")
        self.release = self.target / "app" / "release.json"

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def ship(self, *extra):
        buf = StringIO()
        with redirect_stdout(buf):
            rc = pkg.main(["--go", "--rehearsal", "--skip-tests", "--allow-dirty", "--target", str(self.target), *extra])
        self.out = buf.getvalue()
        return rc

    def age(self, path, seconds):
        """Set a file's mtime relative to release.json's."""
        t = self.release.stat().st_mtime + seconds
        os.utime(path, (t, t))

    def test_layout_follows_the_protocol(self):
        root = sorted(p.name for p in self.target.iterdir())
        self.assertEqual(root, ["Launch KJM GPS Conditions.vbs", "README - HOW THIS WORKS.txt", "app", "help"])
        for rel in ("app/app.py", "app/gps_conditions.ico", "app/release.json", "app/public/index.html", "help/HANDOFF.md", "help/deploys.log"):
            self.assertTrue((self.target / rel).is_file(), rel)
        vbs = (self.target / "Launch KJM GPS Conditions.vbs").read_bytes()
        self.assertIn(b"\r\n", vbs)
        self.assertNotIn(b"\r\r", vbs)
        self.assertNotIn(b"\n", vbs.replace(b"\r\n", b""))  # CRLF everywhere
        self.assertNotIn(b"localhost", vbs.split(b"' 127.0.0.1, NOT localhost")[1].split(b"url       =")[1].split(b"\n")[0])
        self.assertIn(b'port      = "5560"', vbs)
        self.assertFalse(list(self.target.rglob("__pycache__")))
        self.assertIn("MATCH", self.out)

    def test_complete_release_serves_the_page(self):
        self.assertEqual(self.app.seal_status(), (True, []))
        s = Served(self.app)
        try:
            self.assertEqual(s.get("/api/version")[2].decode(), self.app.APP_VERSION)
            self.assertIn(b"Space Weather 101", s.get("/")[2])
        finally:
            s.close()

    def test_file_still_downloading_holds_the_page(self):
        f = self.target / "app" / "public" / "js" / "explain.js"
        f.write_text("// half here", encoding="utf-8")
        self.age(f, -5)  # Dropbox keeps the file's own (older) date
        ok, problems = self.app.seal_status()
        self.assertFalse(ok)
        self.assertTrue(any("explain.js" in p for p in problems))
        s = Served(self.app)
        try:
            self.assertEqual(s.get("/api/version")[2].decode(), self.app.APP_VERSION + "-updating")
            body = s.get("/")[2]
            self.assertIn(b"still downloading an update", body)
            self.assertNotIn(b"Space Weather 101", body)
        finally:
            s.close()

    def test_missing_file_holds_the_page(self):
        (self.target / "app" / "public" / "css" / "styles.css").unlink()
        self.assertFalse(self.app.seal_status()[0])

    def test_hand_edit_after_release_does_not_lock_the_page_for_ever(self):
        f = self.target / "app" / "public" / "css" / "styles.css"
        f.write_text(f.read_text(encoding="utf-8") + "\n/* local tweak */\n", encoding="utf-8")
        self.age(f, +120)
        ok, problems = self.app.seal_status()
        self.assertFalse(ok)  # at first it could be the next release arriving
        self.assertTrue(any("newer than the release" in p for p in problems), problems)
        # Watched time accrues only between checks, capped per gap (a sleeping PC doesn't count).
        clock = [1000.0]
        with mock.patch.object(self.app.time, "monotonic", lambda: clock[0]):
            self.app.seal_status()
            for _ in range(int(self.app.HAND_EDIT_WAIT_S / self.app.WATCH_GAP_CAP_S) - 1):
                clock[0] += 3600  # an hour between checks still counts as 15 s
                self.assertFalse(self.app.seal_status()[0])
            clock[0] += 3600
            clock[0] += 3600
            self.app.seal_status()
            self.assertEqual(self.app.seal_status(), (True, []))

    def test_next_release_files_ahead_of_its_release_json_hold_the_page(self):
        # The reviewer's case: Dropbox brings the next release's page files
        # first, while app.py and release.json are still the old release.
        f = self.target / "app" / "public" / "js" / "app.js"
        f.write_text("// next release's app.js", encoding="utf-8")
        self.age(f, +400)
        ok, problems = self.app.seal_status()
        self.assertFalse(ok)
        s = Served(self.app)
        try:
            self.assertIn(b"still downloading an update", s.get("/")[2])
            self.assertTrue(s.get("/api/version")[2].decode().endswith("-updating"))
        finally:
            s.close()

    def test_new_files_before_new_release_json_do_not_pass_as_hand_edits(self):
        # Negative control for the hand-edit grace: a newer app.py arriving
        # ahead of its release.json is a delivery in progress, not an edit.
        a = self.target / "app" / "app.py"
        a.write_text(a.read_text(encoding="utf-8").replace(f'APP_VERSION = "{self.app.APP_VERSION}"', 'APP_VERSION = "9.9.9"'), encoding="utf-8")
        self.age(a, +300)
        ok, problems = self.app.seal_status()
        self.assertFalse(ok)
        self.assertTrue(any("9.9.9" in p for p in problems), problems)

    def test_release_json_ahead_of_its_files(self):
        m = json.loads(self.release.read_text(encoding="utf-8"))
        m["files"]["app/public/js/app.js"]["sha256"] = "0" * 64
        self.release.write_text(json.dumps(m), encoding="utf-8")
        self.assertFalse(self.app.seal_status()[0])

    def test_reship_prunes_only_inside_app_and_help(self):
        (self.target / "app" / "public" / "old.js").write_text("x")
        (self.target / "help" / "stale notes.txt").write_text("x")
        (self.target / "Update manual.txt").write_text("keep me")
        log_before = (self.target / "help" / "deploys.log").read_text(encoding="utf-8")
        self.assertEqual(self.ship(), 0, self.out)
        self.assertFalse((self.target / "app" / "public" / "old.js").exists())
        self.assertFalse((self.target / "help" / "stale notes.txt").exists())
        self.assertTrue((self.target / "Update manual.txt").exists())
        self.assertIn("left in place", self.out)
        self.assertTrue((self.target / "help" / "deploys.log").read_text(encoding="utf-8").startswith(log_before))

    def test_changed_files_with_the_same_version_are_refused(self):
        f = self.target / "app" / "public" / "js" / "app.js"
        f.write_text("// someone else's edit", encoding="utf-8")
        self.assertEqual(self.ship(), 1)
        self.assertIn("bump it", self.out)
        self.assertEqual(f.read_text(encoding="utf-8"), "// someone else's edit")  # nothing written

    def test_rehearsal_refuses_dropbox(self):
        buf = StringIO()
        with redirect_stdout(buf):
            rc = pkg.main(["--rehearsal", "--target", str(Path.home() / "Dropbox" / "Apps" / "x")])
        self.assertEqual(rc, 2)
        self.assertIn("REFUSED", buf.getvalue())

    def test_live_go_refuses_shortcuts(self):
        buf = StringIO()
        with redirect_stdout(buf):
            rc = pkg.main(["--go", "--skip-tests", "--target", str(self.tmp / "elsewhere")])
        self.assertEqual(rc, 2)


if __name__ == "__main__":
    unittest.main()
