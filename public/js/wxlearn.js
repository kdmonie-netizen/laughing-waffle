// "Weather & RTK" learning area, written for field crews (plain words, real
// survey terms). Everything here comes from the fact-checked knowledge base in
// docs/weather-and-gps.md (sections 1-8). Crew safety (lightning, heat, wind,
// drones) is left out on purpose: the owner asked for the GPS math only.

export const WX_INTRO =
  'Every satellite signal passes through two layers of sky before it reaches your antenna. RTK gets centimeters only because the reference (your base, or the network) and the rover look up through nearly the same sky, so the errors cancel. Weather hurts RTK through the difference between the two ends, and it shows up first in your heights.';

export const WX_LAYERS = [
  ['Ionosphere', '60-1000 km up. Charged gas.', 'Space weather: the Sun, geomagnetic storms.', 'Depends on frequency, so dual-frequency receivers can measure it. Its gradient between base and rover is what hurts.'],
  ['Troposphere', 'Mostly the lowest ~15 km; most water vapor sits in the lowest 2-3 km.', 'Local weather: pressure, humidity, fronts, storms.', 'Same on every frequency, so dual-frequency cannot remove it. It must be modeled, or cancel between the two ends.'],
];

export const WX_POINTS = [
  'Dry air delays the signal about 2.3 m at sea level. It is smooth and follows the air pressure, so models handle it and it nearly cancels between base and rover.',
  'Water vapor adds 0 to about 0.4 m. A Gulf-coast summer runs about 0.25-0.35 m. It is patchy and changes fast, and no model predicts it well. This is the local-weather problem.',
  'A low satellite looks through much more air: at 10° elevation the delay is about 5.6 times the straight-up value. That is one reason a 15° mask helps on bad days.',
  'A 1 cm difference in straight-up delay between the two ends turns into about 3 cm of height error. Weather trouble usually shows up first as vertical scatter.',
  'Rain itself does almost nothing to GPS signals (less than 0.01 dB per km). What hurts is the uneven water vapor around storms, wet trees, wet ground, and the correction link.',
];

export const WX_NETWORK = [
  'The network fits a smooth surface of corrections between reference stations, typically 50-70 km apart in RTK networks. It splits the corrections into an ionosphere part and a troposphere-and-orbit part.',
  'Anything smaller than the station spacing is invisible to that smooth surface: a single thunderstorm cell (a few km to ~10 km across), a sea-breeze front, a squall line. What is left over lands in your height and lowers the fix rate.',
  'Fronts break the smooth-surface idea. Canadian network RTK guidance says to avoid surveying while a front passes, and NGS warns that its interpolated OPUS-RS solutions may not work well then.',
  'Near the edge of a network the rover is extrapolated, not interpolated, and accuracy drops. Pensacola sits at Florida’s western edge, so check fix quality closely.',
  'Storm-time ionosphere gradients that are not smooth across tens of km also drive the network’s fixes down. Over the Southeast these come as storm-enhanced density plumes, worst about 17-23 UT (11 am-5 pm CST) on storm days.',
  'What fails first: the comms and power chain (cell data, the caster, station power), then fix rate and time to fix, then vertical scatter, then wrong fixes that still say FIXED. A bad correction from the network reaches every user at once.',
  'VRS, iMAX and nearest-station mounts need your rover to send its position (NMEA GGA). A wrong mountpoint name or account looks just like a network outage.',
];

export const WX_BASE = [
  'Rover position = base coordinates + the measured baseline. Any base error (coordinates, setup, height) goes one-for-one into every rover point.',
  'Under about 10 km, the leftover atmosphere is small enough that fixing is reliable. Past 10 km it gets steadily harder; most agencies cap single-base work at 10-20 km.',
  'The "1 ppm" in a receiver spec covers all distance errors on a normal day, mostly ionosphere. It is not a storm limit. On disturbed days real errors can be much larger.',
  'A 1-5 km own base is the most storm-resistant setup: storms hurt in proportion to the baseline, and a short base sees nearly the same sky as the rover.',
  'Height difference between base and rover matters less here: Florida is flat. Dry delay changes about 0.3 mm per metre of height, and receiver models remove most of it.',
  'NGS advises against RTK when the weather is clearly different at base and rover: a storm over one end, a front between them, different temperature or pressure. Wait it out or move the base.',
  'UHF radio: rain does not weaken it, but wet leafy trees in the path do (several dB). Calm, clear nights can duct far-away radios onto your channel. Cellular: storms knock it out through power, backhaul and crowding, not through rain.',
  'Standing water or wet ground beside the base adds ground-bounce multipath, and that error lands in every rover point. Wind moving the base tripod or mast does the same.',
];

export const WX_COMPARE = [
  ['Storm cell or sea-breeze front in the area', 'Too small for the network to see: height scatter, lower fix rate', 'Matters only if it sits between base and rover or over one end', 'Check radar; wait it out or shorten the baseline'],
  ['Cold front or squall line passing', 'Breaks the smooth-surface assumption: avoid', 'Front between the ends or passing mid-session breaks the cancellation', 'Skip the passage window; re-shoot after'],
  ['Humid air, even everywhere', 'Small effect by itself', 'Small effect by itself', 'No action; it makes storms and fronts worse'],
  ['Rain (just the drops)', 'No signal effect', 'No signal effect', 'No penalty; watch wet canopy and puddles'],
  ['Wet trees after rain', 'Rover: longer float, more wrong fixes', 'Same at the rover, plus UHF path loss', 'Longer occupations, check shots, open-sky offsets'],
  ['Wet ground or standing water', 'Rover multipath', 'Rover and base multipath', 'Don’t set the base by ponded water; 15° mask'],
  ['Geomagnetic storm (G2 or worse)', 'Hit harder: gradients across tens of km', 'Grows with baseline; under 5 km holds up best', 'Shorten the baseline, multi-GNSS, higher mask, re-initialize checks'],
  ['Tropical storm or hurricane', 'Cell, power and station outages for days', 'UHF still works if your control survived', 'Use your own base on UHF; re-check control after'],
  ['Cell outage or crowding', 'No corrections', 'Only if your base corrections go by cell', 'Switch to UHF base'],
  ['Calm, clear night (inversion)', 'No effect', 'UHF interference from far-away radios', 'Unique station ID, change channel, or use cell'],
];

export const WX_NUMBERS = [
  ['Dry (hydrostatic) delay, straight up', 'about 2.3 m at sea level'],
  ['Wet delay', '0 to about 0.4 m; Gulf summer about 0.25-0.35 m'],
  ['Water vapor to wet delay', 'wet delay ≈ 6.2-6.5 × precipitable water'],
  ['Low-satellite factor at 10°', 'about 5.6 × the straight-up delay'],
  ['Height error from troposphere', '1 cm relative delay → about 3 cm height'],
  ['Ionosphere per TECU', 'L1 0.162 m · L2 0.267 m · L5 0.291 m'],
  ['TEC gradient to ppm', '1 TECU per 100 km ≈ 1.6 ppm on L1'],
  ['Reliable single-base fixing', 'under about 10 km; agency cap 10-20 km'],
  ['Base coordinate error', 'about 1 ppm of baseline error per 10 m of base error'],
  ['Rain loss at L-band', 'under 0.01 dB per km'],
  ['Pensacola magnetic latitude', 'about 39°'],
  ['Storm afternoon window (SED)', 'about 17-23 UT = 11 am-5 pm CST / noon-6 pm CDT'],
  ['Receiver spec (e.g. Trimble R12i)', 'single-base 8 mm + 1 ppm H, 15 mm + 1 ppm V (RMS: roughly double for 95%)'],
  ['Pole tilt on a 2 m pole', '1° ≈ 3.5 cm'],
];

export const WX_MYTHS = [
  ['Rain blocks GPS.', 'L-band rain loss is under 0.01 dB per km. Vapor gradients, wet trees and wet ground around the rain are what hurt.'],
  ['Rain kills the radio or cell link.', 'Not at UHF or normal cell bands. Storms break cell service through power, backhaul and crowding; UHF suffers from wet foliage, not drops.'],
  ['Fog weakens the satellite signal.', 'Fog matters only at frequencies far above GPS.'],
  ['Dual-frequency removes all the atmosphere.', 'It removes the ionosphere, not the troposphere.'],
  ['A humid day is a bad GPS day.', 'Not by itself. Even humidity mostly cancels; gradients from storms and fronts do the damage.'],
  ['FIXED means correct.', 'A fix can be wrong, especially on disturbed days, and receivers can keep showing FIXED for up to a minute after corrections stop. Watch correction age and take check shots.'],
  ['Network RTK always beats my own base.', 'Not in storms. A 1-5 km own base is the most storm-resistant setup.'],
  ['Thunderstorms scramble the ionosphere over the job.', 'Real but tiny: storm and hurricane ripples are about 0.2 TECU, under 0.5 ppm.'],
  ['The 1 ppm in the spec is troposphere error.', 'It covers all distance errors (mostly ionosphere) on a normal day, and it is not a storm limit.'],
  ['Vendor specs are 95% numbers.', 'Usually RMS (1 sigma). Roughly double them for 95%.'],
  ['"FPRN is down" after a server change.', 'Often it is an old IP, port, mountpoint or account in the rover. Check your setup first.'],
];

export const WX_GRADES = [
  'Two letters every hour and every day: FDOT network, and your own base + rover (set the baseline and UHF or cell with 📍).',
  'Thunderstorm chance and the SPC outlook stand in for storm cells. Up to 15%: nothing. 15-30%: small. 30-50%: bigger. Over 50%: the network can’t be a go.',
  'A front passing within 3 hours (dewpoint drops fast, pressure jumps, or the wind swings with drier air) takes off more.',
  'Humid air (dewpoint 72 °F or more) makes storm and front penalties 1.5 times bigger. Humidity alone takes nothing off.',
  'Rain amount alone takes nothing off.',
  'Weather counts fully for the network. For your own base it is scaled by baseline: half at 5 km or less, full at 10-20 km, more beyond.',
  'A hurricane or tropical storm warning holds the network at F (cell and power go down). Your base on UHF is not held down by it.',
  'Space weather works the same way: the network takes it fully; a short base takes about 60% and holds a "go" one Kp step longer.',
];
