# Handoff: GPS Conditions dashboard → finish Learn mode

**Repo:** `kdmonie-netizen/laughing-waffle`
**Branch:** `claude/gps-conditions-dashboard-c7d20v` (keep working here and push here)
**Status (4 Nov 2026):** the dashboard and Learn mode are both done and pushed. Steps 1–8 in section 5 are finished; see "What was done" there for the choices made.

**Update (5 Nov 2026, version 1.3.0):** all 18 findings of the outside audit (`KJM_GPS_Conditions_AUDIT_2026-11-05.md`) were approved and fixed; see its fix log and section 10 below.

Read `README.md` first for what the app does and how the grade works. This file only covers what a new session needs to continue.

---

## 1. What the owner asked for

1. **Original request:** one-stop GPS conditions app. It pulls NOAA SWPC data (GPS dashboard feeds, Kp index), with SpaceWeatherLive and Spaceweather Horizon as sources and inspiration. It gives a daily grade for whether it's a good day to run GPS, today and as far out as possible. It includes a solar-wind ("magnetic wind") simulation and any other simulations. **Done.**
2. **Follow-up (current work):** "add 5th grade level explanation for the results. I need it to be a learning tool also." **In progress.**

The owner does survey work (RTK), so the default profile is "RTK / Survey".

## 2. Why this handoff exists

Claude's automatic safety filter kept showing "Message flagged" on ordinary messages in the old session (for example "Go ahead and finish learn mode."). Nothing in the project causes this. It's a false positive in the chat, so the owner started a fresh session. Nothing about the code needs to change because of it.

## 3. Environment notes (cloud sessions)

- **The data hosts are blocked in the cloud container.** `services.swpc.noaa.gov`, `celestrak.org`, `api.nasa.gov`, `spaceweatherlive.com` and `spaceweatherhorizon.com` all return a proxy 403. Do not keep retrying them. The owner can allow them under the environment's network settings. Until then, test with synthetic data (see section 6).
- Node 22 is available. The app has **no npm dependencies**.
- Playwright and Chromium are pre-installed at `/opt/node-tools/node_modules/playwright`. Do not run `playwright install`.
- Don't open a PR unless the owner asks. PR #1 in this repo ("Redesign KJM Land Surveying…") is unrelated. Leave it alone.

## 4. Code map

```
server.js                    static server + allow-listed /api/proxy (no deps)
public/index.html            the whole page (sections: today, timeline, outlook, live, sats, sims, alerts, sources, method)
public/css/styles.css        dark theme; grade colours via .gA–.gF setting --g
public/js/app.js             loads feeds, calls grading, renders every section
public/js/config.js          every URL, cache times, default location (Pensacola), work profiles
public/js/fetch.js           fetch + cache + proxy fallback
public/js/parsers.js         SWPC JSON (both shapes) and text-product parsers
public/js/grading.js         the grading model (hours → days → 27/45-day outlook)
public/js/gnss.js            SGP4 satellites in view + DOP
public/js/geo.js             magnetic latitude, sun elevation
public/js/charts.js          canvas charts
public/js/sims/*.js          magnetosphere sim, aurora map, CME/DBM, frame player
public/js/explain.js         all Learn-mode text (used by app.js)
test/core.test.js            29 tests: parsers (incl. real NOAA samples), grading, SGP4/DOP, physics
test/fixtures/               real NOAA samples (rtsw wind/mag, 45-day JSON + text), saved 4 Nov 2026
test/explain.test.js         9 tests: reading level of all learner text, page boxes all have text
test/readability.js          Flesch-Kincaid + syllable counter (shared by the tests)
test/readability.test.js     3 tests: the syllable counter vs dictionary counts and known-hard text
test/helpers.js              synthetic SWPC/TLE data builders (tests only)
test/e2e/smoke.mjs           browser smoke test with synthetic data + screenshots
```

`npm test` runs all three test files. **41 tests pass** as of the last commit.

## 5. Learn mode: what exists and what's left

### Already in `public/js/explain.js` (committed)

| Export | What it is |
|---|---|
| `term(key, label)` | Returns `<button class="term" data-term="key">label</button>`, a tappable glossary word |
| `GLOSSARY` | 19 entries `{word, text}`: gps, rtk, fix, ionosphere, kp, magfield, magnetosphere, solarwind, bz, flare, protons, cme, aurora, scintillation, pdop, maglat, l1, tec, noaa |
| `GRADE_KID` | A–F meanings with a weather comparison ("like a calm, sunny day…") |
| `factorKid(f)` | Plain-language reason for each grading factor key: kp, flare, flareNow, proton, protonNow, scint, bz, speed, aurora, pdop, flux. It reads the number out of `f.label` |
| `todayKid(day, nowHour)` | HTML paragraph: today's grade, why, best time to work, and how "right now" differs |
| `statKid(key, value)` | One line per "Right now" tile. Keys: kp, bz, speed, xray (flux), protons (pfu), aurora (%), sats ({count, pdop}), mlat |
| `SECTIONS` | "What am I looking at?" text, keyed: timeline, outlook, kpChart, magChart, windChart, xrayChart, protonChart, scales, sats, magSim, enlil, auroraMap, ovationAnim, lasco, suvi, drap, cme, alerts |
| `hourKid(h)`, `dayKid(d)` | Short kid text for an hour cell and a day card |
| `STORY` | 5 steps for "Space Weather 101": Sun's wind → Earth's shield → high air stirred up → GPS signals pass through → receiver does the math |
| `QUIZ` | 6 multiple-choice questions `{q, choices, answer, why}` |
| `mph(kmPerSec)` | Speed converter used in the text |
| `allText()` | All learner text with tags stripped, for the reading-level test |

### What was done (4 Nov 2026, local session on the owner's PC)

All 8 steps below are finished. Choices worth knowing:

- The switch is on by default. `<body class="learn-on">` is in the HTML, so the boxes show even before the script runs. The choice is only saved when the switch is clicked.
- Every card has a box, including three new `SECTIONS` texts: `discussion`, `sources` and `method`.
- The Space Weather 101 section sits just before "How it's graded" and stays visible with Learn mode off. It is its own section with its own tab.
- The diagram is one tall SVG (viewBox 540×640): Sun, wind and shield on top, an "up close" panel below with the satellite, the ionosphere band, the bent signal (gold) beside the straight path (dashed) and the tripod. Numbered badges 1–5 match the story. Animations stop under `prefers-reduced-motion`.
- Quiz: all 6 questions at once. A tap locks that question, shows right/wrong and `why`, and keeps a score; "Try again" resets it.
- Reading level (step 6): the old syllable counter undercounted (53% of test words right, −42 syllables short over 126 words; it dropped the "-ed" in "started" and read "radio" as 2). The new one in `test/readability.js` gets 89% exactly right with a net bias of −4. Real scores: all learner text **2.5** overall, worst item **5.8**, worst live line **5.5**; dense README text **10.9**, a technical paragraph **17.3**, "The cat sat on the mat." −1.4. So the text really is easy. Two aurora tile lines were reworded; nothing else needed shortening.
- "Today gets an F" now uses the right a/an.

### The original step list

1. **Learn mode switch.** Add a `🎓 Learn mode` chip next to Refresh in `.controls` (`index.html`). Toggle `document.body.classList` `learn-on`, save it in `localStorage` (key `gpsdash:learn`, wrapped in try/catch like the settings code), and **default it to on**, since the owner wants a learning tool.
2. **Explanation boxes.** Add `<div class="learn" data-topic="KEY"></div>` inside each card in `index.html`, using the `SECTIONS` keys above. In `app.js`, fill each one from `SECTIONS[topic]` once at boot. CSS: `.learn { display:none }` and `body.learn-on .learn { display:block }`. Give them a friendly style (soft accent border, 🎓 or 💡 marker, slightly larger text).
3. **Dynamic text** (in `app.js`, inside the existing render functions):
   - `renderToday()`: under the grade card or the drivers list, add a `.learn` box with `todayKid(r.days[0], r.now)`. Under each stat tile, add a `.learn` line with `statKid(...)`. The values are already computed there: `rt.kpNow`, `rt.bz30`, `rt.speed`, `rt.xrayFlux`, `rt.protonFlux`, `rt.aurora`, `geoNow`, `r.mlat`.
   - `showHourDetail(h)`: append `hourKid(h)` in a `.learn` span.
   - `renderDays()`: add `dayKid(d)` to each day card.
4. **Glossary pop-up.** Add one `<dialog id="termDialog">` to `index.html`. Add a single delegated click listener on `document` for `.term`, which fills the dialog from `GLOSSARY[btn.dataset.term]` and calls `showModal()`. Style `.term` as dotted-underline inline text, not a chip.
5. **"Space Weather 101" section.** Add `<section id="learn">` (with a "Learn" link in `.tabs`), placed after `#today` or before `#method`. It contains:
   - An inline SVG diagram with numbered steps 1–5 matching `STORY`: Sun on the left, wind arrows, Earth with its magnetic-shield curve, a glowing ionosphere band, a GPS satellite above, its signal line bending through the band down to a survey tripod/receiver. It must stay readable at phone width (use a `viewBox`, `width:100%`).
   - The `STORY` steps beside or below the diagram.
   - The glossary as a grid of cards (A–Z).
   - The quiz: one question at a time or all at once, with instant right/wrong feedback that shows `why`, and a score. No storage is needed.
6. **Check the reading-level score.** `test/explain.test.js` uses Flesch-Kincaid with a vowel-group syllable estimate. It reported **2.5 overall** (worst single item 6.0), which looked suspiciously easy. Sanity-check `fkGrade()` against known text: a dense README paragraph should score around 12+, and "The cat sat on the mat." around 0–1. If the syllable counter is undercounting, fix it and then shorten any text that goes over the limits (overall ≤ 5.5, no single item > 7). Report the real numbers to the owner.
7. **README:** add a short "Learn mode" section.
8. **Verify in the browser** (section 6) with Learn mode on and off, on desktop (1360 wide) and phone (390 wide), and check that there's no horizontal scroll on the phone. Run `npm test`. Then commit and push.

### Writing rules for any new text

- About a 5th-grade level: short sentences, everyday words, one idea per sentence.
- Explain science words with a comparison the reader already knows (magnets, wind, a rock in a stream, stars twinkling, friends calling your name).
- Wrap science words in `term()` so they link to the glossary.
- Keep it true. The text simplifies, but nothing in it is wrong.

## 6. How to test without live data

```bash
npm test                                    # 41 unit tests
PORT=8099 node server.js &                  # serve the app
node test/e2e/smoke.mjs storm               # synthetic storm day → expect today = F
node test/e2e/smoke.mjs quiet               # synthetic quiet day → expect today = A
```

The smoke test intercepts every external request and serves synthetic data in the real SWPC/CelesTrak/DONKI formats from `test/helpers.js`. It prints the grades, any console errors, and the phone-width horizontal overflow (should be 0). It writes `shot-*.png` screenshots to the current directory, so run it from a scratch folder or delete the screenshots afterward. Don't commit them. It also runs 19 Learn-mode checks: on by default, every box filled, the glossary pop-up, the quiz, switching off and surviving a reload, and phone width with Learn on and off. It prints PASS/FAIL per check and exits non-zero on any failure. Off the cloud box, set `NODE_PATH` to a folder with `playwright` installed and `PW_CHANNEL=chrome` to use the installed Google Chrome.

## 7. Known caveats to keep telling the owner

- **First live run: 4 Nov 2026, on the owner's PC** (the cloud container still can't reach NOAA). Three files had gone: `products/solar-wind/plasma-1-day.json`, `mag-1-day.json` and `text/45-day-ap-forecast.txt` all returned 404. They were replaced by `json/rtsw/rtsw_wind_1m.json`, `json/rtsw/rtsw_mag_1m.json` and `json/45-day-forecast.json`. The rtsw files list every L1 spacecraft side by side (SOLAR1, ACE, IMAP), newest first; the parser keeps only `active: true` rows, because in the same minute ACE and SOLAR1 differ (Bz −2.4 vs −0.9). The new 45-day text file's title also contains "F10.7", which broke the old text parser, so it now splits at the "45-DAY F10.7" heading. Real samples are in `test/fixtures/`. After the fix every NOAA and CelesTrak feed loads live.
- **NASA DONKI** (CME list and modelled arrivals) answered 503 and then 429 "too many requests" on the shared `DEMO_KEY`. A free personal key from https://api.nasa.gov goes in `nasaApiKey` in `config.js`. Signing up is the owner's call.
- SpaceWeatherLive and Spaceweather Horizon have no open data feeds, so they're cross-check links, not data sources.
- To publish the site: merge to `main`, then go to GitHub → Settings → Pages → Source: GitHub Actions (`.github/workflows/pages.yml` is already there).

## 8. The office app (Dropbox) - added 4 Nov 2026

The owner asked for it to be "a proper app like the rest on Dropbox". It follows `Dropbox\Apps\_APP STANDARD\APP PACKAGING PROTOCOL.txt` (read that first if you change the launcher).

- **Office copy:** `~\Dropbox\Apps\KJM GPS Conditions\` - root = `Launch KJM GPS Conditions.vbs` + `README - HOW THIS WORKS.txt`; `app\` (app.py, icon, release.json, public\); `help\` (this file as HANDOFF.md, the developer README, deploys.log). **Never rename the launcher**: desktop icons point at that filename.
- **Port 5560**, recorded in the protocol's port registry. The server binds 127.0.0.1 only.
- **This git repo is the master.** Never edit the Dropbox copy by hand; change the repo, commit, then run `python -B desktop/package_to_dropbox.py` (dry run) and `--go`. The packager refuses a dirty tree, runs `npm test` and the desktop tests, refuses changed app files without a version bump, prunes inside app\ and help\ only, stamps every file with the deploy time, writes `app\release.json` last, appends `help\deploys.log`, and prints dev vs live `MATCH`.
- **Version:** `APP_VERSION` in `desktop/app.py` = `version` in `package.json` (a test checks). Bump both for every release that changes app files, as the last edit before the final test run.
- **Updates reach PCs through the icon:** the launcher compares `/api/version` with `app\app.py` on disk and restarts an older server. No "open the Dropbox folder" step for anyone.
- **Release seal:** until every file listed in `release.json` is on the PC (size + SHA-256) and `app.py` names the same version, `/` shows "Dropbox is still downloading an update" (reloads every 5 s) and `/api/version` says `<v>-updating`. A listed file that differs and is dated over 60 s AFTER release.json could be a hand edit or the next release arriving ahead of its release.json, so it holds the page too, but only for 10 minutes of watched time (at most 15 s counted per gap between checks, so a sleeping PC doesn't count); then it is taken as a hand edit. Tests: `desktop/tests/test_app.py` (23, including negative controls for both cases).
- **Proxy hardening:** upstream bodies are served with `Content-Security-Policy: sandbox` and `Content-Disposition: attachment`; redirects are followed only to another allow-listed https URL (server.js refuses redirects). The server refuses a second copy on the same port (`allow_reuse_address = False`; Windows otherwise lets both bind).
- **Launcher:** touches the desktop icon only when `app\app.py` sits beside it, so running it from the git tree can't repoint the office icon.
- **No watchdog:** nobody depends on it all day, so it isn't armed.
- **Per-PC files:** `%LOCALAPPDATA%\KJM GPS Conditions\` (launcher.log, server.log). Claude's tools see a shadow of %LOCALAPPDATA% (MSIX virtualisation), so check a running server over HTTP, not by reading those files.
- `server.js` stays for `npm start`, GitHub Pages work and the smoke test; its allow-list must match app.py's (a test checks). `SMOKE_URL=http://127.0.0.1:<port>/` points the smoke test at the Python server.

## 9. Data sources added in 1.2.0 (4 Nov 2026) and what to watch

A research agent audited every free source it could find; each one used here was then checked at the source. Details and URLs: `public/js/config.js`; parsers: `public/js/parsers.js` (bottom) and `public/js/health.js`; tests: `test/sources.test.js` on real samples in `test/fixtures/`.

- **The NAVCEN advisory trap.** `current_opsadvisory.oa1` section B kept listing PRN 11 and PRN 25 as UNUSUFN ("unusable until further notice") months after NAVCEN's Satellite Outage File (`current_sof.sof`) recorded both outages closed the same day (NANUs 2026049, 2026069), and NAVCEN's status page showed both healthy. The audit agent believed the advisory. So: the outage file is the authority for FINISHED outages (it holds nothing else: every entry has an end). An advisory's open-ended line (UNUSUFN, UNUNOREF, FCSTUUFN, FCSTEXTD) applies only when the outage file is loaded and holds no later notice for that PRN; without the outage file it is shown as a note, not applied. A scheduled window (FCSTDV/FCSTMX/FCSTRESCD) is closed only by a later notice that overlaps it, never by an unrelated later outage of the same satellite. Don't "simplify" this back; `test/sources.test.js` pins each case.
- **GPS health needs the proxy.** NAVCEN and the GSC send no CORS headers, so those loaders use `proxyFirst` (desktop app or `npm start`). On GitHub Pages the health list says it couldn't load and every satellite counts.
- **GLONASS IAC** (`glonass-iac.ru`) returns 403 to scripts. Getting around that is bot-check circumvention: don't. It is a link only. BeiDou has no machine-readable feed we could verify.
- **NOAA CORS layer:** `NOAA_CORS_Network_view/FeatureServer/2`. Longitudes are stored 0–360° east, and the "Active" layer still contains decommissioned sites, so the query asks `status='Operational'` in a box (the circle query is rejected by this layer).
- **GloTEC:** the index is ~0.5 MB and every frame ~2.5 MB (not gzipped). The loader keeps only the newest frame (`memo: false`), refreshes the index every 10 min.
- **D-RAP** moved to `images/animations/d-rap/global/latest.png`. A failed image used to be *replaced*, which made the next refresh throw and skip the aurora map and CME lists; `showImage()` keeps the element now.
- **Stale real-time data** (older than 90 min) is "unknown", not calm: the red banner says so and those penalties drop out of the grade. SWPC had a real-time outage on 22 Sep 2026.
- **GOES zero readings:** around eclipses and electron storms the GOES X-ray file keeps updating but every reading is `flux: 0.0` with `electron_contaminaton: true` (seen 4 Nov 2026, 21:26 to 23:07 UTC at least). The parser drops zeros; the banner says the readings are unusable (not that the feed went quiet) and the tiles say "no recent data".
- **Review, 4 Nov 2026:** an independent 28-agent review (5 areas, every finding checked by a skeptic) confirmed 20 findings, all fixed in 1.2.0, the worst being a hole in the release seal (next release's files arriving before its release.json passed as hand edits). Left open (verdict "uncertain"): LAUNCH notices are ignored, so a newly launched GPS satellite in checkout would count in PDOP until USABINIT. CelesTrak's gps-ops group may not even list it then; not worth guessing.
- **Still open:** NASA DONKI answers 429 on the shared `DEMO_KEY`. A free personal key from https://api.nasa.gov goes in `nasaApiKey` (config.js). That sign-up is the owner's.
- **Not used, and why:** gpsjam.org (a day behind, needs H3 hex maths; linked instead), GFZ Hp30 (no CORS; Kp already covers it), NAVCEN Yuma almanac health (shows every PRN healthy, even during outages), FAA NOTAM API (needs a key), BoM / ESA (need accounts), US-TEC and CTIPe (retired).

## 10. Audit fixes in 1.3.0 (5 Nov 2026)

The outside audit found that the common bad days (a few storm hours, a storm just starting, a CME on the way, a dead feed) could still say "go". All 18 findings were approved and fixed. The fix log at the bottom of `KJM_GPS_Conditions_AUDIT_2026-11-05.md` says what changed for each ID.

- `test/audit-fixes.test.js` reproduces every audit scenario (Pensacola, RTK, Central time) and is part of `npm test`.
- The audit's own `audit_tests/` folder lives on the office PC, not in this repo. Run it there after pulling: `TZ=America/Chicago node --test audit_tests/*.test.js`. Its API guesses may differ from the names used here (`cmeCheck`, `midLatK`, `realtime.dst`, `realtime.tecAnomaly`, `realtime.kpModel`, `realtime.propagated`); if one fails only on a name, align the test, not the grade.
- Ship from the office PC as usual: `python -B desktop/package_to_dropbox.py` (dry run), then `--go`.
