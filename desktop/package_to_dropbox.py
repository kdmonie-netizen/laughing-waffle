"""Ship the GPS Conditions dashboard to Dropbox as the office app.

    python -B desktop/package_to_dropbox.py            dry run: every check, the plan, nothing written
    python -B desktop/package_to_dropbox.py --go       copy, prune, seal

Source = this git checkout. Target = ~/Dropbox/Apps/KJM GPS Conditions
(override with --target or GPSDASH_TARGET; --rehearsal refuses any Dropbox
path, for practice runs on a copy).

Layout written (APP PACKAGING PROTOCOL in Dropbox/Apps/_APP STANDARD):

    Launch KJM GPS Conditions.vbs      desktop/Launch KJM GPS Conditions.vbs
    README - HOW THIS WORKS.txt        desktop/README - HOW THIS WORKS.txt
    app/app.py                         desktop/app.py   (stdlib Python server)
    app/gps_conditions.ico             desktop/gps_conditions.ico
    app/public/...                     public/...       (the dashboard)
    app/release.json                   written here: version, commit, size + sha256 per app file
    help/HANDOFF.md                    HANDOFF.md
    help/README (developer).md         README.md
    help/deploys.log                   one line appended per --go

Rules it enforces (each from something that broke in another KJM app):
  * --go needs a clean git tree, so the office copy is always a commit.
  * APP_VERSION in desktop/app.py must equal package.json "version", and must
    differ from the version already live unless the files are identical:
    every PC's launcher restarts only when the version changes, and the
    release seal relies on each release having its own version.
  * Tests run first (npm test + the desktop server tests).
  * Prunes what no longer ships, but only inside app/ and help/ (never
    help/deploys.log). Other root files are reported and left alone.
  * Every written file gets one whole-second mtime (the deploy time), and
    release.json is written last.
  * Prints the dev and live versions side by side and says MATCH.
"""

import argparse
import datetime as dt
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.dont_write_bytecode = True

REPO = Path(__file__).resolve().parent.parent
DESKTOP = REPO / "desktop"
APP_NAME = "KJM GPS Conditions"
LAUNCHER = f"Launch {APP_NAME}.vbs"
ROOT_FILES = {LAUNCHER, "README - HOW THIS WORKS.txt"}
KEEP = {"help/deploys.log"}
CRLF_SUFFIXES = {".vbs", ".txt", ".bat", ".cmd"}


def default_target():
    env = os.environ.get("GPSDASH_TARGET")
    if env:
        return Path(env)
    return Path.home() / "Dropbox" / "Apps" / APP_NAME


def version_in(path):
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        if line.startswith("APP_VERSION"):
            return line.split('"')[1]
    return ""


def build_map():
    """{dest relative posix path: source Path}"""
    m = {
        LAUNCHER: DESKTOP / LAUNCHER,
        "README - HOW THIS WORKS.txt": DESKTOP / "README - HOW THIS WORKS.txt",
        "app/app.py": DESKTOP / "app.py",
        "app/gps_conditions.ico": DESKTOP / "gps_conditions.ico",
        "help/HANDOFF.md": REPO / "HANDOFF.md",
        "help/README (developer).md": REPO / "README.md",
    }
    pub = REPO / "public"
    for p in sorted(pub.rglob("*")):
        if p.is_file() and "__pycache__" not in p.parts and not p.name.startswith("."):
            m["app/public/" + p.relative_to(pub).as_posix()] = p
    return m


def payload(dest, src):
    data = src.read_bytes()
    if Path(dest).suffix.lower() in CRLF_SUFFIXES:
        data = data.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
    return data


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def git(*args):
    return subprocess.run(["git", *args], cwd=REPO, capture_output=True, text=True).stdout.strip()


def run_tests():
    npm = shutil.which("npm") or shutil.which("npm.cmd")
    steps = [
        ([npm, "test"], "npm test"),
        ([sys.executable, "-B", "-m", "unittest", "discover", "-s", str(DESKTOP / "tests")], "desktop server tests"),
    ]
    for cmd, label in steps:
        r = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True, shell=False)
        tail = (r.stdout + r.stderr).strip().splitlines()[-4:]
        print(f"  {label}: {'ok' if r.returncode == 0 else 'FAILED'}")
        if r.returncode != 0:
            print("    " + "\n    ".join(tail))
            return False
    return True


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--go", action="store_true", help="write the files (default is a dry run)")
    ap.add_argument("--target", type=Path, default=None)
    ap.add_argument("--rehearsal", action="store_true", help="refuse any Dropbox target")
    ap.add_argument("--skip-tests", action="store_true", help="dry runs only")
    ap.add_argument("--allow-dirty", action="store_true", help="dry runs / rehearsals only")
    a = ap.parse_args(argv)
    target = (a.target or default_target()).resolve()
    problems = []

    if a.rehearsal and "dropbox" in str(target).lower():
        print(f"REFUSED: --rehearsal target is inside Dropbox: {target}")
        return 2
    if a.go and not a.rehearsal and (a.skip_tests or a.allow_dirty):
        print("REFUSED: --skip-tests / --allow-dirty are for dry runs and rehearsals, not a live --go")
        return 2

    print(f"{APP_NAME} packager")
    print(f"  source  {REPO}")
    print(f"  target  {target}")

    files = build_map()
    missing = [str(s) for s in files.values() if not s.is_file()]
    if missing:
        problems.append("source incomplete: " + ", ".join(missing))
    must = ["app/public/index.html", "app/public/js/app.js", "app/public/js/explain.js", "app/public/css/styles.css"]
    for d in must:
        if d not in files:
            problems.append(f"source has no {d}")
    if len(files) < 20:
        problems.append(f"only {len(files)} files to ship - is the checkout complete?")

    dev_v = version_in(DESKTOP / "app.py")
    pkg_v = json.loads((REPO / "package.json").read_text(encoding="utf-8")).get("version")
    if dev_v != pkg_v:
        problems.append(f"APP_VERSION {dev_v} != package.json {pkg_v}")

    commit = git("rev-parse", "--short", "HEAD") or "?"
    dirty = git("status", "--porcelain")
    if dirty and not a.allow_dirty:
        problems.append("git tree has uncommitted changes:\n      " + "\n      ".join(dirty.splitlines()[:10]))

    live_rel = target / "app" / "release.json"
    live = {}
    if live_rel.is_file():
        try:
            live = json.loads(live_rel.read_text(encoding="utf-8"))
        except ValueError:
            live = {}
    live_v = live.get("version", "")

    # Plan
    blobs = {d: payload(d, s) for d, s in files.items() if s.is_file()}
    add, update, same = [], [], []
    for d, data in blobs.items():
        p = target / d
        if not p.is_file():
            add.append(d)
        elif p.read_bytes() != data:
            update.append(d)
        else:
            same.append(d)
    remove, foreign = [], []
    if target.is_dir():
        for p in sorted(target.rglob("*")):
            if not p.is_file():
                continue
            rel = p.relative_to(target).as_posix()
            if rel in blobs or rel in KEEP or rel == "app/release.json":
                continue
            if rel.startswith(("app/", "help/")):
                remove.append(rel)
            else:
                foreign.append(rel)
    # Shipped code changes when an app file is added or rewritten, or a file the
    # live release listed goes away. Stray files no release ever listed are junk.
    code_changed = any(d.startswith("app/") for d in add + update) or any(r in live.get("files", {}) for r in remove)
    if live_v and code_changed and live_v == dev_v:
        problems.append(f"app files change but APP_VERSION is still {dev_v} (live is {live_v}): bump it, or PCs won't restart and the seal can't tell releases apart")

    print(f"  version dev {dev_v} / live {live_v or '(none)'} / commit {commit}{' +dirty' if dirty else ''}")
    print(f"  plan: add {len(add)}, update {len(update)}, unchanged {len(same)}, remove {len(remove)}")
    for label, lst in (("add", add), ("update", update), ("remove", remove)):
        for d in lst[:40]:
            print(f"    {label:6} {d}")
        if len(lst) > 40:
            print(f"    ... {len(lst) - 40} more")
    for f in foreign:
        print(f"    left in place (not ours to remove): {f}")

    if not a.skip_tests:
        print("  tests:")
        if not run_tests():
            problems.append("tests failed")

    if problems:
        print("\nNOT READY:")
        for p in problems:
            print("  - " + p)
        return 1
    if not a.go:
        print("\nDry run only: nothing written. Add --go to ship.")
        return 0

    # Write: everything, then prune, then release.json last.
    stamp = int(time.time())
    for d in add + update:
        p = target / d
        p.parent.mkdir(parents=True, exist_ok=True)
        tmp = p.with_name(p.name + ".partial")
        tmp.write_bytes(blobs[d])
        os.replace(tmp, p)
        os.utime(p, (stamp, stamp))
    for d in remove:
        (target / d).unlink()
    for folder in sorted({(target / d).parent for d in remove}, key=lambda x: -len(x.parts)):
        try:
            folder.rmdir()
        except OSError:
            pass
    manifest = {
        "app": APP_NAME,
        "version": dev_v,
        "commit": commit,
        "built": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "files": {d: {"size": len(b), "sha256": sha256(b)} for d, b in sorted(blobs.items()) if d.startswith("app/")},
    }
    rel = target / "app" / "release.json"
    tmp = rel.with_name("release.json.partial")
    tmp.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    os.replace(tmp, rel)
    os.utime(rel, (stamp + 1, stamp + 1))
    with open(target / "help" / "deploys.log", "a", encoding="utf-8") as log:
        log.write(f"{manifest['built']}  {dev_v}  commit {commit}  add {len(add)} update {len(update)} remove {len(remove)}  from {os.environ.get('COMPUTERNAME', '?')}\n")

    # Read back
    back_v = version_in(target / "app" / "app.py")
    bad = [d for d, b in blobs.items() if (target / d).read_bytes() != b]
    print(f"\nWROTE {len(add) + len(update)} file(s), removed {len(remove)}.")
    print(f"  dev {dev_v} / live {back_v}: {'MATCH' if back_v == dev_v else 'MISMATCH'}")
    print(f"  read-back: {'all files match' if not bad else 'DIFFER: ' + ', '.join(bad)}")
    return 0 if back_v == dev_v and not bad else 1


if __name__ == "__main__":
    sys.exit(main())
