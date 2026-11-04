# Handoff: GPS Conditions dashboard → finish Learn mode

**Repo:** `kdmonie-netizen/laughing-waffle`
**Branch:** `claude/gps-conditions-dashboard-c7d20v` (keep working here and push here)
**Status:** the dashboard is done and pushed. Learn mode is about half done: the text is written and tested, but none of it shows on the page yet.

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
public/js/config.js          every URL, cache times, default location (Denver), work profiles
public/js/fetch.js           fetch + cache + proxy fallback
public/js/parsers.js         SWPC JSON (both shapes) and text-product parsers
public/js/grading.js         the grading model (hours → days → 27/45-day outlook)
public/js/gnss.js            SGP4 satellites in view + DOP
public/js/geo.js             magnetic latitude, sun elevation
public/js/charts.js          canvas charts
public/js/sims/*.js          magnetosphere sim, aurora map, CME/DBM, frame player
public/js/explain.js         ← NEW: all Learn-mode text (not yet used by the page)
test/core.test.js            25 tests: parsers, grading, SGP4/DOP, physics
test/explain.test.js         ← NEW: 7 tests, including a reading-level check
test/helpers.js              synthetic SWPC/TLE data builders (tests only)
test/e2e/smoke.mjs           browser smoke test with synthetic data + screenshots
```

`npm test` runs both test files. **32 tests pass** as of the last commit.

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

### Still to do

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
npm test                                    # 32 unit tests
PORT=8099 node server.js &                  # serve the app
node test/e2e/smoke.mjs storm               # synthetic storm day → expect today = F
node test/e2e/smoke.mjs quiet               # synthetic quiet day → expect today = A
```

The smoke test intercepts every external request and serves synthetic data in the real SWPC/CelesTrak/DONKI formats from `test/helpers.js`. It prints the grades, any console errors, and the phone-width horizontal overflow (should be 0). It writes `shot-*.png` screenshots to the current directory, so run it from a scratch folder or delete the screenshots afterward. Don't commit them. Add steps there to toggle Learn mode, open a glossary word, and answer a quiz question.

## 7. Known caveats to keep telling the owner

- The app has **never been run against live NOAA data**, because the hosts are blocked in the cloud container. The parsers follow SWPC's documented formats and accept both of its JSON shapes. The first real run should be checked using the "Feed status" chips at the bottom of the page.
- SpaceWeatherLive and Spaceweather Horizon have no open data feeds, so they're cross-check links, not data sources.
- To publish the site: merge to `main`, then go to GitHub → Settings → Pages → Source: GitHub Actions (`.github/workflows/pages.yml` is already there).
