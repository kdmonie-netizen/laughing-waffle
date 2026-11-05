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
| US Coast Guard NAVCEN: Satellite Outage File + GPS Operational Advisory | Which GPS satellites are out, and scheduled outages. Unusable satellites are left out of PDOP. The outage file is the authority (see `public/js/health.js`) | past outages → +7 days |
| European GNSS Service Centre: constellation table | Which Galileo satellites are not usable; left out of PDOP | now |
| NOAA SWPC: GloTEC (`products/glotec/`) | Measured ionosphere TEC and its anomaly at the grid cell nearest your site; CONUS anomaly animation | every 10 min |
| NOAA SWPC: WAM-IPE | Physics-model ionosphere forecast animation | about +1 day |
| NOAA SWPC: Kyoto Dst, Geospace model Kp, propagated solar wind | Storm depth now, the model's Kp for the next hour, and when the L1 wind reaches Earth | now → +1 h |
| NOAA SWPC: 3-day space weather predictions | Mid-latitude (lower 48) storm odds and K forecast | +3 days |
| NOAA NGS CORS network (ArcGIS layer behind the NGS CORS map) | Nearest operational CORS stations for OPUS / post-processing | current |
| FAA WAAS (NSTB) | WAAS vertical-navigation service map | every few minutes |
| NASA CCMC DONKI | CME catalogue + WSA-Enlil predicted Earth arrival times and Kp | next few days |
| CelesTrak | GPS, Galileo, GLONASS and BeiDou element sets → sky plot, satellites in view, PDOP/HDOP/VDOP | 72 h |
| Alerts + forecaster discussion | SWPC watches, warnings, alerts | last 48 h |

SpaceWeatherLive and Spaceweather Horizon don't publish open data feeds, so the **Sources** panel deep-links to them for cross-checking. Both are built on the same NOAA/NASA data this app reads directly. The NOAA GPS Community Dashboard, GloTEC, WAM-IPE and Geospace model pages are linked there as well, along with NAVCEN, the Galileo GSC, GLONASS IAC (its site refuses automated requests, so the app can't read it), the FAA WAAS site, the NGS CORS map and GPSJam.

The new readings (TEC, Dst, model Kp, mid-latitude odds, CORS, WAAS) are shown, not graded: there is no published threshold to turn them into points without guessing. Satellite health does change the grade, through PDOP.

## Simulations

- **Solar wind → magnetosphere (live).** Particles stream at the measured wind speed and density, coloured by Bz. Earth's magnetopause is computed with the Shue (1998) model from real-time dynamic pressure and Bz. The GNSS orbit shell and GEO ring are drawn for reference. Three modes: Live, Replay of the last 24 h, or Manual sliders for what-if storms.
- **WSA-Enlil solar wind model**: NOAA's run, including forecast frames.
- **OVATION aurora oval**: rendered as a polar map with your location, plus the 24 h animation.
- **CME arrival.** NASA's modelled Earth impacts, plus a Drag-Based Model calculator (Vršnak et al. 2013) with an animated Sun–Earth view. Click a recent CME to load it.
- **LASCO C3 coronagraph**, **GOES SUVI 304 Å**, and the **D-RAP** absorption map.

## How the grade works

**Two grades, every hour and every day (1.4.0):** one for **FDOT network RTK (FPRN)** and one for **your own base + rover** (set the baseline length and UHF or cellular with 📍; default 5 km, UHF). Both are about the GPS math only: signal delay, the corrections link and fixing. Crew safety is not graded.

**Local weather (1.4.0)** comes from the NWS forecast grid and alerts for the job site and the SPC thunderstorm outlooks. Rain and humidity on their own don't hurt RTK; uneven air does. So the grade reads thunderstorm chance and the SPC category (storm cells), fronts (fast dewpoint, pressure or wind changes) and humid air (as a multiplier). The network takes these fully, because storm cells and sea-breeze fronts are smaller than its station spacing; a short own base shares the rover's air and takes much less. A hurricane or tropical storm warning holds the network at F (cell and power outages); a base on UHF is not held down by it. The full rules are in [`docs/app-grading-rules.md`](docs/app-grading-rules.md), and the research behind them, with sources, is in [`docs/weather-and-gps.md`](docs/weather-and-gps.md).

Each hour starts at 100 and loses points for Kp, flare odds (sunlit side only), proton odds (high latitude), the post-sunset equatorial scintillation window, real-time southward Bz and fast wind, aurora overhead, and poor PDOP. Penalties scale with your **geomagnetic latitude** and your **work profile** (RTK/survey, drone, ag guidance, general nav). The day grade blends the average and the worst hour of your work hours (60/40), but if any work hour is a D or an F the day takes that grade, so a calm morning can't average away a storm afternoon.

The Kp for each hour is the worst of NOAA's 3-day forecast, the live 1-minute estimate (this hour and the next two, since L1 is about an hour upstream), NOAA's Geospace model, NOAA's lower-48 (mid-latitude) K, and any NASA-modelled CME arrival (6 hours before to 12 hours after). Some readings rule out a go outright (the grade stops at D): a survey hour at Kp 5 or more, Dst at or below −100 nT, a TEC anomaly above 10 at the site, or a hole in the Kp forecast during work hours. The grade card says which one did it, and warns when the NASA CME check didn't load.

| A | B | C | D | F |
|---|---|---|---|---|
| ≥ 90 Excellent: go | ≥ 80 Good: go | ≥ 70 Fair: extra checks | ≥ 55 Poor: expect float | No-go for precision work |

Days 1–3 get a letter from NOAA's full 3-day forecast (high confidence). Days 4–45 get a **trend word** instead (quiet, unsettled, active, storm possible) with the Kp and a confidence: the 27-day outlook (medium) repeats what the Sun did one rotation ago, and the 45-day Ap forecast (low) is coarser still. NASA-modelled CME arrivals raise the affected day. Book crews from the 3-day grade.

The app opens on **Pensacola, FL**; change the site with the 📍 button. A failed NOAA feed may be stood in for by a saved copy only while it is young (an hour for live feeds, up to a day for slow ones), and the red banner names any feed shown from a saved copy. All thresholds are lookup tables in [`public/js/grading.js`](public/js/grading.js), so they're easy to tune. The page has a full "How it's graded" table.

> This is a planning aid. Always confirm with your receiver's own fix status, residuals and check shots.

## Weather & RTK learning area and crew quizzes

A **Weather & RTK** section explains, at field-crew level, how weather and space weather reach a fix on the FDOT network and on an own base, with a side-by-side table, numbers worth remembering and common myths. It ends with **10 crew quizzes of 10 questions** (`public/js/quizzes.js`; also printable from [`docs/field-quizzes.md`](docs/field-quizzes.md)). Every question was written from the fact-checked knowledge base and checked by two independent reviewers.

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
