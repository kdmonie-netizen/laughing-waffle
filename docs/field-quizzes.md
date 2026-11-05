# Field-crew quizzes: weather, space weather and RTK

Ten quizzes of ten questions for KJM field crews, on the FDOT network (FPRN) and on your own base + rover. They are also built into the app under **Weather & RTK**.

Written from the fact-checked knowledge base (`docs/weather-and-gps.md`) and the app rules (`docs/app-grading-rules.md`). Each question was checked by two independent reviewers (accuracy and clarity) and revised; a cross-check across all 100 questions replaced 16 near-duplicates. No crew-safety topics, by request. The answer key is at the end of each quiz; "Ref" points into the knowledge base.

## Quiz 1: Two layers of sky

_Every GNSS signal crosses two layers of sky on its way to your antenna, and these ten questions cover what each one does to your RTK fix, on FPRN and on your own base._

**1. Where does most of the water vapor that causes wet delay sit?**

- A) About 60-1000 km up, in the ionosphere
- B) In the lowest 2-3 km of air
- C) Between 15 and 60 km up, above the weather
- D) Spread evenly from the ground up to the satellites

**2. Which layer is 'dispersive', meaning its delay is different on L1, L2 and L5?**

- A) The ionosphere
- B) The dry part of the troposphere
- C) The wet part of the troposphere
- D) Both layers, equally

**3. Comparing L1 and L2 lets your receiver measure one layer's delay. Which delay looks the same on both frequencies, so it can't be measured that way?**

- A) The ionosphere delay, from charged particles
- B) Only the wet (water-vapor) part of the troposphere
- C) The whole troposphere delay, dry and wet
- D) Only the dry (hydrostatic) part of the troposphere

**4. Dual-frequency can remove the ionosphere. So why does cm-level RTK still depend on the base and rover seeing the same ionosphere?**

- A) Dual-frequency only removes the ionosphere on baselines under 5 km
- B) The iono-free mix is noisy and loses the whole-cycle ambiguities a fix needs
- C) L2 is too weak to use on the rover's short occupations
- D) The network folds the ionosphere into its troposphere correction

**5. On a Gulf-coast summer day, which describes dry (hydrostatic) and wet delay correctly?**

- A) Wet about 2.3 m and smooth; dry about 0.3 m and patchy
- B) Both about 1 m, and both cancel fully between base and rover
- C) Dry about 2.3 m and patchy; wet under 1 cm
- D) Dry about 2.3 m and smooth; wet about 0.3 m and patchy

**6. Your base and rover end up with a 1 cm difference in zenith delay. About how much height error should you expect?**

- A) About 0.3 cm
- B) About 1 cm
- C) About 3 cm
- D) About 10 cm

**7. RTK cancels most atmosphere error between the reference and the rover. What does weather actually hurt the position through?**

- A) The difference in delay between the reference and the rover
- B) The total delay at the rover, whatever the reference sees
- C) Raindrops weakening the signal at the rover
- D) Clouds cutting the number of satellites tracked

**8. In the app, the dewpoint is 23 °C (about 73 °F). There is no thunder chance and no front coming. How many points does the humidity cost?**

- A) −6 points
- B) −9 points
- C) −14 points
- D) 0 points

**9. A tropical storm drops the air pressure at the job by 40 hPa. About how much does the zenith dry (hydrostatic) delay change?**

- A) About 9 mm
- B) About 9 cm
- C) About 90 cm
- D) About 2.3 m

**10. Florida is flat; its highest point is about 105 m. Which troposphere error does that keep small, on FPRN and on your own base?**

- A) Wet delay from storms and sea-breeze fronts
- B) Ionosphere gradients during storms
- C) Error from height differences between the stations, or between base and rover
- D) Multipath from wet ground

<details><summary>Answer key</summary>

1. **B**: In the lowest 2-3 km of air. The troposphere is mostly the lowest 15 km of air, and most of its water vapor is in the lowest 2-3 km. The 60-1000 km band is the ionosphere, which holds charged particles, not water vapor. _(Ref: KB §1 [16][27])_
2. **A**: The ionosphere. Ionosphere delay depends on frequency: about 0.162, 0.267 and 0.291 m per TECU on L1, L2 and L5. That difference is what lets a dual-frequency receiver measure it. The troposphere delays every frequency by the same amount. _(Ref: KB §1 [32][33]; KB §6 [32])_
3. **C**: The whole troposphere delay, dry and wet. The troposphere is non-dispersive: it delays L1 and L2 by the same amount, so comparing them shows nothing about it. Both the dry and the wet parts have to be modeled or cancelled between base and rover. _(Ref: KB §1 [16][27]; KB §8 myth 4)_
4. **B**: The iono-free mix is noisy and loses the whole-cycle ambiguities a fix needs. The ionosphere-free combination amplifies noise and loses the integer nature of the ambiguities, so RTK can't use it to get a quick fix. RTK still relies on the error cancelling between the two ends. The network keeps the ionosphere (dispersive) part separate from the troposphere part. _(Ref: KB §8 myth 4 [46]; KB §2.1 [16])_
5. **D**: Dry about 2.3 m and smooth; wet about 0.3 m and patchy. Dry delay is large but smooth, can be predicted from pressure, and nearly cancels between base and rover. Wet delay is smaller (typically 0.25-0.35 m here) but patchy, changes fast, and models can't predict it. That makes it the local-weather problem. _(Ref: KB §1 [22][23][24]; KB §6)_
6. **C**: About 3 cm. Leftover atmosphere error lands mostly in height, amplified about 3 times. That is why weather trouble usually shows up first as vertical scatter in your check shots. _(Ref: KB §1 [25]; KB §6 [25])_
7. **A**: The difference in delay between the reference and the rover. The reference (your base, or the network's master or virtual station) and the rover see nearly the same atmosphere, so most of the delay cancels. Weather hurts only through what is different between the two ends. Rain and clouds do almost nothing to L-band signals. _(Ref: KB §1 [50][51]; KB §8 myth 1)_
8. **D**: 0 points. No thunder chance and no front means no penalty. In the app, a dewpoint of 22 °C or higher only multiplies the thunder and front penalties (by 1.5). Humidity on its own costs nothing, because an even air mass mostly cancels. _(Ref: APP RULES (Local weather causes); KB §8 myth 5 [17])_
9. **B**: About 9 cm. Dry delay changes by about 2.28 mm per hPa, so 40 hPa is about 9 cm. The KB gives about 5-14 cm for a hurricane pressure drop of 20-60+ hPa. 2.3 m is the whole dry delay at sea level, not the change. _(Ref: KB §6 [22])_
10. **C**: Error from height differences between the stations, or between base and rover. With little height difference, the dry-delay term that depends on height stays small (about 0.27-0.3 mm per metre, and receivers model most of it). In Florida the bigger troposphere problem is how much the wet delay varies. _(Ref: KB §2.2 [22]; KB §3.3 [22][25])_

</details>

## Quiz 2: Water vapor and the numbers

_Ten quick questions on how much delay the air adds to GPS signals, why water vapor is the troublemaker, and why it shows up in your heights first._

**1. Straight overhead at sea level, about how much delay does the dry air (hydrostatic delay) add to a GPS signal?**

- A) About 0.4 m
- B) About 2.3 m
- C) About 23 m
- D) About 2.3 cm

**2. What is the normal range of zenith wet delay, the delay caused by water vapor?**

- A) 0 to about 0.4 m
- B) About 2 to 3 m
- C) 0 to about 4 cm
- D) About 1 to 2 m

**3. On a typical Gulf-coast summer day around Pensacola, about how big is the zenith wet delay?**

- A) About 2-5 cm
- B) About 1.0-1.5 m
- C) About 0.25-0.35 m
- D) About 2.3 m

**4. A forecast shows 45 mm of precipitable water (PW) over the job. About how much zenith wet delay does that mean?**

- A) About 4.5 cm
- B) About 28-29 cm
- C) About 2.9 m
- D) About 45 cm

**5. Compared with a satellite straight overhead, about how much more atmosphere delay does a signal from a satellite at 10° elevation carry?**

- A) About 1.2 times
- B) About 2 times
- C) About 10 times
- D) About 5.5-5.8 times

**6. Why do low satellites near the horizon carry more troposphere delay than high ones?**

- A) Their signal crosses much more air on its slanted path
- B) They broadcast on a frequency the air slows more
- C) Receivers stop correcting signals below 15°
- D) Rain near the horizon blocks more signal

**7. A sea-breeze front is sitting between your base and rover on a muggy afternoon. Where would you expect the leftover atmosphere error to show up first on your check shots?**

- A) Horizontal (northing/easting) scatter
- B) Higher PDOP readings
- C) Bearing errors between points
- D) Vertical (height) scatter

**8. On a Florida summer day, about how big is the total zenith troposphere delay, dry plus wet?**

- A) About 0.3 m
- B) About 2.3 m
- C) About 2.5-2.7 m
- D) About 5.5 m

**9. Oxygen in the air weakens a GPS signal slightly: about 0.035 dB straight overhead. About how much at 5° elevation?**

- A) About 0.04 dB
- B) About 0.4 dB
- C) About 4 dB
- D) About 40 dB

**10. Weather leaves a 2 cm difference in zenith wet delay between base and rover. About how big is that difference along the path of a satellite at 10° elevation?**

- A) About 2 cm
- B) About 4 cm
- C) About 11-12 cm
- D) About 40 cm

<details><summary>Answer key</summary>

1. **B**: About 2.3 m. Dry air adds about 2.3 m of zenith delay at sea level. It is large, but it is smooth, predictable from air pressure, and nearly cancels between base and rover. _(Ref: KB §1 [22]; KB §6 [22])_
2. **A**: 0 to about 0.4 m. Wet delay runs from 0 to about 0.4 m, and up to about 0.5 m in extreme cases. The 2-3 m figure is the total delay (dry plus wet), not the wet part. _(Ref: KB §1 [23][24]; KB §6 [23])_
3. **C**: About 0.25-0.35 m. A Gulf-coast summer typically gives about 0.25-0.35 m of wet delay. That puts our summers near the top of the 0-0.4 m range. _(Ref: KB §1 [23][24])_
4. **B**: About 28-29 cm. Zenith wet delay is about 6.2-6.5 times PW, so 45 mm gives roughly 28-29 cm. For comparison, the KB works out 43-48 mm of PW to about 27-31 cm. 45 cm would mean multiplying by 10, which is too high. _(Ref: KB §6 [23][24]; KB §7.1 B [77])_
5. **D**: About 5.5-5.8 times. The slant factor at 10° is 1/sin(10°) = 5.76. Mapping functions that allow for the earth's curve give about 5.5-5.6. Either way, a 10° satellite carries more than five times the zenith delay. _(Ref: KB §6 [27])_
6. **A**: Their signal crosses much more air on its slanted path. A low signal crosses far more of the lower atmosphere on its slanted path, which is where the slant factor comes from. The troposphere delays every frequency the same, and rain itself does almost nothing to L-band signals. _(Ref: KB §6 [27]; KB §1 [16][27][50][51])_
7. **D**: Vertical (height) scatter. Leftover atmosphere error lands mostly in height, so weather problems usually show up first as vertical scatter. Be extra careful with elevation work on days like this. _(Ref: KB §1 [25]; KB §6 [25]; KB §3.4 [1][2][3])_
8. **C**: About 2.5-2.7 m. Dry air adds about 2.3 m, and a Gulf-coast summer adds about 0.25-0.35 m of wet delay, so the total is about 2.5-2.7 m. 2.3 m is the dry part alone. _(Ref: KB §6 [22][23]; KB §1 [22][23][24])_
9. **B**: About 0.4 dB. Oxygen loss is about 0.035 dB at zenith and about 0.4 dB at 5°, because the low signal crosses more air. Both are tiny. The atmosphere matters to RTK mainly through delay, not signal loss. _(Ref: KB §6 [51])_
10. **C**: About 11-12 cm. Multiply by the slant factor at 10°, which is about 5.5-5.8: 2 cm becomes roughly 11-12 cm along that signal path. This is one reason a 10-15° elevation mask is typical. _(Ref: KB §6 [27][3])_

</details>

## Quiz 3: How FDOT network RTK works

_Ten quick questions on how network RTK builds your corrections: interpolation between stations, MAX vs iMAX vs VRS, GGA, mountpoints, and the datum behind your coordinates._

**1. How does network RTK get corrections for a rover that sits between reference stations?**

- A) It uses only the single nearest station, like your own base
- B) It interpolates corrections between the surrounding reference stations
- C) It averages every station in the state with equal weight
- D) It waits for the rover to fix, then sends a stored correction

**2. In network RTK, the correction differences are split into a dispersive part and a non-dispersive part. What goes in the non-dispersive part?**

- A) The ionosphere
- B) Multipath at the rover
- C) Troposphere, orbit and clock errors
- D) Antenna height errors at the stations

**3. With a MAX correction stream, who does the interpolation?**

- A) The rover
- B) The network server
- C) The nearest reference station
- D) The cellular carrier

**4. With both iMAX and VRS, the server does the interpolation. What is the main difference between them?**

- A) iMAX has the rover interpolate; VRS has the server interpolate
- B) VRS works without your position; iMAX needs a GGA from the rover
- C) iMAX is built for single-base work; VRS is built for network work
- D) iMAX ties corrections to a real master station; VRS ties them to a virtual one

**5. Why does the rover have to send an NMEA GGA message on a VRS, iMAX or auto mountpoint?**

- A) So the caster can log your job hours for the account
- B) So the server knows the rover's PDOP before sending corrections
- C) So the server knows where you are and can build corrections for your location
- D) So the caster can confirm the rover already has a fixed solution

**6. In what form does FPRN send its corrections?**

- A) Standard RTCM over NTRIP, usable by any receiver brand
- B) A format that only one receiver brand can read
- C) Daily files you download for post-processing
- D) A UHF radio broadcast from each station

**7. Network interpolation assumes the error field between stations is smooth (linear). What happens to the part that is not linear?**

- A) Dual-frequency tracking removes it at the rover
- B) It is left over as error, and grows with station spacing
- C) It cancels fully when five or more stations are used
- D) It shows up in horizontal position but not height

**8. Which datum are FDOT network RTK corrections referenced to?**

- A) WGS84 at the current epoch
- B) NAD83(1986)
- C) NATRF2022
- D) NAD83(2011) epoch 2010.00

**9. Working on NAD83(2011), which NGS geoid model is normally used to get NAVD88 heights?**

- A) GEOID18
- B) GEOID12B
- C) EGM2008
- D) GEOID99

**10. How far apart are the stations in a typical real-time network?**

- A) About 5-10 km
- B) About 15-20 km
- C) About 50-70 km
- D) About 150-200 km

<details><summary>Answer key</summary>

1. **B**: It interpolates corrections between the surrounding reference stations. Network RTK interpolates corrections between the reference stations around you. That is what lets it cover long gaps between stations without relying on a single nearby base. _(Ref: KB §2.1 [16])_
2. **C**: Troposphere, orbit and clock errors. The non-dispersive part is troposphere plus orbit and clock. These are the same on every frequency, so a dual-frequency receiver cannot remove them; they have to be modeled or cancelled between stations. The ionosphere is the dispersive part. _(Ref: KB §2.1 [16]; KB §1 [16][27])_
3. **A**: The rover. With MAX, the rover does the interpolating itself. With iMAX and VRS, the server does it. _(Ref: KB §2.1 [16])_
4. **D**: iMAX ties corrections to a real master station; VRS ties them to a virtual one. Both are interpolated by the server. iMAX refers the corrections to a real master station, while VRS refers them to a virtual station. Both need the rover to send GGA. _(Ref: KB §2.1 [16][20])_
5. **C**: So the server knows where you are and can build corrections for your location. These mountpoints build corrections for your location, so the server needs your approximate position, and GGA is how the rover reports it. Without GGA, corrections built for your spot can't be made. _(Ref: KB §2.1 [20])_
6. **A**: Standard RTCM over NTRIP, usable by any receiver brand. FPRN is a free statewide real-time CORS network run by FDOT. It sends standard RTCM corrections over NTRIP that any receiver brand can use. Users must register for an account. _(Ref: KB §2.1 [8][14])_
7. **B**: It is left over as error, and grows with station spacing. Interpolation fits a smooth field between stations, so anything non-linear is left over at the rover. The wider the station spacing, the bigger that leftover error. _(Ref: KB §2.1 [17])_
8. **D**: NAD83(2011) epoch 2010.00. FPRN corrections are referenced to NAD83(2011) epoch 2010.00 on the GRS80 ellipsoid. NATRF2022 is part of the NGS modernization that will eventually replace NAD83, but FPRN corrections are on NAD83(2011). _(Ref: KB §2.1 [8][14])_
9. **A**: GEOID18. GEOID18 is the usual NGS geoid model for NAVD88 heights on NAD83(2011). _(Ref: KB §2.1 [8])_
10. **C**: About 50-70 km. Real-time networks are commonly built with stations about 50-70 km apart. That is much longer than a short own-base baseline, and it is why storm cells smaller than the spacing are invisible to interpolation. _(Ref: KB §2.1 [4]; KB §2.2 [17][31])_

</details>

## Quiz 4: Network RTK in Florida weather

_Ten questions on how Panhandle storms, fronts and space weather affect FPRN network RTK, what tends to fail first, and what to check before you head out._

**1. A single thunderstorm cell about 5 km across sits over your rover, between FPRN stations. Why can't the network correct for it?**

- A) Raindrops block the L-band signal at the rover
- B) Dual-frequency receivers already remove it, so the network ignores it
- C) It is smaller than the station spacing, so the smooth field interpolated between stations misses it
- D) The network only corrects the ionosphere, not weather

**2. A sea-breeze front is lying across your job, between FPRN stations. Where does the leftover error mostly show up?**

- A) Mostly in horizontal position, along the line of the front
- B) Mostly in height, along with a lower fix rate
- C) In the satellite count, which drops as the front arrives
- D) In PDOP, which rises as the front passes

**3. A cold front is forecast to pass Pensacola around 1 pm. You are working on FPRN. What is the best plan?**

- A) Keep working, since the network models the troposphere between stations
- B) Work through it, but double your occupation time on each point
- C) Raise the elevation mask to 20° and keep going
- D) Stop for the passage window and re-shoot after the front clears

**4. Why might a rover in far-west Escambia County get weaker FPRN corrections than a rover in central Florida?**

- A) It may be outside the station polygon, so corrections are extrapolated instead of interpolated
- B) The ground is much higher there, so height differences to the stations grow
- C) Frequent coastal rain there weakens the cell signal that carries the corrections
- D) The caster's internet connection runs longer to the west

**5. On a storm day (Kp 5+), the app adds an extra penalty from 17 to 23 UT (11 am-5 pm CST, noon-6 pm CDT). What is that penalty for?**

- A) Afternoon sea-breeze thunderstorms
- B) Poorer afternoon satellite geometry and higher PDOP
- C) Storm-enhanced density (SED) plumes over the Southeast
- D) Ionospheric ripples stirred up by hurricanes

**6. A tropical storm hits the Panhandle. For FPRN network RTK, what usually fails first?**

- A) Cell service and power to the caster or stations
- B) Ionospheric gradients stirred up by the storm
- C) Rain fade on the satellite signals in heavy bands
- D) Vertical accuracy, from the extra water vapor

**7. Your cell link is solid, but storms are building and the ionosphere is active. On FPRN, what do you usually notice first?**

- A) Fixes that look good but are wrong
- B) PDOP jumping above 6
- C) Fewer satellites tracked as the clouds thicken
- D) A lower fix rate and a longer time to fix

**8. On bad days, network RTK has an extra wrong-fix risk that your own base does not. What is it?**

- A) Network corrections cannot be checked with a check shot
- B) One biased correction is shared by every user on the network at once
- C) Network rovers never drop to float, so you cannot tell when there is a problem
- D) Network corrections are refreshed only once a minute

**9. Mid-job on FPRN, the controller says connected and FIXED, but the correction age reads 12 seconds and is climbing. What should you make of it?**

- A) It is normal; correction age does not matter while the receiver says FIXED
- B) The FPRN network has gone down statewide, so pack up for the day
- C) Fresh corrections have stalled or are late, so treat the fix as suspect and take a check shot
- D) A geomagnetic storm has started, so check the space-weather grade

**10. Before an FPRN job, where should you check radar for storms or fronts?**

- A) Over the job site
- B) Over the job, the surrounding stations, and the area between them
- C) Over the nearest reference station
- D) Along the coast, where the sea breeze forms

<details><summary>Answer key</summary>

1. **C**: It is smaller than the station spacing, so the smooth field interpolated between stations misses it. Network interpolation fits a smooth, linear field between stations, so a cell a few km across is invisible to it. Raindrops themselves barely affect L-band. Dual-frequency removes only the ionosphere, not water vapor. _(Ref: KB §2.2 [17][31]; KB §2.1 [16][17])_
2. **B**: Mostly in height, along with a lower fix rate. The leftover wet delay at the rover lands mostly in height, and the fix rate drops. Weather changes the signal delay, not the satellite geometry, so PDOP and satellite count are not where it shows. _(Ref: KB §2.2 [17][31]; KB §1 [25])_
3. **D**: Stop for the passage window and re-shoot after the front clears. NRCan tells network (RTN) users, not just single-base users, to avoid surveying while a front passes. A front breaks the smooth-field assumption that network interpolation depends on, and longer occupations or a higher mask do not fix that. _(Ref: KB §2.2 [6][7]; KB §4)_
4. **A**: It may be outside the station polygon, so corrections are extrapolated instead of interpolated. Network RTK degrades outside the station polygon, where corrections are extrapolated, not interpolated. Pensacola sits at Florida's western edge, so it may be an edge area. Florida is flat, so height offsets are small, and rain does not weaken cellular signals. _(Ref: KB §2.2 [18][19]; KB §2.2 [22]; KB §8 myth 2)_
5. **C**: Storm-enhanced density (SED) plumes over the Southeast. Over the Southeast US, the main storm-time ionospheric structures are SED plumes, which show up in the 17-23 UT window. The sea-breeze default is a separate local-weather rule, and hurricane ripples in the ionosphere are negligible. _(Ref: KB §2.2 [36]; KB §6 [36]; APP RULES)_
6. **A**: Cell service and power to the caster or stations. In hurricanes, the comms and power chain breaks before the atmospheric physics does, and corrections stop entirely. Storms hurt cellular through power loss, backhaul damage and congestion, not through rain fade. _(Ref: KB §2.3 [59][63]; KB §1)_
7. **D**: A lower fix rate and a longer time to fix. Once comms are fine, the fix rate and time-to-fix suffer first, then vertical scatter. Wrong fixes that look fixed come at higher disturbance levels. Clouds and rain do not block the satellite signals. _(Ref: KB §2.3; KB §8 myth 1)_
8. **B**: One biased correction is shared by every user on the network at once. Network RTK has a failure mode of its own: one biased correction reaches every user at the same time. Check shots on known control are still the way to catch it. _(Ref: KB §2.3 [47]; KB §2.4 item 7)_
9. **C**: Fresh corrections have stalled or are late, so treat the fix as suspect and take a check shot. A climbing correction age means no fresh corrections are reaching the rover, even though the session shows 'connected'. Receivers can keep showing FIXED for up to 60 s after corrections stop, so suspect any age beyond a few seconds and check on known control. _(Ref: KB §2.3 [21]; KB §2.4 item 5; KB §7.2 F [64]; KB §8 myth 6)_
10. **B**: Over the job, the surrounding stations, and the area between them. The pre-job checklist says to look anywhere in the region between the job and the surrounding stations, not just at the site. Weather away from the site still matters because it skews the interpolated correction at your rover. _(Ref: KB §2.4 item 4; KB §2.2 [17][31])_

</details>

## Quiz 5: Own base + rover basics

_Ten questions on the GPS math behind running your own base and rover: base errors, baseline length, the ppm term, storms and height differences._

**1. Your base is set up on coordinates that are 3 cm off. What happens to your rover points?**

- A) The rover averages the error out over a long occupation
- B) The error grows with distance and reaches 3 cm only at about 10 km
- C) Every rover point shifts by the same 3 cm
- D) Only points shot close to the base are affected

**2. Up to about what baseline length can you ignore distance-dependent atmospheric errors when getting a fix?**

- A) About 2 km
- B) About 10 km
- C) About 30 km
- D) About 50 km

**3. Your rover spec is 8 mm + 1 ppm horizontal and your baseline is 4 km. What is the nominal horizontal error?**

- A) 8 mm
- B) 4 mm
- C) 40 mm
- D) 12 mm

**4. What does the 1 ppm term in a single-base RTK spec cover?**

- A) All distance-dependent errors, mostly ionosphere
- B) Tropospheric delay between base and rover only
- C) Base setup and base coordinate error
- D) Extra error allowed during a geomagnetic storm

**5. On a stormy or ionospherically disturbed day, how should you treat the 1 ppm term?**

- A) As a hard ceiling, so errors stay under 1 mm per km
- B) As a term that applies only to network RTK, not to your own base
- C) As a normal-day figure that storm-day errors can go well beyond
- D) As a figure that roughly doubles, to about 2 ppm, on storm days

**6. The ionosphere's vertical TEC changes by 1 TECU per 100 km across the ground. About how much L1 error is that per km of baseline?**

- A) 0.16 ppm
- B) 1.6 ppm
- C) 16 ppm
- D) 0.6 ppm

**7. You start your base on an autonomous ('here') position instead of on known control. What happens to the rover points?**

- A) They are shifted by metres unless the job is later moved onto control
- B) They are fine once the rover gets a fixed solution
- C) Only heights are affected; horizontal stays good
- D) Only the first few points are off, until the base averages out

**8. Near sea level, about how much does zenith hydrostatic delay change per metre of height difference between base and rover?**

- A) About 3 mm
- B) About 0.03 mm
- C) About 3 cm
- D) About 0.3 mm

**9. Your base is on a 40 m bluff and the rover is at the shore. Which statement best describes the height-difference effect?**

- A) About 11 cm of delay difference, enough to stop a fix
- B) About 1 mm, too small to matter
- C) About 11 mm, mostly removed by the receiver's troposphere model
- D) About 11 mm the receiver cannot model, so about 33 mm of height error

**10. Your base was set on assumed coordinates that are 20 m off. Roughly how much extra baseline error does that add?**

- A) About 2 ppm
- B) About 0.2 ppm
- C) About 20 ppm
- D) None, it only shifts the points

<details><summary>Answer key</summary>

1. **C**: Every rover point shifts by the same 3 cm. The rover position is the base coordinates plus the measured baseline. Any error at the base, in its coordinates, setup or height, passes one-to-one into every rover point. A longer occupation does not remove it. _(Ref: KB §3.1 [12])_
2. **B**: About 10 km. Below about 10 km these atmospheric errors can be ignored for getting a fix. Beyond 10 km, fixing (ambiguity resolution) gets steadily less reliable, and agency practice caps single-base work at about 10-20 km. _(Ref: KB §3.2 [28]; KB §6)_
3. **D**: 12 mm. 1 ppm is 1 mm per km, so 4 km adds 4 mm on top of the 8 mm constant, giving 12 mm. Remember that vendor specs are usually RMS, so roughly double that for 95%. _(Ref: KB §3.2 [11]; KB §6 [11])_
4. **A**: All distance-dependent errors, mostly ionosphere. In normal conditions the 1 ppm term covers all distance-dependent errors: mostly ionosphere, plus troposphere and orbit. Calling it tropospheric error is a common myth, and it is not a storm limit. _(Ref: KB §3.2 [11]; KB §8 myth 12)_
5. **C**: As a normal-day figure that storm-day errors can go well beyond. The 1 ppm term describes normal conditions and is not a storm limit. On disturbed days, real errors can go well past it, and usable baselines can shrink to a few km. _(Ref: KB §3.2 [11][33])_
6. **B**: 1.6 ppm. 1 TECU per 100 km is about 1.6 mm per km, or 1.6 ppm, on L1, and up to about 3 times that at low elevation. Writing it as 0.16 ppm is a known arithmetic trap. _(Ref: KB §3.2 [32]; KB §6; KB §8 myth 14)_
7. **A**: They are shifted by metres unless the job is later moved onto control. An autonomous position can be metres off, and base errors pass one-to-one into every rover point. A fixed solution does not remove a base coordinate error, so the job has to be moved onto control afterwards. _(Ref: KB §3.6 [12]; KB §3.1 [12])_
8. **D**: About 0.3 mm. Near sea level, zenith hydrostatic delay changes by about 0.27-0.3 mm per metre of height. If left unmodeled, that would amplify to about 1 mm of height error per metre. _(Ref: KB §3.3 [22][25]; KB §6)_
9. **C**: About 11 mm, mostly removed by the receiver's troposphere model. 40 m at about 0.27-0.3 mm per metre is about 11 mm of zenith hydrostatic delay, and standard receiver troposphere models remove most of it. In the Panhandle it is small next to weather-gradient effects, though NRCan still advises similar base and rover heights. _(Ref: KB §3.3 [6][22][25])_
10. **A**: About 2 ppm. Trimble's figure is roughly 1 ppm of baseline error per 10 m of base coordinate error, so 20 m gives about 2 ppm. That comes on top of every rover point being shifted, so the shift is not the only effect. _(Ref: KB §3.6 [12]; KB §6 [12])_

</details>

## Quiz 6: Base + rover in weather and radio

_Ten questions on how weather between your base and rover, your radio or cell link, and your base setup affect the RTK points you shoot on your own base._

**1. Your base is on Pensacola Beach and your rover is 4 km inland. It is raining hard at the rover, the base is in sun, and the temperature is clearly different at each end. What does NGS single-base guidance say to do?**

- A) Keep working, because a 4 km baseline is short enough to cancel it
- B) Wait for uniform conditions or move the base
- C) Keep working, because rain itself barely affects the GPS signal
- D) Raise the elevation mask to 15° and keep shooting

**2. An afternoon sea-breeze front sits between your coastal base and your inland rover. Why does that hurt your RTK points?**

- A) Rain along the front blocks the L-band signal at the rover
- B) The front raises ionospheric TEC over the rover
- C) Humid air behind the front weakens the satellite signal
- D) Different water vapor at each end, so the wet delay stops cancelling

**3. A cold front passes through the job at 10:30, in the middle of your base + rover session on a 4 km baseline. What is the right move?**

- A) Stop during the passage and re-shoot points taken during it after it clears
- B) Keep shooting, because a 4 km baseline is too short for a front to matter
- C) Switch the corrections from UHF to cellular until the front has gone by
- D) Shorten each occupation so fewer epochs are logged while the front passes

**4. Using the usual 4/3-earth rule, about how far beyond the geometric (line-of-sight) horizon does your UHF radio horizon reach?**

- A) About a third beyond
- B) No farther than the geometric horizon
- C) About 15% beyond
- D) About twice as far

**5. After a morning rain, your UHF corrections keep dropping out when the rover goes into a wooded lot. It is no longer raining. What is the most likely cause?**

- A) Raindrops still in the air are attenuating the 450 MHz signal
- B) A geomagnetic storm is disturbing the radio link
- C) Ducting is carrying in distant signals during the day
- D) Wet, leafy vegetation in the radio path is costing several dB

**6. During a big storm, NTRIP corrections over cellular stop coming in. What usually causes this?**

- A) Cell towers losing power or backhaul
- B) Rain fade on the cellular signal
- C) Wet foliage absorbing the cell signal at the rover
- D) Lightning static jamming the cell signal

**7. On a calm, clear night with an inversion over the Gulf, your rover on UHF starts picking up interference on your channel. What is happening, and what helps?**

- A) Heavy dew on the radio antenna; wipe it and raise the antenna higher
- B) Ionospheric scintillation; raise the elevation mask and wait it out
- C) A weak base battery; swap it and restart the base
- D) Ducting is bringing in distant signals on your channel; change channel or switch to cell

**8. The app counts thunder and front penalties fully for the network. How much of them does it count for base + rover on a 4 km baseline?**

- A) All of them (×1.0)
- B) Three quarters (×0.75)
- C) Half (×0.5)
- D) None; local weather is left out of the base + rover grade

**9. After heavy rain, there is standing water right next to the spot where you planned to set the base. What is the concern?**

- A) The water only matters for rover points shot near the puddles
- B) Ground-bounce multipath at the base will contaminate every rover point
- C) There is none, because rain and water do not affect GPS signals
- D) The water will lower the UHF radio range but not the positions

**10. Midway through a session, you notice one base tripod leg has sunk into rain-soaked sand. What has happened to your rover points?**

- A) Every point shot after the shift is off by the same amount
- B) Only the next point is affected; later points are fine
- C) The error averages out over the session
- D) The receiver will have dropped to float, so no bad points were stored

<details><summary>Answer key</summary>

1. **B**: Wait for uniform conditions or move the base. NGS advises against RT work when weather is obviously different at base and rover. The fix is to wait for uniform conditions or move the base. Rain itself is harmless to the signal; the problem is the different air at each end. _(Ref: KB §3.4 [1][2][3])_
2. **D**: Different water vapor at each end, so the wet delay stops cancelling. Base + rover RTK works because both ends see nearly the same atmosphere. A sea-breeze front between them puts different water vapor at each end, so the wet delay stops cancelling. Rain and humid air do not weaken L-band signals. _(Ref: KB §1, §3.4, §4, §8 myths 1 and 5)_
3. **A**: Stop during the passage and re-shoot points taken during it after it clears. A front passing mid-session breaks the cancellation between base and rover, even on a short baseline. The KB says to avoid the passage window and re-shoot after it passes. Changing the radio link does nothing about the atmosphere. _(Ref: KB §3.4, §4)_
4. **C**: About 15% beyond. The radio horizon is about 15% beyond the geometric horizon. 'A third beyond' is a common myth. Ducting on calm, clear nights can briefly carry signals much farther, but that is not normal range. _(Ref: KB §6 [62]; KB §8 myth 15 [62]; KB §3.5 [62])_
5. **D**: Wet, leafy vegetation in the radio path is costing several dB. The main weather weakness of UHF is wet, leafy vegetation in the path, which costs several dB. Rain itself causes negligible attenuation at UHF. _(Ref: KB §3.5 [50][61], §8 myth 2)_
6. **A**: Cell towers losing power or backhaul. Storms break cellular through power loss, backhaul damage and congestion, not through rain fade. Rain attenuation at sub-6 GHz cellular is negligible, and lightning static on cellular is only transient. _(Ref: KB §2.3 [63], §3.5, §8 myth 2)_
7. **D**: Ducting is bringing in distant signals on your channel; change channel or switch to cell. Ducting on calm, clear nights with inversions can carry distant co-channel UHF signals hundreds to thousands of km. The KB fix is a unique station ID, a channel change, or corrections by cell, which ducting does not materially affect. _(Ref: KB §3.5 [62], §4)_
8. **C**: Half (×0.5). Up to 5 km the app scales local-weather penalties by ×0.5, because a short base and rover mostly share the same air. ×0.75 is for 5-10 km. Storm cells and sea-breeze fronts are smaller than the network's station spacing, so they count fully there. _(Ref: APP RULES (Local weather causes); KB §4 (Convective cell / sea-breeze row))_
9. **B**: Ground-bounce multipath at the base will contaminate every rover point. Wet ground or standing water next to the base increases ground-bounce multipath, and that contaminates every rover point. Do not set the base beside ponded water, and use a 15° mask. _(Ref: KB §3.6 [53], §4)_
10. **A**: Every point shot after the shift is off by the same amount. A bumped tripod or legs sinking into soaked sand shifts every rover point by the same amount, because base errors pass one-to-one into the rover. The receiver can stay fixed, so a check shot on known control is how you find it. _(Ref: KB §3.1 [12], §3.6 [12], §4)_

</details>

## Quiz 7: Space weather over Florida

_Ten questions on how the ionosphere and space weather affect your RTK fixes around Pensacola, both on the FPRN network and on your own base and rover._

**1. How much signal delay does 1 TECU (one unit of total electron content) add on GPS L1?**

- A) About 1.6 cm
- B) About 16 cm
- C) About 27 cm
- D) About 1.6 m

**2. The same amount of TEC is overhead. Which signal gets the most ionospheric delay?**

- A) L1
- B) L2
- C) L5
- D) All three are delayed the same

**3. Which space-weather effects does the app take the same in both grades, however short your baseline?**

- A) Solar flares and scintillation
- B) Storm-time ionosphere gradients at high Kp
- C) Storm-enhanced density (SED) plumes in the afternoon

**4. You run a 5 km baseline, there is a vertical TEC gradient of 1 TECU per 100 km, and the satellite is high in the sky. About how much L1 differential delay should you expect?**

- A) About 0.8 mm
- B) About 8 cm
- C) About 16 cm
- D) About 8 mm

**5. On a storm day (Kp 5 or higher), which Pensacola hours does the app give an extra penalty for storm-enhanced density plumes?**

- A) 6 am to 11 am CST
- B) 5 pm to 11 pm CST
- C) 11 am to 5 pm CST
- D) Midnight to 6 am CST

**6. Dst drops to −120 nT at 10 am. What does the app do to the grades?**

- A) Nothing; Dst is shown but not graded
- B) Holds them at D for this hour and the next two
- C) Holds them at F for the rest of the day
- D) Holds them at C until Kp drops

**7. The app scales space-weather points by magnetic latitude. About what magnetic latitude does it use for Pensacola?**

- A) About 50°
- B) About 39°
- C) About 35°
- D) About 30°

**8. A hurricane is out in the Gulf. Will its ionospheric disturbances (TIDs) hurt your RTK fixes?**

- A) No. They are about 0.2 TECU or less, too small to matter for RTK
- B) Yes. They are about as strong as a G3 storm
- C) Yes. They add over 1 ppm, so shorten your baselines
- D) Only on the network; a short base cancels them

**9. During the May 2024 G5 geomagnetic storm, what went wrong for many RTK users?**

- A) Only the cell links dropped; corrections that got through were good
- B) Florida's low latitude kept network RTK working normally
- C) The RTK corrections themselves were corrupted
- D) Only baselines over 20 km lost their fix

**10. Where is Solar Cycle 25 now, in late 2026?**

- A) Still rising, with the peak expected in 2027
- B) At solar minimum, with storms now rare
- C) It peaked in 2019 and has been quiet since
- D) Past its October 2024 peak and declining, but severe storms still happen

<details><summary>Answer key</summary>

1. **B**: About 16 cm. On L1, 1 TECU adds about 0.162 m of delay, roughly 16 cm. About 27 cm is the figure for L2, which is a lower frequency and gets delayed more. _(Ref: KB §6 [32])_
2. **C**: L5. The ionosphere is dispersive, so lower frequencies get delayed more: L1 0.162, L2 0.267 and L5 0.291 m per TECU. The same delay on every frequency describes the troposphere, not the ionosphere. _(Ref: KB §1 [32]; KB §6 [32])_
3. **A**: Solar flares and scintillation. Flares, scintillation, aurora overhead and proton events hit every receiver alike, so a short baseline does not help and both grades take them the same. Gradient-type ionosphere causes are scaled down for a short base (×0.6 up to 5 km). _(Ref: APP RULES (Space weather causes))_
4. **D**: About 8 mm. 1.6 mm per km times 5 km is about 8 mm. Satellites low on the horizon can see up to about 3 times that. _(Ref: KB §3.2 [32])_
5. **C**: 11 am to 5 pm CST. The SED plume window is about 17-23 UT. That is 11 am to 5 pm CST (noon to 6 pm CDT). The 5 pm to 11 pm choice uses the UT hour numbers as if they were local time. _(Ref: APP RULES (Space weather causes); KB §6 [36]; KB §7.2 D [36])_
6. **B**: Holds them at D for this hour and the next two. Dst at or below −100 nT, or a TEC anomaly over 10 at the site, holds the grade at D for this hour and the next two. −120 nT is past that line. _(Ref: APP RULES (Things that hold a grade down))_
7. **B**: About 39°. Pensacola's dipole (magnetic) latitude is about 39°, which gives a scaling factor of about 0.79. About 35° is Miami's value. Magnetic latitude is not the same as the latitude on a map. _(Ref: APP RULES (Points and letters); KB §6 [39])_
8. **A**: No. They are about 0.2 TECU or less, too small to matter for RTK. Thunderstorm and hurricane TIDs are about 0.2 TECU or less (about 3 cm or less), with a gradient near 0.23 mm per km, under 0.5 ppm. That is too small to matter for RTK on either setup, so the grading adds no ionosphere penalty for them. The real hurricane risk is losing cell service, power and CORS stations. _(Ref: KB §6 [44]; KB §7.2 D [44][45]; KB §8 item 8 [44][45])_
9. **C**: The RTK corrections themselves were corrupted. In May 2024 the G5 storm corrupted the RTK corrections themselves, not just the cellular or radio link. On a storm that strong, getting corrections through is no guarantee that they are good. _(Ref: KB §7.2 D [40][41])_
10. **D**: Past its October 2024 peak and declining, but severe storms still happen. Cycle 25 peaked in October 2024 (smoothed sunspot number about 161) and is now declining. Severe storms still happen in the declining phase, such as the one on 19-20 January 2026, so keep checking the space-weather grade. _(Ref: KB §6 [48][49])_

</details>

## Quiz 8: Network or own base today?

_Each question gives you a real Panhandle field day: pick the RTK setup or action that gives you the most trustworthy cm-level positions._

**1. A G2 geomagnetic storm is forecast today. You could use the FPRN network, or set your own base on control 3 km or 15 km from the job. Which setup should hold up best?**

- A) FPRN network, because it uses many stations
- B) Own base on the control 15 km away
- C) Own base on the control 3 km away
- D) Any of them, because a storm hits every setup the same

**2. It's a July afternoon at 2 pm. Sea-breeze storms are popping up around the region but not over the job. Your own base would be 2 km from the rover, with both ends inland on the same side of the storms. Which choice is best?**

- A) Own base at 2 km
- B) FPRN network, because it sees the whole region
- C) Either one, because the humidity is the same everywhere
- D) Stop work, because rain blocks the GPS signal

**3. Your base is on the coast and your rover is 8 km inland. A sea-breeze front now lies between them, with rain at the rover only. What should you do?**

- A) Keep working, because 8 km is under the 10 km limit
- B) Switch to the FPRN network, because it interpolates around the front
- C) Lower the elevation mask to pick up more satellites
- D) Wait, or move the base to the rover's side of the front

**4. A heavy morning rain has just ended. Kp is low and no front is coming, but your next points are under dripping trees. What should you plan for?**

- A) Nothing extra, since the rain has stopped
- B) Longer occupations, check shots and open-sky offsets
- C) Switch to the network, since wet canopy only hurts own-base work
- D) Lower the mask to 5° to pick up more satellites

**5. Mid-job, cell data drops out across the area and the FPRN corrections stop. The rover still shows FIXED for a moment. What should you do?**

- A) Keep shooting while the rover still shows FIXED
- B) Set up your own base and send its corrections over cell
- C) Set up your own base and send its corrections by UHF radio
- D) Switch to a different FPRN mountpoint

**6. It's two days after a hurricane made landfall near Pensacola, and power is out across much of the county. Which plan is best for RTK work?**

- A) Own base on UHF radio, on control you re-check first
- B) FPRN network, because CORS stations are built to ride out storms
- C) Own base with its corrections sent over cell
- D) FPRN network, once your phone shows signal bars again

**7. After the FPRN server change, your rover gets no network corrections. The status map shows the nearby stations up, and another crew is working fine on the network. What should you do first?**

- A) Set up your own base for the rest of the week, because the network is unreliable
- B) Wait for FDOT to fix the outage
- C) Reboot the rover and keep retrying the same profile
- D) Check the rover's hostname, port, mountpoint name and account

**8. Your job sits outside the polygon formed by the network stations around it, so the network has to extrapolate there. You have good control 3 km from the job. Which setup is the better choice?**

- A) FPRN network, because flat Florida ground makes the edge not matter
- B) Own base on the control 3 km away
- C) FPRN network, with a lower elevation mask to pick up more satellites
- D) Either one, because network RTK is the same anywhere in the state

**9. It's a quiet day: no storms, no fronts, low Kp. The only control for a base is 25 km from the job. Cell coverage is good and the FPRN stations are all up. Which choice is best?**

- A) Own base at 25 km, because the 1 ppm term only adds about 2.5 cm
- B) Own base at 25 km, because your own base always beats the network
- C) FPRN network, with a check shot on known control
- D) Own base at 25 km, sending corrections over cell instead of UHF

**10. The app grades the FDOT network D for this afternoon. Your own base can sit on control 3 km from the job. What is the better plan?**

- A) Keep working on the network, but double every occupation
- B) Switch to your own short base (or the nearest single-station mount)
- C) Set an own base on control 20 km away instead
- D) Raise the mask to 30° and stay on the network

<details><summary>Answer key</summary>

1. **C**: Own base on the control 3 km away. Storm error on a single-base baseline grows with its length, so a 1-5 km own base is the most storm-resilient setup. The network and a 10-20 km base both face ionospheric gradients across tens of km. _(Ref: KB §4 (Geomagnetic storm row); KB §3.2 [33]; KB §8 myth 7)_
2. **A**: Own base at 2 km. Storm cells and sea-breeze fronts are smaller than the network's station spacing. Cells near the stations, or between them and the job, skew the interpolated correction at your rover, so you get height scatter and a lower fix rate. A short base only suffers if the weather sits between base and rover or over one end, and rain itself does not block L-band. _(Ref: KB §2.2 [17][31]; KB §4 (Convective cell / sea-breeze row); KB §8 myth 1)_
3. **D**: Wait, or move the base to the rover's side of the front. Single-base RTK only works because both ends see the same air. When the weather is clearly different at base and rover, NGS advice is to wait for even conditions or move the base. The network would not do better, because the front is too small for its interpolation to see. _(Ref: KB §3.4 [1][2][3]; KB §4 (Convective cell / sea-breeze row))_
4. **B**: Longer occupations, check shots and open-sky offsets. Wet canopy after rain means more float time and more wrong fixes at the rover, on the network or on your own base. Plan longer occupations, check shots and open-sky offsets. _(Ref: KB §4 (Wet canopy after rain row) [53])_
5. **C**: Set up your own base and send its corrections by UHF radio. If cell is down, any corrections sent over cell stop, whether from the network or your own base. A UHF base does not need the cell network. A rover can keep showing FIXED for up to 60 s after corrections stop, so that FIXED cannot be trusted. _(Ref: KB §4 (Cellular congestion or outage row); KB §3.5; KB §8 myth 6 [64])_
6. **A**: Own base on UHF radio, on control you re-check first. Hurricanes can knock out cell service, power and CORS for days to weeks. UHF does not rely on the cell network, but the storm may have disturbed the control, so re-check it. Showing signal bars does not mean corrections are flowing: a session can say connected and still carry too little data. _(Ref: KB §4 (Tropical storm or hurricane row); KB §2.3 [21][63]; KB §5.4)_
7. **D**: Check the rover's hostname, port, mountpoint name and account. A stale hostname, port, mountpoint (usually case-sensitive) or account looks like a network outage but is really a setup error in the rover. If the stations are up and other crews are working, check your own settings first. _(Ref: KB §4 (Wrong config row); KB §2.1 [20]; KB §8 myth 16)_
8. **B**: Own base on the control 3 km away. Outside the station polygon, the network extrapolates its corrections instead of interpolating them, and accuracy drops. A short own base does not depend on where the network stations are. Flat terrain only helps with height-difference troposphere error, not with being at the edge. _(Ref: KB §2.2 [18][19])_
9. **C**: FPRN network, with a check shot on known control. Fixing becomes steadily less reliable beyond about 10 km, and practice caps single-base work at 10-20 km; the 1 ppm spec does not show that risk. On a quiet day with healthy stations, the network avoids the long baseline. A short own base beats the network on storm or convective days, or at the network edge, but a 25 km base is not short. _(Ref: KB §3.2 [28][11]; KB §6 (single-base ambiguity row); KB §2.4; APP RULES (Caps: over 20 km no better than C))_
10. **B**: Switch to your own short base (or the nearest single-station mount). On a bad network afternoon, a short own base is the storm-resilient choice: it shares the rover’s air and ionosphere. A 20 km base is not short; fixing gets less reliable past about 10 km. A 30° mask throws away satellites and hurts PDOP. _(Ref: KB §3.2 [28][33]; KB §4; KB §7.2 F)_

</details>

## Quiz 9: Reading the app's two grades

_These ten questions check that you can read the GPS Conditions app's FPRN network and base + rover letters, and know what moves each one, before you plan a day of RTK work._

**1. The app gives every hour two letters, FDOT network (FPRN) and Base + rover. What does the Base + rover letter use from your settings that the network letter does not?**

- A) Your receiver brand and firmware
- B) Your work hours and start time
- C) Your baseline length and correction link
- D) Your cell carrier and signal strength

**2. An hour on the RTK profile scores 72 points. What does the app tell you for that hour?**

- A) B, Good: go
- B) C, Fair: go, with extra checks
- C) D, Poor: expect float / slow inits
- D) F, No-go for precision work

**3. Your work day runs 7 am to 3 pm. Every hour grades A except 1-2 pm, which grades D because of a front. What letter does the day get?**

- A) A, because most of the hours are A
- B) B, from the 60/40 blend of the average and the worst hour
- C) C, as a middle value between the good hours and the bad one
- D) D, because any D or F work hour sets the day's grade

**4. At 9 am the live solar-wind readings show strong southward Bz and fast wind. Which hours does the app hit with these live readings?**

- A) This hour and the next two
- B) Only the current hour
- C) The rest of the work day
- D) The next 24 hours

**5. A Tropical Storm Warning is out for Pensacola. Your crew runs its own base and rover with corrections over UHF radio. How does the app grade the two setups?**

- A) Both are held at F
- B) Network is held at F; base + rover on UHF is not held at F
- C) Base + rover is held at F; network is not affected
- D) Neither is held, since a warning does not change the GPS grades

**6. The NWS shows a 20% thunder chance and your site is inside an SPC slight risk. How does the app count these two together?**

- A) It adds both penalties
- B) It counts only the thunder chance and just displays the SPC risk
- C) It uses the bigger of the two penalties, not both
- D) It averages the two penalties

**7. Which of these does the app count as a front passing within 3 hours?**

- A) The dewpoint falling 4 °C in 3 hours
- B) Rain starting at the site
- C) Cloud cover climbing above 80%
- D) The thunder chance rising above 30%

**8. Steady rain is forecast all day, with no thunder and no front. Why doesn't the app take points off for the rain?**

- A) Rain is already counted through the humidity penalty
- B) Dual-frequency receivers remove the delay caused by rain
- C) The NWS forecast does not include rain amounts
- D) Raindrops barely weaken L-band GPS signals

**9. On the RTK profile, Kp 5 is forecast for 2 pm. You can work off FPRN or set your own base 3 km from the rover. What does the storm rule do?**

- A) Network held at D; the 3 km base only from Kp 6
- B) Both held at D from Kp 5
- C) The 3 km base held at D; the network only from Kp 6
- D) Neither held at D until Kp 7

**10. A client wants a control job 10 days out, and the app shows that day as "Unsettled". What should the office do?**

- A) Treat Unsettled as a C and book the crew
- B) Treat Unsettled as a D and move the job now
- C) Treat it as a trend; book from the 3-day grade
- D) Book from the trend word, since it replaces the letter that far out

<details><summary>Answer key</summary>

1. **C**: Your baseline length and correction link. The base + rover grade uses the crew's baseline length (default 5 km) and correction link (default UHF radio). Things like PDOP count the same in both grades. _(Ref: APP RULES)_
2. **B**: C, Fair: go, with extra checks. 72 falls in the C band, which runs from 70 up to just under 80 (80 and above is a B). A C means you can work but should add checks, such as watching correction age, taking an extra check shot after the weather changes, and re-occupying critical points about 4 h later. _(Ref: APP RULES; KB §7.2 F [1][2][64])_
3. **D**: D, because any D or F work hour sets the day's grade. Normally the day letter blends the average and the worst hour, but a D or F work hour overrides that blend and becomes the day's grade. A calm morning can't average away a bad afternoon. The calm hours are shown as a usable stretch instead. _(Ref: APP RULES)_
4. **A**: This hour and the next two. The spacecraft at L1 is about an hour upstream of Earth (less in fast wind), so what it measures now reaches us within about an hour and its effects can last a while after. The app applies live readings to this hour and the next two, not to the whole day. _(Ref: APP RULES)_
5. **B**: Network is held at F; base + rover on UHF is not held at F. Tropical warnings hold the network at F because cell and power outages stop corrections. A UHF link does not depend on the cell network, so base + rover is held at F only when its corrections go by cell. _(Ref: APP RULES; KB §2.3 [63], §3.5)_
6. **C**: It uses the bigger of the two penalties, not both. Thunder chance and the SPC outlook describe the same storm risk, so the app uses whichever penalty is larger. Here the slight-risk penalty (−14) beats the 20% thunder penalty (−6), so the app uses −14 rather than −20, before any profile, baseline or humidity scaling. _(Ref: APP RULES)_
7. **A**: The dewpoint falling 4 °C in 3 hours. The app flags a front from a 4 °C dewpoint fall in 3 h, a 3 hPa pressure change in 3 h, or a 90° wind shift with a 2 °C dewpoint fall. A front costs −18, or ×1.5 that in humid air. Rain alone costs nothing, and thunder chance is a separate penalty. _(Ref: APP RULES (Local weather causes))_
8. **D**: Raindrops barely weaken L-band GPS signals. Rain loss at L-band is well under 0.01 dB/km, so the drops themselves don't block the signal. Wet canopy and puddles can still add multipath at the rover, so keep taking check shots. Dual-frequency is not the reason, because it removes ionosphere delay and not delay from the lower atmosphere. _(Ref: APP RULES; KB §1, §4, §8 myths 1 and 4 [50][51])_
9. **A**: Network held at D; the 3 km base only from Kp 6. On the RTK profile the network is held at D from Kp 5, but a base up to 5 km only from Kp 6. Over 3 km the base and rover look through nearly the same ionosphere, so most of the storm error cancels, which makes a 1-5 km own base the most storm-resilient setup. _(Ref: APP RULES; KB §3.2 [33], §8 myth 7)_
10. **C**: Treat it as a trend; book from the 3-day grade. Days 4-45 get only a trend word, not a letter. Crews are booked from the 3-day grade. A trend word can still flag a day to keep an eye on. _(Ref: APP RULES)_

</details>

## Quiz 10: Myths and checking your work

_Ten questions on common GPS myths and the field habits that catch a bad fix before it reaches the plat, whether you're on FPRN or your own base._

**1. Your rover is on a 3 km base and shows FIXED during a disturbed afternoon. What is the best way to confirm the fix is good?**

- A) Wait until the FIXED icon has stayed on for a full minute
- B) Check that PDOP is under 4
- C) Take a check shot on known control
- D) Raise the elevation mask to 20 degrees

**2. Your cellular NTRIP link drops mid-shot, but the data collector still shows FIXED. How long can some receivers keep showing FIXED after corrections stop?**

- A) Up to about 60 seconds
- B) No time at all; it drops to float the instant corrections stop
- C) About 1-2 seconds
- D) Up to about 10 minutes

**3. On a C-grade day, at what correction age should you start to suspect your RTK solution?**

- A) Over 60 seconds
- B) Over a few seconds
- C) Over 5 minutes
- D) Only when the receiver drops to float

**4. You need a redundant RTK shot on a critical control point. When should you re-occupy it?**

- A) Right away, after re-leveling the pole
- B) About 15 minutes later
- C) At the same clock time the next day
- D) About 4 hours later

**5. Your receiver spec is 8 mm + 1 ppm horizontal (RMS), and the baseline is 5 km. About what horizontal error should you expect at 95% confidence?**

- A) About 13 mm
- B) About 26 mm
- C) About 9 mm
- D) About 18 mm

**6. On an A or B day, when should you take check shots on known control?**

- A) Only if the receiver drops to float
- B) Only on control jobs, not topo
- C) At the start and end of the job
- D) Once a week on the office mark

**7. On a C-grade day, what elevation mask should you use, if PDOP allows?**

- A) 15 degrees
- B) 5 degrees, to keep more satellites
- C) 30 degrees

**8. On a D-grade day, what should a base + rover crew do at the base?**

- A) Turn up the UHF radio power
- B) Move the base to a control point 15 km away so one setup covers the whole job
- C) Shorten the base session to save battery
- D) Log raw data at the base

**9. A light rain starts while you are shooting. What does the rain itself do to the GNSS signal?**

- A) It blocks enough signal to force the rover into float
- B) Almost nothing; the signal passes through rain
- C) It adds about 1 ppm of error for each hour of rain
- D) It weakens the signal and raises PDOP

**10. Thick fog sits over the job at sunrise. What does the fog do to the GNSS signal?**

- A) It weakens the signal enough to cause float
- B) It blocks the low satellites first
- C) Almost nothing; fog only matters at frequencies far above L-band
- D) It adds a delay that dual-frequency removes

<details><summary>Answer key</summary>

1. **C**: Take a check shot on known control. A fix can be wrong, especially on disturbed days. A check shot on known control shows whether it is right. A steady FIXED icon does not. _(Ref: KB §8 myth 6 [64]; KB §2.4 item 7 [1][2])_
2. **A**: Up to about 60 seconds. Receivers can keep showing FIXED for up to 60 s after corrections stop (NovAtel's RTKTIMEOUT is 5-60 s). That is why you watch correction age and don't trust the fix icon alone. _(Ref: KB §8 myth 6 [64])_
3. **B**: Over a few seconds. The C-grade advice is to suspect anything older than a few seconds. Waiting for float is too late, because the receiver can keep showing FIXED on stale corrections. _(Ref: KB §7.2 F [64]; KB §8 myth 6 [64])_
4. **D**: About 4 hours later. Re-occupy about 4 h later so the satellite geometry and atmosphere have changed. The same clock time the next day gives almost the same geometry, because it repeats about 3 min 56 s earlier each day. _(Ref: KB §6 [1][2]; KB §7.2 F [1][2])_
5. **B**: About 26 mm. 1 ppm is 1 mm per km, so 8 + 5 = 13 mm RMS. Vendor specs are RMS (1 sigma), so roughly double that for 95%, which is about 26 mm. _(Ref: KB §3.2 [11]; KB §6 [11]; KB §8 myth 13 [11])_
6. **C**: At the start and end of the job. Even on A and B days the advice is a check shot at the start and at the end. A fix can be wrong without the receiver dropping to float, so waiting for float is not a check. _(Ref: KB §7.2 F; KB §2.4 item 7 [1][2]; KB §8 myth 6 [64])_
7. **A**: 15 degrees. Use a 15 degree mask on a bad day if PDOP allows. It drops the low satellites whose signals pick up the most ground-bounce multipath. Typical masks run 10-15 degrees. _(Ref: KB §7.2 F [3]; KB §4 (wet ground row); KB §6 [3])_
8. **D**: Log raw data at the base. The D-grade advice is topo only or postpone control, and log raw data at the base so the work can be post-processed. A longer baseline makes a bad day worse, because distance-dependent error grows with baseline length. _(Ref: KB §7.2 F; KB §7.2 C; KB §3.2 [28])_
9. **B**: Almost nothing; the signal passes through rain. L-band rain loss is under 0.01 dB/km, so the drops themselves do almost nothing. The real trouble comes from what travels with the rain: water vapor gradients, wet trees and wet ground. _(Ref: KB §8 myth 1 [50][51]; KB §1 [50][51])_
10. **C**: Almost nothing; fog only matters at frequencies far above L-band. Fog weakening the satellite signal is a myth: fog only matters at frequencies far above L-band. Like raindrops, fog droplets do almost nothing to the GPS signal. _(Ref: KB §8 myth 3 [52])_

</details>
