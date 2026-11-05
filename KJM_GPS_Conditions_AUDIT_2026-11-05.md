# KJM GPS Conditions AUDIT 2026-11-05

Audit of version 1.2.0, the dev copy that was packed into this tree. No program behavior was changed. The only additions are this file and `audit_tests/`.

The grade is a planning aid for RTK crews. A false “go” is treated as worse than a false “bad day,” because a wrong good day can send a crew out when the ionosphere or the geometry is poor.

## Instructions for Claude Code

Daniel approves a finding by writing **Yes** in the Approved column of the fix log at the bottom. Fix only those rows.

- Work in `C:\Users\kdmon\OneDrive\Desktop\New Apps\gps-conditions-dashboard`.
- Do not edit the live Dropbox copy at `C:\Users\kdmon\Dropbox\Apps\KJM GPS Conditions`.
- Leave `audit_tests/` in the repo. After a fix, re-run the matching test. Grading tests need Central time: `TZ=America/Chicago node --test audit_tests/*.test.js` (on Windows, set the time zone or run them on a PC already set to Central).
- A passing `npm test` is not enough. Several of those tests lock an all-day storm and stay green while the bugs below are still there.
- When the approved fixes are in and the audit tests for those IDs pass, bump `version` in `package.json` and `APP_VERSION` in `desktop/app.py` as the last edit. Daniel ships with `python -B desktop/package_to_dropbox.py` (dry run, then `--go`).
- Fill in Fixed by, Date, and Notes on the rows you change.
- The Suggestions section is not a bug list. Do not implement it unless Daniel asks.

## Top 5

1. A single 3-hour G2 (Kp 6) in the middle of a Pensacola workday still grades the **day** a **C, “Fair: go.”** The other hours are quiet, and the “best window” is scored 100.
2. A storm that has already started is applied only to the current hour. Southward Bz of −20 nT and a 750 km/s wind still leave **today a B, “Good: go,”** and the next hours an A.
3. A NASA CME the app has already downloaded does not change today’s letter. A direct hit with modelled Kp 8 on a quiet forecast leaves **today an A**.
4. Days 4 through 45 wear the same A–F “Excellent: go” words as a real 3-day forecast. Those products are a 27-day recurrence and a 45-day Ap outlook.
5. The app opens graded for **Denver, Colorado**, and the letter does not have to agree with the lower-48 K, the TEC anomaly, or Dst sitting on the same screen.

## Report card

| Area | Grade | Why |
|---|---|---|
| Grading model | D | NOAA’s G, R, and S edges are right, and an all-day Kp 6 or higher is an F for Pensacola RTK. A storm that fills only one Kp block, or that has just started, can still say go. |
| Time handling | B | For a 6 am–6 pm day in Pensacola, work hours stay on the same UTC date, winter and summer. A late summer evening can pick up the next UTC day’s flare odds. Daylight-saving time does not move the 6 am–6 pm score. |
| GNSS math | B | The vendored SGP4 matches a standard test vector. PDOP/HDOP/VDOP/GDOP match the usual least-squares formulas. GLONASS and BeiDou are never checked for health, and open-sky PDOP almost never moves the letter. |
| Location and magnetic latitude | C | The dipole formula and the 2025 pole are right. Pensacola is about 39° magnetic, not in the equatorial-bubble zone. The default city is still Denver. |
| Parsers and units | B | The saved 4 Nov 2026 NOAA samples parse, and the scale helpers match the published G/R/S cuts. A feed that fails or comes back stale can still look like a quiet day. |
| Fetch and cache | C | A failed refresh can reuse a cached body of any age and the page still says it updated. The red banner does not mention a stale Kp nowcast. |
| Forecast versus now | D | The 3-day letter ignores a CME arrival and the geospace “next hour” Kp. The 27-day and 45-day letters look like the same kind of go/no-go. |
| Learn mode | C | Most of the kid text tracks the science. A few lines state a Kp, a latitude band, or a “good for GPS” that the grade does not support. |
| Desktop wrapper | B | The office server binds 127.0.0.1:5560, the proxy allow-list holds, and the path checks in the Python tests passed. The dev launcher and the live launcher differ only by Windows line endings, and the packager already writes CRLF on ship. |
| Will the grade tell the truth for an RTK crew in the Florida panhandle? | D | An all-day strong storm comes out no-go, which is the right call. The days that actually happen — a few bad hours, a storm just starting, a CME on the way, or the laptop still set to Denver — can still say go. |

## What checked out

These were measured, not assumed.

- **NOAA scales.** G1 is Kp 5, G2 is Kp 6, G3 is Kp 7, G4 is Kp 8, G5 is Kp 9 (`gScaleFromKp` in `public/js/parsers.js`). R1 is M1 (1e−5 W/m²), R2 is M5, R3 is X1, R4 is X10, R5 is X20. S1 is 10 pfu of ≥10 MeV protons, then 100, 1,000, 10,000, 100,000. The code matches those cuts. Kp 4.67 (Kp 5−) stays below G1, which is also right.
- **`interp`.** Below the first knot and above the last knot, the penalty stays on the end value. It does not run away. Kp 12 stays at the Kp 9 penalty. That is the right behavior for these tables (`public/js/grading.js` lines 23–32). The existing unit test covers it.
- **All-day storms at Pensacola, RTK profile.** With no flare odds added: Kp 4 is a B (88), Kp 5 is a C (70), Kp 6 is an F (50), Kp 7 and above are F. An all-day G2 is already a no-go. The hole is a storm that does not fill the whole workday.
- **SGP4.** `public/vendor/satellite.es.js` is satellite.js 5.0.0. Calling `sgp4` at 0 and 360 minutes on Vallado’s standard object 00005 matched the Python `sgp4` library (the same Vallado model) within a millimeter. A GPS-like element set propagates near 20,050 km altitude. The sky plot is using a real SGP4, not a sketch.
- **DOP.** For a known four-satellite sky, `dop()` matched an independent East-North-Up calculation on PDOP, HDOP, VDOP, and GDOP. Flipping the sign of the line-of-sight row does not change those four numbers. Fewer than four satellites returns infinity. The mask default is 10°, which matches `config.js`.
- **Magnetic latitude.** The centered-dipole formula is the standard one. The pole in `public/js/geo.js` is 80.8°N, 72.8°W. IGRF-14 at epoch 2025.0 puts the north geomagnetic pole at 80.85°N, 72.76°W. That is about a twentieth of a degree. Pensacola (30.42°N, 87.22°W) comes out **39.3°** magnetic, latitude factor **0.79**. Denver is **47.3°**, factor **0.95**. Miami is **34.9°**. All three are above the code’s 25° equatorial-scintillation cutoff, so the post-sunset bubble penalty correctly does not fire on the panhandle. Proton storms are scaled by 0.2 this far from the pole, so an S5 barely moves a Florida grade. That is the safe small hit, not a false go.
- **Solar-wind parsing.** The 4 Nov 2026 `rtsw` samples keep the spacecraft NOAA marked active. Bz is read from the GSM component, in nT. Speed is km/s. The two spacecraft in the same minute really do disagree (about −0.9 nT versus −2.4 nT); mixing them would be wrong, and the parser does not mix them when the active flag is a real boolean.
- **Pensacola clock, default work hours.** 6 am–6 pm Central, both CST and CDT, stays on one UTC date. Kp slots are matched in absolute time, so a 3-hour bin is not assigned to the wrong local hour. On the 8 Mar 2026 spring-forward morning the 2 am hour is skipped, and on the 1 Nov 2026 fall-back morning 1 am appears twice. Both of those are outside 6 am–6 pm, and the work-day score does not shift.
- **Launcher bytes.** `desktop/Launch KJM GPS Conditions.vbs` is LF. `_live_dropbox/Launch KJM GPS Conditions.vbs` is CRLF (192 lines). After stripping carriage returns the files are the same. `desktop/package_to_dropbox.py` already rewrites `.vbs` to CRLF on ship (lines 55 and 91–92). The hash difference is the line endings `fc.exe` was not showing. Nothing in the launcher logic has drifted.
- **Office server.** `desktop/app.py` binds 127.0.0.1 only, refuses a second bind on the port, and the proxy tests refuse other hosts, http, userinfo, and non-443 ports. The static-file escape tests passed.

## Findings

### Critical

#### GPS-C1 — A few bad hours still get a “go” for the day

**Where:** `public/js/grading.js` lines 191–193 (the 60/40 blend) and lines 272–298 (`bestWindow`). The method page tells the reader this blend is enough: `public/index.html` line 463.

**Evidence:** `audit_tests/grading.test.js`, test `GPS-C1`. Fails today. Pensacola, RTK profile, 6 am–6 pm, no flare odds. One SWPC slot at Kp 6 (noon–3 pm Central) and Kp 2 the rest of the day:

- Those three hours score about 50, which is an **F**.
- The day scores **73, grade C, “Fair: go, with extra checks.”**
- The same shape at Kp 7 (G3) scores **62, grade D**, “Poor: expect float,” and the best window is still marked good with score **100**.
- The same shape at Kp 8 (G4) does pull the day to **F (54)**, and the best window is still marked good with score **100** for the quiet morning.

NOAA calls Kp 6 a G2 moderate storm and Kp 7 a G3 strong storm. One Kp block is 3 hours, which is the normal length of a “Kp 6” forecast slot. The blend is 60% average and 40% worst hour, so nine quiet work hours can outvote three storm hours.

`bestWindow` only keeps hours at 80 or above. It does not recommend the storm hour itself. It recommends the quiet hours as a “Best window” with a perfect score, including on a day whose letter is F. The headline and that line can be read as “go, and the good hours are perfect.”

**Plain version:** The big letter is an average. A rough afternoon gets watered down by a calm morning, and the page still points at a “best” stretch scored like a perfect day. A crew that trusts the letter can roll out into a G2.

**Fix:** Make the day letter follow the worst work hour whenever that hour is a D or an F. Keep the 60/40 number on the card as a second figure if you want it, but do not let it say go while any work hour is a no-go. If any work hour is below 80, `bestWindow` should not set `good: true`. Re-run the `GPS-C1` test. Then add the same 3-hour case to `test/core.test.js` so the old “all-day Kp 7 is an F” test is not the only storm check.

#### GPS-C2 — A storm that has started only marks the current hour

**Where:** `public/js/grading.js` lines 148–172 and 242–257. The live Bz, wind, aurora, in-progress flare, and in-progress Kp are added only when `isNow` is true. The method table even says “current hour only” (`public/index.html` around the Bz row). The arrival time the app already computed is display-only: `public/js/app.js` lines 509–514 and `extraNow()` at lines 379–393.

**Evidence:** `audit_tests/grading.test.js`, test `GPS-C2`. Fails today. Quiet Kp forecast (Kp 2), Pensacola RTK:

- Bz −20 nT and solar wind 750 km/s: the current hour is a D, the **day is a B (84), “Good: go,”** and the next three hours are A.
- Estimated Kp already 8 (G4) while the 3-hour forecast still says 2: the current hour is an **F (16)**, the **day is a D (62)**, and the following work hours stay A.

Bz and speed also flatten out at the end of the table: anything at or below −30 nT scores the same 30 points, and wind at or above 1000 km/s scores the same 15 (`TABLES` lines 38–39). An extreme magnetic cloud does not look worse than a merely strong one, and neither one touches the next hour.

L1 is about an hour upstream. The page already says when that wind reaches Earth. The grade charges the hour you are standing in, and leaves the hour the storm arrives as an A.

**Plain version:** The app can see a storm starting and still tell you the rest of the day is excellent. The big letter can say “good, go” while the magnetometer is strongly south.

**Fix:** Take the worse of the forecast Kp and the live Kp, and apply that floor to the current hour and the next two hours (the travel time from L1, plus a little slack). Do the same with a strongly southward Bz (at least Bz below −10). If the propagated-solar-wind row or the geospace model Kp is fresher and worse, use that number on the hour it belongs to. Re-run `GPS-C2`.

#### GPS-C3 — A CME inside the next three days does not change the letter

**Where:** `public/js/grading.js` lines 211–229. CME Kp is applied only inside `pushExtended`, which returns immediately for any day already covered by the 72-hour grade. The day card still prints the arrival as a footnote (`public/js/app.js` lines 446–452) and the CME panel lists modelled Kp (`app.js` lines 847–856).

**Evidence:** `audit_tests/grading.test.js`, test `GPS-C3`. Fails today. Quiet forecast, a direct Earth hit today at 1 pm Central with modelled Kp 6 and 8. **Today stays an A (100).**

**Plain version:** The app can know a cloud is due this afternoon and still give the day an A. The arrival is a line of small text under the letter. The letter is what a crew will remember.

**Fix:** Before the day score is blended, if a CME arrival falls on that local day, raise the Kp of the hours around the arrival to the model’s highest Kp (see GPS-M1 before capping a glancing blow). A day with a modelled Kp 7 or 8 arrival should not be A, B, or C. Re-run `GPS-C3`.

### High

#### GPS-H1 — An all-day minor storm (Kp 5) is a “go” for survey work

**Where:** `public/js/grading.js` lines 35 and 43–48, profile factor 1.25 in `public/js/config.js` lines 181–183, latitude factor about 0.79 for Pensacola.

**Evidence:** `audit_tests/grading.test.js`, test `GPS-H1`. Fails today. All-day Kp 5, no flare odds, Pensacola RTK: penalty is 30 × 0.793 × 1.25 ≈ 30 points, **score 70, grade C, “Fair: go, with extra checks.”** Score 70 is the first “go” letter. One point lower would be a D.

This is a tuning call, and you may have wanted C here. NOAA’s G1 is a minor storm, not a shutdown order. For centimeter RTK I would not call that day a go. Long baselines and network RTK feel Kp 5. A short dual-frequency base often does not. The letter cannot tell those jobs apart, and it currently says go for both.

**Plain version:** A whole day at Kp 5, which is the start of NOAA’s storm scale, still says “fair, go” for the survey profile in Pensacola. It is sitting right on the line.

**Fix, if you want it:** For the RTK / Survey profile only, a work hour at Kp 5 or above should be a D or worse. The smallest change that does it is to raise the Kp 5 knot in `TABLES.kp` until a Pensacola survey hour scores under 70 (a raw penalty around 40 does that). Re-run `GPS-H1`. Leave the drone and navigation profiles alone unless you want them moved too.

#### GPS-H2 — The 27-day and 45-day outlooks use the same go letter as tomorrow

**Where:** `public/js/grading.js` lines 211–235. `public/js/app.js` lines 464–477 shows the letter the same way as a near day. Only the 45-day rows get a “low” style. The 27-day rows are tagged Medium and look like the 3-day grade. The Learn blurb for the outlook (`public/js/explain.js`, `SECTIONS.outlook`) does say far days are best guesses. The letter still says “Excellent: go.”

**Evidence:** `audit_tests/grading.test.js`, test `GPS-H2`. Fails today. A quiet 27-day row gets verdict **“Excellent: go.”**

NOAA’s 27-day outlook is a recurrence product: active regions come around again as the Sun turns. It is not a daily forecast, and it cannot see a CME that has not left the Sun yet. The 45-day product is a daily Ap, which is coarser still. The code labels confidence Medium and Low, then prints the same A–F words as today.

**Plain version:** A green A three weeks out reads like permission to book a job. It is a guess that the Sun will look like it did last rotation.

**Fix:** Keep the Kp and Ap numbers. Stop using A–F and the words “go” / “Excellent” past day 3. “Quiet trend,” “active,” and “storm possible,” with Medium or Low written on the card, is enough. Re-run `GPS-H2`.

#### GPS-H3 — The letter ignores the lower-48 K, the TEC, and Dst

**Where:** `gradeConditions` never reads the 3-day mid-latitude product, GloTEC, or Kyoto Dst. Those are rendered in `public/js/app.js` (`renderMidLat` line 926 says they are “shown for reference”; `extraNow()` lines 379–393 is commented “not part of the grade”). The README says the same thing, on purpose: there was no published point table, so they were left out.

**Evidence:** `audit_tests/grading.test.js`, test `GPS-H3`. Fails today. Planetary Kp 2 with a mid-latitude K of 5 still grades **A**. The 4 Nov 2026 fixture `test/fixtures/3-day-solar-geomag-predictions.txt` really does contain a mid-latitude K of 5 (7 Nov, 00–03 UT). That particular slot is evening in Pensacola, outside 6 am–6 pm, so that one file would not have changed a default work day. The code path is still a false go on any day the lower-48 K is the worse number during work hours.

The tile colors are already honest: TEC anomaly above 10 is drawn as bad, Dst at or below −100 is drawn as bad (`app.js` lines 358–359). The big letter does not have to agree.

Mid-latitude K is the same kind of number as the Kp the grade already uses. It is the product NOAA publishes for the lower 48. Leaving it off the letter is the part I would fix first. TEC and Dst do not have a published “points off a grade” table, so I would not invent one. I would only stop a “go” when they are clearly stormy.

**Plain version:** The page can show a lower-48 storm, a big TEC jump, or a deep Dst, and the letter can still say go. A crew will believe the letter.

**Fix:** Pass the day’s highest mid-latitude K into the grade and let it raise Kp when it is worse. If Dst is −100 nT or lower, or the on-site TEC anomaly is above 10 (the same cut the tile already uses), do not allow A, B, or C. Say on the card which reading did it. Re-run `GPS-H3`.

#### GPS-H4 — The app wakes up in Denver

**Where:** `public/js/config.js` lines 168–171. The chip shows that label (`public/js/app.js` line 1134), so it is not hidden. Nothing blocks a grade until the city is changed.

**Evidence:** `audit_tests/feeds-and-defaults.test.js`, test `GPS-H4`. Fails today. Default is lat 39.74, lon −104.99, “Denver, CO.”

Denver’s magnetic latitude is 47.3° versus Pensacola’s 39.3°, so the same Kp costs about 19% more points in Denver. On storms, the default is a bit harsher, which is the safer direction. The sky plot, the aurora lookup, and the nearest CORS list are still Colorado’s. A Pensacola crew that does not notice the chip can plan OPUS around the wrong stations and trust a sky that is not theirs.

**Plain version:** First open, the grade and the station list are for Denver. The button does say Denver. It is easy to miss on the way out the door.

**Fix:** Prefer no grade until a site is saved. `DEFAULT_SETTINGS.lat` can be null, and the card can say “Set the job site.” A Pensacola default is the other option if you would rather have a number on first open. Re-run `GPS-H4`. Saved browser settings already override the default, so this only changes a PC that has never picked a city.

#### GPS-H5 — A dead feed can come back as a successful update

**Where:** `public/js/fetch.js` lines 109–112. On a network or HTTP failure, any cached body is returned, with no age limit. The 404 path is not retried, then it falls through to that same stale return. `proxyFirst` loads (NAVCEN, Galileo) do stop after a day (lines 80–83). The normal NOAA path does not. Auto-refresh is every 5 minutes (`app.js` line 1209). The “Updated” line is printed whenever refresh finishes, including when the body was old cache.

The red banner (`app.js` lines 283–294) lists stale wind, Bz, X-ray, and protons. It does not list `ages.kp`, which is computed and then dropped. A silent 1-minute Kp feed leaves the day letter on the 3-hour forecast with no banner.

**Evidence:** `audit_tests/feeds-and-defaults.test.js`, test `GPS-H5`. Fails today. A body cached, then a 404 two days later, is handed back as success instead of an error.

**Plain version:** If NOAA blips, the page can keep yesterday’s forecast, say it just updated, and still show a go. “No new data” and “quiet Sun” are not the same thing. The code already says that for a 90-minute-old wind reading. The Kp forecast and the Kp-now tile do not get the same treatment.

**Fix:** If the cache entry is older than a day (or older than a few multiples of its normal lifetime), throw, and let the grade say the feed is missing. Add the Kp nowcast age to the same red banner as the wind. Re-run `GPS-H5`.

#### GPS-H6 — When NASA rate-limits the demo key, the grade does not say the CME check failed

**Where:** `public/js/config.js` line 71 (`nasaApiKey: 'DEMO_KEY'`). A 429 becomes `state.errors.donkiEnlil`. The only sentence is in the CME panel (`public/js/app.js` line 856): “NASA DONKI unavailable (DEMO_KEY may be rate-limited).” `renderErrors` (lines 272–278) only treats Kp forecast, scales, plasma, and mag as core. DONKI is not in that list. HANDOFF already notes the shared demo key returns 429.

**Evidence:** `audit_tests/grading.test.js`, test `GPS-H6`. Fails today. A grade run with `cmeCheck: 'unavailable'` still returns a clean A and no warning text.

This stacks on GPS-C3. Even a successful download does not move today’s letter. A failed download is quieter still: the letter looks finished.

**Plain version:** If the CME list does not load, the day can look like a normal quiet A. The warning is down in the CME section, not on the grade.

**Fix:** When the DONKI load fails, put one line on the grade card: “CME check did not load. This letter does not include a possible eruption.” A free key from api.nasa.gov in `nasaApiKey` is still worth doing; that part is yours to sign up for. Re-run `GPS-H6`.

### Medium

#### GPS-M1 — A glancing CME is capped at Kp 5 even when the model says higher

**Where:** `public/js/grading.js` line 222. `public/js/sims/cme.js` lines 44–45 stores `isEarthGB` or the impact’s glancing flag, and keeps kp_18, kp_90, kp_135, and kp_180. The grade then does `Math.min(k, 5)` for a glancing blow. I could not find a public sentence that defines those four Kp fields as a simple low-to-high pair. Taking the maximum is the safer reading if they are a range. The cap throws that maximum away.

**Evidence:** `audit_tests/grading.test.js`, test `GPS-M1`. Fails today. Ten days out, modelled Kp up to 8, glancing flag set: the outlook day is **Kp 5, grade C**.

**Plain version:** The model can say Kp 8 and the card can say Kp 5, because the hit is labelled a glance. A glance can still be a real storm. Capping it at a minor storm is a second guess on top of the model.

**Fix:** Use the model’s highest Kp for a glancing blow too, and keep the word “glancing” on the card. Re-run `GPS-M1`.

#### GPS-M2 — A few Learn-mode lines do not match the grade

**Where:** `public/js/explain.js`.

**Evidence:** `audit_tests/explain.test.js`. Three tests, all failing.

- `factorKid` rounds the Kp with `toFixed(0)`. Kp **4.67** is not a storm (G1 starts at 5) and the sentence stays in the “a little shaky” branch, but the number printed is **“Kp 5.”** Kp 6.6 is read out as **“Kp 7”** while the words stay in the smaller-storm branch (lines 120–125).
- `statKid('mlat', 39.3)` says “far from the magnetic pole” and “watch for evening twinkle.” Pensacola is 39.3°. `latitudeBand()` calls that mid-latitude. The scintillation penalty only runs below 25° (`grading.js` lines 163–165). The kid line describes a penalty the grade does not apply.
- `statKid('aurora', 0)` says **“Good for GPS.”** Aurora at 0% is normal in Florida during storms that still hurt RTK. The tile is only about aurora.

Two more lines, same family, no separate test: `GRADE_KID` for C says “You can still go out,” and for D says “You can work.” Together with GPS-C1, a G2 afternoon can be described as a day you can still go out. The method paragraph (`index.html` line 463) says the 60/40 blend means “one bad afternoon still shows.” It shows as a muted “Worst:” line. The letter can stay a go.

**Plain version:** Learn mode is careful in most places. These sentences tell a stronger or different story than the math: a Kp that rounds up to a storm, evening twinkle as the Florida problem, and “good for GPS” when the northern lights are simply somewhere else.

**Fix:** Print Kp to one decimal, or to the nearest third, and pick the sentence from that same number. For magnetic latitude between 25° and 55°, say it is mid-latitude and that big storms still reach it. Change the zero-aurora line to “No aurora over you.” Leave out “Good for GPS.” After GPS-C1 is fixed, align the C and D kid sentences with the verdicts. Re-run `audit_tests/explain.test.js`. The reading-level test in `npm test` still has to pass; keep the new sentences short.

#### GPS-M3 — A late sunlit hour can use the next UTC day’s flare odds

**Where:** `public/js/grading.js` line 155, `scaleByDate.get(dayKeyUTC(mid))`. Flare and proton probabilities are daily products stamped in UTC. The hour is filed on the local calendar.

**Evidence:** `audit_tests/grading.test.js`, test `GPS-M3`. Fails today. 15 Jul 2026, work day extended to 9 pm, today’s major-flare odds 90% and tomorrow’s 0%. The 7 pm Central hour is still in daylight (sun about 4° up at 7:30 pm) and is 00:00 UTC the next day. **That hour gets no flare penalty.**

Default 6 am–6 pm in Pensacola does not hit this, winter or summer. The last included hour stays on today’s UTC date. It shows up when the crew works late in summer (past about 7 pm CDT) or past about 6 pm CST. Denver in winter hits it earlier, including the default 5 pm hour, because Mountain time is one hour further from UTC. The default city is Denver (GPS-H4), so the default install is the one that crosses first.

**Plain version:** Flare odds are filed by the UTC date. A long summer evening in Florida is still “today” on the crew’s clock and already “tomorrow” on NOAA’s date. The flare risk can vanish for that hour while the Sun is still up.

**Fix:** For each hour, look up the flare and proton odds for both the local date and the UTC date, and use the worse one. Re-run `GPS-M3`.

#### GPS-M4 — A hole in the Kp forecast is skipped, and the day can still be an A

**Where:** `public/js/grading.js` lines 145–146. If an hour has no 3-hour slot, the hour is dropped. The day average uses whatever hours remain.

**Evidence:** `audit_tests/grading.test.js`, test `GPS-M4`. Fails today. The noon–3 pm slot removed, every other slot Kp 2. The day is an **A (100)** with noon missing from the strip.

If the hole is a slot that failed to parse, the missing hours are exactly the ones you do not want to assume were quiet.

**Plain version:** A gap in the forecast is treated as “those hours don’t count,” not as “we don’t know.” The day can still look perfect.

**Fix:** If any hour between work start and work end has no Kp, set a flag on the day and do not give it A, B, or C. The card should say the forecast has a hole. Re-run `GPS-M4`.

#### GPS-M5 — GLONASS and BeiDou are always counted as healthy

**Where:** `public/js/health.js` lines 202–211. GPS is filtered from NAVCEN, Galileo from the GSC table. Anything else, including GLONASS and BeiDou, returns usable. HANDOFF is right that the GLONASS site blocks scripts and that working around that block is a bad idea. BeiDou has no feed in this app. The fail-open choice is deliberate for GPS when the name does not match, because dropping a healthy satellite makes PDOP look worse.

**Evidence:** `audit_tests/gnss-health.test.js`, test `GPS-M5`. Fails today. `buildHealth({})` records GPS and Galileo as known or not, and the notes list is empty. Nothing says the other two constellations were not checked.

On an open Florida sky the PDOP is already low (about 1.6 at a 10° mask in the synthetic constellation, about 2.7 at 15°). That is under the penalty table’s first real step, so the letter does not move. The sky plot can still show a satellite the rover should have rejected. The single-clock DOP comment in `public/js/gnss.js` lines 75–77 is also fair: mixing four constellations with one clock is a little optimistic. With dozens of satellites the number stays in the “great” range either way.

**Plain version:** Broken GPS and Galileo satellites are left out. Broken GLONASS and BeiDou satellites are not, because the app cannot read those health lists. The page does not say that. In open sky the letter will not change anyway. Under trees, or on a rover that is not using all four systems, the PDOP on screen is kinder than the job.

**Fix:** Do not try to scrape the GLONASS site. Add a standing note on the satellite card: “GLONASS and BeiDou health was not checked. Every one of those satellites is counted.” Re-run `GPS-M5`. A mask and a “canopy is not in this grade” line belong in Suggestions.

#### GPS-M6 — The unit tests never ask what a short storm does to the day

**Where:** `test/core.test.js`, the test named “Kp 7 storm grades F for survey work.” It sets every slot to Kp 7. That case really is an F, and the test should stay. The test “real-time southward Bz and aurora overhead hit the current hour only” locks in GPS-C2 as intended behavior.

**Evidence:** `npm test` is 57 passed, 0 failed, including that Kp 7 test. `audit_tests/grading.test.js` `GPS-C1` fails on the same codebase.

**Plain version:** The green test run proves an all-day storm is an F. It does not prove a three-hour storm is handled. That is why the suite can be green and the day letter can still say go.

**Fix:** After GPS-C1 and GPS-C2 are fixed, change the Bz test so a storm onset is required to mark the following hours, and add the 3-hour Kp 6 case next to the all-day Kp 7 case. Keep `audit_tests/` as well.

### Low

#### GPS-L1 — The Ap-to-Kp table does not use the published anchors at Kp 7 and Kp 8

**Where:** `public/js/parsers.js` lines 255–268. The knots are Kp 7 = Ap 140 and Kp 8 = Ap 240. The published Bartels pairs are Kp 7 = Ap 132 and Kp 8 = Ap 207 (Kp 0–6 in the same table do match: 0, 4, 7, 15, 27, 48, 80). The function then adds about one Kp step as a “peak” bump and rounds to thirds. That bump is intentional. The anchors under it are not the published ones.

**Evidence:** `audit_tests/feeds-and-defaults.test.js`, test `GPS-L1`. Fails today. Ap 207, which is the published partner of Kp 8, comes out **8.67**. With the published anchor and the same +1 bump it would be **9**. Ap 132 comes out 8 either way, so the quiet and moderate 45-day values (the saved file tops out at Ap 30) do not move. This only shows up on a stormy outlook day, and it is a third of a Kp, not a today’s-letter bug.

**Plain version:** The 45-day “peak Kp” is close, and it tends to run a little hot, which is the safer direction. At the top of the scale the conversion table is off the published pairs.

**Fix:** Change the two knots to 132 and 207. Keep the +1 peak bump unless you decide the outlook should show the daily-average Kp instead. Re-run `GPS-L1`.

#### GPS-L2 — `server.js` is looser than the office proxy

**Where:** `server.js` lines 20–28 and 53. The host must be on the list and the scheme must be https. The port and the username are not checked. `desktop/app.py` lines 238–247 rejects userinfo and any port other than 443. The Python tests cover those cases and passed. Redirects are refused in `server.js` (`redirect: 'error'`) and only followed to another allow-listed https URL in Python.

**Plain version:** The office app is the tight one. `npm start` will proxy any port on an allow-listed host. That is a smaller hole than an open proxy, and it is not the grade. Worth making the two lists behave the same way.

**Fix:** In `server.js` `proxy()`, reject URLs with a username, a password, or a port other than 443, the same way `check_proxy_target` does. The path check on Windows is a `startsWith` on the folder (`server.js` lines 79–82). I could not get a request past the URL parser onto a file outside `public`. The Python tests already cover the office server.

#### GPS-L3 — One desktop test depends on how long the PC has been awake

**Where:** `desktop/tests/test_app.py` lines 261–278, and the watch in `desktop/app.py` lines 150–162. The seal itself caps each gap between checks at 15 seconds and opens the page after 10 minutes of watched time. That part matches the comments.

**Evidence:** `python -B -m unittest discover -s desktop/tests` — **23 tests, 22 passed, 1 failed:** `test_hand_edit_after_release_does_not_lock_the_page_for_ever`. Running that test again by itself, after the machine’s monotonic clock had passed 1000 seconds, **passed**. The fake clock starts at 1000. The first real check, outside the fake clock, already starts the watch. If the computer has been awake less than about 1000 seconds, the jump onto the fake clock adds one extra 15-second step, and the test thinks the page opened too soon. The page-lock rule is not what failed.

The launcher (`desktop/Launch KJM GPS Conditions.vbs` lines 161–162) force-kills whatever is LISTENING on port 5560, using the fifth netstat column. The trailing space so `:5560` does not match `:55600` is in place. Anything else bound to that port gets killed. The port is reserved for this app, so that is what you wanted. It is still “kill by port,” not “kill the Python we started.”

**Plain version:** The desktop suite can show a red test on a PC that just booted, then go green later, without the seal code changing. The launcher’s kill command is aimed at the port, with a guard against matching 55600.

**Fix:** In that one test, start the fake clock well above the real monotonic clock, or reset the watch when the fake clock starts. No change to the seal. Matching the listener’s image name before `taskkill` is optional.

## Suggestions

These are product ideas from RTK field work. They are not the bug list above. Leave them until you ask for one.

1. Ask for the job site before showing a letter, and keep a short list: the Pensacola office, and the site you are driving to today. The CORS list and the sky should be that site, not the last city someone saved.
2. One line before anyone leaves the office: if any work hour is a D or an F, or Kp is 5 or higher, say so in a banner the size of the grade. “Do not roll the trucks” is more useful than a C buried in a blend.
3. A one-page go-sheet to print or drop in a text: date, site, letter, the work-hour letters, Kp, Bz, TEC anomaly, the two nearest CORS stations, and a footer that says the rover’s fix and the check shots win over this page.
4. A small box for how the rover actually behaved yesterday (fixed all day, float after lunch, never fixed). Put it next to yesterday’s letter. After a few dozen jobs you will know whether a C is really a go for your baselines.
5. Ask the baseline, or at least offer “short base, dual frequency” and “long base or network RTK.” Dual frequency on a few-mile base takes out most of the steady ionosphere. It does not take out scintillation, and it does not save a 30-mile shot when the ionosphere is tilted. One survey factor for every job hides that.
6. Say on the grade that trees, buildings, and a 15° mask in the rover are not in the letter. The 10° mask makes PDOP look a little kinder and keeps low satellites that RTK often does not want. Open-sky PDOP in Florida is usually too good to change the grade either way.
7. Florida afternoons carry more ionosphere than the early morning inside the same 3-hour Kp. When you show two hours with the same Kp, say they are not equal. Do not tell a crew to “wait until evening” unless that hour’s Kp is actually lower. Evening is also when a long summer day starts to cross UTC midnight (GPS-M3).
8. Make the worst work hour as large as the day letter. The muted “Worst:” line under the best window is easy to miss from across the room.
9. The magnetic-field chart already prints when the L1 wind reaches Earth. Put that clock time on the hour strip, on the hour it will hit, not only as a caption.
10. Draw days 4–45 as a trend (quiet, active, stormy) with the Kp number, not as an A–F go letter. Book the crew from the 3-day grade.
11. If the CME list fails to load, say “CME check missing” on the grade card. A free NASA key is still worth getting so the 429s stop.
12. The WAAS map can look fine on a day that is poor for RTK. The page already says RTK does not use WAAS. Keep that sentence next to the map so a good blue picture is not read as a go.
13. After a storm, Dst can stay low into the next morning while Kp has already fallen. A “go” the morning after a Kp 7 day should mention that the recovery is still on the Dst tile.
14. A 6 am message with the letter and the one main reason would catch the decision before the trucks are loaded. That is a real send, so it waits on you. The in-app banner in item 2 covers the same moment without a new service.

## Tests run

| Suite | Result |
|---|---|
| `npm test` (`node --test test/*.test.js`) | **57 passed, 0 failed.** HANDOFF says 41. That count is from before the 1.2.0 source tests. The suite on this tree is 57, and they passed. |
| `python -B -m unittest discover -s desktop/tests` | **23 tests. First run: 22 passed, 1 failed** (`test_hand_edit_after_release_does_not_lock_the_page_for_ever`). That test **passed on its own** once the machine had been up longer. See GPS-L3. The other 22, including proxy, path, and version checks, passed. |
| `TZ=America/Chicago node --test audit_tests/*.test.js` | **17 tests, 17 failed, 0 passed.** They are written to fail until the matching fix exists. They are not part of `npm test`, so the green suite above does not hide them. |

Audit tests by finding: GPS-C1, GPS-C2, GPS-C3, GPS-H1, GPS-H2, GPS-H3, GPS-H4, GPS-H5, GPS-H6, GPS-M1, GPS-M2 (three tests), GPS-M3, GPS-M4, GPS-M5, GPS-L1.

## Fix log

Daniel writes Yes in Approved to allow a fix. Claude Code fills the rest, and only for Yes rows.

| ID | Approved? | Fixed by | Date | Notes |
|---|---|---|---|---|
| GPS-C1 | Yes | Claude Code (cloud) | 2026-11-05 | A D/F work hour now sets the day letter (the 60/40 number is kept as `blendScore`). `bestWindow.good` is false if any work hour is under 80; the quiet stretch shows as "Usable stretch", and the worst hour is shown as large as the letter. Kp 6, 7, 8 noon slot → F. |
| GPS-C2 | Yes | Claude Code (cloud) | 2026-11-05 | Live Kp, Bz, wind and aurora now count for this hour and the next two (`LIVE_HOURS = 3`). Geospace model Kp and propagated L1 wind are applied on the hour they belong to. Bz table extended to −50 nT (−45) and wind to 1500 km/s (−25). Bz −20 + 750 km/s → day D; live Kp 8 → F. |
| GPS-C3 | Yes | Claude Code (cloud) | 2026-11-05 | A CME arrival raises Kp from 6 h before to 12 h after it, inside the 72-hour grade too. Direct hit, modelled Kp 8, today → F. |
| GPS-H1 | Yes | Claude Code (cloud) | 2026-11-05 | RTK / Survey profile only (`stormKp: 5` in config.js): an hour at Kp 5+ is held at D. Drone, ag and nav unchanged. Kp 4.67 is not caught. |
| GPS-H2 | Yes | Claude Code (cloud) | 2026-11-05 | Days 4–45 get a trend word (Quiet trend, Unsettled, Active, Storm possible, Strong storm possible) with Kp and confidence. No A–F, no "go". |
| GPS-H3 | Yes | Claude Code (cloud) | 2026-11-05 | Lower-48 K from the 3-day predictions raises Kp on its UTC slot. Dst ≤ −100 nT or an on-site TEC anomaly > 10 (not model-only) holds the live hours at D; the card lists the reading under "Why this can’t be a go". |
| GPS-H4 | Yes | Claude Code (cloud) | 2026-11-05 | Default is Pensacola, FL (30.42, −87.22), per Daniel. Saved browser settings still win. |
| GPS-H5 | Yes | Claude Code (cloud) | 2026-11-05 | A saved copy may stand in only while younger than `staleLimit(ttl)` (12× its cache life, 1 h to 24 h). Older → error. Any feed served from a saved copy is named in the red banner and on the Updated line. Kp nowcast age added to the banner. |
| GPS-H6 | Yes | Claude Code (cloud) | 2026-11-05 | `cmeCheck: 'unavailable'` (DONKI failed) puts "CME check did not load. This letter does not include a possible eruption." on the grade card. A free NASA key is still for Daniel to get. |
| GPS-M1 | Yes | Claude Code (cloud) | 2026-11-05 | Glancing-blow cap removed; the model’s highest Kp is used and "glancing" stays on the card. |
| GPS-M2 | Yes | Claude Code (cloud) | 2026-11-05 | Kp printed to one decimal and the sentence picked from that number. Mid-latitude line for 25°–55°. Zero aurora: "No aurora over you." C and D kid text no longer say "you can still go out" / "you can work". Reading-level tests pass. |
| GPS-M3 | Yes | Claude Code (cloud) | 2026-11-05 | Flare and proton odds use the worse of the local-date and UTC-date entries. |
| GPS-M4 | Yes | Claude Code (cloud) | 2026-11-05 | A missing slot inside the forecast span is a "?" hour, not skipped. Any in work hours → day held at D with "The Kp forecast has a hole…". |
| GPS-M5 | Yes | Claude Code (cloud) | 2026-11-05 | `buildHealth` always adds a note: "GLONASS and BeiDou: health was not checked. Every one of those satellites is counted." Shown on the satellite card. No scraping. |
| GPS-M6 | Yes | Claude Code (cloud) | 2026-11-05 | The current-hour-only Bz test now requires the next two hours to be marked. Added the 3-hour Kp 6 case next to the all-day Kp 7 test, plus test/audit-fixes.test.js for every ID. |
| GPS-L1 | Yes | Claude Code (cloud) | 2026-11-05 | Knots changed to Kp 7 = Ap 132, Kp 8 = Ap 207. Ap 207 → 9, Ap 132 → 8. |
| GPS-L2 | Yes | Claude Code (cloud) | 2026-11-05 | server.js proxy rejects user info and any port other than 443, matching check_proxy_target. |
| GPS-L3 | Yes | Claude Code (cloud) | 2026-11-05 | Test resets the watch (`_late_watch.update(key=None)`) when the fake clock starts. Passed on a machine up < 2 min. Seal unchanged. |
