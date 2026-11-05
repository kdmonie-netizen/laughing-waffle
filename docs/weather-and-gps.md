# KJM Land Surveying: How Weather Affects RTK GNSS (Knowledge Base and App Grading Design)

**Scope:** Pensacola and the western Florida Panhandle. Covers FDOT network RTK (FPRN, NTRIP over cellular) and KJM's own base + rover (UHF or cellular).
**Audience:** field crews (learning area and quizzes) and the developers of the GPS-conditions app.
**Prepared:** 2026-11-05

> **Verification status, read first.** Most of this research was done without live access to fdot.gov, myfloridagps.com, ngs.noaa.gov, weather.gov, osha.gov or fcc.gov, and the web-search budget ran out. Every claim below is one that a fact-checker confirmed, or a corrected version of it. The confirmation was mostly against textbook physics, arithmetic and known literature, not fresh page reads. Items that could not be checked are in Section 9. **Nothing in Section 9 should go into a quiz or the app's help text until someone reads the live source.** That covers almost every FDOT-specific number: ports, IP, station count, the 14 km Auto switch and the support email.

---

## 1. Big picture: how weather reaches an RTK position

Every GNSS signal crosses two layers of atmosphere before it reaches the antenna. RTK cm-level accuracy works only because the **reference** (your own base, or the network's virtual or master station) sees nearly the same atmosphere as the **rover**. When the two ends see the same thing, the error cancels out. **Weather hurts RTK only through the difference between the two ends**, plus the equipment and comms chain around them.

| Layer | What it is | What drives it | Key property |
|---|---|---|---|
| **Ionosphere** (about 60-1000 km up) | Charged particles | **Space weather**: solar activity, geomagnetic storms | *Dispersive*: the delay depends on frequency, so dual-frequency receivers can measure it. Its *gradient* between reference and rover is what hurts RTK [32][33] |
| **Neutral atmosphere / "troposphere"** (mostly the lowest about 15 km; most water vapor sits in the lowest 2-3 km) | Dry gas and water vapor | **Local weather**: pressure, humidity, fronts, storms | *Non-dispersive*: the same on every frequency, so dual-frequency receivers **cannot** remove it. It has to be modeled or cancelled between stations [16][27] |

In plain words:

- **Dry air (hydrostatic delay):** about 2.3 m of delay at sea level [22]. It is smooth and predictable from air pressure, and it nearly cancels between base and rover.
- **Water vapor (wet delay):** 0 to about 0.4 m. In a Gulf-coast summer it is typically about 0.25-0.35 m [23][24]. It is patchy, changes fast, and climatological models cannot predict it. **This is the local-weather problem.**
- **Leftover atmosphere error lands mostly in HEIGHT.** A 1 cm difference in zenith delay between the two ends gives about 3 cm of height error [25]. Weather problems usually show up **first as vertical scatter**.
- **Rain itself does almost nothing to the signal.** L-band rain loss is well under 0.01 dB/km [50][51]. Rain matters because of the water vapor around it, because wet trees and wet ground degrade the signal, and because of lightning and link outages.
- **Space weather** (Kp, storms, SED plumes) reaches the position through ionospheric gradients. The app already grades this. Local weather is a **separate** term and should not double-count the ionosphere.

The comms and equipment chain around the solution can also fail in weather. For network RTK that chain is cellular, internet, the FDOT caster, and CORS power. For base + rover it is the UHF link, the base tripod, and the base battery. In hurricanes and lightning, this chain fails before the atmospheric physics does.

---

## 2. FDOT FPRN network RTK

### 2.1 How it works
- FPRN is a free statewide real-time CORS network run by FDOT with partner agencies. Users must register for an account. It sends standard RTCM corrections over NTRIP that any receiver brand can use, referenced to **NAD83(2011) epoch 2010.00** (GRS80 ellipsoid) [8][14]. The usual NGS geoid for NAVD88 heights on NAD83(2011) is **GEOID18**. NGS is also modernizing the NSRS (NATRF2022 / NAPGD2022), which will eventually replace NAD83 and NAVD88 [8].
- Network RTK interpolates corrections between surrounding reference stations. In the Master-Auxiliary Concept (MAC), which underlies RTCM 3.x network messages, correction differences are split into a **dispersive** part (ionosphere) and a **non-dispersive** part (troposphere, orbit and clock) [16]. With MAX, the rover interpolates. With iMAX and VRS, the server interpolates. iMAX refers corrections to a real master station; VRS refers them to a virtual one [16].
- Interpolation fits a **linear (smooth) field** between stations. Anything **non-linear** is left over, and that residual grows as station spacing grows [17].
- Mountpoints that build corrections for your location (VRS, iMAX, auto or nearest-station, and in practice MAX cell selection) **need the rover to send NMEA GGA**. A wrong mountpoint name (usually case-sensitive) or bad credentials cause failures that **look like a network outage** [20].
- **Spacing:** real-time networks are commonly built with stations about 50-70 km apart [4]. For FPRN, a statewide estimate (about 100 stations over Florida's roughly 139,000 km² of land) gives an average spacing of about **37-44 km**. This is a calculation, not an FDOT figure, and the true Panhandle spacing is unknown [14]. Straight-line distances from Pensacola are about **69 km to Destin, 73 km to Crestview and 84 km to Mobile**. Whether a Pensacola rover is close to a real-time station depends on whether the Pensacola-area NCN station (PCLA) and any Alabama stations stream into FPRN. **That is unconfirmed.**

### 2.2 What weather and space weather do to it
- **Storms and fronts smaller than the station spacing are invisible to interpolation.** Single convective cells are a few km to about 10 km across. Sea-breeze fronts and squall lines are thin features. They leave leftover wet delay at the rover, mostly in height, and lower the fix rate [17][31]. The rover is hurt by the difference between the true delay at its own location and the interpolated value. Weather near distant stations matters only through the way it skews that interpolation.
- **Localized severe weather** (heavy regional rain, tropical systems) leaves large non-linear residuals even with network RTK [31].
- **Fronts:** NRCan tells RTN users, as well as single-base users, to avoid surveying while a front passes [6]. NGS says OPUS-RS, which interpolates troposphere from surrounding CORS just as a network does, may not work well while a strong front passes [7].
- **Network edge:** network RTK degrades when the rover is outside the station polygon, because the corrections are extrapolated rather than interpolated. It also degrades with large height offsets from the stations [18][19]. Pensacola is at Florida's western geographic edge, so the western Panhandle **may** be an edge area. Treat published outside-the-polygon distance tolerances as rule-of-thumb or vendor figures [18].
- **Ionosphere:** interpolation error grows with distance to the nearest station and with the strength of ionospheric gradients and TIDs [34]. Storm-time gradients that are non-linear across the station spacing drive interpolation residuals up and fix rates down sharply. This is documented at high latitude (Norway, 2011 storm) [35] and low latitude, but **no Florida magnitude is published**. Over the SE US the main storm-time structures are **storm-enhanced density (SED) plumes** [36].
- **Flat terrain helps.** Florida's highest point is Britton Hill, about 105 m (345 ft), so height-difference troposphere errors are small. Wet-delay variability dominates [22].

### 2.3 What fails first
1. **The comms and power chain.** Network RTK depends on station power and comms, the FDOT server and caster, the internet, and the crew's cellular link. Hurricanes and lightning can break any of these, and then corrections stop entirely [59][63]. Users commonly report cellular as a weak point: a session shows "connected" but carries too little correction data, or corrections arrive late [21]. **Storms hurt cellular through power loss, backhaul damage and congestion, not through rain fade** [63].
2. **Fix rate and time-to-fix**, then **vertical scatter**, in convective or frontal weather and during ionospheric disturbance.
3. **Wrong fixes that look fixed** at higher disturbance levels. Network RTK has an extra failure mode of its own: one biased correction is shared by every user at once [47].

### 2.4 Pre-job FPRN checklist
1. FPRN station status (status map, URL to be confirmed through fdot.gov [14][15]) and NGS CORS notices [13].
2. A current account, the hostname, and the mountpoint. **Confirm ports and products on the live FDOT FAQ.**
3. The app's space-weather grade.
4. Radar for storms or fronts **anywhere in the region between the job and the surrounding stations**, not just at the site.
5. Cell coverage and **correction age** at the site.
6. Satellite count, PDOP, and site obstructions or multipath.
7. A check shot on known control. Re-occupy critical points at a different time [1][2].
8. The tropical-storm outlook.

---

## 3. Own base + rover (single-base RTK)

### 3.1 How it works
The rover position equals the base coordinates plus the measured baseline. The method assumes base and rover see the same atmosphere, which holds well on short baselines. Every error at the base, whether in its coordinates, its setup or its height measurement, **passes one-to-one into every rover point** [12].

### 3.2 Baseline length
- Below about **10 km**, distance-dependent atmospheric residuals can be ignored for ambiguity resolution. Beyond 10 km, ambiguity resolution gets steadily less reliable. Agency practice caps single-base work at about 10-20 km [28].
- Nominal distance error is about **1 ppm (1 mm per km)** on top of a constant of about 8-10 mm. The 1 ppm term covers **all** distance-dependent errors under normal conditions: mostly ionosphere, plus troposphere and orbit. It is **not a storm limit** [11]. On stormy or ionospherically disturbed days, real errors can go well past it.
- **Ionosphere:** a vertical TEC gradient of 1 TECU per 100 km is about **1.6 mm/km (1.6 ppm)** of L1 differential delay, and up to about 3 times that at low elevation [32]. In quiet conditions, baselines under about 10 km rarely fail to fix. Under disturbance, usable baselines can shrink to a few km [33].
- **Storm days:** error on a short single-base baseline scales with its length, so **a 1-5 km own base is the most storm-resilient setup**. Network RTK and a 10-20 km own base are both exposed. Which of those two is worse depends on the shape of the gradient: a smooth gradient favors the network, while a sharp front between stations pushes the network toward the nearest-station distance. This is reasoning about the design, not a measured Florida ranking.

### 3.3 Height difference between base and rover
- Near sea level, zenith hydrostatic delay changes by about **0.27-0.3 mm per metre of height** [22]. With about 3x amplification into height, leaving it unmodeled would give about **1 mm of height error per metre** of height difference. Receivers' standard troposphere models remove most of this [25].
- Example: a base on a 40 m bluff or roof against a rover at the shore differs by about 11 mm of zenith hydrostatic delay, most of it modeled. In the Panhandle this term is small next to weather-gradient effects. NRCan still advises keeping base and rover at similar heights [6].

### 3.4 Weather between the two ends
- NGS single-base guidance advises against RT work when weather is **obviously different at base and rover** (a storm front, rain at one end, clearly different temperature or pressure). The fix is to wait for uniform conditions or move the base [1][2][3].
- Typical Panhandle cases: a sea-breeze front lying between a coastal base and an inland rover; a thunderstorm over one end only; a cold front passing during the session.

### 3.5 Corrections link: UHF radio vs cellular
| | UHF (about 410-470 MHz) | Cellular (NTRIP) |
|---|---|---|
| Rain | Negligible attenuation [50] | Negligible attenuation |
| Main weather weakness | **Wet, leafy vegetation in the path** (several dB) [61]; terrain and distance | Tower power loss, backhaul failure, congestion [63] |
| Hurricanes | Independent of the cell network, so it is the fallback once the crew's control survives | Shares network RTK's weakness |
| Ducting (calm clear nights, inversions, over the Gulf and the coastal plain) | Can carry distant co-channel signals hundreds to thousands of km, causing interference or briefly extending range [62] | Not materially affected |
| Lightning static | Weaker at UHF than HF/VHF. Nearby strokes **may** cause brief dropouts (plausible but unmeasured) | Transient only |

### 3.6 Base setup hazards (base + rover only)
- Wind on the tripod or mast, a bumped tripod, or legs sinking into rain-soaked sand shift **every** rover point by the same amount [12].
- A base error in the assumed coordinates adds roughly **1 ppm of baseline error per 10 m** of base error (Trimble's figure) [12]. A base set on an autonomous ("here") position also shifts every point by metres unless the job is later moved onto control.
- Wet ground or standing water next to the base increases ground-bounce multipath, which contaminates every rover point [53].
- Lightning and heat at an unattended base: see Section 5. A direct strike usually destroys the antenna [59][60].

---

## 4. Side-by-side hazard table

| Hazard | Network RTK (FPRN) effect | Base/rover effect | What the crew should do |
|---|---|---|---|
| Thunder heard / lightning within about 10 mi | Crew danger. Station or cell outages possible | Crew danger. Base and mast at risk | **STOP. Shelter. Wait 30 min after the last thunder** [55][56] |
| Convective cell or sea-breeze front in the region | Invisible to interpolation. Height scatter, lower fix rate [17][31] | Matters only if it sits **between** base and rover or over one end | Check radar. Wait it out, or shorten the baseline |
| Cold front or squall line passing | Breaks the smooth-field assumption. Avoid [6][7] | A front between the ends, or one passing mid-session, breaks cancellation | Avoid the passage window. Re-shoot after it passes |
| High humidity in an even air mass | Small effect on its own | Small effect on its own | No action. It acts as a multiplier when storms are around |
| Rain (the drops themselves) | No signal effect [50][51] | No signal effect | No penalty. Watch for wet canopy and puddles |
| Wet canopy after rain | Rover: more float time and wrong fixes [53] | Same at the rover. Also UHF path loss | Longer occupations, check shots, open-sky offsets |
| Wet ground or standing water | Rover multipath | Rover **and base** multipath | Do not set the base beside ponded water. Use a 15° mask |
| Wind and gusts | Pole tilt at the rover | Pole tilt plus **base tripod or mast movement** | Bipod or tripod, sandbags, check shots after gusts |
| Geomagnetic storm (G2+) | Hit harder: gradients across tens of km [34][35] | Scales with the baseline. Under 5 km is most robust | Shorten the baseline. Use multi-GNSS, a higher mask, re-initialised checks |
| Tropical storm or hurricane | Cell, power and CORS outages for days to weeks [63] | UHF still works, if the control survived | Use your own base on UHF. Re-check control afterwards |
| Cellular congestion or outage | No corrections [21] | Only if base corrections go by cell | Switch to UHF base |
| Inversion / ducting night | No effect | Co-channel interference on UHF [62] | Unique station ID, change channel, or use cell |
| Heat | Crew and equipment | Plus an unattended base battery and radio baking | OSHA heat plan. Shade gear. Do not charge Li-ion above about 45 °C [65] |
| Wrong config after the FPRN changeover | Looks like "network down" | Not applicable | Verify hostname, port, mountpoint and account |

---

## 5. Field safety weather

### 5.1 Lightning (the top hazard in Florida)
- **Florida leads the US in lightning deaths**, both in the long record since 1959 and in recent NWS data. Over the long record it has roughly twice as many as the next state (Texas). Most victims are male (about 80% nationally) and were outdoors in open areas or near trees [58]. *Check exact counts on the NWS statistics page before quizzing on them.*
- Lightning can strike **about 10 miles** from the storm. **If you can hear thunder, you are within striking distance.** "When thunder roars, go indoors." No place outside is safe [55]. Flash-to-bang is about 5 seconds per mile.
- **OSHA/NOAA Fact Sheet FS-3863** is guidance, not a regulation. It says: go to a fully enclosed building or a hard-topped metal vehicle when thunder is heard; stay until **30 minutes after the last thunder**, and every new thunder restarts the clock; employers **should** have a written lightning plan in the Emergency Action Plan and train workers. It also says corded phones are a hazard, while cell and cordless phones are safe [56]. OSHA has no lightning standard; enforcement is under the General Duty Clause [56].
- The old **30-second flash-to-bang trigger** of the "30-30 rule" has been dropped. A 30 s count is only about 6 miles, which is inside the roughly 10-mile reach. The 30-minute wait still applies [56].
- **Metal does not attract lightning, but it conducts it.** Height, a pointed shape and isolation decide where it strikes. A crew member holding a 2 m pole in an open field fits that description. **Drop the pole and go to the truck; do not waste time packing gear** [57]. A car protects you through its metal roof and sides, not its rubber tires [57].
- **Never walk out to a base during a storm.** Lightning destroys CORS and base receivers every year through direct strikes and through surges induced on coax and power lines. A direct strike usually kills the antenna even with arresters fitted [59][60].
- Panhandle sea-breeze storms can build from blue sky in minutes in early afternoon.

### 5.2 Heat
- **OSHA heat index bands:** below 91 °F lower (caution); 91-103 °F moderate (remind workers to drink about 4 cups of water per hour); 103-115 °F high; above 115 °F very high to extreme. Move up one band for strenuous work, direct sun, or heavy clothing [66].
- **Federal heat rule:** proposed rule 89 FR 70698 (Aug 30 2024, Docket OSHA-2021-0009). Its initial trigger is an **80 °F** heat index and its high-heat trigger is **90 °F**, with 15-minute paid rest breaks every 2 hours at high heat. Hearings were held June-July 2025. **It is not final.** Check its current 2026 status before teaching it [67].
- **Equipment:** Trimble R12i operating range is -40 to +65 °C, storage to +75 °C, IP67 [65]. Li-ion cells generally should not be charged above about **45 °C**. A receiver on a dashboard or in direct sun can exceed both limits while the air is only 32-35 °C [65].

### 5.3 Wind
- Pole tilt error is pole height × sin(tilt). On a 2 m pole, **1° gives 3.5 cm**, 2° about 7 cm, and 20 arc-minutes (easy to miss on a bubble) about 1 cm. Check bubble calibration regularly [68].
- At the base, use a heavy or fixed-height tripod with sandbags, stake the legs in soft soil, and take check shots after gusts. No published wind standard exists for this.

### 5.4 Storms, hurricanes, drones
- Hurricanes can knock out a large share of a county's cell sites for days to weeks, mostly through commercial power loss and backhaul failure rather than tower damage [63]. After Hurricane Michael (2018), a majority of Bay County sites were out at first. Hurricane Sally made landfall at **Gulf Shores, AL, on Sept 16, 2020** (about 30 mi west of Pensacola). Quote exact DIRS counts only from the FCC reports themselves.
- After hurricanes, CORS go offline mainly through power and telecom loss, and occasionally through physical damage. Check FPRN status before network work after a storm [13][14].
- **Drones (14 CFR 107.51 / 107.49):** 3 statute miles of visibility from the control station; 500 ft below and 2,000 ft horizontally from clouds; 87 kt (100 mph) maximum; 400 ft AGL; a required preflight weather check; **no numeric wind limit** [69]. Use the manufacturer's limit instead, for example a maximum wind resistance of 12 m/s (about 27 mph) for the DJI M350 RTK, which is IP55 [70].

---

## 6. Numbers worth remembering

| Quantity | Value | Applies to | Source |
|---|---|---|---|
| Zenith hydrostatic (dry) delay | about 2.3 m at sea level; 2.28 mm per hPa | Both (mostly cancels) | [22] |
| Zenith wet delay | 0 to about 0.4 m (up to about 0.5 m in extreme cases); total ZTD about 2.5-2.7 m in a FL summer | Both | [23] |
| PW to wet delay | ZWD ≈ 6.2-6.5 × PW. FL summer PW of 43-48 mm gives about 27-31 cm; 70 mm gives about 44 cm (derived) | Both | [23][24] |
| Hurricane pressure drop | 20-60+ hPa, about 5-14 cm ZHD change | Both | [22] |
| Slant factor at 10° elevation | 1/sin(10°) = 5.76 (curvature-aware functions give about 5.5-5.6) | Both | [27] |
| Height amplification | 1 cm relative zenith bias gives about 3 cm height error | Both | [25] |
| Height-difference physics | about 0.27-0.3 mm ZHD per m, about 1 mm height per m if unmodeled | Base/rover | [22][25] |
| Reliable single-base ambiguity resolution | under about 10 km; practice cap 10-20 km | Base/rover | [28] |
| Ionosphere on L1 / L2 / L5 | 0.162 / 0.267 / 0.291 m per TECU | Both | [32] |
| TEC gradient to ppm | 1 TECU per 100 km ≈ 1.6 ppm on L1; 1 ppm ≈ 0.6 TECU per 100 km | Both | [32] |
| Worst storm gradient measured over CONUS | about 413 mm/km slant L1 (Nov 2003, Ohio area); GBAS threat bound 375-425 mm/km; quiet sigma about 4 mm/km | Both | [37][38] |
| Hurricane TIDs | about 0.2 TECU or less (about 3 cm or less); gradient about 0.23 mm/km, negligible | Both | [44] |
| Pensacola dipole latitude | about 39.3° (Miami about 35°, Orlando about 37.6°) | Both | [39] |
| SED storm window | about 17-23 UT, which is 11:00-17:00 CST / 12:00-18:00 CDT | Both, worse for network | [36] |
| Solar Cycle 25 peak | Oct 2024, smoothed SSN about 161; declining; severe storm 19-20 Jan 2026 | Both | [48][49] |
| Rain attenuation at L-band | under 0.01 dB/km (about 0.004-0.005 dB/km at 100 mm/h) | Both | [50][51] |
| Atmospheric (oxygen) loss | about 0.035 dB at zenith, about 0.4 dB at 5° elevation | Both | [51] |
| Lightning reach / all-clear | about 10 mi; 30 min after the last thunder | Crew | [55][56] |
| Pole tilt | 2 m pole: 1° = 3.5 cm; 20′ ≈ 1 cm | Both | [68] |
| Vendor RTK spec (Trimble R12/R12i) | single-base 8 mm + 1 ppm H, 15 mm + 1 ppm V; network 8 mm + 0.5 ppm H, 15 mm + 0.5 ppm V. **RMS (1σ): roughly double for 95%** | Both | [11] |
| Base coordinate error | about 1 ppm per 10 m of base error | Base/rover | [12] |
| FL 5J-17 closure classes | Commercial/High Risk 1:10,000; Suburban 1:7,500; Rural 1:5,000 | Both | [9] |
| Short-tie example | two ±2 cm points 300 ft apart give about 1:3,200, which fails Suburban | Both | [9][10] |
| NGS-58 heights | 3 × 5 h sessions on 3 days; re-observe if repeats differ by more than 2 cm; VDOP under 6 for 90% of the session | Both (static) | [5] |
| Redundant RTK shot | about 4 h later; geometry repeats about 3 min 56 s earlier each day | Both | [1][2] |
| Elevation mask | 10-15° typical | Both | [3] |
| OSHA heat bands | <91 / 91-103 / 103-115 / >115 °F | Crew | [66] |
| Li-ion charge window | about 0-45 °C | Equipment | [65] |
| Part 107 minimums | 3 SM visibility; 500 ft below / 2,000 ft horizontal from clouds; 400 ft AGL; 87 kt | Drone | [69] |
| Radio horizon (4/3 earth) | about 15% beyond the geometric horizon | UHF | [62] |

---

## 7. Data sources for the app, and the grading design

### 7.1 Data sources

**A. NWS API: the primary source (public domain, fine for commercial use) [71][72]**
- `GET https://api.weather.gov/points/{lat},{lon}` returns `gridId` (Pensacola is **MOB**), `gridX`, `gridY`, `forecast`, `forecastHourly` and `forecastGridData`. Use **4 decimal places at most**; more returns an error. The mapping rarely changes, so **cache it per job site** [72].
- `GET /gridpoints/{wfo}/{x},{y}` returns raw layers. Confirmed layer names: `probabilityOfThunder, probabilityOfPrecipitation, quantitativePrecipitation, windSpeed, windGust, windDirection, relativeHumidity, dewpoint, temperature, heatIndex, apparentTemperature, skyCover, weather, hazards, visibility, ceilingHeight, lightningActivityLevel, pressure, probabilityOfTropicalStormWinds, probabilityOfHurricaneWinds` [73][75].
  - Each layer is `{uom, values:[{validTime:"start/duration", value}]}`. Durations can include days (`PT3H`, `P2DT18H`, `P3D`), because equal consecutive values are merged. **Expand every value to hourly bins** [73].
  - Units come from `uom`: temperature and dewpoint are `wmoUnit:degC`, wind is `wmoUnit:km_h-1`, precipitation is `wmoUnit:mm`, visibility and ceiling are `wmoUnit:m` [75].
  - **An empty `values` array means unknown, not zero.** `probabilityOfThunder` and `pressure` were empty in NWS's own fixture [75].
  - `weather` values are arrays of `{coverage, weather, intensity, visibility, attributes}` with snake_case strings, for example `{"coverage":"slight_chance","weather":"thunderstorms"}`. Fields can be null [75].
  - `hazards` holds P-VTEC codes (for example `HU.W`, `TR.W`) and is a good backup for tropical alerts [73].
  - `lightningActivityLevel` is a fire-weather **forecast** (LAL 1-6) and offices fill it unevenly [73].
- `GET /gridpoints/{wfo}/{x},{y}/forecast/hourly` returns about 156 hourly periods. `dewpoint` is in **degC even though temperature is in °F**, and `windSpeed` is a string such as `"10 mph"`. Current 12-hour `/forecast` responses no longer carry dewpoint or RH, so parse defensively [75].
- `GET /alerts/active?point={lat},{lon}` returns a GeoJSON FeatureCollection with `event, severity, urgency, certainty, onset, ends, expires, headline`. `onset`, `ends` and `headline` can be null. Alerts follow CAP v1.2 [72][75].
- `probabilityOfPrecipitation` means the chance of at least 0.01 in (0.254 mm) at the point. It is **not** a thunder probability or an intensity [73].
- **Caching and limits:** honor Cache-Control. Use `If-Modified-Since` (a 304 means no change). **Never add cache-buster query parameters, which return HTTP 400.** The rate limit is not published; retry after about 5 s. There is no SLA, and planned outages are announced through Public Information Statements [72][74]. Poll about every 30-60 min; this interval is an engineering choice, not an NWS figure.
- **CORS and User-Agent:** NWS asks for an identifying User-Agent. Chrome and Safari ignore a User-Agent set from page JavaScript, and **any custom header (User-Agent, Feature-Flags) triggers a CORS preflight that users report failing**. From a browser, send plain GETs only. **Recommended: a small serverless proxy** that sets the UA, caches responses and adds CORS [72].
- **Station observations** (for the "now" grade and for spotting fronts): `/stations/{id}/observations/latest` for KPNS (Pensacola Intl) and KNPA (NAS Pensacola). This comes from a checker note; verify the fields when implementing.

**B. Open-Meteo: the better troposphere signal, but a paid key is needed for commercial use**
- `https://api.open-meteo.com/v1/forecast` needs no key and supports CORS [76]. Useful hourly variables: `cape, lifted_index, convective_inhibition, boundary_layer_height, total_column_integrated_water_vapour, surface_pressure, dew_point_2m, wind_gusts_10m, precipitation_probability`. The default is 7 days, extendable to 16 [77][78].
- **`total_column_integrated_water_vapour` is PW in mm**, so ZWD ≈ 6.5 × PW. **`surface_pressure` gives ZHD** ≈ 2.2768 mm/hPa × P. These are much better troposphere-risk inputs than surface dewpoint [77].
- **Model change:** HRRR is marked *Discontinued 2026-11-30* and NAM *Discontinued 2026-11-01*. The US high-resolution source is now **RRFS** (3 km CONUS). Model ids are `ncep_gfs_seamless` and `ncep_rrfs_conus`. Use `best_match` by default. **Do not build on HRRR** [78].
- `precipitation_probability` comes from GEFS ensemble members, and Open-Meteo states its threshold inconsistently (more than 0.1 mm/h in one place, more than 0.254 mm in another) [78].
- **License:** the free tier is **non-commercial only**, with fewer than 10,000 calls a day, 5,000 an hour and 600 a minute. Commercial use needs a paid subscription. Data is CC BY 4.0, with the attribution "Weather data by Open-Meteo.com" [76][79]. **KJM is commercial, so use Open-Meteo only behind a paid key or a feature flag.**

**C. SPC convective outlooks**
- `https://www.spc.noaa.gov/products/outlook/day1otlk_cat.lyr.geojson`, with properties `DN, VALID, EXPIRE, ISSUE, LABEL, LABEL2, stroke, fill`. **DN: 2 = TSTM, 3 = MRGL, 4 = SLGT, 5 = ENH, 6 = MDT, 8 = HIGH** [80][81]. Timestamps are compact UTC strings (for example `202103171200`).
- Per-hazard files (torn, wind, hail, sig*) exist for Days 1-2. **Day 3 has only categorical plus combined `prob`/`sigprob` files.** Do a point-in-polygon test at the site and take the highest DN. CORS is unverified, so proxy it.

**D. Lightning: GOES-19 GLM (free, open, commercial use OK) [82][83]**
- Bucket `noaa-goes19` (us-east-1, no account needed), keys `GLM-L2-LCFA/YYYY/DDD/HH/OR_GLM-L2-LCFA_G19_s…_e…_c….nc`. Files are HDF5/NetCDF4, about 240 KB each, **one every 20 s (180 an hour)**. Read the `flash_lat` and `flash_lon` variables.
- The bucket **does return `Access-Control-Allow-Origin: *`**, but decoding should still happen **server side**. Resolution is about **8 km at nadir**, so use a 10-15 km stop radius and never imply sub-mile precision.
- Each file covers GLM's field of view (most of the Western Hemisphere). Modified data must not be presented as original NOAA data [83].
- **Do not use Blitzortung.** Commercial use is prohibited without agreement, and there is no API sanctioned for outside or commercial use [84].
- The NWS API has **no observed-lightning endpoint**. Thunder fields there are forecasts only [73].

**E. Radar (images and tiles; no key)**
- RIDGE II site pages: `https://radar.weather.gov/station/KEVX/standard` and KMOB [88].
- NCEP opengeo MRMS WMS (about 1 km mosaic, about every 2 min; confirm layer names with GetCapabilities) [86].
- The NWS ArcGIS `radar_base_reflectivity` service [85].
- IEM XYZ tiles `…/nexrad-n0q-900913/{z}/{x}/{y}.png` (university-run, no SLA) [87].
- Showing images needs no CORS. Reading pixel values does, so do that through the server.

**F. Network health (for the FPRN grade)**
- FPRN station status map. The URL and refresh rate are unverified, no API was found, and the terms of use must be checked before scraping [14][15].
- NGS CORS notices (a historical outage record, not real time) [13].
- FCC DIRS county cell-outage reports, issued only when DIRS is activated for a disaster [63].

### 7.2 Recommended grading design

**Architecture.** Keep three separate outputs per hour:
1. **FIELD-SAFETY STOP**: a red banner. It is not a letter grade and it overrides everything.
2. **FDOT Network RTK grade** (A-F).
3. **Base/Rover RTK grade** (A-F). Crews enter the baseline length (default 5 km), the link type (UHF or cell), and optionally the base-rover height difference.

Each RTK grade = **min(space-weather grade for that mode, local-weather grade for that mode, infrastructure cap)**. Local weather can only **pull a grade down**. Below, "−1" means one letter step. **All thresholds are engineering judgment derived from the physics above. None of them are published standards.** Calibrate them against KJM's own check-shot residuals, logged by weather type.

**A. Field-safety stop (both modes, separate banner)**
| Trigger | Action | Reason |
|---|---|---|
| GLM flash within about 10-15 km in the last 30 min, or crew reports thunder | STOP, shelter, 30-min timer that resets on each strike | [55][56] |
| Active Tornado, Severe Thunderstorm, Hurricane, Tropical Storm or Flash Flood **warning** at the point | STOP | [75] (policy) |
| Heat index 103-115 °F / above 115 °F | High / extreme heat advisory, with OSHA controls | [66] |
| Drone: visibility under 3 SM, cloud clearance not met, gusts over the airframe limit | No-fly | [69][70] |

**B. Shared local-weather inputs with different weights per mode**
| Input (source) | Network grade | Base/rover grade | Reason |
|---|---|---|---|
| **Frontal passage** in the hour ±3 h: 3-h pressure tendency of 3 hPa or more, a sharp dewpoint drop, or a wind shift (Open-Meteo `surface_pressure` or station obs) | −2 | −1 if baseline ≤5 km, −2 if ≥10 km | NGS/NRCan/OPUS-RS: avoid fronts [1][6][7] |
| **Thunder**: `probabilityOfThunder` <15% → 0; 15-30% → −1; 30-50% → −2; >50% or `weather` coverage "likely"+ → cap D | as listed | base ≤5 km: one step milder; ≥10 km: as listed | Sub-spacing cells are invisible to interpolation [17][31]; short baselines share the air |
| **Radar echo** of about 40 dBZ+ within about 50 km of the job (network) or within the base-rover corridor plus 5 km (base/rover) | −1 to −2 | −1 to −2 (scaled by baseline) | Same physics; different footprint |
| **SPC Day-1 category at the site**: TSTM/MRGL −1; SLGT+ −2 | as listed | as listed | Day-planning layer [80] |
| **Moisture**: PW above about 51 mm, or dewpoint ≥72-75 °F | 0 on its own; **doubles** convection and front penalties | same | High PW feeds sharp wet-delay contrasts [23][24]; humidity in an even air mass is not a big error |
| **Summer afternoon default** (May-Oct, 12:00-19:00 local) when no forecast data is available | −1 | −1 for baselines ≥10 km | Sea-breeze convection [29] |
| **CAPE** (paid Open-Meteo): >1000 J/kg −1; >2500 J/kg −2 | as listed | half weight | Convective potential |
| **Rain amount alone** | 0 | 0 | No signal effect [50] |
| Heavy rain in the last 3 h plus wooded site | −1 at the rover | −1 at the rover; also −1 if the UHF path is wooded | Wet canopy and foliage loss [53][61] |
| **Wind gusts** ≥25 mph caution; ≥35 mph | rover pole −1 / −2 | **base tripod and mast** −1 / −2 | [68]; base error passes 1:1 into every point |
| Calm, clear night with an inversion | 0 | −1 when on UHF (low confidence) | Ducting interference [62] |

**C. Mode-specific inputs**
| Input | Network | Base/rover |
|---|---|---|
| **Baseline length** | not used | ≤5 km: 0; 5-10 km: 0, with storm penalties ×1.5; 10-20 km: −1, with storm penalties ×2; >20 km: cap C [28] |
| **Height difference** | not used (flat FL) | Display "about 0.3 mm ZHD per m (mostly modeled)". Flag above 30 m. No penalty by default [22] |
| **Station health** (status map, manual until a feed exists) | Nearest stations down: −1 per station among the nearest 3; cap D if the nearest is down | not used |
| **Network edge** (far-west Escambia/Santa Rosa) | Fixed −1 caution until PCLA and Alabama station inclusion is confirmed [18][19] | not used |
| **Cellular risk**: TS/hurricane warning, a DIRS activation, or widespread severe weather | F (unavailable) during warnings; cap D for 1-5 days after landfall until status is confirmed (policy) [63] | Apply **only if corrections go by cell**. UHF: weather penalties only |
| **Config caveat** | Always-on note: "confirm hostname, port, mountpoint and account on the FDOT FAQ", so a setup error is not read as weather | not used |

**D. Space-weather tiers by mode (proposal; tune with logs)**
| Kp / G-scale | Network | Base ≤5 km | Base 10-20 km |
|---|---|---|---|
| Kp ≤4 | 0 | 0 | 0 |
| Kp 5-6 (G1-G2) | −1 | 0 | −1 |
| Kp 7 (G3) | −2 | −1 | −2 |
| Kp 8-9 (G4-G5) or Dst < −200 nT | F | D (fix plus check shots only) | F |

- **Storm-day time multiplier:** add an extra −1 between 17 and 23 UT (11:00-17:00 CST), which is the SED window [36].
- **Do not snap back to normal when Kp drops.** Hold one step of penalty for about 24 h, because negative-phase depletion edges persist (a checker note; policy).
- **No ionospheric penalty for thunderstorms or hurricanes.** Their TIDs are negligible [44][45].
- The G5 storm of May 2024 corrupted corrections themselves, so treat G5 as "do not work" for both modes [40][41].

**E. Expected-accuracy readout**
- Show the vendor spec for the crew's receiver. For the R12i: base/rover 8 mm + 1 ppm H / 15 mm + 1 ppm V; network 8 mm + 0.5 ppm (ppm of distance to the nearest physical station).
- Label these as **RMS (roughly double them for 95%)** [11].
- On C/D grades, multiply by a weather factor (×1.5-3, a design choice).
- **Always show a separate "elevation work" caution**, because tropospheric error hits vertical first [25][26].

**F. Advice text by grade**
- **A/B:** normal occupations; check shot at start and end.
- **C:** check correction age (suspect anything beyond a few seconds) [64]; re-occupy critical points about 4 h later [1][2]; take an extra check shot after weather changes; use a 15° mask if PDOP allows [3].
- **D:** topo only or postpone control; network users switch to their own short base or the nearest single-station mount; log raw data at the base.
- **F:** stop.
- **Data hygiene:** store the hourly grade with each field session. FL 5J-17 requires documented accuracy methodology.

---

## 8. Common myths

1. **"Rain blocks GPS."** False. L-band rain loss is under 0.01 dB/km [50][51]. What hurts are the water-vapor gradients, wet trees, wet ground and lightning around the rain.
2. **"Rain kills the radio or cell link."** False at UHF and sub-6 GHz cellular. Storms break cellular through power, backhaul and congestion [63]. UHF suffers from wet foliage, not raindrops [61]. (5G mmWave is rain-sensitive, but devices fall back to LTE or sub-6 GHz.)
3. **"Fog weakens the satellite signal."** False. Fog matters only far above L-band [52]. Its real effects are drone visibility and roadside safety.
4. **"Dual-frequency removes all the atmosphere."** False. It removes the ionosphere, not the troposphere. Even for the ionosphere, the ionosphere-free combination amplifies noise and loses integer ambiguities, so RTK still depends on the two ends cancelling [46].
5. **"Humid day = bad GPS day."** Not on its own. Uniform humidity mostly cancels. **Gradients** from storms and fronts do the damage [17].
6. **"FIXED means correct."** False. A fix can be wrong, especially on disturbed days, and receivers can keep showing FIXED for up to 60 s after corrections stop (NovAtel RTKTIMEOUT 5-60 s) [64]. Watch correction age and take check shots.
7. **"Network RTK is always better than my base."** False in storms. A 1-5 km own base is the most storm-resilient setup [33].
8. **"Thunderstorms mess up the ionosphere over my job."** Real but negligible. Storm and hurricane TIDs are about 0.2 TECU or less, under 0.5 ppm [44][45].
9. **"Metal poles attract lightning."** False. Metal conducts but does not attract. Height and isolation are what matter, so drop the pole and shelter [57].
10. **"30-30 rule: if flash-to-bang is over 30 s you're fine."** Outdated. Thirty seconds is only about 6 miles. Thunder heard means go [56].
11. **"Rubber tires protect you in a car."** False. The metal roof and sides do [57].
12. **"The 1 ppm in the spec is tropospheric error."** False. It covers all distance-dependent errors (mostly ionosphere) in normal conditions, and it is not a storm limit [11].
13. **"Vendor specs are 95% numbers."** Usually RMS (1σ). Roughly double them for 95% [11].
14. **Arithmetic trap:** "1 TECU per 100 km = 0.16 ppm" is wrong. It is **1.6 ppm** [32].
15. **"Radio horizon is a third beyond the optical horizon."** Wrong. It is about 15% beyond the geometric horizon [62].
16. **"FPRN is down" after the server change.** Often it is a stale IP, port, mountpoint or account in the rover. Check the configuration first [20].

---

## 9. Not settled / do not quiz on these

**FPRN specifics (no live FDOT page was readable):**
- Station count ("nearly 100") and the "no plans to charge" wording.
- Leica Spider hardware and software; four-constellation streaming.
- The Nov 3 2025 server move: IP 48.223.232.215 (old 40.121.5.206), ports 20000/24000/25000 (old 10000/31000/40000), one account per rover.
- Product list (iMAX/MAX/VRS/FKP/SBL) and the **14 km Auto-iMAX/VRS switch**.
- The 1-2 cm H / 2-3 cm V accuracy figure.
- Status map URL, refresh rate (15 min, 5 min or daily), and any API.
- Support email.
- Which listed sites are FPRN versus NCN; whether PCLA or Alabama stations stream into FPRN.
- An FDOT-specific geoid package (and the names FPRNGD16B and FPRN18).
- MAC cell size (about 6 stations), 70 km design spacing, the 30 km single-base radius.

**FDOT and Florida rules:** the FDOT handbook's "MAX required / VRS not allowed", static primary-control session rules, 20%/3-station/30-epoch checks, and the 02-28-2025 edition date. The negative claim that "5J-17 has no GNSS provisions".

**NGS specifics:**
- RT1-RT4 class table: PDOP 2/3/4/6, satellites 7/6/5/5, RMS, epoch counts, 10/15/20 km.
- Typical precisions per class.
- 2 s latency gate.
- G3/S4/R3 no-go levels. Note that R-scale blackouts do not directly degrade L-band.
- Henning 2009 "7 C's", the checklist wording, and RTN 3-4 cm / 5-7 cm.
- Exact version numbers and item numbers.
- NGS wording of the "1 mm per m" rule.
- Station-versus-OPUS 2 cm / 4 cm tolerances; "40 km baselines".

**Other guidelines and studies:**
- NRCan PDOP 2-3 and 50 km polygon.
- CT DOT two-base wording; WisDOT 5-epoch check shots.
- Optimal RTN occupation of 180-300 s.
- Lantmäteriet 15/25 mm and 13 to 8 mm densification.
- Hong Kong NRTK fix rates (more than 80% vs about 66%, 16:00 LT minimum).
- I95 cut-offs (4/8/15 ppm, >30, >8).
- CLOSE II 85% / 55 s; Odolinski 8.9 km at Kp 7−.
- Erol & Sanli rates; specific Korean, Chengdu, Alpine and Finnish edge numbers.
- Frontal "40-200 km thick / >3 cm/h"; "15 mm / 25%"; 2.7 km decorrelation.
- 30 min pre-convection and 5 h PW lead times.

**Ionosphere details:** +75 / 190-200 TECU in May 2024; the 49-event SED climatology; scintillation case studies other than Ledvina 2001; ERAU lightning-RF posters; the Oct 2026 sunspot number of 45.7; whether SED or EIA edges crossed the Panhandle in 2024-2026.

**Field and equipment:** wet-versus-dry foliage dB figures (3-8 dB; NASA 60%/90%); UHF canopy 3-5 dB per 10 m and seasonal 5-15 dB; humidity-RSSI correlation; GeoMax TRU35 14 km range; Emlid 10 s / LG290P 120 s hold times; exact Florida lightning death counts; exact FCC DIRS outage counts; Isaac "11 CORS"; Harvey TXRP; 2026 OSHA heat-rule status; Emlid tilt spec.

**Data:** NOAA ArcGIS SPC MapServer field names and layer IDs; CORS on api.weather.gov, SPC and radar hosts; RIDGE GIF names; MRMS bref layer name; NWS "no past periods since Jan 2026"; SCN 24-55 date; Feature-Flags names; whether gpsmet.noaa.gov is still operating.

---

## 10. Sources

**NGS / standards / vendor specs**
1. https://www.ngs.noaa.gov/PUBS_LIB/NGSRealTimeUserGuidelines.v2.1.pdf
2. https://geodesy.noaa.gov/PUBS_LIB/UserGuidelinesForSingleBaseRealTimeGNSSPositioningv.3.1APR2014-1.pdf
3. https://geodesy.noaa.gov/library/pdfs/NOAA_Manual_NOS_NGS_0009.pdf
4. https://www.ngs.noaa.gov/PUBS_LIB/NGSGuidelinesForRealTimeGNSSNetworksV2.2.pdf
5. https://geodesy.noaa.gov/library/pdfs/NOAA_TM_NOS_NGS_0058.pdf
6. https://natural-resources.canada.ca/sites/nrcan/files/earthsciences/pdf/Canada%20RTK_UserGuide_v1_2-EN.pdf
7. https://webarchive.library.unt.edu/eot2008/20090506125042/http:/www.ngs.noaa.gov/OPUS/Using_OPUS-RS.html
8. https://www.federalregister.gov/documents/2013/08/08/2013-19167/publication-of-north-american-datum-of-1983-2011-epoch-201000-north-american-datum-of-1983-pa2011
9. https://flrules.org/gateway/notice_Files.asp?ID=2066893
10. https://www.fgdc.gov/standards/projects/accuracy/part4/FGDC-endorsed-standard
11. https://www.duncan-parnell.com/media/sparsh/product_attachment/R12_-_Datasheet.pdf
12. https://help.fieldsystems.trimble.com/r750/position-modes-critical-factors-rtk.htm
13. https://geodesy.noaa.gov/CORS/news/notices/notices.shtml

**FPRN / network RTK**
14. https://www.fdot.gov/Geospatial/fprn.shtm
15. https://www.myfloridagps.com/Dmap/ (unverified)
16. https://amerisurv.com/2005/03/25/leica-geosystems-introduces-new-leica-spidernet-network-rtk-module-for-gps-spider/
17. https://fig.net/resources/proceedings/fig_proceedings/fig2015/ppt/ts05g/TS05G_charara_7843_ppt.pdf
18. https://c4g.lsu.edu/index.php/faqs/real-time-network/how-far-outside-of-the-network-can-i-use-it
19. https://www.researchgate.net/profile/Stuart_Edwards2/publication/233389321_An_examination_of_network_RTK_GPS_services_in_great_Britain/links/0f317533abc793a08d000000.pdf
20. https://www.manualslib.com/manual/1599592/Leica-Gr30.html?page=188
21. https://rpls.com/forums/strictly-surveying/rtk-over-cellular-a-couple-of-questions/

**Troposphere**
22. https://vmf.geo.tuwien.ac.at/codes/saasthyd.f (Saastamoinen 1972)
23. https://impacts.ucar.edu/en/publications/gps-meteorology-remote-sensing-of-atmospheric-water-vapor-using-t/ (Bevis et al. 1992)
24. https://www.weather.gov/media/tbw/climate/summaries/SummerRainySeason.pdf
25. https://www.aiub.unibe.ch/download/BERN42/DOCU/DOCU42_5.pdf (Beutler et al. 1988 rule)
26. https://zendy.io/title/10.1029/1998jb900067 (Gregorius & Blewitt 1999)
27. https://www.geologie.ens.fr/~ecalais/teaching/gps-geodesy/gps_signal_propagation.pdf
28. https://www.deere.com/assets/pdfs/navcom/White%20Papers/ntm_lrtk_algorithm_paper_2007.pdf
29. https://www.soest.hawaii.edu/met/Faculty/businger/PDF/CoLightningPPR.pdf (Mazany et al. 2002)
30. https://ri.conicet.gov.ar/handle/11336/128431
31. https://koreascience.kr/article/JAKO201436438764739.pdf

**Ionosphere / space weather**
32. https://indico.ictp.it/event/a08148/session/82/contribution/51/material/0/0.pdf
33. https://tu-dresden.de/bu/umwelt/geo/gi/gg/ressourcen/dateien/veroeffentlichungen/ion04f64.pdf
34. https://pub.geus.dk/en/publications/a-new-method-for-evaluation-of-the-ionospheric-modeling-error-in-/
35. https://www.swsc-journal.org/articles/swsc/full_html/2012/01/swsc120026/swsc120026.html
36. https://image.gsfc.nasa.gov/publication/document/2002_foster_etal.pdf
37. https://dspace.kaist.ac.kr/bitstream/10203/103238/1/000306912200002.pdf
38. https://www.icao.int/sites/default/files/sp-files/APAC/Documents/edocs/GBAS%20safety%20assessment%20guidance.pdf
39. https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2024SW004245
40. https://siliconangle.com/2024/05/13/geomagnetic-storm-disrupts-tractor-navigation-systems-across-numerous-us-farms/
41. https://ruralradio.com/krvn/news/biggest-solar-storm-in-decades-causes-disturbances-to-gps-rtk-networks-in-tractors
42. https://arxiv.org/pdf/2412.06608
43. https://upcommons.upc.edu/entities/publication/5366e564-5d98-44c8-8a04-fdac8be19c7c
44. https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2018JA026453
45. https://zendy.io/title/10.1002/2013gl057963
46. https://espace.curtin.edu.au/bitstream/handle/20.500.11937/6089/169367_169367.pdf?sequence=2
47. https://www.lantmateriet.se/globalassets/geodata/gps-och-geodetisk-matning/publikationer/ionospheric-effects-on-network-rtk.pdf
48. https://sidc.be/article/progress-sc25-0
49. https://www.metoffice.gov.uk/blog/2026/declining-phase-for-suns-activity-but-whats-next

**Field, equipment and safety**
50. https://itu-rpy.readthedocs.io/en/latest/apidoc/itu838.html (ITU-R P.838-3)
51. https://www.icao.int/sites/default/files/sp-files/SAM/Documents/2008/IONOSFERASEMINAR/Tropospheric%20Effect%20on%20GNSS.pdf
52. https://www.itu.int/dms_pubrec/itu-r/rec/p/R-REC-P.840-9-202308-I!!PDF-E.pdf
53. https://impacts.ucar.edu/en/publications/using-gps-multipath-to-measure-soil-moisture-fluctuations-initial/
54. https://files.igs.org/pub/resource/pubs/06_darmstadt/IGS%20WS%202006%20Papers%20PDF/11_PP_IGS06_erro_hugentobler.pdf
55. https://www.weather.gov/abq/northamericanmonsoon-lightning
56. https://www.weather.gov/media/owlie/OSHA_FS-3863_Lightning_Safety_05-2016.pdf
57. https://webarchive.library.unt.edu/web/20130213213517/http:/www.lightningsafety.noaa.gov/myths.htm
58. https://weather.gov/mlb/lightning_stats
59. https://geodeticsurvey.nc.gov/docs/2012-06-18_CORS_overview.pdf
60. https://help.fieldsystems.trimble.com/alloy/lightening-protection.htm
61. https://its.ntia.gov/media/30374/vog_s.pdf
62. https://www.electronics-notes.com/articles/antennas-propagation/tropospheric/tropo-lifts-ducting-enhanced-conditions.php
63. https://docs.fcc.gov/public/attachments/DOC-354668A1.pdf
64. https://docs.novatel.com/OEM7/Content/Commands/RTKTIMEOUT.htm
65. https://frontierprecision.com/wp-content/uploads/2025/09/Frontier-Precision-Trimble-R12i-GNSS-System-Spec-Sheet.pdf
66. https://www.northwestern.edu/risk/environmental-health-safety/docs/health-docs/osha-heat-index-guidelines.pdf
67. https://osha.prod.pace.dol.gov/heat-exposure/rulemaking
68. https://leica-geosystems.com/products/gnss-systems/smart-antennas/leica-gs18-t/store-tilt-functionality-gs18-t
69. https://www.angleofattack.com/far/part-107/107-51/
70. https://www.korecgroup.com/wp-content/uploads/2025/05/DJI-Matrice-350-RTK-Spec-sheet.pdf

**Data sources**
71. https://api.weather.gov
72. https://raw.githubusercontent.com/weather-gov/api/master/general-faqs.md
73. https://raw.githubusercontent.com/weather-gov/api/master/gridpoints.md
74. https://raw.githubusercontent.com/weather-gov/api/master/planned-outages.md
75. https://github.com/weather-gov/weather.gov (API fixtures under api-proxy/data/)
76. https://raw.githubusercontent.com/open-meteo/open-meteo/main/README.md
77. https://raw.githubusercontent.com/open-meteo/open-meteo/main/Sources/App/Gfs/GfsVariable.swift
78. https://raw.githubusercontent.com/open-meteo/open-meteo-website/main/src/routes/en/docs/gfs-api/+page.svelte
79. https://raw.githubusercontent.com/open-meteo/open-meteo-website/main/src/routes/en/terms/+page.svelte
80. https://raw.githubusercontent.com/Unidata/MetPy/main/staticdata/spc_day1otlk_20210317_1200_lyr.geojson
81. https://www.spc.noaa.gov/products/outlook/day1otlk_cat.lyr.geojson
82. https://noaa-goes19.s3.amazonaws.com/?list-type=2&prefix=GLM-L2-LCFA/
83. https://registry.opendata.aws/collab/noaa/
84. https://forum.blitzortung.org/showthread.php?pid=12520
85. https://mapservices.weather.noaa.gov/eventdriven/rest/services/radar/radar_base_reflectivity/MapServer
86. https://opengeo.ncep.noaa.gov/
87. https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png
88. https://radar.weather.gov/station/KEVX/standard

*References without a URL, cited by the fact-checkers:* Saastamoinen (1972); Davis et al. (1985) Radio Science 20(6); Bevis et al. (1992) JGR 97(D14); Niell (1996) JGR 101(B2); Boehm et al. (2006) VMF1; Beutler et al. (1988); Gregorius & Blewitt (1999) JGR 104(B7); Landau, Vollath & Chen (2002) J. GPS 1(2); Mazany, Businger, Gutman & Roeder (2002) Weather and Forecasting 17; Zilkoski et al. (1997) NOAA TM NOS NGS-58; ITU-R P.833 and P.838; Ledvina et al. (2002) GRL; LeVine (1987) review of the lightning RF spectrum.