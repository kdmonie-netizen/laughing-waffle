// Central configuration: every data source the dashboard pulls from, plus
// the defaults for the GPS grading model. Edit this file to add sources or
// tune thresholds; nothing else hard-codes a URL.

export const SWPC = 'https://services.swpc.noaa.gov';

export const SOURCES = {
  // --- NOAA SWPC: geomagnetic (Kp) ---------------------------------------
  kpObserved: `${SWPC}/products/noaa-planetary-k-index.json`,
  kpForecast: `${SWPC}/products/noaa-planetary-k-index-forecast.json`,
  kp1m: `${SWPC}/json/planetary_k_index_1m.json`,
  scales: `${SWPC}/products/noaa-scales.json`,

  // --- NOAA SWPC: real-time solar wind at L1 (DSCOVR/ACE) -----------------
  plasma: `${SWPC}/products/solar-wind/plasma-1-day.json`,
  mag: `${SWPC}/products/solar-wind/mag-1-day.json`,

  // --- NOAA SWPC: GOES X-ray flares + protons ------------------------------
  xray: `${SWPC}/json/goes/primary/xrays-1-day.json`,
  protons: `${SWPC}/json/goes/primary/integral-protons-1-day.json`,

  // --- NOAA SWPC: text forecasts (3, 27 and 45 days out) -------------------
  forecast3: `${SWPC}/text/3-day-forecast.txt`,
  outlook27: `${SWPC}/text/27-day-outlook.txt`,
  ap45: `${SWPC}/text/45-day-ap-forecast.txt`,
  discussion: `${SWPC}/text/discussion.txt`,
  alerts: `${SWPC}/products/alerts.json`,

  // --- NOAA SWPC: models / simulations -------------------------------------
  ovation: `${SWPC}/json/ovation_aurora_latest.json`,
  enlilFrames: `${SWPC}/products/animations/enlil.json`,
  ovationNorthFrames: `${SWPC}/products/animations/ovation_north_24h.json`,
  ovationSouthFrames: `${SWPC}/products/animations/ovation_south_24h.json`,
  lascoC3Frames: `${SWPC}/products/animations/lasco-c3.json`,
  lascoC2Frames: `${SWPC}/products/animations/lasco-c2.json`,
  suvi304Frames: `${SWPC}/products/animations/suvi-primary-304.json`,
  drapImage: `${SWPC}/images/animations/d-rap/global/d-rap/latest.png`,

  // --- NASA CCMC DONKI: CMEs and their WSA-Enlil arrival simulations -------
  // DEMO_KEY works for light use (rate-limited per IP). Get a free key at
  // https://api.nasa.gov and put it here for heavier use.
  nasaApiKey: 'DEMO_KEY',
  donkiCme: 'https://api.nasa.gov/DONKI/CMEAnalysis',
  donkiEnlil: 'https://api.nasa.gov/DONKI/WSAEnlilSimulations',

  // --- CelesTrak: GNSS orbital elements for satellite geometry / PDOP -----
  tle: {
    GPS: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle',
    GLONASS: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=glo-ops&FORMAT=tle',
    Galileo: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=galileo&FORMAT=tle',
    BeiDou: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=beidou&FORMAT=tle',
  },
};

// Sites that don't publish an open data API. The dashboard links to them as
// cross-checks and for their own visualisations.
export const CROSS_CHECK_LINKS = [
  {
    name: 'NOAA SWPC GPS Community Dashboard',
    url: 'https://www.swpc.noaa.gov/communities/global-positioning-system-gps-community-dashboard',
    note: 'NOAA’s own GPS-user page. This app reads the same SWPC feeds directly.',
  },
  {
    name: 'SpaceWeatherLive: Kp index',
    url: 'https://www.spaceweatherlive.com/en/auroral-activity/the-kp-index.html',
    note: 'Kp history and forecast charts. SpaceWeatherLive also uses NOAA/DSCOVR data.',
  },
  {
    name: 'SpaceWeatherLive: solar wind',
    url: 'https://www.spaceweatherlive.com/en/solar-activity/solar-wind.html',
    note: 'Live Bz / speed / density panels for a second look.',
  },
  {
    name: 'SpaceWeatherLive: solar flares',
    url: 'https://www.spaceweatherlive.com/en/solar-activity/solar-flares.html',
    note: 'Flare list and X-ray flux (radio bursts can cost dayside GPS lock).',
  },
  {
    name: 'Spaceweather Horizon',
    url: 'https://spaceweatherhorizon.com/',
    note: 'Live solar wind, Kp, CME tracking and its CME-arrival / magnetosphere simulators.',
  },
  {
    name: 'NOAA GloTEC (global TEC)',
    url: 'https://www.swpc.noaa.gov/products/glotec',
    note: 'Real-time global ionospheric Total Electron Content map.',
  },
  {
    name: 'NOAA CTIPe TEC forecast',
    url: 'https://www.swpc.noaa.gov/products/ctipe-total-electron-content-forecast',
    note: 'Physics-model ionosphere forecast. TEC gradients drive GPS error.',
  },
  {
    name: 'NOAA Geospace magnetosphere model',
    url: 'https://www.swpc.noaa.gov/products/geospace-magnetosphere-movies',
    note: 'SWMF magnetosphere simulation driven by L1 solar wind.',
  },
  {
    name: 'GFZ Potsdam Kp / Hp30',
    url: 'https://kp.gfz-potsdam.de/en/',
    note: 'Definitive Kp plus half-hourly Hp30 index.',
  },
];

// Cache lifetimes (ms). CelesTrak asks clients not to re-download element
// sets more than every couple of hours, so TLEs are cached for 6 h.
export const CACHE_TTL = {
  default: 5 * 60 * 1000,
  text: 30 * 60 * 1000,
  tle: 6 * 60 * 60 * 1000,
  donki: 60 * 60 * 1000,
};

export const DEFAULT_SETTINGS = {
  lat: 39.74,         // Denver, CO. Replaced by "Use my location" or manual entry.
  lon: -104.99,
  label: 'Denver, CO',
  profile: 'survey',
  workStart: 6,        // local hours used for the day's headline grade
  workEnd: 18,
  elevationMask: 10,   // degrees
  constellations: ['GPS', 'Galileo', 'GLONASS', 'BeiDou'],
};

// Profiles scale every penalty. RTK/survey work is the most sensitive to
// ionospheric disturbance; plain navigation shrugs most of it off.
export const PROFILES = {
  survey: { label: 'RTK / Survey (cm-level)', factor: 1.25 },
  drone: { label: 'Drone / UAV mapping', factor: 1.0 },
  ag: { label: 'Precision ag / machine guidance', factor: 0.9 },
  nav: { label: 'General navigation (m-level)', factor: 0.5 },
};
