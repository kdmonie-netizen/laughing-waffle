import { SOURCES, CROSS_CHECK_LINKS, CACHE_TTL, DEFAULT_SETTINGS, PROFILES, SWPC } from './config.js';
import { fetchJSON, fetchText, loadAll, staleFeeds } from './fetch.js';
import * as P from './parsers.js';
import { gradeConditions, gradeFor } from './grading.js';
import { geomagneticLatitude, latitudeBand } from './geo.js';
import { buildSatrecs, visibleSatellites, geometryTimeline, dop } from './gnss.js';
import { drawChart, kpColor } from './charts.js';
import { MagnetosphereSim } from './sims/magnetosphere.js';
import { FramePlayer } from './sims/player.js';
import { drawAuroraMap, loadLand } from './sims/aurora.js';
import { dbmArrival, enlilEarthArrivals, cmeAnalyses, CmeAnimation } from './sims/cme.js';
import * as L from './explain.js';
import { parseNavcenOA, parseSof, parseGalileoStatus, buildHealth } from './health.js';
import * as W from './wxlearn.js';
import { QUIZZES } from './quizzes.js';
import { parsePoints, parseGridpoint, parseAlerts as parseNwsAlerts, spcAtSite, buildLocalWeather } from './weather.js';

const $ = (id) => document.getElementById(id);
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtTime = (d) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const fmtDay = (d) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const CONST_COLORS = { GPS: '#5ab0ff', Galileo: '#c084fc', GLONASS: '#f87171', BeiDou: '#fbbf24' };

// ---------------------------------------------------------------- settings
function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('gpsdash:settings') || '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
function saveSettings() {
  try {
    localStorage.setItem('gpsdash:settings', JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}
let settings = loadSettings();

const state = {
  raw: {},
  parsed: {},
  errors: {},
  sats: [],
  geometry: [],
  result: null,
  selectedHour: null,
  players: {},
};

// ------------------------------------------------------------------ loading
const LOADERS = {
  kpObserved: (force) => fetchJSON(SOURCES.kpObserved, { force }),
  kpForecast: (force) => fetchJSON(SOURCES.kpForecast, { force }),
  kp1m: (force) => fetchJSON(SOURCES.kp1m, { force }),
  scales: (force) => fetchJSON(SOURCES.scales, { force }),
  plasma: (force) => fetchJSON(SOURCES.plasma, { force }),
  mag: (force) => fetchJSON(SOURCES.mag, { force }),
  xray: (force) => fetchJSON(SOURCES.xray, { force }),
  protons: (force) => fetchJSON(SOURCES.protons, { force }),
  forecast3: (force) => fetchText(SOURCES.forecast3, { force, ttl: CACHE_TTL.text }),
  outlook27: (force) => fetchText(SOURCES.outlook27, { force, ttl: CACHE_TTL.text, persist: true }),
  ap45: (force) => fetchJSON(SOURCES.ap45, { force, ttl: CACHE_TTL.text, persist: true }),
  discussion: (force) => fetchText(SOURCES.discussion, { force, ttl: CACHE_TTL.text }),
  alerts: (force) => fetchJSON(SOURCES.alerts, { force }),
  ovation: (force) => fetchJSON(SOURCES.ovation, { force }),
  donkiEnlil: (force) => fetchJSON(donkiUrl(SOURCES.donkiEnlil, 7), { force, ttl: CACHE_TTL.donki, persist: true }),
  donkiCme: (force) => fetchJSON(donkiUrl(SOURCES.donkiCme, 10) + '&mostAccurateOnly=true', { force, ttl: CACHE_TTL.donki, persist: true }),
  // added in 1.2.0
  dst: (force) => fetchJSON(SOURCES.dst, { force, ttl: 30 * 60000 }),
  kpModel: (force) => fetchJSON(SOURCES.kpModel, { force }),
  propagated: (force) => fetchJSON(SOURCES.propagated, { force }),
  daypre: (force) => fetchText(SOURCES.daypre, { force, ttl: CACHE_TTL.text }),
  glotec: (force) => loadGlotec(force),
  navcenOA: (force) => fetchText(SOURCES.navcenOA, { force, ttl: CACHE_TTL.text, persist: true, proxyFirst: true }),
  navcenSof: (force) => fetchText(SOURCES.navcenSof, { force, ttl: 3 * 3600000, proxyFirst: true }),
  galileoStatus: (force) => fetchText(SOURCES.galileoStatus, { force, ttl: 3600000, proxyFirst: true }),
  // 1.4.0: local weather. Each answer carries its site, like the CORS list.
  nws: (force) => loadNws(force),
  spc: (force) => loadSpc(force),
  // The answer carries the site it was asked for, so a late reply for an old site is never shown for a new one.
  cors: async (force) => {
    const site = { lat: settings.lat, lon: settings.lon };
    return { site, data: await fetchJSON(P.corsQueryUrl(SOURCES.corsLayer, site.lat, site.lon), { force, ttl: 24 * 3600000, persist: true }) };
  },
};

// GloTEC: the index (~0.5 MB, refreshed every 10 min) names the newest frame;
// each frame (~2.5 MB) is fetched once and only the latest is kept.
let glotecFrame = { url: null, data: null };
async function loadGlotec(force) {
  const idx = await fetchJSON(SOURCES.glotecIndex, { force, ttl: 10 * 60000 });
  const last = Array.isArray(idx) ? idx[idx.length - 1] : null;
  if (!last?.url) {
    if (glotecFrame.data) return glotecFrame.data; // a blip in the index: keep the frame we have
    throw new Error('GloTEC index is empty');
  }
  const url = new URL(last.url, SWPC).href;
  if (glotecFrame.url !== url) glotecFrame = { url, data: await fetchJSON(url, { memo: false, ttl: 0 }) };
  return glotecFrame.data;
}

// NWS: /points (cached for a month per site) names the forecast grid; the grid
// (~7 days hourly) refreshes about hourly. Alerts are best effort.
async function loadNws(force) {
  const site = { lat: settings.lat, lon: settings.lon };
  const points = parsePoints(await fetchJSON(SOURCES.nwsPoints(site.lat, site.lon), { ttl: 30 * 86400000, persist: true }));
  if (!points) throw new Error('NWS has no forecast grid for this site');
  const grid = await fetchJSON(points.gridUrl, { force, ttl: 30 * 60000, persist: true });
  let alerts = null;
  try {
    alerts = await fetchJSON(SOURCES.nwsAlerts(site.lat, site.lon), { force, ttl: 10 * 60000 });
  } catch {
    /* alerts unknown: the grade card says so via state.errors */
  }
  return { site, points, grid, alerts };
}

async function loadSpc(force) {
  const out = await Promise.all(SOURCES.spcOutlook.map((u) => fetchJSON(u, { force, ttl: 30 * 60000 }).catch(() => null)));
  if (!out.some(Boolean)) throw new Error('SPC outlooks did not load');
  return out;
}

/** Local weather for the grade, only if the answer is for the current site. */
function localWeatherNow() {
  const raw = state.raw.nws;
  const same = raw && Math.abs(raw.site.lat - settings.lat) < 1e-6 && Math.abs(raw.site.lon - settings.lon) < 1e-6;
  let grid = null;
  let alerts = [];
  try {
    if (same) grid = parseGridpoint(raw.grid);
    if (same && raw.alerts) alerts = parseNwsAlerts(raw.alerts);
  } catch (e) {
    console.warn(e);
  }
  const spc = (state.raw.spc || []).map((j) => (j ? spcAtSite(j, settings.lat, settings.lon) : null)).filter(Boolean);
  return buildLocalWeather({ grid, alerts, spc });
}

function donkiUrl(base, daysBack) {
  const d = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  return `${base}?startDate=${d(-daysBack)}&endDate=${d(1)}&api_key=${SOURCES.nasaApiKey}`;
}

async function loadTLEs() {
  const texts = {};
  await Promise.all(
    settings.constellations.map(async (c) => {
      try {
        texts[c] = await fetchText(SOURCES.tle[c], { ttl: CACHE_TTL.tle, persist: true });
        state.errors[`tle:${c}`] = undefined;
      } catch (e) {
        state.errors[`tle:${c}`] = String(e.message || e);
      }
    }),
  );
  state.sats = buildSatrecs(texts);
}

function computeGeometry() {
  if (!state.sats.length) {
    state.geometry = [];
    return;
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  state.geometry = geometryTimeline(state.sats, start, 72, 10, settings.lat, settings.lon, settings.elevationMask, state.health?.usable || null);
  state.geometryHealthKey = state.health?.key || '';
}

function parseAll(raw) {
  const p = {};
  const safe = (fn, v) => {
    try {
      return v == null ? null : fn(v);
    } catch (e) {
      console.warn(e);
      return null;
    }
  };
  p.kpObserved = safe(P.parseKpObserved, raw.kpObserved) || [];
  p.kpForecast = safe(P.parseKpForecast, raw.kpForecast) || [];
  p.kp1m = safe(P.parseKp1m, raw.kp1m) || [];
  p.scales = safe(P.parseScales, raw.scales);
  p.plasma = safe(P.parsePlasma, raw.plasma) || [];
  p.mag = safe(P.parseMag, raw.mag) || [];
  p.xray = safe(P.parseXray, raw.xray) || [];
  p.protons = safe(P.parseProtons, raw.protons) || [];
  p.outlook27 = safe(P.parse27Day, raw.outlook27) || [];
  p.outlook45 = safe(P.parse45Day, raw.ap45) || { ap: [], f107: [] };
  p.alerts = safe(P.parseAlerts, raw.alerts) || [];
  p.ovation = safe(P.parseOvation, raw.ovation);
  p.enlil = safe(enlilEarthArrivals, raw.donkiEnlil) || [];
  p.cmes = safe(cmeAnalyses, raw.donkiCme) || [];
  p.dst = safe(P.parseDst, raw.dst) || [];
  p.kpModel = safe(P.parseKpModel, raw.kpModel) || [];
  p.propagated = safe(P.parsePropagated, raw.propagated) || [];
  p.daypre = safe(P.parseDaypre, raw.daypre);
  p.glotec = raw.glotec || null;
  p.cors = safe(corsForSite, raw.cors) || [];
  // Health lists: a page that parses to nothing has changed shape, which
  // means "unknown", never "every satellite is fine".
  p.oa = safe(parseNavcenOA, raw.navcenOA);
  p.sof = safe(parseSof, raw.navcenSof);
  if (p.sof && !p.sof.outages.length) p.sof = null;
  p.galileo = safe(parseGalileoStatus, raw.galileoStatus);
  if (p.galileo && !p.galileo.length) p.galileo = null;
  return p;
}

/** Minutes since the newest row in a raw SWPC table, whatever its value. */
function rowAge(json) {
  let newest = 0;
  for (const r of P.toRows(json)) {
    const t = P.parseTime(r.time_tag);
    if (t && +t > newest) newest = +t;
  }
  return newest ? (Date.now() - newest) / 60000 : null;
}

// A live reading older than this is "no recent data", never "calm": NOAA's
// real-time feeds do go quiet (SWPC news, 22 Sep 2026: RTSW and GOES-18 out).
const FRESH_MIN = 90;

function realtime(p) {
  const now = Date.now();
  const recent = (arr, key, mins) => {
    const v = arr.filter((r) => now - r.time <= mins * 60000 && r[key] != null).map((r) => r[key]);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const newest = (arr, key) => {
    for (let i = arr.length - 1; i >= 0; i--) if (arr[i][key] != null) return arr[i];
    return null;
  };
  const last = (arr, key) => {
    const r = newest(arr, key);
    return r && now - r.time <= FRESH_MIN * 60000 ? r : null;
  };
  const age = (arr, key) => {
    const r = newest(arr, key);
    return r ? (now - r.time) / 60000 : null;
  };
  const xr = last(p.xray, 'flux');
  const pr = last(p.protons, 'flux');
  const kp = last(p.kp1m, 'kp');
  return {
    kpNow: kp?.kp ?? null,
    bz30: recent(p.mag, 'bz', 30) ?? last(p.mag, 'bz')?.bz ?? null,
    bzLatest: last(p.mag, 'bz')?.bz ?? null,
    bt: last(p.mag, 'bt')?.bt ?? null,
    speed: recent(p.plasma, 'speed', 30) ?? last(p.plasma, 'speed')?.speed ?? null,
    density: recent(p.plasma, 'density', 30) ?? last(p.plasma, 'density')?.density ?? null,
    xrayFlux: xr?.flux ?? null,
    rNow: xr ? P.rScaleFromFlux(xr.flux) : null, // null = no recent reading (grading checks >= 1)
    protonFlux: pr?.flux ?? null,
    sNow: pr ? P.sScaleFromFlux(pr.flux) : null,
    aurora: p.ovation ? p.ovation.at(settings.lat, settings.lon) : null,
    ages: { wind: age(p.plasma, 'speed'), mag: age(p.mag, 'bz'), xray: age(p.xray, 'flux'), protons: age(p.protons, 'flux'), kp: age(p.kp1m, 'kp') },
    // Newest row of ANY value (incl. GOES's flagged zero readings), to tell "feed silent" from "readings unusable".
    rowAges: { xray: rowAge(state.raw.xray), protons: rowAge(state.raw.protons) },
  };
}

async function refresh({ force = false } = {}) {
  $('refreshBtn').disabled = true;
  $('updated').textContent = 'Updating…';
  const [{ data, errors }] = await Promise.all([loadAll(LOADERS, force), state.sats.length ? null : loadTLEs()]);
  state.raw = data;
  for (const k of Object.keys(LOADERS)) state.errors[k] = errors[k];
  state.parsed = parseAll(data);
  const p = state.parsed;
  state.health = buildHealth({ oa: p.oa, sof: p.sof, galileo: p.galileo });
  if (!state.geometry.length || force || state.health.key !== state.geometryHealthKey) computeGeometry();
  regrade();
  renderAll();
  $('refreshBtn').disabled = false;
  const saved = staleFeeds().length;
  $('updated').textContent = `Updated ${fmtTime(new Date())}${saved ? ` · ${saved} feed${saved > 1 ? 's' : ''} from saved copies` : ''}`;
}

function regrade() {
  const p = state.parsed;
  state.rt = realtime(p);
  // Live readings that can raise the next hours or forbid a "go" (GPS-C2, GPS-H3).
  const ex = extraNow();
  Object.assign(state.rt, {
    kpModel: p.kpModel,
    propagated: p.propagated.filter((r) => Date.now() - r.time <= FRESH_MIN * 60000),
    dst: ex.dst?.dst ?? null,
    tecAnomaly: ex.tec && !ex.tec.modelOnly ? ex.tec.anomaly ?? null : null,
  });
  state.result = gradeConditions({
    settings,
    kpForecast: p.kpForecast,
    scales: p.scales,
    realtime: state.rt,
    geometry: state.geometry,
    outlook27: p.outlook27,
    outlook45: p.outlook45,
    cmeArrivals: p.enlil,
    midLatK: midLatSlots(p.daypre),
    cmeCheck: state.errors.donkiEnlil ? 'unavailable' : 'ok',
    localWeather: (state.localWeather = localWeatherNow()),
  });
}

/** NOAA's lower-48 K forecast as absolute 3-hour UTC slots, for the grade (GPS-H3). */
function midLatSlots(d) {
  if (!d?.midK?.length || !d.dates?.length) return [];
  const out = [];
  for (const row of d.midK) {
    const startH = parseInt(row.slot, 10);
    row.k.forEach((k, i) => {
      if (d.dates[i] && Number.isFinite(k)) out.push({ time: new Date(+d.dates[i] + startH * 3600000), k });
    });
  }
  return out;
}

// ---------------------------------------------------------------- rendering
function renderAll() {
  renderErrors();
  renderToday();
  renderWeather();
  renderHours();
  renderDays();
  renderExtended();
  renderCharts();
  renderScales();
  renderSats();
  renderMidLat();
  renderField();
  renderSims();
  renderAlerts();
  renderFeeds();
  $('mlatNote').textContent = `yours is ${state.result.mlat.toFixed(1)}° magnetic, ${latitudeBand(state.result.mlat)}, ×${state.result.latFactor.toFixed(2)}`;
}

function renderErrors() {
  const core = ['kpForecast', 'scales', 'plasma', 'mag'];
  const failed = core.filter((k) => state.errors[k]);
  const msgs = [];
  if (failed.length) {
    const fileHint = location.protocol === 'file:' ? ' You opened the file directly. Run <code>npm start</code> and open http://localhost:8080 instead.' : '';
    msgs.push(`Couldn’t reach some NOAA feeds (${failed.join(', ')}). The grade is built from whatever did load.${fileHint}`);
  }
  const a = state.rt?.ages || {};
  const ra = state.rt?.rowAges || {};
  const fmtAge = (m) => (m < 120 ? `${Math.round(m)} min` : `${(m / 60).toFixed(1)} h`);
  const old = [
    ['Kp nowcast (1-minute)', a.kp, null],
    ['solar wind speed', a.wind, null],
    ['magnetic field (Bz)', a.mag, null],
    ['X-ray readings', a.xray, ra.xray],
    ['proton readings', a.protons, ra.protons],
  ].filter(([, m]) => m != null && m > FRESH_MIN);
  // Rows still arriving but none usable (GOES reports zero, e.g. electron contamination) vs. a silent feed.
  const flagged = old.filter(([, , r]) => r != null && r <= FRESH_MIN);
  const silent = old.filter(([, , r]) => !(r != null && r <= FRESH_MIN));
  if (silent.length) {
    msgs.push(`No recent ${silent.map(([n, m]) => `${n} (last reading ${fmtAge(m)} ago)`).join(', ')}. NOAA’s live feed has gone quiet, so these are left out of the grade until it comes back. That is “unknown”, not “calm”.`);
  }
  if (flagged.length) {
    msgs.push(`NOAA is still sending ${flagged.map(([n]) => n).join(' and ')}, but the ones from the last ${fmtAge(Math.min(...flagged.map(([, m]) => m)))} are marked unusable (the GOES sensor reports zero). They are left out of the grade until good readings return. That is “unknown”, not “calm”.`);
  }
  const saved = staleFeeds();
  if (saved.length) {
    const name = (url) => Object.entries(SOURCES).find(([, v]) => typeof v === 'string' && url.startsWith(v.split('?')[0]))?.[0] || new URL(url).hostname;
    msgs.push(`These feeds didn’t answer, so a saved copy is shown: ${saved.map((f) => `${esc(name(f.url))} (${fmtAge(f.age / 60000)} old)`).join(', ')}. A saved copy is not new data.`);
  }
  const box = $('errors');
  box.hidden = !msgs.length;
  box.innerHTML = msgs.map((m) => `<div>${m}</div>`).join('');
}

function gClass(grade) {
  return `g${grade}`;
}

/** One grade column (network or base/rover) on the today card. */
function gradeColumn(d, m) {
  const w = d.bestWindow;
  const wh = d.worstHour;
  // GPS-C1: a D/F work hour is shown as large as the letter, and a good stretch on
  // a mixed day is "usable", never "best window" with a perfect score.
  const worstLine = wh && wh.score < 70 ? `<div class="worst ${gClass(wh.grade)}">Worst work hour: <b>${fmtHour(wh.time)}</b> <span class="worst-letter">${wh.grade}</span></div>` : '';
  const windowLine = !w
    ? ''
    : w.good
      ? `Best window: <b>${fmtTime(w.start)} – ${fmtTime(w.end)}</b>`
      : w.partial
        ? `Usable stretch: <b>${fmtTime(w.start)} – ${fmtTime(w.end)}</b> (A/B hours). The rest of the work day is worse.`
        : `No A or B hours. Least-bad hour: <b>${fmtTime(w.start)}</b> (${gradeFor(w.score).grade})`;
  const notGo = [...d.capReasons, ...d.flags];
  return `<div class="grade-col ${gClass(d.grade)}" data-mode="${d.mode}">
      <div class="mode-name">${esc(m.label)}</div>
      <div class="grade">${d.grade}</div>
      <div class="verdict">${esc(d.verdict)}</div>
      <div class="score muted">Score ${d.score}/100</div>
      ${notGo.length ? `<div class="nogo"><b>Why this can’t be a go:</b><ul>${notGo.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      <div class="window">${worstLine}${windowLine ? `<div>${windowLine}</div>` : ''}</div>
    </div>`;
}

function renderToday() {
  const r = state.result;
  const today = r.days[0];
  const card = $('gradeCard');
  card.className = 'grade-card';
  if (!today) {
    $('gradeCols').innerHTML = '<div class="grade-col"><div class="grade">?</div><div class="verdict">No Kp forecast available</div></div>';
    $('todayAlerts').innerHTML = (r.warnings || []).map((x) => `<div class="warn">⚠ ${esc(x)}</div>`).join('');
    $('todayLearn').innerHTML = `<p>${L.todayKid(null)}</p>`;
    return;
  }
  $('gradeCols').innerHTML = gradeColumn(today.modes.network, r.modes.network) + gradeColumn(today.modes.base, r.modes.base);
  $('todayScore').textContent = `${PROFILES[settings.profile].label} · work hours ${settings.workStart}:00–${settings.workEnd}:00 · change the base/rover setup with 📍`;
  $('todayAlerts').innerHTML = today.warnings.map((x) => `<div class="warn">⚠ ${esc(x)}</div>`).join('');

  const now = r.now;
  const pill = $('nowGrade');
  pill.className = `pill ${now ? gClass(now.grade) : ''}`;
  pill.style.color = now ? 'var(--g)' : '';
  pill.textContent = now ? `Network ${now.modes.network.grade} · Base ${now.modes.base.grade}` : '–';

  const rt = state.rt;
  const geoNow = nearestGeometry(new Date());
  const kpC = rt.kpNow == null ? null : kpColor(rt.kpNow);
  const kid = {
    kp: L.statKid('kp', rt.kpNow),
    bz: L.statKid('bz', rt.bz30),
    speed: L.statKid('speed', rt.speed),
    xray: L.statKid('xray', rt.xrayFlux),
    protons: L.statKid('protons', rt.protonFlux),
    aurora: L.statKid('aurora', rt.aurora),
    sats: L.statKid('sats', geoNow ? { count: geoNow.count, pdop: geoNow.pdop } : null),
    mlat: L.statKid('mlat', r.mlat),
  };
  const ex = extraNow();
  kid.tec = L.statKid('tec', ex.tec?.modelOnly ? { anomaly: null } : ex.tec);
  kid.dst = L.statKid('dst', ex.dst?.dst ?? null);
  kid.kpNext = L.statKid('kpNext', ex.kpNext);
  const stats = [
    { k: 'Kp now (est.)', v: rt.kpNow?.toFixed(2) ?? '–', d: rt.kpNow != null ? `G${P.gScaleFromKp(rt.kpNow)} storm scale` : 'no data', c: kpC, kid: kid.kp },
    { k: 'IMF Bz (30 min)', v: rt.bz30 != null ? `${rt.bz30.toFixed(1)} nT` : '–', d: rt.bz30 == null ? '' : rt.bz30 < -10 ? 'strongly south' : rt.bz30 < -3 ? 'south: loading' : 'north/neutral', c: rt.bz30 == null ? null : rt.bz30 < -10 ? css('--bad') : rt.bz30 < -3 ? css('--fair') : css('--good'), kid: kid.bz },
    { k: 'Solar wind', v: rt.speed != null ? `${Math.round(rt.speed)} km/s` : '–', d: rt.density != null ? `${rt.density.toFixed(1)} p/cm³` : '', c: rt.speed == null ? null : rt.speed > 700 ? css('--bad') : rt.speed > 500 ? css('--fair') : css('--good'), kid: kid.speed },
    { k: 'X-ray', v: rt.xrayFlux != null ? P.flareClass(rt.xrayFlux) : '–', d: rt.rNow == null ? 'no recent data' : rt.rNow ? `R${rt.rNow} radio blackout` : 'no blackout', c: rt.rNow == null ? null : rt.rNow >= 3 ? css('--bad') : rt.rNow ? css('--fair') : css('--good'), kid: kid.xray },
    { k: 'Protons ≥10 MeV', v: rt.protonFlux != null ? `${rt.protonFlux < 10 ? rt.protonFlux.toFixed(2) : Math.round(rt.protonFlux)} pfu` : '–', d: rt.sNow == null ? 'no recent data' : rt.sNow ? `S${rt.sNow} radiation storm` : 'below S1', c: rt.sNow == null ? null : rt.sNow ? css('--poor') : css('--good'), kid: kid.protons },
    { k: 'Aurora overhead', v: rt.aurora != null ? `${Math.round(rt.aurora)}%` : '–', d: 'OVATION at your site', c: rt.aurora == null ? null : rt.aurora >= 30 ? css('--bad') : rt.aurora >= 10 ? css('--fair') : css('--good'), kid: kid.aurora },
    { k: 'Ionosphere (TEC)', v: ex.tec?.tec != null ? `${ex.tec.tec.toFixed(1)} TECU` : '–', d: ex.tec ? (ex.tec.modelOnly ? `model estimate only (no GPS data nearby) · ${fmtTime(ex.tec.time)}` : `${ex.tec.anomaly != null ? `${ex.tec.anomaly >= 0 ? '+' : ''}${ex.tec.anomaly.toFixed(1)} vs normal · ` : ''}GloTEC ${fmtTime(ex.tec.time)}`) : 'no data', c: ex.tec?.anomaly == null || ex.tec.modelOnly ? null : ex.tec.anomaly > 10 ? css('--bad') : ex.tec.anomaly > 3 ? css('--fair') : css('--good'), kid: kid.tec },
    { k: 'Dst (storm depth)', v: ex.dst ? `${Math.round(ex.dst.dst)} nT` : '–', d: ex.dst ? `Kyoto, ${fmtTime(ex.dst.time)}` : 'no data', c: ex.dst == null ? null : ex.dst.dst <= -100 ? css('--bad') : ex.dst.dst <= -50 ? css('--poor') : ex.dst.dst <= -30 || ex.dst.dst > 20 ? css('--fair') : css('--good'), kid: kid.dst },
    { k: 'Kp next hour (model)', v: ex.kpNext != null ? ex.kpNext.toFixed(1) : '–', d: ex.kpNext != null ? `NOAA Geospace, to ${fmtTime(ex.kpNextUntil)}` : 'no data', c: ex.kpNext == null ? null : kpColor(ex.kpNext), kid: kid.kpNext },
    { k: 'Satellites / PDOP', v: geoNow ? `${geoNow.count} / ${Number.isFinite(geoNow.pdop) ? geoNow.pdop.toFixed(1) : '∞'}` : '–', d: geoNow ? `above ${settings.elevationMask}° mask` : 'element sets loading', c: geoNow ? (geoNow.pdop > 4 ? css('--fair') : css('--good')) : null, kid: kid.sats },
    { k: 'Magnetic latitude', v: `${r.mlat.toFixed(1)}°`, d: latitudeBand(r.mlat), c: null, kid: kid.mlat },
  ];
  $('nowStats').innerHTML = stats
    .map((s) => `<div class="stat" style="${s.c ? `--c:${s.c}` : ''}"><div class="k">${s.k}</div><div class="v">${esc(s.v)}</div><div class="d">${esc(s.d)}</div><div class="learn">${esc(s.kid)}</div></div>`)
    .join('');

  const RT_KEYS = ['bz', 'speed', 'flareNow', 'protonNow', 'aurora'];
  const drivers = today.drivers.filter((d) => d.penalty >= 1 && !RT_KEYS.includes(d.key));
  const nowFactors = (now?.factors || []).filter((f) => RT_KEYS.includes(f.key));
  const items = [...nowFactors.map((f) => ({ ...f, label: `Now: ${f.label}` })), ...drivers];
  $('todayDrivers').innerHTML = items.length
    ? items.map((d) => `<li>${esc(d.label)} <span class="pen">−${d.penalty.toFixed(0)}</span></li>`).join('')
    : '<li>Nothing significant. Quiet space weather and good geometry.</li>';

  $('todayLearn').innerHTML = L.todayKid(today, now) + `<p><a href="#learn">${L.NEW_HERE}</a></p>`;
}

/** Readings added in 1.2.0. Dst and TEC can forbid a "go"; the model Kp can raise an hour (see regrade). */
function extraNow() {
  const p = state.parsed;
  const now = Date.now();
  const tec = p.glotec ? P.glotecNearest(p.glotec, settings.lat, settings.lon) : null;
  const dstRow = p.dst.at(-1);
  const dst = dstRow && now - dstRow.time < 3 * 3600000 ? dstRow : null;
  const ahead = p.kpModel.filter((r) => r.time >= now);
  return {
    // quality_flag 0 = no GNSS data near this cell, so the value is the model's background estimate.
    tec: tec && now - tec.time < 2 * 3600000 ? { ...tec, modelOnly: tec.quality === 0 } : null,
    dst,
    kpNext: ahead.length ? Math.max(...ahead.map((r) => r.kp)) : null,
    kpNextUntil: ahead.length ? ahead[ahead.length - 1].time : null,
  };
}

function nearestGeometry(t) {
  let best = null;
  for (const g of state.geometry) if (!best || Math.abs(g.time - t) < Math.abs(best.time - t)) best = g;
  return best && Math.abs(best.time - t) < 20 * 60000 ? best : null;
}

function renderHours() {
  const hours = state.result.hours;
  const strip = $('hourStrip');
  strip.style.gridTemplateColumns = `repeat(${hours.length}, minmax(14px, 1fr))`;
  const row = (mode) =>
    hours
      .map((h, i) => {
        const hr = h.time.getHours();
        const off = hr < settings.workStart || hr >= settings.workEnd;
        const g = h.modes[mode];
        const name = mode === 'network' ? 'FDOT network' : 'Base/rover';
        return `<button class="hour ${h.missing ? 'gNA' : gClass(g.grade)} ${off ? 'off' : ''} ${h.isNow ? 'now' : ''} ${mode}" style="background:var(--g)" data-i="${i}" title="${fmtDay(h.time)} ${fmtHour(h.time)} · ${name}: ${g.grade} (${g.score ?? '–'})" aria-label="${fmtDay(h.time)} ${fmtHour(h.time)} ${name} grade ${g.grade}">${g.grade}</button>`;
      })
      .join('');
  strip.innerHTML =
    row('network') +
    row('base') +
    hours
      .map((h) => {
        const hr = h.time.getHours();
        const lbl = hr % 6 === 0 ? (hr === 0 ? h.time.toLocaleDateString(undefined, { weekday: 'short' }) : fmtHour(h.time)) : '';
        return `<span class="hour-tick">${lbl}</span>`;
      })
      .join('');
  strip.onclick = (e) => {
    const b = e.target.closest('.hour');
    if (!b) return;
    state.selectedHour = +b.dataset.i;
    strip.querySelectorAll('.hour').forEach((x) => x.classList.toggle('sel', x.dataset.i === b.dataset.i));
    showHourDetail(hours[state.selectedHour]);
  };
  const initial = hours.find((h) => h.isNow) || hours[0];
  if (initial) showHourDetail(hours[state.selectedHour] || initial);
}

function fmtHour(d) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric' });
}

function showHourDetail(h) {
  if (!h) return;
  if (h.missing) {
    $('hourDetail').innerHTML = `<b>${fmtDay(h.time)} ${fmtHour(h.time)}</b>: no Kp forecast for this hour. It counts as unknown, not quiet, so the day can’t be a go.`;
    return;
  }
  const line = (mode, name) => {
    const g = h.modes[mode];
    const fac = g.factors.filter((f) => f.penalty >= 0.5);
    return `<div class="hd-mode"><b>${name}: ${g.grade}</b> (${g.score}), ${esc(g.verdict)}<br>` +
      (fac.length ? fac.map((f) => `${esc(f.label)} <span class="muted">−${f.penalty.toFixed(1)}</span>`).join(' · ') : '<span class="muted">No penalties</span>') +
      (g.caps.length ? `<br><span class="capline">Held down: ${g.caps.map(esc).join(' · ')}</span>` : '') +
      '</div>';
  };
  $('hourDetail').innerHTML = `<b>${fmtDay(h.time)} ${fmtHour(h.time)}</b> · Kp ${h.kp.toFixed(2)} (${h.kpKind}) · ${h.sunlit ? 'daylight' : 'night'}` +
    line('network', 'FDOT network') + line('base', esc(state.result.modes.base.label)) +
    `<div class="learn">${L.hourKid(h)}</div>`;
}

function renderDays() {
  const M = state.result.modes;
  $('dayCards').innerHTML = state.result.days
    .map((d, i) => {
      const cmes = state.parsed.enlil.filter((a) => sameLocalDay(a.arrival, d.date));
      const n = d.modes.network;
      const b = d.modes.base;
      const modeLine = (x, name) =>
        `<div class="day-mode ${gClass(x.grade)}"><span class="letter">${x.grade}</span><span><b>${name}</b><br><span class="small">${esc(x.verdict)} (${x.score})${x.worstHour && x.worstHour.score < 70 ? ` · worst ${fmtHour(x.worstHour.time)}` : ''}</span></span></div>`;
      const reasons = [...new Set([...n.capReasons, ...n.flags].map((x) => `Network: ${x}`).concat([...b.capReasons, ...b.flags].map((x) => `Base/rover: ${x}`)))];
      return `<div class="day ${gClass(n.grade)}">
        <div class="top"><div><b>${i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtDay(d.date)}</b><div class="muted small">${fmtDay(d.date)} · peak Kp ${d.kpMax != null ? d.kpMax.toFixed(2) : '–'}</div></div></div>
        ${modeLine(n, 'FDOT network')}${modeLine(b, `Base/rover ${M.base.km} km`)}
        <ul>${reasons.map((x) => `<li style="color:var(--poor)">${esc(x)}</li>`).join('')}${n.drivers.filter((x) => x.penalty >= 1).map((x) => `<li>${esc(x.label)}</li>`).join('') || (reasons.length ? '' : '<li>Clean</li>')}
        ${cmes.map((c) => `<li style="color:var(--poor)">CME ${c.glancing ? 'glancing blow' : 'arrival'} ≈ ${fmtTime(c.arrival)} (NASA model)</li>`).join('')}</ul>
        <div class="muted small">${esc(d.source)}</div>
        <div class="learn">${L.dayKid(d)}</div>
      </div>`;
    })
    .join('');
}

function sameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function renderExtended() {
  const ext = state.result.extended;
  $('extStrip').innerHTML = ext.length
    ? ext
        .map(
          (d) => `<div class="ext t-${d.trend} ${d.confidence === 'Low' ? 'low' : ''}" title="${esc(d.source)} · confidence ${d.confidence}\nPeak Kp ≈ ${d.kpMax.toFixed(1)} · Ap ${d.ap}${d.f107 ? ` · F10.7 ${d.f107}` : ''}\nA trend, not a go/no-go. Book crews from the 3-day grade.">
          <div>${d.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
          <div class="l">${esc(d.trendLabel)}</div>
          <div class="muted">Kp ${d.kpMax.toFixed(1)} · ${d.confidence}</div>
          ${d.cme ? `<div class="cme">CME${d.cme.glancing ? ' (glancing)' : ''}</div>` : ''}
        </div>`,
        )
        .join('')
    : '<div class="muted">27/45-day outlooks unavailable.</div>';
}

function renderCharts() {
  const p = state.parsed;
  const now = new Date();
  const H3 = 3 * 3600000;
  const kpSeen = new Set(p.kpForecast.map((r) => +r.time));
  const kpPts = [
    ...p.kpObserved.filter((r) => !kpSeen.has(+r.time)).map((r) => ({ time: r.time, value: r.kp, note: 'observed' })),
    ...p.kpForecast.map((r) => ({ time: r.time, value: r.kp, note: r.kind, alpha: r.kind === 'predicted' ? 0.55 : 1 })),
  ];
  const xMinKp = now - 3 * 86400000;
  $('kpNote').textContent = p.kpForecast.length ? `3 days back · ${Math.round((Math.max(...p.kpForecast.map((r) => +r.time)) + H3 - now) / 3600000)} h forecast` : '';
  drawChart($('kpChart'), {
    series: [{ label: 'Kp', type: 'bar', barWidthMs: H3, points: kpPts.filter((x) => +x.time >= xMinKp), colorFn: (pt) => kpColor(pt.value) }],
    yMin: 0,
    yMax: 9,
    yTicks: [0, 3, 5, 7, 9],
    thresholds: [{ value: 5, label: 'G1 storm', color: css('--poor') }],
    now,
    xMin: xMinKp,
  });

  drawChart($('magChart'), {
    series: [
      { label: 'Bt', color: css('--muted'), points: p.mag.map((r) => ({ time: r.time, value: r.bt })) },
      { label: 'Bz', color: css('--bad'), points: p.mag.map((r) => ({ time: r.time, value: r.bz })) },
    ],
    thresholds: [{ value: 0, label: '0', color: css('--muted') }, { value: -10, label: 'Bz −10', color: css('--poor') }],
    now,
  });
  // When what L1 measures now reaches Earth (NOAA propagates it with the wind speed).
  const pr = p.propagated.at(-1);
  $('magArrive').textContent =
    pr && now - pr.time < FRESH_MIN * 60000
      ? `What the spacecraft measures now reaches Earth at about ${fmtTime(pr.arrival)} (${Math.round((pr.arrival - pr.time) / 60000)} min later)${pr.bz != null ? `, with Bz ${pr.bz.toFixed(1)} nT` : ''}.`
      : '';

  drawChart($('windChart'), {
    series: [
      { label: 'Speed km/s', color: css('--accent'), points: p.plasma.map((r) => ({ time: r.time, value: r.speed })) },
      { label: 'Density×50', color: css('--fair'), points: p.plasma.map((r) => ({ time: r.time, value: r.density != null ? r.density * 50 : null })) },
    ],
    yMin: 0,
    thresholds: [{ value: 600, label: '600 km/s', color: css('--poor') }],
    now,
  });

  drawChart($('xrayChart'), {
    series: [{ label: 'X-ray', color: css('--fair'), points: p.xray.map((r) => ({ time: r.time, value: r.flux })) }],
    log: true,
    yMin: 1e-8,
    yMax: 1e-3,
    yFormat: (v) => (v >= 1e-4 ? 'X' : v >= 1e-5 ? 'M' : v >= 1e-6 ? 'C' : v >= 1e-7 ? 'B' : 'A') + (v === 1e-4 || v === 1e-5 || v === 1e-6 || v === 1e-7 || v === 1e-8 ? '' : ` ${P.flareClass(v)}`),
    yTicks: [1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3],
    thresholds: [{ value: 1e-5, label: 'M (R1)', color: css('--fair') }, { value: 1e-4, label: 'X (R3)', color: css('--bad') }],
    now,
  });

  drawChart($('protonChart'), {
    series: [{ label: 'Protons pfu', color: css('--poor'), points: p.protons.map((r) => ({ time: r.time, value: r.flux })) }],
    log: true,
    yMin: 0.01,
    yMax: 1e4,
    yFormat: (v) => (v >= 1 ? String(Math.round(v)) : v.toFixed(2)),
    thresholds: [{ value: 10, label: 'S1', color: css('--poor') }],
    now,
  });
}

function renderScales() {
  const s = state.parsed.scales;
  if (!s) {
    $('scalesTable').innerHTML = '<div class="muted">Unavailable</div>';
    return;
  }
  const badge = (letter, v) => {
    const c = v >= 3 ? css('--bad') : v >= 1 ? css('--poor') : css('--good');
    return `<span class="scale-badge" style="color:${c}">${letter}${v ?? 0}</span>`;
  };
  const cur = s.current;
  const rows = s.days
    .map(
      (d, i) => `<tr><td>${i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : esc(d.date)}</td>
      <td>${badge('G', d.G)} ${d.gText ? `<span class="muted small">${esc(d.gText)}</span>` : ''}</td>
      <td>R1–R2 ${d.rMinorProb ?? '–'}% · R3+ ${d.rMajorProb ?? '–'}%</td>
      <td>S1+ ${d.sProb ?? '–'}%</td></tr>`,
    )
    .join('');
  $('scalesTable').innerHTML = `
    <p>Observed now: ${badge('R', cur?.R)} radio blackout · ${badge('S', cur?.S)} radiation · ${badge('G', cur?.G)} geomagnetic</p>
    <table><thead><tr><th>Day</th><th>Geomagnetic</th><th>Flare (radio blackout) odds</th><th>Proton odds</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="muted small">G drives ionospheric storms and RTK trouble. R3+ flares can briefly knock out dayside GNSS tracking. S affects polar users.</p>`;
}

function renderSats() {
  // constellation toggles
  $('constToggles').innerHTML = Object.keys(SOURCES.tle)
    .map((c) => `<label class="toggle"><input type="checkbox" value="${c}" ${settings.constellations.includes(c) ? 'checked' : ''}/> <span style="color:${CONST_COLORS[c]}">${c}</span></label>`)
    .join('');
  $('maskInput').value = settings.elevationMask;

  const now = new Date();
  const { vis, excluded } = skyNow(now);
  const d = dop(vis);
  const counts = {};
  for (const v of vis) counts[v.constellation] = (counts[v.constellation] || 0) + 1;
  const tleErr = Object.entries(state.errors).filter(([k, v]) => k.startsWith('tle:') && v);
  $('satNote').textContent = state.sats.length
    ? `${vis.length} in view now${excluded.length ? ` (+${excluded.length} left out by operator notices)` : ''} · PDOP ${Number.isFinite(d.pdop) ? d.pdop.toFixed(2) : '∞'} · HDOP ${Number.isFinite(d.hdop) ? d.hdop.toFixed(2) : '∞'} · VDOP ${Number.isFinite(d.vdop) ? d.vdop.toFixed(2) : '∞'}`
    : tleErr.length
      ? `Couldn’t load element sets (${tleErr.map(([k]) => k.slice(4)).join(', ')})`
      : 'Loading element sets…';
  $('skyLegend').innerHTML = Object.entries(counts)
    .map(([c, n]) => `<span><span class="sw" style="background:${CONST_COLORS[c]}"></span>${c} ${n}</span>`)
    .join('');
  drawSkyplot($('skyplot'), vis, excluded);
  renderHealth();

  const g = state.geometry;
  drawChart($('dopChart'), {
    series: [
      { label: 'PDOP', color: css('--accent'), points: g.map((x) => ({ time: x.time, value: Number.isFinite(x.pdop) ? Math.min(x.pdop, 10) : 10 })) },
      { label: 'Sats ÷5', color: css('--good'), points: g.map((x) => ({ time: x.time, value: x.count / 5 })) },
    ],
    yMin: 0,
    yMax: Math.max(8, ...g.map((x) => x.count / 5)),
    thresholds: [{ value: 4, label: 'PDOP 4', color: css('--fair') }],
    now,
  });
}

/** Satellites above the mask now, split into usable and left out by operator notices. */
function skyNow(now = new Date()) {
  const all = state.sats.length ? visibleSatellites(state.sats, now, settings.lat, settings.lon, 0, settings.elevationMask) : [];
  const usable = state.health?.usable;
  if (!usable) return { vis: all, excluded: [] };
  const vis = [];
  const excluded = [];
  for (const v of all) (usable(v, now) ? vis : excluded).push(v);
  return { vis, excluded };
}

function renderHealth() {
  const h = state.health;
  const box = $('healthList');
  if (!h) {
    box.innerHTML = '';
    return;
  }
  const when = (d) => (d ? `${fmtDay(d)} ${fmtTime(d)}` : '');
  const row = (e) =>
    `<li><b>${esc(e.constellation)}${e.id ? ` ${esc(e.id)}` : ''}</b>: ${esc(e.why)}${e.since ? `, from ${esc(when(e.since))}` : ''}${e.until ? ` to ${esc(when(e.until))}` : e.since ? ', no end time yet' : ''}${e.nanu ? ` <span class="muted small">(notice ${esc(e.nanu)})</span>` : ''}</li>`;
  const parts = [];
  parts.push(
    h.excludedNow.length
      ? `<p><b>Left out of PDOP now:</b></p><ul>${h.excludedNow.map(row).join('')}</ul>`
      : `<p>No satellite is out of service right now${h.known.GPS || h.known.Galileo ? '' : ' (as far as we can tell)'}.</p>`,
  );
  if (h.scheduled.length) parts.push(`<p><b>Scheduled in the next 7 days:</b></p><ul>${h.scheduled.map(row).join('')}</ul>`);
  if (h.notes.length) parts.push(`<ul class="muted">${h.notes.map(row).join('')}</ul>`);
  const src = [];
  src.push(
    h.known.GPS
      ? `GPS: US Coast Guard NAVCEN${state.parsed.sof?.created ? ` (outage file of ${fmtDay(state.parsed.sof.created)})` : ''}${h.known.GPSconfirmed ? '' : ', advisory only'}.`
      : 'GPS: NAVCEN’s notices didn’t load, so every GPS satellite counts. (They need the desktop app or npm start.)',
  );
  src.push(h.known.Galileo ? 'Galileo: European GNSS Service Centre.' : 'Galileo: the GSC status table didn’t load, so every Galileo satellite counts.');
  src.push('GLONASS has its own status site (see Sources). BeiDou has no open health feed.');
  parts.push(`<p class="muted small">${src.join(' ')}</p>`);
  box.innerHTML = parts.join('');
}

function drawSkyplot(canvas, vis, excluded = []) {
  const dpr = window.devicePixelRatio || 1;
  const S = canvas.clientWidth;
  if (!S) return;
  canvas.width = S * dpr;
  canvas.height = S * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const c = S / 2;
  const R = S / 2 - 18;
  ctx.clearRect(0, 0, S, S);
  ctx.strokeStyle = css('--grid');
  ctx.fillStyle = css('--muted');
  ctx.font = '11px system-ui, sans-serif';
  for (const el of [0, 30, 60]) {
    ctx.beginPath();
    ctx.arc(c, c, R * (1 - el / 90), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillText(`${el}°`, c + 3, c - R * (1 - el / 90) + 12);
  }
  // mask ring
  ctx.strokeStyle = css('--fair');
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(c, c, R * (1 - settings.elevationMask / 90), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = css('--muted');
  [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([l, az]) => {
    const a = (az * Math.PI) / 180;
    ctx.fillText(l, c + (R + 10) * Math.sin(a) - 4, c - (R + 10) * Math.cos(a) + 4);
  });
  // Satellites the operators say not to use: hollow gray rings.
  for (const s of excluded) {
    const r = R * (1 - s.el / 90);
    const a = (s.az * Math.PI) / 180;
    const x = c + r * Math.sin(a);
    const y = c - r * Math.cos(a);
    ctx.strokeStyle = css('--muted');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = css('--muted');
    const short = (s.name.match(/PRN\s*(\w+)/)?.[1] || s.name.match(/^(GSAT\d+)/)?.[1] || s.name).slice(0, 8);
    ctx.fillText(`${short} out`, x + 8, y + 4);
  }
  for (const s of vis) {
    const r = R * (1 - s.el / 90);
    const a = (s.az * Math.PI) / 180;
    const x = c + r * Math.sin(a);
    const y = c - r * Math.cos(a);
    ctx.fillStyle = CONST_COLORS[s.constellation] || '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = css('--text');
    const short = (s.name.match(/PRN\s*(\w+)/)?.[1] || s.name.match(/\((.+?)\)/)?.[1] || s.name).slice(0, 6);
    ctx.fillText(short, x + 8, y + 4);
  }
}

// -------------------------------------------------------------- simulations
let magSim;
let simMode = 'live';
let replayTimer = null;
let cmeAnim;
let land = [];

function setupSims() {
  magSim = new MagnetosphereSim($('magSim'), $('magReadout'));
  const sliders = { spd: ['speed', (v) => `${v} km/s`], den: ['density', (v) => `${(+v).toFixed(1)} /cm³`], bz: ['bz', (v) => `${(+v).toFixed(1)} nT`] };
  for (const [id, [key, f]] of Object.entries(sliders)) {
    const inp = $(`${id}In`);
    inp.addEventListener('input', () => {
      if (simMode !== 'manual') setSimMode('manual');
      $(`${id}Out`).textContent = f(inp.value);
      magSim.set({ [key]: +inp.value });
    });
  }
  document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => setSimMode(b.dataset.mode)));

  cmeAnim = new CmeAnimation($('cmeCanvas'));
  $('dbmRun').addEventListener('click', runDbm);
  const t = new Date(Date.now() - 6 * 3600000);
  $('dbmTime').value = toLocalInputUTC(t);
  runDbm();
}

function toLocalInputUTC(d) {
  return d.toISOString().slice(0, 16);
}

function syncSliders(p) {
  $('spdIn').value = p.speed;
  $('denIn').value = p.density;
  $('bzIn').value = p.bz;
  $('spdOut').textContent = `${Math.round(p.speed)} km/s`;
  $('denOut').textContent = `${p.density.toFixed(1)} /cm³`;
  $('bzOut').textContent = `${p.bz.toFixed(1)} nT`;
}

function setSimMode(mode) {
  simMode = mode;
  document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
  clearInterval(replayTimer);
  $('replayTime').textContent = '';
  if (mode === 'live') applyLiveSim();
  if (mode === 'replay') startReplay();
}

function applyLiveSim() {
  const rt = state.rt || {};
  const p = { speed: rt.speed ?? 400, density: rt.density ?? 5, bz: rt.bzLatest ?? rt.bz30 ?? 0 };
  magSim.set(p);
  syncSliders(p);
}

function startReplay() {
  const { plasma, mag } = state.parsed;
  if (!plasma?.length || !mag?.length) return;
  const t0 = Math.max(+plasma[0].time, +mag[0].time);
  const t1 = Math.min(+plasma.at(-1).time, +mag.at(-1).time);
  let t = t0;
  const step = 10 * 60000;
  const at = (arr, key, tt) => {
    let best = null;
    for (const r of arr) {
      if (r[key] == null) continue;
      if (Math.abs(r.time - tt) <= 10 * 60000 && (!best || Math.abs(r.time - tt) < Math.abs(best.time - tt))) best = r;
    }
    return best?.[key];
  };
  replayTimer = setInterval(() => {
    const p = {
      speed: at(plasma, 'speed', t) ?? magSim.params.speed,
      density: at(plasma, 'density', t) ?? magSim.params.density,
      bz: at(mag, 'bz', t) ?? magSim.params.bz,
    };
    magSim.set(p);
    syncSliders(p);
    $('replayTime').textContent = `Replaying ${new Date(t).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`;
    t += step;
    if (t > t1) t = t0;
  }, 120);
}

function runDbm() {
  const v0 = +$('dbmV0').value;
  const w = +$('dbmW').value;
  const gamma = +$('dbmGamma').value * 1e-7;
  const launch = new Date(`${$('dbmTime').value}:00Z`);
  const { hours, speed } = dbmArrival({ v0, w, gamma });
  const arrival = new Date(+launch + hours * 3600000);
  cmeAnim.set({ v0, w, gamma, hours, halfAngle: +($('dbmRun').dataset.half || 35) });
  $('dbmOut').innerHTML = `
    <div><span>Transit time</span><b>${hours.toFixed(1)} h</b></div>
    <div><span>Arrival at Earth</span><b>${Number.isNaN(+arrival) ? '–' : arrival.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</b></div>
    <div><span>Impact speed</span><b>${Math.round(speed)} km/s</b></div>
    <div><span>Typical uncertainty</span><b>±10–12 h</b></div>`;
}

async function renderSims() {
  if (simMode === 'live') applyLiveSim();

  // Frame players (built once per refresh of the frame lists)
  const hemi = settings.lat < 0 ? 'ovationSouthFrames' : 'ovationNorthFrames';
  const players = { enlilPlayer: 'enlilFrames', ovationPlayer: hemi, lascoPlayer: 'lascoC3Frames', suviPlayer: 'suvi304Frames', glotecPlayer: 'glotecAnomFrames', wamPlayer: 'wamIpeFrames' };
  for (const [el, src] of Object.entries(players)) {
    if (state.players[el]?.src === src && Date.now() - state.players[el].t < 30 * 60000) continue;
    fetchJSON(SOURCES[src], { ttl: 15 * 60000 })
      .then((json) => {
        state.players[el]?.player?.destroy?.();
        const root = $(el);
        const player = new FramePlayer(root, P.parseFrames(json), { maxFrames: src === 'enlilFrames' || src === 'wamIpeFrames' ? 200 : 96 });
        state.players[el] = { src, player, t: Date.now() };
        state.errors[src] = undefined;
      })
      .catch((e) => {
        state.errors[src] = String(e.message || e);
        $(el).querySelector('.player-time').innerHTML = `Couldn’t load frames. <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener">View on SWPC</a>`;
        renderFeeds();
      });
  }
  // Keep the <img> (an earlier version replaced it on error, and the next
  // refresh then threw on the missing element and skipped the aurora map and
  // CME lists below).
  showImage($('drapImg'), `${SOURCES.drapImage}?t=${Math.floor(Date.now() / 600000)}`, 'D-RAP image unavailable right now.');

  // Aurora map
  if (!land.length) land = await loadLand();
  const ov = state.parsed.ovation;
  $('auroraNote').textContent = ov?.forecast ? `Forecast for ${fmtTime(ov.forecast)} · ${state.rt.aurora != null ? Math.round(state.rt.aurora) + '% at your site' : ''}` : 'Unavailable';
  drawAuroraMap($('auroraMap'), ov, land, settings);

  // CME lists
  const arr = state.parsed.enlil.filter((a) => a.arrival > Date.now() - 86400000);
  $('cmeArrivals').innerHTML = arr.length
    ? arr
        .map(
          (a) => `<div class="item"><b>${a.glancing ? 'Glancing blow' : 'Direct hit'}</b> ≈ ${a.arrival.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          <div class="t">CME ${a.cmeTime ? fmtDay(a.cmeTime) : ''} · ${a.speed ?? '?'} km/s${a.kpEstimate.length ? ` · modelled Kp ${Math.min(...a.kpEstimate)}–${Math.max(...a.kpEstimate)}` : ''}${a.link ? ` · <a href="${esc(a.link)}" target="_blank" rel="noopener">run</a>` : ''}</div></div>`,
        )
        .join('')
    : `<div class="muted small">${state.errors.donkiEnlil ? 'NASA DONKI unavailable (DEMO_KEY may be rate-limited).' : 'No Earth-directed CMEs modelled in the last 7 days.'}</div>`;
  $('cmeList').innerHTML = state.parsed.cmes.length
    ? state.parsed.cmes
        .slice(0, 25)
        .map(
          (c, i) => `<div class="item clickable" data-i="${i}"><b>${c.speed} km/s</b> · half-angle ${c.halfAngle ?? '?'}° · lon ${c.lon ?? '?'}°
          <div class="t">${c.time.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} at 21.5 R☉ · type ${esc(c.type || '?')}${Math.abs(c.lon ?? 99) <= 30 ? ' · <span style="color:var(--poor)">Earth-facing</span>' : ''}</div></div>`,
        )
        .join('')
    : '<div class="muted small">No CME analyses loaded.</div>';
  $('cmeList').onclick = (e) => {
    const it = e.target.closest('.item');
    if (!it) return;
    const c = state.parsed.cmes[+it.dataset.i];
    $('dbmV0').value = c.speed;
    $('dbmTime').value = toLocalInputUTC(c.time);
    $('dbmW').value = Math.round(state.rt.speed || 400);
    $('dbmRun').dataset.half = c.halfAngle || 35;
    runDbm();
  };
}

/** Point an <img> at a URL; on failure hide it and show a note beside it (until the next try works). */
function showImage(img, src, failText) {
  if (!img) return;
  let note = img.parentElement.querySelector('.img-note');
  if (!note) {
    note = Object.assign(document.createElement('div'), { className: 'img-note muted' });
    img.parentElement.append(note);
  }
  img.onload = () => {
    img.hidden = false;
    note.hidden = true;
  };
  img.onerror = () => {
    img.hidden = true;
    note.hidden = false;
    note.textContent = failText;
  };
  if (img.getAttribute('src') !== src) img.src = src;
}

/** Mid-latitude (lower 48) storm odds and K forecast from NOAA's 3-day predictions. */
function renderMidLat() {
  const d = state.parsed.daypre;
  const box = $('midLat');
  if (!d?.probMid?.active || !d.dates.length) {
    box.innerHTML = '';
    return;
  }
  // NOAA's columns are UTC days (00-24 UT is 7 PM-7 PM Eastern, 6 PM-6 PM Central). Name each
  // column from its own date against the local calendar, never by position.
  const localKey = (dt) => `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
  const utcKey = (dt) => `${dt.getUTCFullYear()}-${dt.getUTCMonth()}-${dt.getUTCDate()}`;
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const day = (i) => {
    const k = utcKey(d.dates[i]);
    if (k === localKey(today)) return 'Today';
    if (k === localKey(tomorrow)) return 'Tomorrow';
    return d.dates[i].toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  };
  const cell = (v) => `<td>${v ?? '–'}%</td>`;
  box.innerHTML = `<h3>Lower 48 (mid-latitude) odds</h3>
    <table><thead><tr><th></th>${d.dates.map((_, i) => `<th>${day(i)}</th>`).join('')}</tr></thead><tbody>
    <tr><td>Active</td>${d.probMid.active.map(cell).join('')}</tr>
    <tr><td>Minor storm</td>${(d.probMid.minor || []).map(cell).join('')}</tr>
    <tr><td>Major or severe storm</td>${(d.probMid.major || []).map(cell).join('')}</tr>
    ${d.midKMax ? `<tr><td>Highest mid-latitude K</td>${d.midKMax.map((k) => `<td>${k}</td>`).join('')}</tr>` : ''}
    </tbody></table>
    <p class="muted small">NOAA’s 3-day predictions${d.issued ? `, issued ${fmtDay(d.issued)} ${fmtTime(d.issued)}` : ''}. Each column is a UTC day. When the lower-48 K is higher than the planetary Kp for an hour, the grade uses it.</p>`;
}

/** Nearest NOAA CORS stations + the FAA WAAS map. */
function renderField() {
  const list = state.parsed.cors || [];
  const mi = (km) => `${(km * 0.621371).toFixed(km < 16 ? 1 : 0)} mi`;
  $('corsList').innerHTML = list.length
    ? list
        .slice(0, 6)
        .map(
          (s) => `<div class="item"><b>${esc(s.site)}</b> · ${mi(s.km)} away · ${s.sampling ? `${esc(s.sampling)} s data` : 'rate not listed'} · ${esc(s.gnss.join(' + ') || 'systems not listed')} · ${esc(s.avail || '')}
          <div class="t">${esc(s.agency)}</div></div>`,
        )
        .join('')
    : `<div class="muted small">${state.errors.cors ? 'The NOAA CORS list didn’t load. Try Refresh, or use the NGS CORS map (Sources).' : 'No operational CORS station within about 100 miles of this site.'}</div>`;
  $('corsNote').textContent = list.length ? `${list.length} operational nearby, closest ${mi(list[0].km)} · NOAA NGS` : 'For OPUS and post-processing';
  showImage($('waasImg'), `${SOURCES.waasImage}?t=${Math.floor(Date.now() / 180000)}`, 'The FAA WAAS map is unavailable right now (their site posts occasional outages).');
}

/** CORS stations for the CURRENT site only ([] if the answer was for another site). */
function corsForSite(raw) {
  if (!raw?.data || raw.site?.lat !== settings.lat || raw.site?.lon !== settings.lon) return [];
  return P.parseCors(raw.data, settings.lat, settings.lon);
}

/** The CORS list depends on the site, so a new location fetches it again. */
/** Local weather card: what the NWS and SPC say for the site, and how it feeds the two grades. */
function renderWeather() {
  const lw = state.localWeather;
  const box = $('wxStats');
  if (!box) return;
  const HOUR = 3600000;
  const now = Math.floor(Date.now() / HOUR) * HOUR;
  if (!lw?.ok) {
    box.innerHTML = `<div class="muted">${state.errors.nws ? `The NWS forecast didn’t load (${esc(state.errors.nws)}).` : 'Loading the NWS forecast…'} Until it does, summer afternoons get a default sea-breeze penalty and nothing else from local weather is in the grades.</div>`;
    drawChart($('wxChart'), { series: [] });
    return;
  }
  const next = (n) => Array.from({ length: n }, (_, i) => lw.at(now + i * HOUR));
  const n6 = next(6);
  const tMax = Math.max(...n6.map((x) => x.thunderPct ?? 0));
  const cur = n6[0];
  const frontAt = Array.from({ length: 13 }, (_, i) => ({ t: now + i * HOUR, f: lw.at(now + i * HOUR).front })).find((x) => x.f);
  const spcNow = cur.spc;
  const link = lw.alerts.find((a) => /Warning/.test(a.event)) || null;
  const f = (c) => (c == null ? '–' : `${Math.round((c * 9) / 5 + 32)} °F`);
  const tiles = [
    { k: 'Thunderstorm chance (next 6 h)', v: `${Math.round(tMax)}%`, d: cur.thunderFrom ? `NWS ${cur.thunderFrom}` : 'NWS', c: tMax > 50 ? css('--bad') : tMax >= 30 ? css('--poor') : tMax >= 15 ? css('--fair') : css('--good') },
    { k: 'Dewpoint now', v: f(cur.dewC), d: cur.dewC == null ? 'no data' : cur.dewC >= 22 ? 'humid: storm and front penalties ×1.5' : 'not a multiplier', c: cur.dewC != null && cur.dewC >= 22 ? css('--fair') : css('--good') },
    { k: 'Front (next 12 h)', v: frontAt ? fmtHour(new Date(frontAt.t)) : 'None seen', d: frontAt ? frontAt.f : 'no sharp dewpoint, pressure or wind change', c: frontAt ? css('--poor') : css('--good') },
    { k: 'SPC outlook now', v: spcNow ? spcNow.label : '–', d: spcNow ? `until ${fmtTime(spcNow.expire)}` : state.errors.spc ? 'did not load' : 'no outlook for this hour', c: !spcNow ? null : spcNow.dn >= 5 ? css('--bad') : spcNow.dn >= 4 ? css('--poor') : spcNow.dn >= 2 ? css('--fair') : css('--good') },
    { k: 'NWS warnings', v: link ? link.event : 'None', d: link ? (/(Hurricane|Tropical Storm|Storm Surge|Extreme Wind)/.test(link.event) ? 'cell and power outages likely: network held at F' : 'not used in the grade') : state.errors.nws ? 'unknown' : 'none active for this point', c: link ? css('--poor') : css('--good') },
    { k: 'Forecast issued', v: lw.updated ? fmtTime(lw.updated) : '–', d: lw.updated ? fmtDay(lw.updated) : '', c: null },
  ];
  box.innerHTML = tiles
    .map((s) => `<div class="stat" style="${s.c ? `--c:${s.c}` : ''}"><div class="k">${esc(s.k)}</div><div class="v">${esc(s.v)}</div><div class="d">${esc(s.d)}</div></div>`)
    .join('');
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const hrs = lw.hours.filter((h) => +h.time >= +start && +h.time < +start + 72 * HOUR);
  drawChart($('wxChart'), {
    series: [
      { label: 'Thunder %', type: 'bar', barWidthMs: HOUR, points: hrs.map((h) => ({ time: h.time, value: h.thunderPct })), colorFn: (pt) => (pt.value > 50 ? css('--bad') : pt.value >= 30 ? css('--poor') : pt.value >= 15 ? css('--fair') : css('--good')) },
      { label: 'Dewpoint °F', color: css('--accent'), gapMs: 2 * HOUR, points: hrs.map((h) => ({ time: h.time, value: h.dewC == null ? null : (h.dewC * 9) / 5 + 32 })) },
    ],
    yMin: 0,
    yMax: 100,
    thresholds: [{ value: 50, label: 'thunder 50%', color: css('--bad') }, { value: 72, label: 'dewpoint 72 °F', color: css('--accent') }],
    now: new Date(),
  });
}

/** Load local weather for a new site, then regrade (the old site's forecast is never used). */
async function refreshWeather() {
  try {
    state.raw.nws = await loadNws(false);
    state.errors.nws = undefined;
  } catch (e) {
    state.errors.nws = String(e.message || e);
  }
  regrade();
  renderAll();
}

async function refreshCors() {
  const asked = { lat: settings.lat, lon: settings.lon };
  let raw = null;
  let err;
  try {
    raw = await LOADERS.cors(false);
  } catch (e) {
    err = String(e.message || e);
  }
  if (asked.lat !== settings.lat || asked.lon !== settings.lon) return; // the site changed again meanwhile
  state.raw.cors = raw;
  state.errors.cors = err;
  state.parsed.cors = corsForSite(raw);
  renderField();
  renderFeeds();
}

function renderAlerts() {
  const cutoff = Date.now() - 48 * 3600000;
  const list = state.parsed.alerts.filter((a) => a.issued >= cutoff);
  $('alertList').innerHTML = list.length
    ? list
        .map(
          (a) => `<details class="item"><summary>${esc(P.alertHeadline(a.message))}<div class="t">${a.issued.toLocaleString()}</div></summary><pre>${esc(a.message)}</pre></details>`,
        )
        .join('')
    : `<div class="muted">${state.errors.alerts ? 'Alerts feed unavailable.' : 'No alerts in the last 48 hours.'}</div>`;
  $('forecastText').textContent = state.raw.forecast3 || 'Unavailable';
  $('discussionText').textContent = state.raw.discussion || 'Unavailable';
}

function renderFeeds() {
  const names = [...Object.keys(LOADERS), ...settings.constellations.map((c) => `tle:${c}`)];
  $('feedStatus').innerHTML = names
    .map((n) => `<span class="feed ${state.errors[n] ? 'fail' : 'ok'}" title="${esc(state.errors[n] || 'OK')}">${n}</span>`)
    .join('');
}

function renderLinks() {
  $('crossLinks').innerHTML = CROSS_CHECK_LINKS.map(
    (l) => `<a class="link" href="${esc(l.url)}" target="_blank" rel="noopener"><b>${esc(l.name)} ↗</b><span>${esc(l.note)}</span></a>`,
  ).join('');
}

// --------------------------------------------------------------- learn mode
const LEARN_KEY = 'gpsdash:learn';

function learnStored() {
  try {
    const v = localStorage.getItem(LEARN_KEY);
    return v == null ? true : v === '1'; // on by default: this is a learning tool
  } catch {
    return true;
  }
}

function applyLearn(on) {
  document.body.classList.toggle('learn-on', on);
  $('learnBtn').setAttribute('aria-pressed', String(on));
}

function setupLearn() {
  applyLearn(learnStored());
  $('learnBtn').addEventListener('click', () => {
    const on = !document.body.classList.contains('learn-on');
    applyLearn(on);
    try {
      localStorage.setItem(LEARN_KEY, on ? '1' : '0');
    } catch {
      /* ignore */
    }
  });

  // Static "What am I looking at?" boxes.
  document.querySelectorAll('.learn[data-topic]').forEach((el) => {
    const text = L.SECTIONS[el.dataset.topic];
    if (text) el.innerHTML = `<b class="learn-q">What am I looking at?</b> ${text}`;
  });

  // Space Weather 101.
  $('learnIntro').textContent = L.LEARN_INTRO;
  $('storySteps').innerHTML = L.STORY.map((s) => {
    const [, num, title] = s.title.match(/^(\d+)\.\s*(.*)$/) || [null, '', s.title];
    return `<li><span class="step-num" aria-hidden="true">${num}</span><div><b>${esc(title)}</b><p>${s.text}</p></div></li>`;
  }).join('');
  $('glossGrid').innerHTML = Object.entries(L.GLOSSARY)
    .sort(([, a], [, b]) => a.word.localeCompare(b.word))
    .map(([k, g]) => `<div class="gloss-card" id="gloss-${k}"><b>${esc(g.word)}</b><p>${esc(g.text)}</p></div>`)
    .join('');
  setupGlossaryDialog();
  setupQuiz();
  setupWxLearn();
}

function setupGlossaryDialog() {
  const dlg = $('termDialog');
  let current = null;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.term');
    if (!btn) return;
    const g = L.GLOSSARY[btn.dataset.term];
    if (!g) return;
    e.preventDefault();
    current = btn.dataset.term;
    $('termWord').textContent = g.word;
    $('termText').textContent = g.text;
    if (!dlg.open) dlg.showModal();
  });
  $('termAll').addEventListener('click', () => {
    dlg.close();
    const card = $(`gloss-${current}`) || $('glossary');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('flash');
    void card.offsetWidth; // restart the highlight animation
    card.classList.add('flash');
  });
}

/** The "Weather & RTK" learning area and the crew quiz picker. */
function setupWxLearn() {
  $('wxIntro').textContent = W.WX_INTRO;
  $('wxLayers').querySelector('tbody').innerHTML = W.WX_LAYERS.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${esc(c)}</td>` : `<td><b>${esc(c)}</b></td>`)).join('')}</tr>`).join('');
  const list = (id, items) => ($(id).innerHTML = items.map((x) => `<li>${esc(x)}</li>`).join(''));
  list('wxPoints', W.WX_POINTS);
  list('wxNetwork', W.WX_NETWORK);
  list('wxBase', W.WX_BASE);
  list('wxGrades', W.WX_GRADES);
  $('wxCompare').querySelector('tbody').innerHTML = W.WX_COMPARE.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${esc(c)}</td>` : `<td><b>${esc(c)}</b></td>`)).join('')}</tr>`).join('');
  $('wxNumbers').querySelector('tbody').innerHTML = W.WX_NUMBERS.map(([k, v]) => `<tr><td>${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join('');
  $('wxMyths').innerHTML = W.WX_MYTHS.map(([m, t]) => `<li><b>Myth: “${esc(m)}”</b> ${esc(t)}</li>`).join('');

  const sel = $('fqSel');
  const box = $('fq');
  if (!QUIZZES.length) {
    sel.innerHTML = '<option>Quizzes coming soon</option>';
    sel.disabled = true;
    return;
  }
  sel.innerHTML = QUIZZES.map((q, i) => `<option value="${i}">${i + 1}. ${esc(q.title)}</option>`).join('');
  let right = 0;
  let done = 0;
  let quiz = QUIZZES[0];
  const score = () => {
    $('fqScore').innerHTML =
      done < quiz.questions.length
        ? `Score: <b>${right}</b> of ${quiz.questions.length}`
        : `All done! You got <b>${right} of ${quiz.questions.length}</b>.${right === quiz.questions.length ? ' Perfect! 🎉' : ''} <button type="button" class="chip" id="fqReset">Try again</button>`;
  };
  const build = () => {
    quiz = QUIZZES[+sel.value || 0];
    right = 0;
    done = 0;
    $('fqIntro').textContent = quiz.intro || '';
    box.innerHTML =
      quiz.questions
        .map(
          (q, i) => `<fieldset class="quiz-q" data-i="${i}"><legend>${i + 1}. ${esc(q.q)}</legend>
          <div class="quiz-choices">${q.choices.map((c, j) => `<button type="button" class="quiz-choice" data-j="${j}">${esc(c)}</button>`).join('')}</div>
          <p class="quiz-why" hidden></p></fieldset>`,
        )
        .join('') + '<div class="quiz-score" id="fqScore" aria-live="polite"></div>';
    score();
  };
  sel.addEventListener('change', build);
  box.addEventListener('click', (e) => {
    if (e.target.id === 'fqReset') {
      build();
      box.querySelector('.quiz-choice')?.focus();
      return;
    }
    const b = e.target.closest('.quiz-choice');
    if (!b) return;
    const fs = b.closest('.quiz-q');
    if (fs.dataset.done) return;
    const q = quiz.questions[+fs.dataset.i];
    const ok = +b.dataset.j === q.answer;
    fs.dataset.done = ok ? 'right' : 'wrong';
    done++;
    if (ok) right++;
    fs.querySelectorAll('.quiz-choice').forEach((x) => {
      x.disabled = true;
      if (+x.dataset.j === q.answer) x.classList.add('right');
    });
    if (!ok) b.classList.add('wrong');
    const why = fs.querySelector('.quiz-why');
    why.hidden = false;
    why.className = `quiz-why ${ok ? 'ok' : 'no'}`;
    why.innerHTML = `<b>${ok ? 'Right!' : `Not quite. The answer is: ${esc(q.choices[q.answer])}.`}</b> ${esc(q.why)}`;
    score();
  });
  build();
}

function setupQuiz() {
  const T = L.QUIZ_TEXT;
  const box = $('quiz');
  let right = 0;
  let done = 0;
  $('quizIntro').textContent = T.intro;
  const score = () => {
    $('quizScore').innerHTML =
      done < L.QUIZ.length
        ? `${T.score} <b>${right}</b> of ${L.QUIZ.length}`
        : `${T.done} <b>${right} of ${L.QUIZ.length}</b>.${right === L.QUIZ.length ? ` ${T.perfect} 🎉` : ''} <button type="button" class="chip" id="quizReset">${T.again}</button>`;
  };
  const build = () => {
    right = 0;
    done = 0;
    box.innerHTML =
      L.QUIZ.map(
        (q, i) => `<fieldset class="quiz-q" data-i="${i}"><legend>${i + 1}. ${esc(q.q)}</legend>
          <div class="quiz-choices">${q.choices.map((c, j) => `<button type="button" class="quiz-choice" data-j="${j}">${esc(c)}</button>`).join('')}</div>
          <p class="quiz-why" hidden></p></fieldset>`,
      ).join('') + '<div class="quiz-score" id="quizScore" aria-live="polite"></div>';
    score();
  };
  box.addEventListener('click', (e) => {
    if (e.target.id === 'quizReset') {
      build();
      box.querySelector('.quiz-choice')?.focus();
      return;
    }
    const b = e.target.closest('.quiz-choice');
    if (!b) return;
    const fs = b.closest('.quiz-q');
    if (fs.dataset.done) return;
    const q = L.QUIZ[+fs.dataset.i];
    const ok = +b.dataset.j === q.answer;
    fs.dataset.done = ok ? 'right' : 'wrong';
    done++;
    if (ok) right++;
    fs.querySelectorAll('.quiz-choice').forEach((x) => {
      x.disabled = true;
      if (+x.dataset.j === q.answer) x.classList.add('right');
    });
    if (!ok) b.classList.add('wrong');
    const why = fs.querySelector('.quiz-why');
    why.hidden = false;
    why.className = `quiz-why ${ok ? 'ok' : 'no'}`;
    why.innerHTML = `<b>${ok ? T.right : `${T.wrong} ${esc(q.choices[q.answer])}.`}</b> ${esc(q.why)}`;
    score();
  });
  build();
}

// ------------------------------------------------------------------- wiring
function setupControls() {
  const sel = $('profileSel');
  sel.innerHTML = Object.entries(PROFILES)
    .map(([k, v]) => `<option value="${k}" ${k === settings.profile ? 'selected' : ''}>${v.label}</option>`)
    .join('');
  sel.addEventListener('change', () => {
    settings.profile = sel.value;
    saveSettings();
    regrade();
    renderAll();
  });
  $('locLabel').textContent = settings.label || `${settings.lat.toFixed(2)}, ${settings.lon.toFixed(2)}`;
  $('refreshBtn').addEventListener('click', () => refresh({ force: true }));

  const dlg = $('locDialog');
  $('locBtn').addEventListener('click', () => {
    $('locName').value = settings.label || '';
    $('locLat').value = settings.lat;
    $('locLon').value = settings.lon;
    $('workStart').value = settings.workStart;
    $('workEnd').value = settings.workEnd;
    $('baselineKm').value = settings.baselineKm ?? 5;
    $('linkSel').value = settings.link || 'uhf';
    dlg.showModal();
  });
  $('geoBtn').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    $('geoBtn').textContent = 'Locating…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        $('locLat').value = pos.coords.latitude.toFixed(4);
        $('locLon').value = pos.coords.longitude.toFixed(4);
        if (!$('locName').value || $('locName').value === settings.label) $('locName').value = 'My location';
        $('geoBtn').textContent = 'Use my current location';
      },
      () => {
        $('geoBtn').textContent = 'Location blocked: enter it manually';
      },
      { timeout: 10000 },
    );
  });
  dlg.addEventListener('close', () => {
    if (dlg.returnValue !== 'ok') return;
    const lat = parseFloat($('locLat').value);
    const lon = parseFloat($('locLon').value);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    settings.lat = lat;
    settings.lon = lon;
    settings.label = $('locName').value || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    settings.workStart = Math.max(0, Math.min(23, parseInt($('workStart').value, 10) || 0));
    settings.workEnd = Math.max(settings.workStart + 1, Math.min(24, parseInt($('workEnd').value, 10) || 24));
    const km = parseFloat($('baselineKm').value);
    settings.baselineKm = Number.isFinite(km) && km > 0 ? Math.min(100, Math.round(km * 10) / 10) : 5;
    settings.link = $('linkSel').value === 'cell' ? 'cell' : 'uhf';
    saveSettings();
    $('locLabel').textContent = settings.label;
    computeGeometry();
    state.players.ovationPlayer = null;
    regrade();
    renderAll();
    refreshCors();
    refreshWeather();
  });

  $('constToggles').addEventListener('change', async (e) => {
    const boxes = [...$('constToggles').querySelectorAll('input:checked')].map((b) => b.value);
    if (!boxes.length) {
      e.target.checked = true;
      return;
    }
    settings.constellations = boxes;
    saveSettings();
    await loadTLEs();
    computeGeometry();
    regrade();
    renderAll();
  });
  $('maskInput').addEventListener('change', () => {
    settings.elevationMask = Math.max(0, Math.min(40, +$('maskInput').value || 0));
    saveSettings();
    computeGeometry();
    regrade();
    renderAll();
  });
}

function boot() {
  setupLearn();
  setupControls();
  renderLinks();
  setupSims();
  refresh();
  setInterval(() => refresh(), 5 * 60000);
  // Keep the live "now" pieces moving between refreshes.
  setInterval(() => {
    if (!state.result) return;
    renderSats();
  }, 60000);
  window.addEventListener('resize', () => {
    if (!state.result) return;
    const { vis, excluded } = skyNow();
    drawSkyplot($('skyplot'), vis, excluded);
    drawAuroraMap($('auroraMap'), state.parsed.ovation, land, settings);
  });
}

// Exposed for debugging in the console.
window.gpsdash = { state, settings: () => settings, gradeFor };

boot();
