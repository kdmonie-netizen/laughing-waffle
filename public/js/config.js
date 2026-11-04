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

  // --- NOAA SWPC: real-time solar wind at L1 --------------------------------
  // One row per minute per spacecraft (e.g. SOLAR1, ACE, IMAP) for the last
  // ~24 h; `active: true` marks the one NOAA is using. These replaced
  // products/solar-wind/plasma-1-day.json and mag-1-day.json (404 since late
  // 2026). About 4 MB raw, ~250 KB compressed, which browsers ask for.
  plasma: `${SWPC}/json/rtsw/rtsw_wind_1m.json`,
  mag: `${SWPC}/json/rtsw/rtsw_mag_1m.json`,

  // --- NOAA SWPC: GOES X-ray flares + protons ------------------------------
  xray: `${SWPC}/json/goes/primary/xrays-1-day.json`,
  protons: `${SWPC}/json/goes/primary/integral-protons-1-day.json`,

  // --- NOAA SWPC: text forecasts (3, 27 and 45 days out) -------------------
  forecast3: `${SWPC}/text/3-day-forecast.txt`,
  outlook27: `${SWPC}/text/27-day-outlook.txt`,
  // 45-day Ap + F10.7. JSON replaced text/45-day-ap-forecast.txt (404).
  ap45: `${SWPC}/json/45-day-forecast.json`,
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
  // (the old .../d-rap/global/d-rap/latest.png path is 404 since at least Nov 2026)
  drapImage: `${SWPC}/images/animations/d-rap/global/latest.png`,
  glotecAnomFrames: `${SWPC}/products/animations/glotec/anomcus_urt.json`,
  wamIpeFrames: `${SWPC}/products/animations/wam-ipe/wfs_ionosphere_new.json`,

  // --- NOAA SWPC: added in 1.2.0 ----------------------------------------------
  // GloTEC: measured ionosphere (TEC) on a 5° x 2.5° grid every 10 min. The
  // index lists every frame for ~30 days (~0.5 MB); each frame is ~2.5 MB.
  glotecIndex: `${SWPC}/products/glotec/geojson_2d_urt.json`,
  dst: `${SWPC}/products/kyoto-dst.json`,
  kpModel: `${SWPC}/json/geospace/geospace_pred_est_kp_1_hour.json`,
  propagated: `${SWPC}/products/geospace/propagated-solar-wind-1-hour.json`,
  daypre: `${SWPC}/text/3-day-solar-geomag-predictions.txt`,

  // --- Satellite health from the operators (no CORS: read via /api/proxy) ---
  navcenOA: 'https://navcen.uscg.gov/sites/default/files/gps/opsadvisory/current_opsadvisory.oa1',
  // The outage file is the authority (see health.js); ~360 KB, changes with each NANU.
  navcenSof: 'https://navcen.uscg.gov/sites/default/files/gps/sof/current_sof.sof',
  galileoStatus: 'https://www.gsc-europa.eu/system-service-status/constellation-information',

  // --- NOAA NGS CORS network (ArcGIS layer behind the NGS CORS map) --------
  corsLayer: 'https://services2.arcgis.com/C8EMgrsFcRFL6LrL/arcgis/rest/services/NOAA_CORS_Network_view/FeatureServer/2',

  // --- FAA WAAS (an image; no data feed) ------------------------------------
  waasImage: 'https://www.nstb.tc.faa.gov/incoming/vplbig.png',

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
    url: 'https://www.spaceweatherlive.com/en/auroral-activity/kp-index.html',
    note: 'Kp history and forecast charts. SpaceWeatherLive also uses NOAA data.',
  },
  {
    name: 'US Coast Guard NAVCEN: GPS constellation status',
    url: 'https://navcen.uscg.gov/gps-constellation',
    note: 'The official list of GPS outages and NANUs. This app reads its daily advisory.',
  },
  {
    name: 'Galileo (GSC): constellation status',
    url: 'https://www.gsc-europa.eu/system-service-status/constellation-information',
    note: 'Which Galileo satellites are usable. This app reads this table.',
  },
  {
    name: 'GLONASS IAC: constellation status',
    url: 'https://glonass-iac.ru/en/sostavOG/',
    note: 'GLONASS health. Not read by the app (the site refuses automated requests), so check it here.',
  },
  {
    name: 'FAA WAAS performance (NSTB)',
    url: 'https://www.nstb.tc.faa.gov/',
    note: 'WAAS/SBAS service maps and satellite status, updated every few minutes.',
  },
  {
    name: 'NGS CORS map',
    url: 'https://geodesy.noaa.gov/CORS_Map/',
    note: 'Every CORS station, its data and coordinates, for OPUS and post-processing.',
  },
  {
    name: 'GPSJam: GNSS interference map',
    url: 'https://gpsjam.org/',
    note: 'Daily map of GPS interference seen by aircraft. About a day behind.',
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
    name: 'NOAA WAM-IPE ionosphere forecast',
    url: 'https://www.swpc.noaa.gov/products/wam-ipe',
    note: 'Physics-model ionosphere forecast (replaced CTIPe). TEC gradients drive GPS error.',
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
