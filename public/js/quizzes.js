// Field-crew quizzes: weather, space weather and RTK on the FDOT network and
// on an own base. 10 quizzes x 10 questions. Generated 5 Nov 2026 from
// docs/weather-and-gps.md (fact-checked knowledge base) and
// docs/app-grading-rules.md. Every question was checked by two independent
// reviewers (accuracy, clarity) and revised; a cross-check across all 100
// replaced 16 near-duplicates. "ref" points into the knowledge base.
// Printable copy with answer key: docs/field-quizzes.md.
// No crew-safety topics (by request) and nothing from the knowledge base's
// "Not settled" list.
export const QUIZZES = [
  {
    "id": "q01",
    "title": "Two layers of sky",
    "intro": "Every GNSS signal crosses two layers of sky on its way to your antenna, and these ten questions cover what each one does to your RTK fix, on FPRN and on your own base.",
    "questions": [
      {
        "q": "Where does most of the water vapor that causes wet delay sit?",
        "choices": [
          "About 60-1000 km up, in the ionosphere",
          "In the lowest 2-3 km of air",
          "Between 15 and 60 km up, above the weather",
          "Spread evenly from the ground up to the satellites"
        ],
        "answer": 1,
        "why": "The troposphere is mostly the lowest 15 km of air, and most of its water vapor is in the lowest 2-3 km. The 60-1000 km band is the ionosphere, which holds charged particles, not water vapor.",
        "ref": "KB §1 [16][27]"
      },
      {
        "q": "Which layer is 'dispersive', meaning its delay is different on L1, L2 and L5?",
        "choices": [
          "The ionosphere",
          "The dry part of the troposphere",
          "The wet part of the troposphere",
          "Both layers, equally"
        ],
        "answer": 0,
        "why": "Ionosphere delay depends on frequency: about 0.162, 0.267 and 0.291 m per TECU on L1, L2 and L5. That difference is what lets a dual-frequency receiver measure it. The troposphere delays every frequency by the same amount.",
        "ref": "KB §1 [32][33]; KB §6 [32]"
      },
      {
        "q": "Comparing L1 and L2 lets your receiver measure one layer's delay. Which delay looks the same on both frequencies, so it can't be measured that way?",
        "choices": [
          "The ionosphere delay, from charged particles",
          "Only the wet (water-vapor) part of the troposphere",
          "The whole troposphere delay, dry and wet",
          "Only the dry (hydrostatic) part of the troposphere"
        ],
        "answer": 2,
        "why": "The troposphere is non-dispersive: it delays L1 and L2 by the same amount, so comparing them shows nothing about it. Both the dry and the wet parts have to be modeled or cancelled between base and rover.",
        "ref": "KB §1 [16][27]; KB §8 myth 4"
      },
      {
        "q": "Dual-frequency can remove the ionosphere. So why does cm-level RTK still depend on the base and rover seeing the same ionosphere?",
        "choices": [
          "Dual-frequency only removes the ionosphere on baselines under 5 km",
          "The iono-free mix is noisy and loses the whole-cycle ambiguities a fix needs",
          "L2 is too weak to use on the rover's short occupations",
          "The network folds the ionosphere into its troposphere correction"
        ],
        "answer": 1,
        "why": "The ionosphere-free combination amplifies noise and loses the integer nature of the ambiguities, so RTK can't use it to get a quick fix. RTK still relies on the error cancelling between the two ends. The network keeps the ionosphere (dispersive) part separate from the troposphere part.",
        "ref": "KB §8 myth 4 [46]; KB §2.1 [16]"
      },
      {
        "q": "On a Gulf-coast summer day, which describes dry (hydrostatic) and wet delay correctly?",
        "choices": [
          "Wet about 2.3 m and smooth; dry about 0.3 m and patchy",
          "Both about 1 m, and both cancel fully between base and rover",
          "Dry about 2.3 m and patchy; wet under 1 cm",
          "Dry about 2.3 m and smooth; wet about 0.3 m and patchy"
        ],
        "answer": 3,
        "why": "Dry delay is large but smooth, can be predicted from pressure, and nearly cancels between base and rover. Wet delay is smaller (typically 0.25-0.35 m here) but patchy, changes fast, and models can't predict it. That makes it the local-weather problem.",
        "ref": "KB §1 [22][23][24]; KB §6"
      },
      {
        "q": "Your base and rover end up with a 1 cm difference in zenith delay. About how much height error should you expect?",
        "choices": [
          "About 0.3 cm",
          "About 1 cm",
          "About 3 cm",
          "About 10 cm"
        ],
        "answer": 2,
        "why": "Leftover atmosphere error lands mostly in height, amplified about 3 times. That is why weather trouble usually shows up first as vertical scatter in your check shots.",
        "ref": "KB §1 [25]; KB §6 [25]"
      },
      {
        "q": "RTK cancels most atmosphere error between the reference and the rover. What does weather actually hurt the position through?",
        "choices": [
          "The difference in delay between the reference and the rover",
          "The total delay at the rover, whatever the reference sees",
          "Raindrops weakening the signal at the rover",
          "Clouds cutting the number of satellites tracked"
        ],
        "answer": 0,
        "why": "The reference (your base, or the network's master or virtual station) and the rover see nearly the same atmosphere, so most of the delay cancels. Weather hurts only through what is different between the two ends. Rain and clouds do almost nothing to L-band signals.",
        "ref": "KB §1 [50][51]; KB §8 myth 1"
      },
      {
        "q": "In the app, the dewpoint is 23 °C (about 73 °F). There is no thunder chance and no front coming. How many points does the humidity cost?",
        "choices": [
          "−6 points",
          "−9 points",
          "−14 points",
          "0 points"
        ],
        "answer": 3,
        "why": "No thunder chance and no front means no penalty. In the app, a dewpoint of 22 °C or higher only multiplies the thunder and front penalties (by 1.5). Humidity on its own costs nothing, because an even air mass mostly cancels.",
        "ref": "APP RULES (Local weather causes); KB §8 myth 5 [17]"
      },
      {
        "q": "A tropical storm drops the air pressure at the job by 40 hPa. About how much does the zenith dry (hydrostatic) delay change?",
        "choices": [
          "About 9 mm",
          "About 9 cm",
          "About 90 cm",
          "About 2.3 m"
        ],
        "answer": 1,
        "why": "Dry delay changes by about 2.28 mm per hPa, so 40 hPa is about 9 cm. The KB gives about 5-14 cm for a hurricane pressure drop of 20-60+ hPa. 2.3 m is the whole dry delay at sea level, not the change.",
        "ref": "KB §6 [22]"
      },
      {
        "q": "Florida is flat; its highest point is about 105 m. Which troposphere error does that keep small, on FPRN and on your own base?",
        "choices": [
          "Wet delay from storms and sea-breeze fronts",
          "Ionosphere gradients during storms",
          "Error from height differences between the stations, or between base and rover",
          "Multipath from wet ground"
        ],
        "answer": 2,
        "why": "With little height difference, the dry-delay term that depends on height stays small (about 0.27-0.3 mm per metre, and receivers model most of it). In Florida the bigger troposphere problem is how much the wet delay varies.",
        "ref": "KB §2.2 [22]; KB §3.3 [22][25]"
      }
    ]
  },
  {
    "id": "q02",
    "title": "Water vapor and the numbers",
    "intro": "Ten quick questions on how much delay the air adds to GPS signals, why water vapor is the troublemaker, and why it shows up in your heights first.",
    "questions": [
      {
        "q": "Straight overhead at sea level, about how much delay does the dry air (hydrostatic delay) add to a GPS signal?",
        "choices": [
          "About 0.4 m",
          "About 2.3 m",
          "About 23 m",
          "About 2.3 cm"
        ],
        "answer": 1,
        "why": "Dry air adds about 2.3 m of zenith delay at sea level. It is large, but it is smooth, predictable from air pressure, and nearly cancels between base and rover.",
        "ref": "KB §1 [22]; KB §6 [22]"
      },
      {
        "q": "What is the normal range of zenith wet delay, the delay caused by water vapor?",
        "choices": [
          "0 to about 0.4 m",
          "About 2 to 3 m",
          "0 to about 4 cm",
          "About 1 to 2 m"
        ],
        "answer": 0,
        "why": "Wet delay runs from 0 to about 0.4 m, and up to about 0.5 m in extreme cases. The 2-3 m figure is the total delay (dry plus wet), not the wet part.",
        "ref": "KB §1 [23][24]; KB §6 [23]"
      },
      {
        "q": "On a typical Gulf-coast summer day around Pensacola, about how big is the zenith wet delay?",
        "choices": [
          "About 2-5 cm",
          "About 1.0-1.5 m",
          "About 0.25-0.35 m",
          "About 2.3 m"
        ],
        "answer": 2,
        "why": "A Gulf-coast summer typically gives about 0.25-0.35 m of wet delay. That puts our summers near the top of the 0-0.4 m range.",
        "ref": "KB §1 [23][24]"
      },
      {
        "q": "A forecast shows 45 mm of precipitable water (PW) over the job. About how much zenith wet delay does that mean?",
        "choices": [
          "About 4.5 cm",
          "About 28-29 cm",
          "About 2.9 m",
          "About 45 cm"
        ],
        "answer": 1,
        "why": "Zenith wet delay is about 6.2-6.5 times PW, so 45 mm gives roughly 28-29 cm. For comparison, the KB works out 43-48 mm of PW to about 27-31 cm. 45 cm would mean multiplying by 10, which is too high.",
        "ref": "KB §6 [23][24]; KB §7.1 B [77]"
      },
      {
        "q": "Compared with a satellite straight overhead, about how much more atmosphere delay does a signal from a satellite at 10° elevation carry?",
        "choices": [
          "About 1.2 times",
          "About 2 times",
          "About 10 times",
          "About 5.5-5.8 times"
        ],
        "answer": 3,
        "why": "The slant factor at 10° is 1/sin(10°) = 5.76. Mapping functions that allow for the earth's curve give about 5.5-5.6. Either way, a 10° satellite carries more than five times the zenith delay.",
        "ref": "KB §6 [27]"
      },
      {
        "q": "Why do low satellites near the horizon carry more troposphere delay than high ones?",
        "choices": [
          "Their signal crosses much more air on its slanted path",
          "They broadcast on a frequency the air slows more",
          "Receivers stop correcting signals below 15°",
          "Rain near the horizon blocks more signal"
        ],
        "answer": 0,
        "why": "A low signal crosses far more of the lower atmosphere on its slanted path, which is where the slant factor comes from. The troposphere delays every frequency the same, and rain itself does almost nothing to L-band signals.",
        "ref": "KB §6 [27]; KB §1 [16][27][50][51]"
      },
      {
        "q": "A sea-breeze front is sitting between your base and rover on a muggy afternoon. Where would you expect the leftover atmosphere error to show up first on your check shots?",
        "choices": [
          "Horizontal (northing/easting) scatter",
          "Higher PDOP readings",
          "Bearing errors between points",
          "Vertical (height) scatter"
        ],
        "answer": 3,
        "why": "Leftover atmosphere error lands mostly in height, so weather problems usually show up first as vertical scatter. Be extra careful with elevation work on days like this.",
        "ref": "KB §1 [25]; KB §6 [25]; KB §3.4 [1][2][3]"
      },
      {
        "q": "On a Florida summer day, about how big is the total zenith troposphere delay, dry plus wet?",
        "choices": [
          "About 0.3 m",
          "About 2.3 m",
          "About 2.5-2.7 m",
          "About 5.5 m"
        ],
        "answer": 2,
        "why": "Dry air adds about 2.3 m, and a Gulf-coast summer adds about 0.25-0.35 m of wet delay, so the total is about 2.5-2.7 m. 2.3 m is the dry part alone.",
        "ref": "KB §6 [22][23]; KB §1 [22][23][24]"
      },
      {
        "q": "Oxygen in the air weakens a GPS signal slightly: about 0.035 dB straight overhead. About how much at 5° elevation?",
        "choices": [
          "About 0.04 dB",
          "About 0.4 dB",
          "About 4 dB",
          "About 40 dB"
        ],
        "answer": 1,
        "why": "Oxygen loss is about 0.035 dB at zenith and about 0.4 dB at 5°, because the low signal crosses more air. Both are tiny. The atmosphere matters to RTK mainly through delay, not signal loss.",
        "ref": "KB §6 [51]"
      },
      {
        "q": "Weather leaves a 2 cm difference in zenith wet delay between base and rover. About how big is that difference along the path of a satellite at 10° elevation?",
        "choices": [
          "About 2 cm",
          "About 4 cm",
          "About 11-12 cm",
          "About 40 cm"
        ],
        "answer": 2,
        "why": "Multiply by the slant factor at 10°, which is about 5.5-5.8: 2 cm becomes roughly 11-12 cm along that signal path. This is one reason a 10-15° elevation mask is typical.",
        "ref": "KB §6 [27][3]"
      }
    ]
  },
  {
    "id": "q03",
    "title": "How FDOT network RTK works",
    "intro": "Ten quick questions on how network RTK builds your corrections: interpolation between stations, MAX vs iMAX vs VRS, GGA, mountpoints, and the datum behind your coordinates.",
    "questions": [
      {
        "q": "How does network RTK get corrections for a rover that sits between reference stations?",
        "choices": [
          "It uses only the single nearest station, like your own base",
          "It interpolates corrections between the surrounding reference stations",
          "It averages every station in the state with equal weight",
          "It waits for the rover to fix, then sends a stored correction"
        ],
        "answer": 1,
        "why": "Network RTK interpolates corrections between the reference stations around you. That is what lets it cover long gaps between stations without relying on a single nearby base.",
        "ref": "KB §2.1 [16]"
      },
      {
        "q": "In network RTK, the correction differences are split into a dispersive part and a non-dispersive part. What goes in the non-dispersive part?",
        "choices": [
          "The ionosphere",
          "Multipath at the rover",
          "Troposphere, orbit and clock errors",
          "Antenna height errors at the stations"
        ],
        "answer": 2,
        "why": "The non-dispersive part is troposphere plus orbit and clock. These are the same on every frequency, so a dual-frequency receiver cannot remove them; they have to be modeled or cancelled between stations. The ionosphere is the dispersive part.",
        "ref": "KB §2.1 [16]; KB §1 [16][27]"
      },
      {
        "q": "With a MAX correction stream, who does the interpolation?",
        "choices": [
          "The rover",
          "The network server",
          "The nearest reference station",
          "The cellular carrier"
        ],
        "answer": 0,
        "why": "With MAX, the rover does the interpolating itself. With iMAX and VRS, the server does it.",
        "ref": "KB §2.1 [16]"
      },
      {
        "q": "With both iMAX and VRS, the server does the interpolation. What is the main difference between them?",
        "choices": [
          "iMAX has the rover interpolate; VRS has the server interpolate",
          "VRS works without your position; iMAX needs a GGA from the rover",
          "iMAX is built for single-base work; VRS is built for network work",
          "iMAX ties corrections to a real master station; VRS ties them to a virtual one"
        ],
        "answer": 3,
        "why": "Both are interpolated by the server. iMAX refers the corrections to a real master station, while VRS refers them to a virtual station. Both need the rover to send GGA.",
        "ref": "KB §2.1 [16][20]"
      },
      {
        "q": "Why does the rover have to send an NMEA GGA message on a VRS, iMAX or auto mountpoint?",
        "choices": [
          "So the caster can log your job hours for the account",
          "So the server knows the rover's PDOP before sending corrections",
          "So the server knows where you are and can build corrections for your location",
          "So the caster can confirm the rover already has a fixed solution"
        ],
        "answer": 2,
        "why": "These mountpoints build corrections for your location, so the server needs your approximate position, and GGA is how the rover reports it. Without GGA, corrections built for your spot can't be made.",
        "ref": "KB §2.1 [20]"
      },
      {
        "q": "In what form does FPRN send its corrections?",
        "choices": [
          "Standard RTCM over NTRIP, usable by any receiver brand",
          "A format that only one receiver brand can read",
          "Daily files you download for post-processing",
          "A UHF radio broadcast from each station"
        ],
        "answer": 0,
        "why": "FPRN is a free statewide real-time CORS network run by FDOT. It sends standard RTCM corrections over NTRIP that any receiver brand can use. Users must register for an account.",
        "ref": "KB §2.1 [8][14]"
      },
      {
        "q": "Network interpolation assumes the error field between stations is smooth (linear). What happens to the part that is not linear?",
        "choices": [
          "Dual-frequency tracking removes it at the rover",
          "It is left over as error, and grows with station spacing",
          "It cancels fully when five or more stations are used",
          "It shows up in horizontal position but not height"
        ],
        "answer": 1,
        "why": "Interpolation fits a smooth field between stations, so anything non-linear is left over at the rover. The wider the station spacing, the bigger that leftover error.",
        "ref": "KB §2.1 [17]"
      },
      {
        "q": "Which datum are FDOT network RTK corrections referenced to?",
        "choices": [
          "WGS84 at the current epoch",
          "NAD83(1986)",
          "NATRF2022",
          "NAD83(2011) epoch 2010.00"
        ],
        "answer": 3,
        "why": "FPRN corrections are referenced to NAD83(2011) epoch 2010.00 on the GRS80 ellipsoid. NATRF2022 is part of the NGS modernization that will eventually replace NAD83, but FPRN corrections are on NAD83(2011).",
        "ref": "KB §2.1 [8][14]"
      },
      {
        "q": "Working on NAD83(2011), which NGS geoid model is normally used to get NAVD88 heights?",
        "choices": [
          "GEOID18",
          "GEOID12B",
          "EGM2008",
          "GEOID99"
        ],
        "answer": 0,
        "why": "GEOID18 is the usual NGS geoid model for NAVD88 heights on NAD83(2011).",
        "ref": "KB §2.1 [8]"
      },
      {
        "q": "How far apart are the stations in a typical real-time network?",
        "choices": [
          "About 5-10 km",
          "About 15-20 km",
          "About 50-70 km",
          "About 150-200 km"
        ],
        "answer": 2,
        "why": "Real-time networks are commonly built with stations about 50-70 km apart. That is much longer than a short own-base baseline, and it is why storm cells smaller than the spacing are invisible to interpolation.",
        "ref": "KB §2.1 [4]; KB §2.2 [17][31]"
      }
    ]
  },
  {
    "id": "q04",
    "title": "Network RTK in Florida weather",
    "intro": "Ten questions on how Panhandle storms, fronts and space weather affect FPRN network RTK, what tends to fail first, and what to check before you head out.",
    "questions": [
      {
        "q": "A single thunderstorm cell about 5 km across sits over your rover, between FPRN stations. Why can't the network correct for it?",
        "choices": [
          "Raindrops block the L-band signal at the rover",
          "Dual-frequency receivers already remove it, so the network ignores it",
          "It is smaller than the station spacing, so the smooth field interpolated between stations misses it",
          "The network only corrects the ionosphere, not weather"
        ],
        "answer": 2,
        "why": "Network interpolation fits a smooth, linear field between stations, so a cell a few km across is invisible to it. Raindrops themselves barely affect L-band. Dual-frequency removes only the ionosphere, not water vapor.",
        "ref": "KB §2.2 [17][31]; KB §2.1 [16][17]"
      },
      {
        "q": "A sea-breeze front is lying across your job, between FPRN stations. Where does the leftover error mostly show up?",
        "choices": [
          "Mostly in horizontal position, along the line of the front",
          "Mostly in height, along with a lower fix rate",
          "In the satellite count, which drops as the front arrives",
          "In PDOP, which rises as the front passes"
        ],
        "answer": 1,
        "why": "The leftover wet delay at the rover lands mostly in height, and the fix rate drops. Weather changes the signal delay, not the satellite geometry, so PDOP and satellite count are not where it shows.",
        "ref": "KB §2.2 [17][31]; KB §1 [25]"
      },
      {
        "q": "A cold front is forecast to pass Pensacola around 1 pm. You are working on FPRN. What is the best plan?",
        "choices": [
          "Keep working, since the network models the troposphere between stations",
          "Work through it, but double your occupation time on each point",
          "Raise the elevation mask to 20° and keep going",
          "Stop for the passage window and re-shoot after the front clears"
        ],
        "answer": 3,
        "why": "NRCan tells network (RTN) users, not just single-base users, to avoid surveying while a front passes. A front breaks the smooth-field assumption that network interpolation depends on, and longer occupations or a higher mask do not fix that.",
        "ref": "KB §2.2 [6][7]; KB §4"
      },
      {
        "q": "Why might a rover in far-west Escambia County get weaker FPRN corrections than a rover in central Florida?",
        "choices": [
          "It may be outside the station polygon, so corrections are extrapolated instead of interpolated",
          "The ground is much higher there, so height differences to the stations grow",
          "Frequent coastal rain there weakens the cell signal that carries the corrections",
          "The caster's internet connection runs longer to the west"
        ],
        "answer": 0,
        "why": "Network RTK degrades outside the station polygon, where corrections are extrapolated, not interpolated. Pensacola sits at Florida's western edge, so it may be an edge area. Florida is flat, so height offsets are small, and rain does not weaken cellular signals.",
        "ref": "KB §2.2 [18][19]; KB §2.2 [22]; KB §8 myth 2"
      },
      {
        "q": "On a storm day (Kp 5+), the app adds an extra penalty from 17 to 23 UT (11 am-5 pm CST, noon-6 pm CDT). What is that penalty for?",
        "choices": [
          "Afternoon sea-breeze thunderstorms",
          "Poorer afternoon satellite geometry and higher PDOP",
          "Storm-enhanced density (SED) plumes over the Southeast",
          "Ionospheric ripples stirred up by hurricanes"
        ],
        "answer": 2,
        "why": "Over the Southeast US, the main storm-time ionospheric structures are SED plumes, which show up in the 17-23 UT window. The sea-breeze default is a separate local-weather rule, and hurricane ripples in the ionosphere are negligible.",
        "ref": "KB §2.2 [36]; KB §6 [36]; APP RULES"
      },
      {
        "q": "A tropical storm hits the Panhandle. For FPRN network RTK, what usually fails first?",
        "choices": [
          "Cell service and power to the caster or stations",
          "Ionospheric gradients stirred up by the storm",
          "Rain fade on the satellite signals in heavy bands",
          "Vertical accuracy, from the extra water vapor"
        ],
        "answer": 0,
        "why": "In hurricanes, the comms and power chain breaks before the atmospheric physics does, and corrections stop entirely. Storms hurt cellular through power loss, backhaul damage and congestion, not through rain fade.",
        "ref": "KB §2.3 [59][63]; KB §1"
      },
      {
        "q": "Your cell link is solid, but storms are building and the ionosphere is active. On FPRN, what do you usually notice first?",
        "choices": [
          "Fixes that look good but are wrong",
          "PDOP jumping above 6",
          "Fewer satellites tracked as the clouds thicken",
          "A lower fix rate and a longer time to fix"
        ],
        "answer": 3,
        "why": "Once comms are fine, the fix rate and time-to-fix suffer first, then vertical scatter. Wrong fixes that look fixed come at higher disturbance levels. Clouds and rain do not block the satellite signals.",
        "ref": "KB §2.3; KB §8 myth 1"
      },
      {
        "q": "On bad days, network RTK has an extra wrong-fix risk that your own base does not. What is it?",
        "choices": [
          "Network corrections cannot be checked with a check shot",
          "One biased correction is shared by every user on the network at once",
          "Network rovers never drop to float, so you cannot tell when there is a problem",
          "Network corrections are refreshed only once a minute"
        ],
        "answer": 1,
        "why": "Network RTK has a failure mode of its own: one biased correction reaches every user at the same time. Check shots on known control are still the way to catch it.",
        "ref": "KB §2.3 [47]; KB §2.4 item 7"
      },
      {
        "q": "Mid-job on FPRN, the controller says connected and FIXED, but the correction age reads 12 seconds and is climbing. What should you make of it?",
        "choices": [
          "It is normal; correction age does not matter while the receiver says FIXED",
          "The FPRN network has gone down statewide, so pack up for the day",
          "Fresh corrections have stalled or are late, so treat the fix as suspect and take a check shot",
          "A geomagnetic storm has started, so check the space-weather grade"
        ],
        "answer": 2,
        "why": "A climbing correction age means no fresh corrections are reaching the rover, even though the session shows 'connected'. Receivers can keep showing FIXED for up to 60 s after corrections stop, so suspect any age beyond a few seconds and check on known control.",
        "ref": "KB §2.3 [21]; KB §2.4 item 5; KB §7.2 F [64]; KB §8 myth 6"
      },
      {
        "q": "Before an FPRN job, where should you check radar for storms or fronts?",
        "choices": [
          "Over the job site",
          "Over the job, the surrounding stations, and the area between them",
          "Over the nearest reference station",
          "Along the coast, where the sea breeze forms"
        ],
        "answer": 1,
        "why": "The pre-job checklist says to look anywhere in the region between the job and the surrounding stations, not just at the site. Weather away from the site still matters because it skews the interpolated correction at your rover.",
        "ref": "KB §2.4 item 4; KB §2.2 [17][31]"
      }
    ]
  },
  {
    "id": "q05",
    "title": "Own base + rover basics",
    "intro": "Ten questions on the GPS math behind running your own base and rover: base errors, baseline length, the ppm term, storms and height differences.",
    "questions": [
      {
        "q": "Your base is set up on coordinates that are 3 cm off. What happens to your rover points?",
        "choices": [
          "The rover averages the error out over a long occupation",
          "The error grows with distance and reaches 3 cm only at about 10 km",
          "Every rover point shifts by the same 3 cm",
          "Only points shot close to the base are affected"
        ],
        "answer": 2,
        "why": "The rover position is the base coordinates plus the measured baseline. Any error at the base, in its coordinates, setup or height, passes one-to-one into every rover point. A longer occupation does not remove it.",
        "ref": "KB §3.1 [12]"
      },
      {
        "q": "Up to about what baseline length can you ignore distance-dependent atmospheric errors when getting a fix?",
        "choices": [
          "About 2 km",
          "About 10 km",
          "About 30 km",
          "About 50 km"
        ],
        "answer": 1,
        "why": "Below about 10 km these atmospheric errors can be ignored for getting a fix. Beyond 10 km, fixing (ambiguity resolution) gets steadily less reliable, and agency practice caps single-base work at about 10-20 km.",
        "ref": "KB §3.2 [28]; KB §6"
      },
      {
        "q": "Your rover spec is 8 mm + 1 ppm horizontal and your baseline is 4 km. What is the nominal horizontal error?",
        "choices": [
          "8 mm",
          "4 mm",
          "40 mm",
          "12 mm"
        ],
        "answer": 3,
        "why": "1 ppm is 1 mm per km, so 4 km adds 4 mm on top of the 8 mm constant, giving 12 mm. Remember that vendor specs are usually RMS, so roughly double that for 95%.",
        "ref": "KB §3.2 [11]; KB §6 [11]"
      },
      {
        "q": "What does the 1 ppm term in a single-base RTK spec cover?",
        "choices": [
          "All distance-dependent errors, mostly ionosphere",
          "Tropospheric delay between base and rover only",
          "Base setup and base coordinate error",
          "Extra error allowed during a geomagnetic storm"
        ],
        "answer": 0,
        "why": "In normal conditions the 1 ppm term covers all distance-dependent errors: mostly ionosphere, plus troposphere and orbit. Calling it tropospheric error is a common myth, and it is not a storm limit.",
        "ref": "KB §3.2 [11]; KB §8 myth 12"
      },
      {
        "q": "On a stormy or ionospherically disturbed day, how should you treat the 1 ppm term?",
        "choices": [
          "As a hard ceiling, so errors stay under 1 mm per km",
          "As a term that applies only to network RTK, not to your own base",
          "As a normal-day figure that storm-day errors can go well beyond",
          "As a figure that roughly doubles, to about 2 ppm, on storm days"
        ],
        "answer": 2,
        "why": "The 1 ppm term describes normal conditions and is not a storm limit. On disturbed days, real errors can go well past it, and usable baselines can shrink to a few km.",
        "ref": "KB §3.2 [11][33]"
      },
      {
        "q": "The ionosphere's vertical TEC changes by 1 TECU per 100 km across the ground. About how much L1 error is that per km of baseline?",
        "choices": [
          "0.16 ppm",
          "1.6 ppm",
          "16 ppm",
          "0.6 ppm"
        ],
        "answer": 1,
        "why": "1 TECU per 100 km is about 1.6 mm per km, or 1.6 ppm, on L1, and up to about 3 times that at low elevation. Writing it as 0.16 ppm is a known arithmetic trap.",
        "ref": "KB §3.2 [32]; KB §6; KB §8 myth 14"
      },
      {
        "q": "You start your base on an autonomous ('here') position instead of on known control. What happens to the rover points?",
        "choices": [
          "They are shifted by metres unless the job is later moved onto control",
          "They are fine once the rover gets a fixed solution",
          "Only heights are affected; horizontal stays good",
          "Only the first few points are off, until the base averages out"
        ],
        "answer": 0,
        "why": "An autonomous position can be metres off, and base errors pass one-to-one into every rover point. A fixed solution does not remove a base coordinate error, so the job has to be moved onto control afterwards.",
        "ref": "KB §3.6 [12]; KB §3.1 [12]"
      },
      {
        "q": "Near sea level, about how much does zenith hydrostatic delay change per metre of height difference between base and rover?",
        "choices": [
          "About 3 mm",
          "About 0.03 mm",
          "About 3 cm",
          "About 0.3 mm"
        ],
        "answer": 3,
        "why": "Near sea level, zenith hydrostatic delay changes by about 0.27-0.3 mm per metre of height. If left unmodeled, that would amplify to about 1 mm of height error per metre.",
        "ref": "KB §3.3 [22][25]; KB §6"
      },
      {
        "q": "Your base is on a 40 m bluff and the rover is at the shore. Which statement best describes the height-difference effect?",
        "choices": [
          "About 11 cm of delay difference, enough to stop a fix",
          "About 1 mm, too small to matter",
          "About 11 mm, mostly removed by the receiver's troposphere model",
          "About 11 mm the receiver cannot model, so about 33 mm of height error"
        ],
        "answer": 2,
        "why": "40 m at about 0.27-0.3 mm per metre is about 11 mm of zenith hydrostatic delay, and standard receiver troposphere models remove most of it. In the Panhandle it is small next to weather-gradient effects, though NRCan still advises similar base and rover heights.",
        "ref": "KB §3.3 [6][22][25]"
      },
      {
        "q": "Your base was set on assumed coordinates that are 20 m off. Roughly how much extra baseline error does that add?",
        "choices": [
          "About 2 ppm",
          "About 0.2 ppm",
          "About 20 ppm",
          "None, it only shifts the points"
        ],
        "answer": 0,
        "why": "Trimble's figure is roughly 1 ppm of baseline error per 10 m of base coordinate error, so 20 m gives about 2 ppm. That comes on top of every rover point being shifted, so the shift is not the only effect.",
        "ref": "KB §3.6 [12]; KB §6 [12]"
      }
    ]
  },
  {
    "id": "q06",
    "title": "Base + rover in weather and radio",
    "intro": "Ten questions on how weather between your base and rover, your radio or cell link, and your base setup affect the RTK points you shoot on your own base.",
    "questions": [
      {
        "q": "Your base is on Pensacola Beach and your rover is 4 km inland. It is raining hard at the rover, the base is in sun, and the temperature is clearly different at each end. What does NGS single-base guidance say to do?",
        "choices": [
          "Keep working, because a 4 km baseline is short enough to cancel it",
          "Wait for uniform conditions or move the base",
          "Keep working, because rain itself barely affects the GPS signal",
          "Raise the elevation mask to 15° and keep shooting"
        ],
        "answer": 1,
        "why": "NGS advises against RT work when weather is obviously different at base and rover. The fix is to wait for uniform conditions or move the base. Rain itself is harmless to the signal; the problem is the different air at each end.",
        "ref": "KB §3.4 [1][2][3]"
      },
      {
        "q": "An afternoon sea-breeze front sits between your coastal base and your inland rover. Why does that hurt your RTK points?",
        "choices": [
          "Rain along the front blocks the L-band signal at the rover",
          "The front raises ionospheric TEC over the rover",
          "Humid air behind the front weakens the satellite signal",
          "Different water vapor at each end, so the wet delay stops cancelling"
        ],
        "answer": 3,
        "why": "Base + rover RTK works because both ends see nearly the same atmosphere. A sea-breeze front between them puts different water vapor at each end, so the wet delay stops cancelling. Rain and humid air do not weaken L-band signals.",
        "ref": "KB §1, §3.4, §4, §8 myths 1 and 5"
      },
      {
        "q": "A cold front passes through the job at 10:30, in the middle of your base + rover session on a 4 km baseline. What is the right move?",
        "choices": [
          "Stop during the passage and re-shoot points taken during it after it clears",
          "Keep shooting, because a 4 km baseline is too short for a front to matter",
          "Switch the corrections from UHF to cellular until the front has gone by",
          "Shorten each occupation so fewer epochs are logged while the front passes"
        ],
        "answer": 0,
        "why": "A front passing mid-session breaks the cancellation between base and rover, even on a short baseline. The KB says to avoid the passage window and re-shoot after it passes. Changing the radio link does nothing about the atmosphere.",
        "ref": "KB §3.4, §4"
      },
      {
        "q": "Using the usual 4/3-earth rule, about how far beyond the geometric (line-of-sight) horizon does your UHF radio horizon reach?",
        "choices": [
          "About a third beyond",
          "No farther than the geometric horizon",
          "About 15% beyond",
          "About twice as far"
        ],
        "answer": 2,
        "why": "The radio horizon is about 15% beyond the geometric horizon. 'A third beyond' is a common myth. Ducting on calm, clear nights can briefly carry signals much farther, but that is not normal range.",
        "ref": "KB §6 [62]; KB §8 myth 15 [62]; KB §3.5 [62]"
      },
      {
        "q": "After a morning rain, your UHF corrections keep dropping out when the rover goes into a wooded lot. It is no longer raining. What is the most likely cause?",
        "choices": [
          "Raindrops still in the air are attenuating the 450 MHz signal",
          "A geomagnetic storm is disturbing the radio link",
          "Ducting is carrying in distant signals during the day",
          "Wet, leafy vegetation in the radio path is costing several dB"
        ],
        "answer": 3,
        "why": "The main weather weakness of UHF is wet, leafy vegetation in the path, which costs several dB. Rain itself causes negligible attenuation at UHF.",
        "ref": "KB §3.5 [50][61], §8 myth 2"
      },
      {
        "q": "During a big storm, NTRIP corrections over cellular stop coming in. What usually causes this?",
        "choices": [
          "Cell towers losing power or backhaul",
          "Rain fade on the cellular signal",
          "Wet foliage absorbing the cell signal at the rover",
          "Lightning static jamming the cell signal"
        ],
        "answer": 0,
        "why": "Storms break cellular through power loss, backhaul damage and congestion, not through rain fade. Rain attenuation at sub-6 GHz cellular is negligible, and lightning static on cellular is only transient.",
        "ref": "KB §2.3 [63], §3.5, §8 myth 2"
      },
      {
        "q": "On a calm, clear night with an inversion over the Gulf, your rover on UHF starts picking up interference on your channel. What is happening, and what helps?",
        "choices": [
          "Heavy dew on the radio antenna; wipe it and raise the antenna higher",
          "Ionospheric scintillation; raise the elevation mask and wait it out",
          "A weak base battery; swap it and restart the base",
          "Ducting is bringing in distant signals on your channel; change channel or switch to cell"
        ],
        "answer": 3,
        "why": "Ducting on calm, clear nights with inversions can carry distant co-channel UHF signals hundreds to thousands of km. The KB fix is a unique station ID, a channel change, or corrections by cell, which ducting does not materially affect.",
        "ref": "KB §3.5 [62], §4"
      },
      {
        "q": "The app counts thunder and front penalties fully for the network. How much of them does it count for base + rover on a 4 km baseline?",
        "choices": [
          "All of them (×1.0)",
          "Three quarters (×0.75)",
          "Half (×0.5)",
          "None; local weather is left out of the base + rover grade"
        ],
        "answer": 2,
        "why": "Up to 5 km the app scales local-weather penalties by ×0.5, because a short base and rover mostly share the same air. ×0.75 is for 5-10 km. Storm cells and sea-breeze fronts are smaller than the network's station spacing, so they count fully there.",
        "ref": "APP RULES (Local weather causes); KB §4 (Convective cell / sea-breeze row)"
      },
      {
        "q": "After heavy rain, there is standing water right next to the spot where you planned to set the base. What is the concern?",
        "choices": [
          "The water only matters for rover points shot near the puddles",
          "Ground-bounce multipath at the base will contaminate every rover point",
          "There is none, because rain and water do not affect GPS signals",
          "The water will lower the UHF radio range but not the positions"
        ],
        "answer": 1,
        "why": "Wet ground or standing water next to the base increases ground-bounce multipath, and that contaminates every rover point. Do not set the base beside ponded water, and use a 15° mask.",
        "ref": "KB §3.6 [53], §4"
      },
      {
        "q": "Midway through a session, you notice one base tripod leg has sunk into rain-soaked sand. What has happened to your rover points?",
        "choices": [
          "Every point shot after the shift is off by the same amount",
          "Only the next point is affected; later points are fine",
          "The error averages out over the session",
          "The receiver will have dropped to float, so no bad points were stored"
        ],
        "answer": 0,
        "why": "A bumped tripod or legs sinking into soaked sand shifts every rover point by the same amount, because base errors pass one-to-one into the rover. The receiver can stay fixed, so a check shot on known control is how you find it.",
        "ref": "KB §3.1 [12], §3.6 [12], §4"
      }
    ]
  },
  {
    "id": "q07",
    "title": "Space weather over Florida",
    "intro": "Ten questions on how the ionosphere and space weather affect your RTK fixes around Pensacola, both on the FPRN network and on your own base and rover.",
    "questions": [
      {
        "q": "How much signal delay does 1 TECU (one unit of total electron content) add on GPS L1?",
        "choices": [
          "About 1.6 cm",
          "About 16 cm",
          "About 27 cm",
          "About 1.6 m"
        ],
        "answer": 1,
        "why": "On L1, 1 TECU adds about 0.162 m of delay, roughly 16 cm. About 27 cm is the figure for L2, which is a lower frequency and gets delayed more.",
        "ref": "KB §6 [32]"
      },
      {
        "q": "The same amount of TEC is overhead. Which signal gets the most ionospheric delay?",
        "choices": [
          "L1",
          "L2",
          "L5",
          "All three are delayed the same"
        ],
        "answer": 2,
        "why": "The ionosphere is dispersive, so lower frequencies get delayed more: L1 0.162, L2 0.267 and L5 0.291 m per TECU. The same delay on every frequency describes the troposphere, not the ionosphere.",
        "ref": "KB §1 [32]; KB §6 [32]"
      },
      {
        "q": "Which space-weather effects does the app take the same in both grades, however short your baseline?",
        "choices": [
          "Solar flares and scintillation",
          "Storm-time ionosphere gradients at high Kp",
          "Storm-enhanced density (SED) plumes in the afternoon"
        ],
        "answer": 0,
        "why": "Flares, scintillation, aurora overhead and proton events hit every receiver alike, so a short baseline does not help and both grades take them the same. Gradient-type ionosphere causes are scaled down for a short base (×0.6 up to 5 km).",
        "ref": "APP RULES (Space weather causes)"
      },
      {
        "q": "You run a 5 km baseline, there is a vertical TEC gradient of 1 TECU per 100 km, and the satellite is high in the sky. About how much L1 differential delay should you expect?",
        "choices": [
          "About 0.8 mm",
          "About 8 cm",
          "About 16 cm",
          "About 8 mm"
        ],
        "answer": 3,
        "why": "1.6 mm per km times 5 km is about 8 mm. Satellites low on the horizon can see up to about 3 times that.",
        "ref": "KB §3.2 [32]"
      },
      {
        "q": "On a storm day (Kp 5 or higher), which Pensacola hours does the app give an extra penalty for storm-enhanced density plumes?",
        "choices": [
          "6 am to 11 am CST",
          "5 pm to 11 pm CST",
          "11 am to 5 pm CST",
          "Midnight to 6 am CST"
        ],
        "answer": 2,
        "why": "The SED plume window is about 17-23 UT. That is 11 am to 5 pm CST (noon to 6 pm CDT). The 5 pm to 11 pm choice uses the UT hour numbers as if they were local time.",
        "ref": "APP RULES (Space weather causes); KB §6 [36]; KB §7.2 D [36]"
      },
      {
        "q": "Dst drops to −120 nT at 10 am. What does the app do to the grades?",
        "choices": [
          "Nothing; Dst is shown but not graded",
          "Holds them at D for this hour and the next two",
          "Holds them at F for the rest of the day",
          "Holds them at C until Kp drops"
        ],
        "answer": 1,
        "why": "Dst at or below −100 nT, or a TEC anomaly over 10 at the site, holds the grade at D for this hour and the next two. −120 nT is past that line.",
        "ref": "APP RULES (Things that hold a grade down)"
      },
      {
        "q": "The app scales space-weather points by magnetic latitude. About what magnetic latitude does it use for Pensacola?",
        "choices": [
          "About 50°",
          "About 39°",
          "About 35°",
          "About 30°"
        ],
        "answer": 1,
        "why": "Pensacola's dipole (magnetic) latitude is about 39°, which gives a scaling factor of about 0.79. About 35° is Miami's value. Magnetic latitude is not the same as the latitude on a map.",
        "ref": "APP RULES (Points and letters); KB §6 [39]"
      },
      {
        "q": "A hurricane is out in the Gulf. Will its ionospheric disturbances (TIDs) hurt your RTK fixes?",
        "choices": [
          "No. They are about 0.2 TECU or less, too small to matter for RTK",
          "Yes. They are about as strong as a G3 storm",
          "Yes. They add over 1 ppm, so shorten your baselines",
          "Only on the network; a short base cancels them"
        ],
        "answer": 0,
        "why": "Thunderstorm and hurricane TIDs are about 0.2 TECU or less (about 3 cm or less), with a gradient near 0.23 mm per km, under 0.5 ppm. That is too small to matter for RTK on either setup, so the grading adds no ionosphere penalty for them. The real hurricane risk is losing cell service, power and CORS stations.",
        "ref": "KB §6 [44]; KB §7.2 D [44][45]; KB §8 item 8 [44][45]"
      },
      {
        "q": "During the May 2024 G5 geomagnetic storm, what went wrong for many RTK users?",
        "choices": [
          "Only the cell links dropped; corrections that got through were good",
          "Florida's low latitude kept network RTK working normally",
          "The RTK corrections themselves were corrupted",
          "Only baselines over 20 km lost their fix"
        ],
        "answer": 2,
        "why": "In May 2024 the G5 storm corrupted the RTK corrections themselves, not just the cellular or radio link. On a storm that strong, getting corrections through is no guarantee that they are good.",
        "ref": "KB §7.2 D [40][41]"
      },
      {
        "q": "Where is Solar Cycle 25 now, in late 2026?",
        "choices": [
          "Still rising, with the peak expected in 2027",
          "At solar minimum, with storms now rare",
          "It peaked in 2019 and has been quiet since",
          "Past its October 2024 peak and declining, but severe storms still happen"
        ],
        "answer": 3,
        "why": "Cycle 25 peaked in October 2024 (smoothed sunspot number about 161) and is now declining. Severe storms still happen in the declining phase, such as the one on 19-20 January 2026, so keep checking the space-weather grade.",
        "ref": "KB §6 [48][49]"
      }
    ]
  },
  {
    "id": "q08",
    "title": "Network or own base today?",
    "intro": "Each question gives you a real Panhandle field day: pick the RTK setup or action that gives you the most trustworthy cm-level positions.",
    "questions": [
      {
        "q": "A G2 geomagnetic storm is forecast today. You could use the FPRN network, or set your own base on control 3 km or 15 km from the job. Which setup should hold up best?",
        "choices": [
          "FPRN network, because it uses many stations",
          "Own base on the control 15 km away",
          "Own base on the control 3 km away",
          "Any of them, because a storm hits every setup the same"
        ],
        "answer": 2,
        "why": "Storm error on a single-base baseline grows with its length, so a 1-5 km own base is the most storm-resilient setup. The network and a 10-20 km base both face ionospheric gradients across tens of km.",
        "ref": "KB §4 (Geomagnetic storm row); KB §3.2 [33]; KB §8 myth 7"
      },
      {
        "q": "It's a July afternoon at 2 pm. Sea-breeze storms are popping up around the region but not over the job. Your own base would be 2 km from the rover, with both ends inland on the same side of the storms. Which choice is best?",
        "choices": [
          "Own base at 2 km",
          "FPRN network, because it sees the whole region",
          "Either one, because the humidity is the same everywhere",
          "Stop work, because rain blocks the GPS signal"
        ],
        "answer": 0,
        "why": "Storm cells and sea-breeze fronts are smaller than the network's station spacing. Cells near the stations, or between them and the job, skew the interpolated correction at your rover, so you get height scatter and a lower fix rate. A short base only suffers if the weather sits between base and rover or over one end, and rain itself does not block L-band.",
        "ref": "KB §2.2 [17][31]; KB §4 (Convective cell / sea-breeze row); KB §8 myth 1"
      },
      {
        "q": "Your base is on the coast and your rover is 8 km inland. A sea-breeze front now lies between them, with rain at the rover only. What should you do?",
        "choices": [
          "Keep working, because 8 km is under the 10 km limit",
          "Switch to the FPRN network, because it interpolates around the front",
          "Lower the elevation mask to pick up more satellites",
          "Wait, or move the base to the rover's side of the front"
        ],
        "answer": 3,
        "why": "Single-base RTK only works because both ends see the same air. When the weather is clearly different at base and rover, NGS advice is to wait for even conditions or move the base. The network would not do better, because the front is too small for its interpolation to see.",
        "ref": "KB §3.4 [1][2][3]; KB §4 (Convective cell / sea-breeze row)"
      },
      {
        "q": "A heavy morning rain has just ended. Kp is low and no front is coming, but your next points are under dripping trees. What should you plan for?",
        "choices": [
          "Nothing extra, since the rain has stopped",
          "Longer occupations, check shots and open-sky offsets",
          "Switch to the network, since wet canopy only hurts own-base work",
          "Lower the mask to 5° to pick up more satellites"
        ],
        "answer": 1,
        "why": "Wet canopy after rain means more float time and more wrong fixes at the rover, on the network or on your own base. Plan longer occupations, check shots and open-sky offsets.",
        "ref": "KB §4 (Wet canopy after rain row) [53]"
      },
      {
        "q": "Mid-job, cell data drops out across the area and the FPRN corrections stop. The rover still shows FIXED for a moment. What should you do?",
        "choices": [
          "Keep shooting while the rover still shows FIXED",
          "Set up your own base and send its corrections over cell",
          "Set up your own base and send its corrections by UHF radio",
          "Switch to a different FPRN mountpoint"
        ],
        "answer": 2,
        "why": "If cell is down, any corrections sent over cell stop, whether from the network or your own base. A UHF base does not need the cell network. A rover can keep showing FIXED for up to 60 s after corrections stop, so that FIXED cannot be trusted.",
        "ref": "KB §4 (Cellular congestion or outage row); KB §3.5; KB §8 myth 6 [64]"
      },
      {
        "q": "It's two days after a hurricane made landfall near Pensacola, and power is out across much of the county. Which plan is best for RTK work?",
        "choices": [
          "Own base on UHF radio, on control you re-check first",
          "FPRN network, because CORS stations are built to ride out storms",
          "Own base with its corrections sent over cell",
          "FPRN network, once your phone shows signal bars again"
        ],
        "answer": 0,
        "why": "Hurricanes can knock out cell service, power and CORS for days to weeks. UHF does not rely on the cell network, but the storm may have disturbed the control, so re-check it. Showing signal bars does not mean corrections are flowing: a session can say connected and still carry too little data.",
        "ref": "KB §4 (Tropical storm or hurricane row); KB §2.3 [21][63]; KB §5.4"
      },
      {
        "q": "After the FPRN server change, your rover gets no network corrections. The status map shows the nearby stations up, and another crew is working fine on the network. What should you do first?",
        "choices": [
          "Set up your own base for the rest of the week, because the network is unreliable",
          "Wait for FDOT to fix the outage",
          "Reboot the rover and keep retrying the same profile",
          "Check the rover's hostname, port, mountpoint name and account"
        ],
        "answer": 3,
        "why": "A stale hostname, port, mountpoint (usually case-sensitive) or account looks like a network outage but is really a setup error in the rover. If the stations are up and other crews are working, check your own settings first.",
        "ref": "KB §4 (Wrong config row); KB §2.1 [20]; KB §8 myth 16"
      },
      {
        "q": "Your job sits outside the polygon formed by the network stations around it, so the network has to extrapolate there. You have good control 3 km from the job. Which setup is the better choice?",
        "choices": [
          "FPRN network, because flat Florida ground makes the edge not matter",
          "Own base on the control 3 km away",
          "FPRN network, with a lower elevation mask to pick up more satellites",
          "Either one, because network RTK is the same anywhere in the state"
        ],
        "answer": 1,
        "why": "Outside the station polygon, the network extrapolates its corrections instead of interpolating them, and accuracy drops. A short own base does not depend on where the network stations are. Flat terrain only helps with height-difference troposphere error, not with being at the edge.",
        "ref": "KB §2.2 [18][19]"
      },
      {
        "q": "It's a quiet day: no storms, no fronts, low Kp. The only control for a base is 25 km from the job. Cell coverage is good and the FPRN stations are all up. Which choice is best?",
        "choices": [
          "Own base at 25 km, because the 1 ppm term only adds about 2.5 cm",
          "Own base at 25 km, because your own base always beats the network",
          "FPRN network, with a check shot on known control",
          "Own base at 25 km, sending corrections over cell instead of UHF"
        ],
        "answer": 2,
        "why": "Fixing becomes steadily less reliable beyond about 10 km, and practice caps single-base work at 10-20 km; the 1 ppm spec does not show that risk. On a quiet day with healthy stations, the network avoids the long baseline. A short own base beats the network on storm or convective days, or at the network edge, but a 25 km base is not short.",
        "ref": "KB §3.2 [28][11]; KB §6 (single-base ambiguity row); KB §2.4; APP RULES (Caps: over 20 km no better than C)"
      },
      {
        "q": "The app grades the FDOT network D for this afternoon. Your own base can sit on control 3 km from the job. What is the better plan?",
        "choices": [
          "Keep working on the network, but double every occupation",
          "Switch to your own short base (or the nearest single-station mount)",
          "Set an own base on control 20 km away instead",
          "Raise the mask to 30° and stay on the network"
        ],
        "answer": 1,
        "why": "On a bad network afternoon, a short own base is the storm-resilient choice: it shares the rover’s air and ionosphere. A 20 km base is not short; fixing gets less reliable past about 10 km. A 30° mask throws away satellites and hurts PDOP.",
        "ref": "KB §3.2 [28][33]; KB §4; KB §7.2 F"
      }
    ]
  },
  {
    "id": "q09",
    "title": "Reading the app's two grades",
    "intro": "These ten questions check that you can read the GPS Conditions app's FPRN network and base + rover letters, and know what moves each one, before you plan a day of RTK work.",
    "questions": [
      {
        "q": "The app gives every hour two letters, FDOT network (FPRN) and Base + rover. What does the Base + rover letter use from your settings that the network letter does not?",
        "choices": [
          "Your receiver brand and firmware",
          "Your work hours and start time",
          "Your baseline length and correction link",
          "Your cell carrier and signal strength"
        ],
        "answer": 2,
        "why": "The base + rover grade uses the crew's baseline length (default 5 km) and correction link (default UHF radio). Things like PDOP count the same in both grades.",
        "ref": "APP RULES"
      },
      {
        "q": "An hour on the RTK profile scores 72 points. What does the app tell you for that hour?",
        "choices": [
          "B, Good: go",
          "C, Fair: go, with extra checks",
          "D, Poor: expect float / slow inits",
          "F, No-go for precision work"
        ],
        "answer": 1,
        "why": "72 falls in the C band, which runs from 70 up to just under 80 (80 and above is a B). A C means you can work but should add checks, such as watching correction age, taking an extra check shot after the weather changes, and re-occupying critical points about 4 h later.",
        "ref": "APP RULES; KB §7.2 F [1][2][64]"
      },
      {
        "q": "Your work day runs 7 am to 3 pm. Every hour grades A except 1-2 pm, which grades D because of a front. What letter does the day get?",
        "choices": [
          "A, because most of the hours are A",
          "B, from the 60/40 blend of the average and the worst hour",
          "C, as a middle value between the good hours and the bad one",
          "D, because any D or F work hour sets the day's grade"
        ],
        "answer": 3,
        "why": "Normally the day letter blends the average and the worst hour, but a D or F work hour overrides that blend and becomes the day's grade. A calm morning can't average away a bad afternoon. The calm hours are shown as a usable stretch instead.",
        "ref": "APP RULES"
      },
      {
        "q": "At 9 am the live solar-wind readings show strong southward Bz and fast wind. Which hours does the app hit with these live readings?",
        "choices": [
          "This hour and the next two",
          "Only the current hour",
          "The rest of the work day",
          "The next 24 hours"
        ],
        "answer": 0,
        "why": "The spacecraft at L1 is about an hour upstream of Earth (less in fast wind), so what it measures now reaches us within about an hour and its effects can last a while after. The app applies live readings to this hour and the next two, not to the whole day.",
        "ref": "APP RULES"
      },
      {
        "q": "A Tropical Storm Warning is out for Pensacola. Your crew runs its own base and rover with corrections over UHF radio. How does the app grade the two setups?",
        "choices": [
          "Both are held at F",
          "Network is held at F; base + rover on UHF is not held at F",
          "Base + rover is held at F; network is not affected",
          "Neither is held, since a warning does not change the GPS grades"
        ],
        "answer": 1,
        "why": "Tropical warnings hold the network at F because cell and power outages stop corrections. A UHF link does not depend on the cell network, so base + rover is held at F only when its corrections go by cell.",
        "ref": "APP RULES; KB §2.3 [63], §3.5"
      },
      {
        "q": "The NWS shows a 20% thunder chance and your site is inside an SPC slight risk. How does the app count these two together?",
        "choices": [
          "It adds both penalties",
          "It counts only the thunder chance and just displays the SPC risk",
          "It uses the bigger of the two penalties, not both",
          "It averages the two penalties"
        ],
        "answer": 2,
        "why": "Thunder chance and the SPC outlook describe the same storm risk, so the app uses whichever penalty is larger. Here the slight-risk penalty (−14) beats the 20% thunder penalty (−6), so the app uses −14 rather than −20, before any profile, baseline or humidity scaling.",
        "ref": "APP RULES"
      },
      {
        "q": "Which of these does the app count as a front passing within 3 hours?",
        "choices": [
          "The dewpoint falling 4 °C in 3 hours",
          "Rain starting at the site",
          "Cloud cover climbing above 80%",
          "The thunder chance rising above 30%"
        ],
        "answer": 0,
        "why": "The app flags a front from a 4 °C dewpoint fall in 3 h, a 3 hPa pressure change in 3 h, or a 90° wind shift with a 2 °C dewpoint fall. A front costs −18, or ×1.5 that in humid air. Rain alone costs nothing, and thunder chance is a separate penalty.",
        "ref": "APP RULES (Local weather causes)"
      },
      {
        "q": "Steady rain is forecast all day, with no thunder and no front. Why doesn't the app take points off for the rain?",
        "choices": [
          "Rain is already counted through the humidity penalty",
          "Dual-frequency receivers remove the delay caused by rain",
          "The NWS forecast does not include rain amounts",
          "Raindrops barely weaken L-band GPS signals"
        ],
        "answer": 3,
        "why": "Rain loss at L-band is well under 0.01 dB/km, so the drops themselves don't block the signal. Wet canopy and puddles can still add multipath at the rover, so keep taking check shots. Dual-frequency is not the reason, because it removes ionosphere delay and not delay from the lower atmosphere.",
        "ref": "APP RULES; KB §1, §4, §8 myths 1 and 4 [50][51]"
      },
      {
        "q": "On the RTK profile, Kp 5 is forecast for 2 pm. You can work off FPRN or set your own base 3 km from the rover. What does the storm rule do?",
        "choices": [
          "Network held at D; the 3 km base only from Kp 6",
          "Both held at D from Kp 5",
          "The 3 km base held at D; the network only from Kp 6",
          "Neither held at D until Kp 7"
        ],
        "answer": 0,
        "why": "On the RTK profile the network is held at D from Kp 5, but a base up to 5 km only from Kp 6. Over 3 km the base and rover look through nearly the same ionosphere, so most of the storm error cancels, which makes a 1-5 km own base the most storm-resilient setup.",
        "ref": "APP RULES; KB §3.2 [33], §8 myth 7"
      },
      {
        "q": "A client wants a control job 10 days out, and the app shows that day as \"Unsettled\". What should the office do?",
        "choices": [
          "Treat Unsettled as a C and book the crew",
          "Treat Unsettled as a D and move the job now",
          "Treat it as a trend; book from the 3-day grade",
          "Book from the trend word, since it replaces the letter that far out"
        ],
        "answer": 2,
        "why": "Days 4-45 get only a trend word, not a letter. Crews are booked from the 3-day grade. A trend word can still flag a day to keep an eye on.",
        "ref": "APP RULES"
      }
    ]
  },
  {
    "id": "q10",
    "title": "Myths and checking your work",
    "intro": "Ten questions on common GPS myths and the field habits that catch a bad fix before it reaches the plat, whether you're on FPRN or your own base.",
    "questions": [
      {
        "q": "Your rover is on a 3 km base and shows FIXED during a disturbed afternoon. What is the best way to confirm the fix is good?",
        "choices": [
          "Wait until the FIXED icon has stayed on for a full minute",
          "Check that PDOP is under 4",
          "Take a check shot on known control",
          "Raise the elevation mask to 20 degrees"
        ],
        "answer": 2,
        "why": "A fix can be wrong, especially on disturbed days. A check shot on known control shows whether it is right. A steady FIXED icon does not.",
        "ref": "KB §8 myth 6 [64]; KB §2.4 item 7 [1][2]"
      },
      {
        "q": "Your cellular NTRIP link drops mid-shot, but the data collector still shows FIXED. How long can some receivers keep showing FIXED after corrections stop?",
        "choices": [
          "Up to about 60 seconds",
          "No time at all; it drops to float the instant corrections stop",
          "About 1-2 seconds",
          "Up to about 10 minutes"
        ],
        "answer": 0,
        "why": "Receivers can keep showing FIXED for up to 60 s after corrections stop (NovAtel's RTKTIMEOUT is 5-60 s). That is why you watch correction age and don't trust the fix icon alone.",
        "ref": "KB §8 myth 6 [64]"
      },
      {
        "q": "On a C-grade day, at what correction age should you start to suspect your RTK solution?",
        "choices": [
          "Over 60 seconds",
          "Over a few seconds",
          "Over 5 minutes",
          "Only when the receiver drops to float"
        ],
        "answer": 1,
        "why": "The C-grade advice is to suspect anything older than a few seconds. Waiting for float is too late, because the receiver can keep showing FIXED on stale corrections.",
        "ref": "KB §7.2 F [64]; KB §8 myth 6 [64]"
      },
      {
        "q": "You need a redundant RTK shot on a critical control point. When should you re-occupy it?",
        "choices": [
          "Right away, after re-leveling the pole",
          "About 15 minutes later",
          "At the same clock time the next day",
          "About 4 hours later"
        ],
        "answer": 3,
        "why": "Re-occupy about 4 h later so the satellite geometry and atmosphere have changed. The same clock time the next day gives almost the same geometry, because it repeats about 3 min 56 s earlier each day.",
        "ref": "KB §6 [1][2]; KB §7.2 F [1][2]"
      },
      {
        "q": "Your receiver spec is 8 mm + 1 ppm horizontal (RMS), and the baseline is 5 km. About what horizontal error should you expect at 95% confidence?",
        "choices": [
          "About 13 mm",
          "About 26 mm",
          "About 9 mm",
          "About 18 mm"
        ],
        "answer": 1,
        "why": "1 ppm is 1 mm per km, so 8 + 5 = 13 mm RMS. Vendor specs are RMS (1 sigma), so roughly double that for 95%, which is about 26 mm.",
        "ref": "KB §3.2 [11]; KB §6 [11]; KB §8 myth 13 [11]"
      },
      {
        "q": "On an A or B day, when should you take check shots on known control?",
        "choices": [
          "Only if the receiver drops to float",
          "Only on control jobs, not topo",
          "At the start and end of the job",
          "Once a week on the office mark"
        ],
        "answer": 2,
        "why": "Even on A and B days the advice is a check shot at the start and at the end. A fix can be wrong without the receiver dropping to float, so waiting for float is not a check.",
        "ref": "KB §7.2 F; KB §2.4 item 7 [1][2]; KB §8 myth 6 [64]"
      },
      {
        "q": "On a C-grade day, what elevation mask should you use, if PDOP allows?",
        "choices": [
          "15 degrees",
          "5 degrees, to keep more satellites",
          "30 degrees"
        ],
        "answer": 0,
        "why": "Use a 15 degree mask on a bad day if PDOP allows. It drops the low satellites whose signals pick up the most ground-bounce multipath. Typical masks run 10-15 degrees.",
        "ref": "KB §7.2 F [3]; KB §4 (wet ground row); KB §6 [3]"
      },
      {
        "q": "On a D-grade day, what should a base + rover crew do at the base?",
        "choices": [
          "Turn up the UHF radio power",
          "Move the base to a control point 15 km away so one setup covers the whole job",
          "Shorten the base session to save battery",
          "Log raw data at the base"
        ],
        "answer": 3,
        "why": "The D-grade advice is topo only or postpone control, and log raw data at the base so the work can be post-processed. A longer baseline makes a bad day worse, because distance-dependent error grows with baseline length.",
        "ref": "KB §7.2 F; KB §7.2 C; KB §3.2 [28]"
      },
      {
        "q": "A light rain starts while you are shooting. What does the rain itself do to the GNSS signal?",
        "choices": [
          "It blocks enough signal to force the rover into float",
          "Almost nothing; the signal passes through rain",
          "It adds about 1 ppm of error for each hour of rain",
          "It weakens the signal and raises PDOP"
        ],
        "answer": 1,
        "why": "L-band rain loss is under 0.01 dB/km, so the drops themselves do almost nothing. The real trouble comes from what travels with the rain: water vapor gradients, wet trees and wet ground.",
        "ref": "KB §8 myth 1 [50][51]; KB §1 [50][51]"
      },
      {
        "q": "Thick fog sits over the job at sunrise. What does the fog do to the GNSS signal?",
        "choices": [
          "It weakens the signal enough to cause float",
          "It blocks the low satellites first",
          "Almost nothing; fog only matters at frequencies far above L-band",
          "It adds a delay that dual-frequency removes"
        ],
        "answer": 2,
        "why": "Fog weakening the satellite signal is a myth: fog only matters at frequencies far above L-band. Like raindrops, fog droplets do almost nothing to the GPS signal.",
        "ref": "KB §8 myth 3 [52]"
      }
    ]
  }
];
