# How the GPS Conditions app grades (version 1.4.0)

Plain summary of the rules in `public/js/grading.js` and `public/js/weather.js`. The quizzes and the learning area are written from this file; keep it in step with the code.

## Two grades
- Every hour and every day gets **two letters**: **FDOT network (FPRN)** and **Base + rover**. The base/rover grade uses the crew's settings: baseline length (default 5 km) and how corrections are sent (default UHF radio).
- Both grades are only about the GPS math (signal delay, corrections link, fixing). Crew safety (lightning, heat, wind) is not in the grades.

## Points and letters
- Each hour starts at 100 and loses points for each cause. Points are scaled by geomagnetic latitude (Pensacola is about 39° magnetic, factor about 0.79) and by work profile (RTK / Survey ×1.25).
- Letters: A ≥ 90 Excellent: go · B ≥ 80 Good: go · C ≥ 70 Fair: go, with extra checks · D ≥ 55 Poor: expect float / slow inits · F below 55 No-go for precision work.
- Day letter: a blend of the average and the worst work hour (60/40), **but if any work hour is a D or F, the day takes that hour's grade.** A calm morning can't average away a stormy afternoon. Calm stretches on a mixed day are shown as a "usable stretch", not a "best window".

## Space weather causes (ionosphere)
- The Kp used for an hour is the worst of: NOAA's 3-day forecast, the live 1-minute estimate (this hour and the next two), NOAA's Geospace model, NOAA's lower-48 (mid-latitude) K, and a NASA-modelled CME arrival (6 h before to 12 h after it).
- Live solar-wind readings (southward Bz, fast wind) count for this hour and the next two, because the spacecraft at L1 is about an hour upstream.
- On storm days (Kp 5+), 17-23 UT (11 am-5 pm CST) gets an extra penalty: storm-enhanced density plumes over the Southeast.
- Ionosphere causes count fully for the network. For base + rover they are scaled by baseline: ×0.6 up to 5 km, ×0.8 to 10 km, ×1.0 to 20 km, ×1.2 beyond.
- Flares, scintillation, aurora overhead and proton events hit every receiver alike, so both grades take them the same. So does PDOP.

## Local weather causes (lower atmosphere), from the NWS forecast and SPC outlooks
- Thunderstorm chance: under 15% → 0; 15-30% → −6; 30-50% → −14; over 50% → −20.
- SPC thunderstorm outlook at the site: general or marginal → −6; slight → −14; enhanced or higher → −20. The bigger of the thunder or SPC penalty is used, not both.
- A front passing within 3 hours (dewpoint falling 4 °C in 3 h, pressure changing 3 hPa in 3 h, or the wind turning 90° with the dewpoint falling 2 °C) → −18.
- Humid air (dewpoint 22 °C / about 72 °F or more) multiplies the thunder and front penalties by 1.5. Humidity alone adds nothing.
- Rain amount alone adds nothing: rain does not block L-band signals.
- These count fully for the network (storm cells and sea-breeze fronts are smaller than its station spacing). For base + rover they are scaled by baseline: ×0.5 up to 5 km, ×0.75 to 10 km, ×1.0 to 20 km, ×1.25 beyond.
- If the NWS forecast did not load: May-October, noon-7 pm local gets a default −6 for sea-breeze storms, and the grade card says the weather forecast is missing.

## Things that hold a grade down (caps)
- RTK / Survey storm rule: network, any hour at Kp 5 or more is held at D. Base + rover up to 5 km: held at D from Kp 6 (a short base shares most of the same ionosphere). Longer bases: from Kp 5.
- Thunderstorms likely (over 50%) or an SPC enhanced risk or higher: network held at D. Base + rover only when the baseline is over 10 km.
- Dst at or below −100 nT, or a TEC anomaly over 10 at the site: held at D (this hour and the next two).
- A hole in the Kp forecast during work hours: the day is held at D ("unknown, not quiet").
- Hurricane, Tropical Storm, Storm Surge or Extreme Wind Warning: the network is held at F (cell and power outages stop corrections). Base + rover is held at F only if its corrections go by cell; on UHF it is not.
- Base + rover baseline over 10 km: −8. Over 20 km: no better than C.

## Further out
- Days 4-45 get a trend word (Quiet trend, Unsettled, Active, Storm possible), not a letter. Book crews from the 3-day grade.
- If NASA's CME list does not load, the grade card says the letter does not include a possible eruption.
