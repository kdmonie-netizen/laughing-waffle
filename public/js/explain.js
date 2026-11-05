// Learn mode: plain-language explanations written for about a 5th-grade
// reading level. Short sentences, everyday words, and comparisons to things
// kids already know. Science words are buttons that open the glossary.
//
// test/explain.test.js measures every string here with the Flesch-Kincaid
// grade formula, so keep sentences short when you edit.

/** A tappable glossary word. */
export const term = (key, label) => `<button type="button" class="term" data-term="${key}">${label}</button>`;

// ------------------------------------------------------------------ glossary
export const GLOSSARY = {
  gps: {
    word: 'GPS',
    text: 'GPS satellites fly high above Earth. Each one sends out a radio signal that says what time it is. Your receiver hears the signals from many satellites. It checks how long each signal took to arrive. From that, it can tell exactly where you are.',
  },
  rtk: {
    word: 'RTK',
    text: 'RTK is a way to make GPS super exact, down to about the width of your finger. It uses a second GPS receiver, called a base, that sits still on a known spot. The base tells your receiver how much the signals are off. RTK needs clean signals, so space storms bother it a lot.',
  },
  fix: {
    word: 'Fix',
    text: 'A fix is when your GPS has locked onto its answer. A "fixed" RTK answer is the best kind. A "float" answer means the GPS is close but not sure yet. On stormy days, a GPS can be stuck in float for a long time.',
  },
  ionosphere: {
    word: 'Ionosphere',
    text: 'The ionosphere is a layer of air very high up, about 50 to 600 miles above the ground. The Sun gives this air an electric charge. GPS signals must pass through it. When the layer is calm, signals go straight. When it gets stirred up, signals bend and slow down, and your spot on the map can be off.',
  },
  kp: {
    word: 'Kp index',
    text: 'Kp is a score from 0 to 9 for how shaky Earth’s magnetic field is. Scientists check it every 3 hours. 0 to 3 is calm. 4 is a little bumpy. 5 or more is a space storm. 8 or 9 is a huge storm. Think of it like a wind scale, but for space.',
  },
  magfield: {
    word: 'Magnetic field',
    text: 'Earth acts like a giant magnet. Its invisible force field is called the magnetic field. It wraps around the whole planet like a bubble. It is the same force that makes a compass point north.',
  },
  magnetosphere: {
    word: 'Magnetosphere',
    text: 'The magnetosphere is the big bubble made by Earth’s magnetic field. It is our shield. It pushes most of the solar wind around Earth, the way a rock in a stream pushes water around it.',
  },
  solarwind: {
    word: 'Solar wind',
    text: 'The Sun is always blowing out a wind made of tiny bits of atoms. It is called the solar wind. It is very thin, but very fast. A normal speed is about 400 km per second. That is close to 900,000 miles per hour!',
  },
  bz: {
    word: 'Bz',
    text: 'The solar wind carries its own magnetic field from the Sun. Bz tells us which way that field points, north or south. Magnets have two ends. Like ends push apart. Opposite ends snap together. When Bz points north, it pushes away from Earth’s field and our shield stays shut. When Bz points south (a minus number), it snaps onto Earth’s field. That opens a door and lets storm energy pour in.',
  },
  flare: {
    word: 'Solar flare',
    text: 'A flare is a giant flash of light on the Sun. It reaches Earth in about 8 minutes. Flares are graded with letters: A, B, C, M and X. Each letter is 10 times stronger than the one before. Big M and X flares can make loud radio noise. That noise can drown out GPS signals on the daytime side of Earth for a few minutes.',
  },
  protons: {
    word: 'Solar protons',
    text: 'Protons are tiny pieces of atoms. Big blasts on the Sun can throw them out super fast. Earth’s magnetic field steers them toward the North and South Poles. So proton storms mostly bother people who work near the poles.',
  },
  cme: {
    word: 'CME',
    text: 'CME stands for coronal mass ejection. It is a giant cloud of hot gas and magnetic field that the Sun throws into space. It can be bigger than Earth many times over. If one heads our way, it takes 1 to 4 days to get here. When it hits, it can start a space storm.',
  },
  aurora: {
    word: 'Aurora',
    text: 'The aurora is the northern lights (or southern lights). It glows when solar wind energy crashes into the air near the poles. Pretty to look at! But the air where the aurora glows is bumpy. GPS signals passing through it can flicker.',
  },
  scintillation: {
    word: 'Scintillation',
    text: 'Scintillation is a big word for twinkling. Stars twinkle because air bends their light. GPS signals can twinkle too, when the high air is lumpy. A twinkling signal is hard for your receiver to hold on to.',
  },
  pdop: {
    word: 'PDOP',
    text: 'PDOP tells you how well spread out the satellites are in your sky. Imagine finding a friend by listening to people call your name. If the voices come from all around you, it is easy. If they all come from one corner, it is hard. Lower PDOP is better. Under 2 is great. Over 4 is not so good.',
  },
  maglat: {
    word: 'Magnetic latitude',
    text: 'Earth’s magnetic poles are not in the same spot as the North and South Poles on a globe. Magnetic latitude tells how close you are to the magnetic pole. The closer you are, the harder space storms hit your GPS.',
  },
  l1: {
    word: 'L1',
    text: 'L1 is a spot in space about 1 million miles toward the Sun. Spacecraft park there and measure the solar wind before it reaches us. It is like a lookout on a tall tower. It gives us about an hour of warning.',
  },
  tec: {
    word: 'TEC',
    text: 'TEC means total electron content. It counts how many charged bits are in the high air between you and a satellite. More of them slow GPS signals down more. Your receiver can fix some of this, but fast changes are hard to fix.',
  },
  waas: {
    word: 'WAAS',
    text: 'WAAS is a helper for GPS over North America. Stations on the ground check the GPS signals all day. Then a satellite sends out fixes for the errors. Many drones, planes and handheld GPS units use it. It does not help RTK, which has its own base.',
  },
  cors: {
    word: 'CORS',
    text: 'A CORS is a GPS receiver that never moves. It sits on a known spot and records the signals all day, every day. Surveyors use its data to check their own work. NOAA’s OPUS tool uses these stations to find an exact spot from your GPS file.',
  },
  dst: {
    word: 'Dst',
    text: 'Dst tells how deep a space storm is. It is measured near the equator in nT, a tiny unit of magnet strength. Near zero means calm. Below minus 50 is a storm. Below minus 100 is a big storm. After a storm, Dst climbs back up slowly, over a day or two. A sudden jump above zero means a blast of solar wind just hit. A storm may follow.',
  },
  noaa: {
    word: 'NOAA',
    text: 'NOAA is the U.S. agency that watches the weather and the oceans. Its Space Weather Prediction Center watches the Sun around the clock. It sends out the forecasts this app uses.',
  },
};

// ------------------------------------------------------------ grade meanings
export const GRADE_KID = {
  A: 'Super day for GPS! Signals come through clean. Your receiver should lock on fast and stay locked. It is like a calm, sunny day with no wind.',
  B: 'Good day for GPS. There are small bumps in space, but your GPS should work fine. It is like a sunny day with a light breeze.',
  C: 'Okay day. GPS should work, but it might be a little shaky. Check your work twice. It is like a cloudy day. Keep an eye on the sky.',
  D: 'Rough day. Your GPS may take a long time to lock on, or not lock at all. It might jump around, too. Careful work should wait if it can. It is like a windy, rainy day.',
  F: 'Stormy day in space! Exact GPS work could fail. If you can, save the careful jobs for a better day. It is like a thunderstorm. Most people would wait it out.',
};

// ----------------------------------------------------- why points came off
/** Kid version of each grading factor, using its live value where useful. */
export function factorKid(f) {
  const n = (re) => {
    const m = f.label.match(re);
    return m ? parseFloat(m[1]) : null;
  };
  switch (f.key) {
    case 'kp': {
      // GPS-M2: show one decimal and pick the words from that same number,
      // so Kp 4.7 is never printed as a storm-level "Kp 5".
      const raw = n(/Kp[^\d]*([\d.]+)/);
      const kp = raw == null ? null : Math.round(raw * 10) / 10;
      if (kp == null || kp < 3) return `Earth’s ${term('magfield', 'magnetic field')} is calm.`;
      if (kp < 5) return `Earth’s ${term('magfield', 'magnetic field')} is a little shaky (${term('kp', 'Kp')} ${kp.toFixed(1)}). The high air gets bumpy, so signals wobble a bit.`;
      if (kp < 7) return `There is a space storm (${term('kp', 'Kp')} ${kp.toFixed(1)}). Earth’s ${term('magfield', 'magnetic field')} is being shaken. That stirs up the ${term('ionosphere', 'high air')}, and GPS signals bend on the way down.`;
      return `There is a big space storm (${term('kp', 'Kp')} ${kp.toFixed(1)}). The ${term('ionosphere', 'high air')} is very stirred up. Exact GPS can stop working for a while.`;
    }
    case 'flare':
      return `The Sun might send out a ${term('flare', 'flare')} today. A big one can make radio noise that drowns out GPS for a few minutes. This only matters in the daytime, when your side of Earth faces the Sun.`;
    case 'flareNow':
      return `A ${term('flare', 'flare')} is happening on the Sun right now! Its radio noise can drown out GPS signals on the daytime side of Earth.`;
    case 'proton':
      return `There is a small chance of a ${term('protons', 'proton storm')}. Those mostly bother GPS near the North and South Poles.`;
    case 'protonNow':
      return `A ${term('protons', 'proton storm')} is happening now. Fast bits of atoms from the Sun are raining down near the poles.`;
    case 'scint':
      return `Near the equator, bubbles form in the ${term('ionosphere', 'high air')} after the Sun sets. They make GPS signals ${term('scintillation', 'twinkle')}, like stars do.`;
    case 'bz': {
      const v = n(/Bz\s*(-?[\d.]+)/);
      return `The Sun’s magnetic field is pointing south${v != null ? ` (${term('bz', 'Bz')} ${v.toFixed(0)})` : ''}. Opposite magnet ends snap together, so it is opening a door in Earth’s ${term('magnetosphere', 'shield')}. Storm energy is leaking in.`;
    }
    case 'speed': {
      const v = n(/wind\s*([\d.]+)/);
      return `The ${term('solarwind', 'solar wind')} is blowing fast${v ? `, about ${mph(v)} miles per hour` : ''}. Fast wind pushes hard on Earth’s ${term('magnetosphere', 'shield')}.`;
    }
    case 'aurora':
      return `The ${term('aurora', 'northern lights')} may be right over you. Where the aurora glows, the high air is lumpy, and GPS signals ${term('scintillation', 'twinkle')}.`;
    case 'pdop': {
      const v = n(/PDOP\s*([\d.]+)/);
      if (v != null && v <= 3) return `The satellites are spread out well in your sky (${term('pdop', 'PDOP')} ${v.toFixed(1)}). That is a small dent in the score.`;
      return `The satellites are bunched up in one part of your sky (${term('pdop', 'PDOP')} ${v != null ? v.toFixed(1) : 'high'}). It is harder to find your spot when the signals all come from one side.`;
    }
    case 'flux':
      return 'The Sun is extra busy this time of year. A busy Sun makes more flares and charges up the high air more.';
    default:
      return f.label;
  }
}

export function mph(kmPerSec) {
  const v = kmPerSec * 2236.94;
  return v >= 1e6 ? `${(v / 1e6).toFixed(1)} million` : `${Math.round(v / 1000) * 1000}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ------------------------------------------------------------ today summary
/** "an A", "a B", "an F": the article that goes before a grade letter when read out loud. */
const aGrade = (g) => `${/^[AEF]/.test(g) ? 'an' : 'a'} ${g}`;

export function todayKid(day, now) {
  if (!day) return 'We could not get the space forecast right now, so there is no grade yet.';
  const parts = [`<p><b>Today gets ${aGrade(day.grade)}.</b> ${GRADE_KID[day.grade]}</p>`];
  const reasons = day.drivers.filter((d) => d.penalty >= 3);
  if (reasons.length) {
    parts.push(`<p><b>Why?</b></p><ul>${reasons.map((r) => `<li>${factorKid(r)}</li>`).join('')}</ul>`);
  } else {
    parts.push('<p><b>Why?</b> Space is calm, and lots of satellites are spread around your sky. Nothing is getting in the way.</p>');
  }
  if (day.capReasons?.length || day.flags?.length) {
    parts.push(
      `<p><b>Why not a go?</b> ${day.flags?.length ? 'Part of the forecast is missing. We never guess that missing hours are calm. ' : ''}${day.capReasons?.length ? 'Some readings say a storm is here or close. Then the grade stops at D, even if other hours look calm.' : ''}</p>`,
    );
  }
  const w = day.bestWindow;
  if (w) {
    const t = (d) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    parts.push(
      w.good
        ? `<p><b>Best time to work:</b> ${t(w.start)} to ${t(w.end)}.</p>`
        : w.partial
          ? `<p><b>Good hours:</b> ${t(w.start)} to ${t(w.end)}. The rest of the work day is rougher, so the day gets the lower grade.</p>`
          : `<p><b>No great hours today.</b> The least bad time is around ${t(w.start)}.</p>`,
    );
  }
  if (now && now.grade !== day.grade) {
    parts.push(`<p><b>Right now</b> it is ${aGrade(now.grade)}. Things can change hour by hour, just like weather.</p>`);
  }
  return parts.join('');
}

// --------------------------------------------------------- "right now" tiles
export function statKid(key, v) {
  switch (key) {
    case 'kp':
      if (v == null) return 'No reading right now.';
      if (v < 3) return 'Calm. Earth’s magnet field is quiet, like a still pond.';
      if (v < 4) return 'Mostly calm, with a few small ripples.';
      if (v < 5) return 'A little bumpy. Not a storm yet.';
      if (v < 7) return 'Space storm! The magnet field is being shaken.';
      return 'Big space storm! Expect GPS trouble.';
    case 'bz':
      if (v == null) return 'No reading right now.';
      if (v >= -3) return 'Pointing north or flat. Earth’s shield stays shut. Good!';
      if (v >= -10) return 'Pointing south. A door in Earth’s shield is opening a little.';
      return 'Pointing hard south. Storm energy is pouring in.';
    case 'speed':
      if (v == null) return 'No reading right now.';
      return `About ${mph(v)} mph. ${v < 500 ? 'That is a normal speed.' : v < 700 ? 'That is faster than normal.' : 'That is very fast!'}`;
    case 'xray':
      if (v == null) return 'No reading right now.';
      if (v < 1e-5) return 'No big flares. The Sun is quiet.';
      if (v < 1e-4) return 'A medium flare (M class). Some radio noise.';
      return 'A big X flare! GPS on the daytime side may drop out for a bit.';
    case 'protons':
      if (v == null) return 'No reading right now.';
      return v < 10 ? 'Normal. No proton storm.' : 'Proton storm! Mostly a problem near the poles.';
    case 'aurora':
      if (v == null) return 'No reading right now.';
      if (v < 5) return 'No aurora over you.';
      if (v < 30) return 'Some of the northern lights may be over you. Signals may twinkle.';
      return 'The northern lights are likely right over you. Your signals will twinkle.';
    case 'sats':
      if (v == null) return 'Still loading where the satellites are.';
      return v.pdop <= 2
        ? `${v.count} satellites, nicely spread out. Great!`
        : v.pdop <= 4
          ? `${v.count} satellites, spread out okay.`
          : `${v.count} satellites, but bunched up. Not great.`;
    case 'tec':
      if (v == null) return 'No reading right now.';
      if (v.anomaly == null) return 'Shows how much charged air is over you.';
      if (v.anomaly > 10) return 'Much more charged air than normal. GPS errors grow.';
      if (v.anomaly > 3) return 'A bit more charged air than normal.';
      if (v.anomaly < -3) return 'Less charged air than normal. That is fine for GPS.';
      return 'About normal for this time of day.';
    case 'dst':
      if (v == null) return 'No reading right now.';
      if (v > 20) return 'A jump up! A blast of solar wind just hit Earth. A storm may follow.';
      if (v > -30) return 'No storm. Earth’s magnet field is quiet.';
      if (v > -50) return 'A small dip. Not quite a storm.';
      if (v > -100) return 'A space storm is going on.';
      return 'A big space storm is going on!';
    case 'kpNext':
      if (v == null) return 'No forecast right now.';
      if (v < 4) return 'A computer model of space says the next hour looks calm.';
      if (v < 5) return 'The model says the next hour gets a little bumpy.';
      return 'The model says a storm is coming in the next hour.';
    case 'mlat': {
      const a = Math.abs(v);
      if (a >= 55) return 'You are close to the magnetic pole. Storms hit you hard.';
      if (a >= 25) return 'You are in the middle. Big storms still reach you.';
      return 'You are near the magnetic equator. Watch for twinkly signals after sunset.';
    }
    default:
      return '';
  }
}

// --------------------------------------------- what each section is showing
export const SECTIONS = {
  timeline:
    `Each box is one hour. The letter is the grade for that hour. Green is good and red is bad. Faded boxes are outside your work hours. Tap a box to see why it got that grade.`,
  outlook:
    `This is like a weather forecast, but for space. The first 3 days come from ${term('noaa', 'NOAA')} and get a real grade. Days farther out are best guesses, so they get a word, like quiet or active, not a letter. The Sun spins once about every 27 days, so busy spots on the Sun come back around. That is how scientists can guess weeks ahead.`,
  kpChart:
    `Each bar shows how shaky Earth’s ${term('magfield', 'magnetic field')} was over 3 hours. Taller bars mean more shaking. Green is calm, yellow is bumpy, orange and red are storms. Faded bars on the right are the forecast. Watch for bars that reach the dashed line at 5. That is where storms start.`,
  magChart:
    `This shows the Sun’s magnetic field as it flows past a spacecraft at ${term('l1', 'L1')}. The red line is ${term('bz', 'Bz')}. When the red line drops below zero and stays down, storm energy can get into Earth’s shield. It reaches Earth about an hour later.`,
  windChart:
    `The blue line is how fast the ${term('solarwind', 'solar wind')} is blowing. The yellow line is how thick it is. Fast wind and thick wind both push hard on Earth’s ${term('magnetosphere', 'shield')}.`,
  xrayChart:
    `This shows flashes of X-ray light from the Sun. Spikes are ${term('flare', 'flares')}. Each line up the side is 10 times stronger than the one below. Spikes past the M line can cause radio trouble. Spikes past the X line can knock out GPS on the daytime side for a few minutes.`,
  protonChart:
    `This counts super-fast ${term('protons', 'protons')} from the Sun. If the line goes above the S1 line, a radiation storm has started. It mostly affects GPS near the poles.`,
  scales:
    `${term('noaa', 'NOAA')} rates space weather with three scales, like hurricane categories. G is for geomagnetic storms (shaking of Earth’s magnet field). S is for solar radiation (protons). R is for radio blackouts (flares). Each one goes from 1 (small) to 5 (extreme). G matters most for GPS.`,
  sats:
    `The circle is your sky. The middle is straight overhead and the edge is the horizon. Each dot is a satellite your GPS can hear. More dots spread all around is better. The chart shows ${term('pdop', 'PDOP')} over the next 3 days. Lower is better. Satellites move, so some hours are better than others.`,
  magSim:
    `This is a model of the ${term('solarwind', 'solar wind')} hitting Earth. The dots are the wind. The bright curved line is the edge of Earth’s ${term('magnetosphere', 'shield')}. Strong wind squishes the shield closer to Earth. The green ring is where GPS satellites fly. Try the sliders: make the wind fast and Bz very negative, and watch the shield shrink!`,
  enlil:
    `This is a computer model of the ${term('solarwind', 'solar wind')} spreading out from the Sun. The Sun is in the middle and Earth is the dot. Red and yellow swirls are fast wind or a ${term('cme', 'CME')}. If a big blob moves over Earth’s dot, expect a storm.`,
  auroraMap:
    `This map looks down on the top (or bottom) of Earth. The glowing ring is where the ${term('aurora', 'aurora')} is likely right now. The white dot is you. If the ring covers your dot, GPS signals may ${term('scintillation', 'twinkle')}.`,
  ovationAnim:
    'This shows how the aurora ring grew and shrank over the last day. A bigger, brighter ring means a stronger storm.',
  lasco:
    `A spacecraft blocks the bright Sun with a disk so it can see the faint stuff around it. Clouds blasting outward are ${term('cme', 'CMEs')}. A cloud that spreads out all around the disk, like a ring, may be coming right at Earth.`,
  suvi:
    'This is a live picture of the Sun in a special color of light. Bright spots are busy areas where flares can start.',
  drap:
    `This map shows where the high air is soaking up radio waves after a ${term('flare', 'flare')} or ${term('protons', 'proton storm')}. Colored areas are having radio trouble. GPS can be noisy there too.`,
  cme:
    `When the Sun throws a ${term('cme', 'CME')}, scientists use computer models to guess when it will reach Earth. Pick one from the list and press Simulate. The model shows the cloud slowing down as it pushes through the ${term('solarwind', 'solar wind')}, like a ball slowing down in water.`,
  health:
    `Sometimes a satellite is broken or being fixed. Its owner then tells everyone not to use it. This app reads those notices for ${term('gps', 'GPS')} and Galileo. It leaves those satellites out, just like your receiver does. Gray rings on the sky circle are left out.`,
  cors:
    `These are the ${term('cors', 'CORS')} stations nearest your job site. Each one is a GPS that never moves. Closer stations help most when you send your data to OPUS. The list also shows which satellite systems each one tracks.`,
  waas:
    `This map from the FAA shows how well ${term('waas', 'WAAS')} is working over North America. Dark blue is good. Red means WAAS can’t help much there. Inside the yellow line, WAAS works its best. Drones and handheld GPS units use WAAS. RTK does not.`,
  glotecMap:
    `This map shows the ${term('ionosphere', 'high air')} over the United States, compared with the last 30 days. Orange and brown mean more charged air than usual. Purple means less. Big orange patches slow GPS signals more and make errors grow.`,
  wamipe:
    `This is a computer forecast of the ${term('ionosphere', 'high air')} for the whole Earth. It looks ahead about a day. Look at the top left map. Bright yellow means lots of charged air, where GPS signals slow down the most. In the bottom left map, red means more than normal and blue means less.`,
  alerts:
    'These are the official warnings from the space weather forecasters. A watch means something might happen. A warning means it is about to happen. An alert means it is happening now.',
  discussion:
    `This is what the forecasters wrote, in their own words. It uses a lot of science talk. The 3-day forecast lists the ${term('kp', 'Kp')} they expect for every 3 hours.`,
  sources:
    'These links go to other space weather websites. You can use them to double-check this app. The dots at the bottom show which data came in. Green means it worked. Red means that data could not be reached.',
  method:
    `This is the recipe for the grade. Every hour starts with 100 points, like a perfect test score. Each problem in space takes some points away. More points left means a better grade. One bad hour can pull down the whole day. People close to the ${term('maglat', 'magnetic pole')} lose more points, because storms hit them harder.`,
};

// ------------------------------------------------- Space Weather 101 extras
export const LEARN_INTRO =
  'Space weather is like the weather outside, but it happens out in space. The Sun can send out storms. They can make your GPS less exact. Here is how it works, in 5 steps.';

export const NEW_HERE = 'New here? Start with Space Weather 101.';

export const QUIZ_TEXT = {
  intro: 'Test what you know! Tap an answer to see if you are right.',
  right: 'Right!',
  wrong: 'Not quite. The answer is:',
  score: 'Score:',
  done: 'All done! You got',
  perfect: 'A perfect score!',
  again: 'Try again',
};

// ------------------------------------------------------------- hour + days
export function hourKid(h) {
  const big = h.factors.filter((f) => f.penalty >= 3);
  const main = big[0];
  return `${GRADE_KID[h.grade].split('. ')[0]}.${main ? ` The biggest reason: ${factorKid(main)}` : ''}`;
}

export function dayKid(d) {
  return GRADE_KID[d.grade].split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.');
}

// --------------------------------------------------------- Space Weather 101
export const STORY = [
  {
    title: '1. The Sun blows a wind',
    text: `The Sun is always blowing out a fast, thin wind called the ${term('solarwind', 'solar wind')}. Sometimes it also throws giant clouds called ${term('cme', 'CMEs')} or flashes bright ${term('flare', 'flares')}.`,
  },
  {
    title: '2. Earth has a shield',
    text: `Earth is a giant magnet. Its ${term('magnetosphere', 'magnetic shield')} pushes most of the wind around us. But when the wind’s magnet points south (${term('bz', 'Bz')} below zero), the shield opens a door and energy pours in.`,
  },
  {
    title: '3. The high air gets stirred up',
    text: `That energy shakes Earth’s ${term('magfield', 'magnetic field')}. We measure the shaking with ${term('kp', 'Kp')}. The shaking stirs up the ${term('ionosphere', 'ionosphere')}, a layer of charged air high above us. Near the poles it glows as the ${term('aurora', 'aurora')}.`,
  },
  {
    title: '4. GPS signals pass through',
    text: `${term('gps', 'GPS')} satellites fly about 12,500 miles up. Their signals must pass through the ${term('ionosphere', 'ionosphere')} to reach you. Calm air lets them through straight. Stirred-up air bends them and makes them ${term('scintillation', 'twinkle')}.`,
  },
  {
    title: '5. Your receiver does the math',
    text: `Your receiver times signals from many satellites to find your spot. Bent signals give it the wrong times. Then your answer is off, or ${term('rtk', 'RTK')} can’t get a ${term('fix', 'fix')}. That is why this app grades each day.`,
  },
];

export const QUIZ = [
  {
    q: 'What does a high Kp number mean?',
    choices: ['It is raining a lot', 'Earth’s magnetic field is stormy', 'The satellites are broken'],
    answer: 1,
    why: 'Kp measures how much Earth’s magnetic field is shaking. 5 or more means a space storm.',
  },
  {
    q: 'Which way should Bz point for a calm GPS day?',
    choices: ['North (a plus number)', 'South (a minus number)'],
    answer: 0,
    why: 'When Bz points north, it pushes away from Earth’s field, like two magnet ends that are the same. Our shield stays shut.',
  },
  {
    q: 'Which PDOP is better?',
    choices: ['1.5', '6.0'],
    answer: 0,
    why: 'Lower PDOP means the satellites are spread out all around your sky. That makes it easier to find your exact spot.',
  },
  {
    q: 'Where do space storms bother GPS the most?',
    choices: ['Near the poles', 'In the middle of the ocean', 'Inside a cave'],
    answer: 0,
    why: 'Earth’s magnetic field steers storm energy toward the poles. That is also where the aurora glows.',
  },
  {
    q: 'About how long does the solar wind take to get from L1 to Earth?',
    choices: ['About 1 second', 'About 1 hour', 'About 1 month'],
    answer: 1,
    why: 'L1 is about 1 million miles away. Even at 900,000 miles per hour, the wind takes about an hour to get here.',
  },
  {
    q: 'A solar flare can hurt GPS. When does that happen?',
    choices: ['Only at night', 'Only in the daytime', 'Only in winter'],
    answer: 1,
    why: 'Flare light and radio noise hit the side of Earth that faces the Sun. That is the daytime side.',
  },
];

/** All learner-facing text, for the reading-level test. */
export function allText() {
  const out = [];
  for (const g of Object.values(GLOSSARY)) out.push(g.text);
  out.push(...Object.values(GRADE_KID), ...Object.values(SECTIONS));
  for (const s of STORY) out.push(s.text);
  for (const q of QUIZ) out.push(q.q, q.why);
  out.push(LEARN_INTRO, NEW_HERE, QUIZ_TEXT.intro);
  return out.map((s) => s.replace(/<[^>]+>/g, ''));
}
