# GPS Conditions

A one-stop GPS/GNSS conditions dashboard. It answers one question: **is today a good day to run GPS?** It gives an A–F grade for today, an hour-by-hour grade for the next 72 hours, and an outlook out to 45 days. Live space-weather data and simulations sit underneath the grade.

## What it pulls

| Source | What | Horizon |
|---|---|---|
| NOAA SWPC: planetary Kp (observed, 1-minute estimate, forecast) | Geomagnetic storm level, the main driver of RTK/ionosphere trouble | past 7 days → +3 days |
| NOAA SWPC: `noaa-scales.json` | G/S/R scales now, plus flare and proton-event probabilities | +3 days |
| NOAA SWPC: real-time solar wind (`json/rtsw/`, plasma + magnetic field) | Bz, Bt, speed, density at L1, about 30–60 min ahead of Earth. The file lists every L1 spacecraft (SOLAR1, ACE, IMAP); the app uses the one NOAA marks active | last 24 h |
| NOAA SWPC: GOES X-ray + ≥10 MeV protons | Flares (radio bursts) and radiation storms | last 24 h |
| NOAA SWPC: 27-day outlook | Daily largest Kp, Ap, F10.7 | +27 days |
| USAF/NOAA: 45-day Ap forecast (`json/45-day-forecast.json`) | Daily Ap, F10.7 | +45 days |
| NOAA SWPC: OVATION aurora | Is the auroral oval (scintillation zone) over your site? | nowcast |
| NOAA SWPC: WSA-Enlil, OVATION, LASCO C3, SUVI animations, D-RAP | Model and imagery players | Enlil includes forecast days |
| NASA CCMC DONKI | CME catalogue + WSA-Enlil predicted Earth arrival times and Kp | next few days |
| CelesTrak | GPS, Galileo, GLONASS and BeiDou element sets → sky plot, satellites in view, PDOP/HDOP/VDOP | 72 h |
| Alerts + forecaster discussion | SWPC watches, warnings, alerts | last 48 h |

SpaceWeatherLive and Spaceweather Horizon don't publish open data feeds, so the **Sources** panel deep-links to them for cross-checking. Both are built on the same NOAA/NASA data this app reads directly. The NOAA GPS Community Dashboard, GloTEC, CTIPe and Geospace model pages are linked there as well.

## Simulations

- **Solar wind → magnetosphere (live).** Particles stream at the measured wind speed and density, coloured by Bz. Earth's magnetopause is computed with the Shue (1998) model from real-time dynamic pressure and Bz. The GNSS orbit shell and GEO ring are drawn for reference. Three modes: Live, Replay of the last 24 h, or Manual sliders for what-if storms.
- **WSA-Enlil solar wind model**: NOAA's run, including forecast frames.
- **OVATION aurora oval**: rendered as a polar map with your location, plus the 24 h animation.
- **CME arrival.** NASA's modelled Earth impacts, plus a Drag-Based Model calculator (Vršnak et al. 2013) with an animated Sun–Earth view. Click a recent CME to load it.
- **LASCO C3 coronagraph**, **GOES SUVI 304 Å**, and the **D-RAP** absorption map.

## How the grade works

Each hour starts at 100 and loses points for Kp, flare odds (sunlit side only), proton odds (high latitude), the post-sunset equatorial scintillation window, real-time southward Bz and fast wind, aurora overhead, and poor PDOP. Penalties scale with your **geomagnetic latitude** and your **work profile** (RTK/survey, drone, ag guidance, general nav). The day grade blends the average and the worst hour of your work hours (60/40).

| A | B | C | D | F |
|---|---|---|---|---|
| ≥ 90 Excellent: go | ≥ 80 Good: go | ≥ 70 Fair: extra checks | ≥ 55 Poor: expect float | No-go for precision work |

Days 1–3 use NOAA's full 3-day forecast (high confidence). Days 4–27 use the 27-day outlook's peak Kp (medium). Days 28–45 use the 45-day Ap forecast converted to an equivalent Kp (low). NASA-modelled CME arrivals bump the affected day. All thresholds are lookup tables in [`public/js/grading.js`](public/js/grading.js), so they're easy to tune. The page has a full "How it's graded" table.

> This is a planning aid. Always confirm with your receiver's own fix status, residuals and check shots.

## Learn mode

The app is also a teaching tool. The **🎓 Learn mode** switch next to Refresh shows plain-language explanations written at about a 5th-grade reading level. It's on by default, and your browser remembers if you turn it off.

- **Every section** gets a 💡 "What am I looking at?" box. Today's grade gets a "why" in plain words, each "Right now" tile gets one line, and each hour and day says what its grade means.
- **Underlined words** (Kp, Bz, ionosphere, PDOP and 15 more) open a pop-up with a simple definition.
- **Space Weather 101** (the *Learn* tab) has a picture of how the Sun's wind reaches your receiver in 5 numbered steps, the same steps in words, the whole word list, and a 6-question quiz with instant feedback.

All the learner text lives in [`public/js/explain.js`](public/js/explain.js). `npm test` scores every line of it with the Flesch-Kincaid grade formula. The whole set must average grade 5.5 or below, and no single item may go above grade 7, so keep sentences short when you edit. The syllable counter behind that score is itself tested against dictionary counts and against text with known difficulty ([`test/readability.test.js`](test/readability.test.js)), so an easy score means easy text.

## Run it

Needs Node 18 or newer. There are no dependencies to install.

```bash
npm start          # → http://localhost:8080
npm test           # unit tests: parsers, grading, SGP4/DOP, physics models
```

Opening `public/index.html` straight from disk won't work, because browsers block ES modules on `file://`. Use `npm start` or GitHub Pages instead.

Set your work location with the 📍 button (or "Use my current location") and pick a work profile. Settings are saved in your browser.

### The office app (Dropbox)

The office runs it like every other KJM app: **`Dropbox\Apps\KJM GPS Conditions\Launch KJM GPS Conditions.vbs`**. The launcher puts a desktop icon on each PC, starts a small Python server (standard library only, no installs) on `127.0.0.1:5560`, and opens the browser. When Dropbox brings a newer version, the next icon click restarts onto it.

The desktop pieces live in [`desktop/`](desktop/): `app.py` (the server: the same static files and `/api/proxy` as `server.js`, plus `/api/version` and a release seal), the launcher, its README, the icon, and `package_to_dropbox.py`, which ships this checkout to Dropbox (dry run by default, `--go` to write). See `HANDOFF.md` section 8.

```bash
python -B -m unittest discover -s desktop/tests     # desktop server + packager tests
python -B desktop/package_to_dropbox.py             # dry run: checks + plan, writes nothing
```

### Host it free on GitHub Pages

The repo includes `.github/workflows/pages.yml`. In GitHub, go to **Settings → Pages → Source: GitHub Actions**. Every push to `main` then publishes `public/`. The browser fetches NOAA, NASA and CelesTrak directly, and all three send CORS headers. If a network blocks that, run `npm start` locally: `server.js` has an allow-listed `/api/proxy` that the page falls back to automatically.

### Configuration

[`public/js/config.js`](public/js/config.js) holds every URL, the cache lifetimes, the default location, and the work profiles. NASA DONKI uses `DEMO_KEY`, which is rate-limited per IP. Get a free key at <https://api.nasa.gov> and set `nasaApiKey` if you see DONKI errors in the feed-status panel.

## Layout

```
server.js                 zero-dependency static server + allow-listed proxy
public/index.html         the dashboard
public/js/config.js       data sources, profiles, defaults
public/js/fetch.js        fetch + cache + proxy fallback
public/js/parsers.js      SWPC JSON/text, OVATION, TLE parsers
public/js/grading.js      the GPS-day grading model
public/js/gnss.js         SGP4 propagation, sats in view, DOP
public/js/geo.js          geomagnetic latitude, sun elevation
public/js/charts.js       canvas charts
public/js/sims/           magnetosphere, aurora map, CME/DBM, frame player
public/vendor/            satellite.js (MIT), Natural Earth land outline. See NOTICE.md
desktop/                  the office app: Python server, VBS launcher, icon, Dropbox packager, tests
test/                     node:test unit tests with synthetic fixtures
```
