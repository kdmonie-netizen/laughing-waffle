import { SOURCES, CROSS_CHECK_LINKS, CACHE_TTL, DEFAULT_SETTINGS, PROFILES } from './config.js';
import { fetchJSON, fetchText, loadAll } from './fetch.js';
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
  ap45: (force) => fetchText(SOURCES.ap45, { force, ttl: CACHE_TTL.text, persist: true }),
  discussion: (force) => fetchText(SOURCES.discussion, { force, ttl: CACHE_TTL.text }),
  alerts: (force) => fetchJSON(SOURCES.alerts, { force }),
  ovation: (force) => fetchJSON(SOURCES.ovation, { force }),
  donkiEnlil: (force) => fetchJSON(donkiUrl(SOURCES.donkiEnlil, 7), { force, ttl: CACHE_TTL.donki, persist: true }),
  donkiCme: (force) => fetchJSON(donkiUrl(SOURCES.donkiCme, 10) + '&mostAccurateOnly=true', { force, ttl: CACHE_TTL.donki, persist: true }),
};

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
  state.geometry = geometryTimeline(state.sats, start, 72, 10, settings.lat, settings.lon, settings.elevationMask);
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
  return p;
}

function realtime(p) {
  const now = Date.now();
  const recent = (arr, key, mins) => {
    const v = arr.filter((r) => now - r.time <= mins * 60000 && r[key] != null).map((r) => r[key]);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const last = (arr, key) => {
    for (let i = arr.length - 1; i >= 0; i--) if (arr[i][key] != null) return arr[i];
    return null;
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
    rNow: xr ? P.rScaleFromFlux(xr.flux) : 0,
    protonFlux: pr?.flux ?? null,
    sNow: pr ? P.sScaleFromFlux(pr.flux) : 0,
    aurora: p.ovation ? p.ovation.at(settings.lat, settings.lon) : null,
  };
}

async function refresh({ force = false } = {}) {
  $('refreshBtn').disabled = true;
  $('updated').textContent = 'Updating…';
  const [{ data, errors }] = await Promise.all([loadAll(LOADERS, force), state.sats.length ? null : loadTLEs()]);
  state.raw = data;
  for (const k of Object.keys(LOADERS)) state.errors[k] = errors[k];
  state.parsed = parseAll(data);
  if (!state.geometry.length || force) computeGeometry();
  regrade();
  renderAll();
  $('refreshBtn').disabled = false;
  $('updated').textContent = `Updated ${fmtTime(new Date())}`;
}

function regrade() {
  const p = state.parsed;
  state.rt = realtime(p);
  state.result = gradeConditions({
    settings,
    kpForecast: p.kpForecast,
    scales: p.scales,
    realtime: state.rt,
    geometry: state.geometry,
    outlook27: p.outlook27,
    outlook45: p.outlook45,
    cmeArrivals: p.enlil,
  });
}

// ---------------------------------------------------------------- rendering
function renderAll() {
  renderErrors();
  renderToday();
  renderHours();
  renderDays();
  renderExtended();
  renderCharts();
  renderScales();
  renderSats();
  renderSims();
  renderAlerts();
  renderFeeds();
  $('mlatNote').textContent = `yours is ${state.result.mlat.toFixed(1)}° magnetic, ${latitudeBand(state.result.mlat)}, ×${state.result.latFactor.toFixed(2)}`;
}

function renderErrors() {
  const core = ['kpForecast', 'scales', 'plasma', 'mag'];
  const failed = core.filter((k) => state.errors[k]);
  const box = $('errors');
  if (!failed.length) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const fileHint = location.protocol === 'file:' ? ' You opened the file directly. Run <code>npm start</code> and open http://localhost:8080 instead.' : '';
  box.innerHTML = `Couldn’t reach some NOAA feeds (${failed.join(', ')}). The grade is built from whatever did load.${fileHint}`;
}

function gClass(grade) {
  return `g${grade}`;
}

function renderToday() {
  const r = state.result;
  const today = r.days[0];
  const card = $('gradeCard');
  card.className = 'grade-card';
  if (!today) {
    $('todayGrade').textContent = '?';
    $('todayVerdict').textContent = 'No Kp forecast available';
    $('todayLearn').innerHTML = `<p>${L.todayKid(null)}</p>`;
    return;
  }
  card.classList.add(gClass(today.grade));
  $('todayGrade').textContent = today.grade;
  $('todayVerdict').textContent = today.verdict;
  $('todayScore').textContent = `Score ${today.score}/100 · ${PROFILES[settings.profile].label} · work hours ${settings.workStart}:00–${settings.workEnd}:00`;
  const w = today.bestWindow;
  $('todayWindow').innerHTML = w
    ? `${w.good ? 'Best window' : 'Least-bad hour'}: <b>${fmtTime(w.start)} – ${fmtTime(w.end)}</b> (avg ${w.score})` +
      (today.worstHour && today.worstHour.score < 80 ? `<br><span class="muted">Worst: ${fmtTime(today.worstHour.time)} (${today.worstHour.grade})</span>` : '')
    : '';

  const now = r.now;
  const pill = $('nowGrade');
  pill.className = `pill ${now ? gClass(now.grade) : ''}`;
  pill.style.color = now ? 'var(--g)' : '';
  pill.textContent = now ? `${now.grade} · ${now.score}` : '–';

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
  const stats = [
    { k: 'Kp now (est.)', v: rt.kpNow?.toFixed(2) ?? '–', d: rt.kpNow != null ? `G${P.gScaleFromKp(rt.kpNow)} storm scale` : 'no data', c: kpC, kid: kid.kp },
    { k: 'IMF Bz (30 min)', v: rt.bz30 != null ? `${rt.bz30.toFixed(1)} nT` : '–', d: rt.bz30 == null ? '' : rt.bz30 < -10 ? 'strongly south' : rt.bz30 < -3 ? 'south: loading' : 'north/neutral', c: rt.bz30 == null ? null : rt.bz30 < -10 ? css('--bad') : rt.bz30 < -3 ? css('--fair') : css('--good'), kid: kid.bz },
    { k: 'Solar wind', v: rt.speed != null ? `${Math.round(rt.speed)} km/s` : '–', d: rt.density != null ? `${rt.density.toFixed(1)} p/cm³` : '', c: rt.speed == null ? null : rt.speed > 700 ? css('--bad') : rt.speed > 500 ? css('--fair') : css('--good'), kid: kid.speed },
    { k: 'X-ray', v: P.flareClass(rt.xrayFlux), d: rt.rNow ? `R${rt.rNow} radio blackout` : 'no blackout', c: rt.rNow >= 3 ? css('--bad') : rt.rNow ? css('--fair') : css('--good'), kid: kid.xray },
    { k: 'Protons ≥10 MeV', v: rt.protonFlux != null ? `${rt.protonFlux < 10 ? rt.protonFlux.toFixed(2) : Math.round(rt.protonFlux)} pfu` : '–', d: rt.sNow ? `S${rt.sNow} radiation storm` : 'below S1', c: rt.sNow ? css('--poor') : css('--good'), kid: kid.protons },
    { k: 'Aurora overhead', v: rt.aurora != null ? `${Math.round(rt.aurora)}%` : '–', d: 'OVATION at your site', c: rt.aurora == null ? null : rt.aurora >= 30 ? css('--bad') : rt.aurora >= 10 ? css('--fair') : css('--good'), kid: kid.aurora },
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

function nearestGeometry(t) {
  let best = null;
  for (const g of state.geometry) if (!best || Math.abs(g.time - t) < Math.abs(best.time - t)) best = g;
  return best && Math.abs(best.time - t) < 20 * 60000 ? best : null;
}

function renderHours() {
  const hours = state.result.hours;
  const strip = $('hourStrip');
  strip.style.gridTemplateColumns = `repeat(${hours.length}, minmax(14px, 1fr))`;
  strip.innerHTML = hours
    .map((h, i) => {
      const hr = h.time.getHours();
      const off = hr < settings.workStart || hr >= settings.workEnd;
      return `<button class="hour ${gClass(h.grade)} ${off ? 'off' : ''} ${h.isNow ? 'now' : ''}" style="background:var(--g)" data-i="${i}" title="${fmtDay(h.time)} ${fmtHour(h.time)}: ${h.grade} (${h.score})" aria-label="${fmtDay(h.time)} ${fmtHour(h.time)} grade ${h.grade}">${h.grade}</button>`;
    })
    .join('') +
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
    strip.querySelectorAll('.hour').forEach((x) => x.classList.toggle('sel', x === b));
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
  const fac = h.factors.filter((f) => f.penalty >= 0.5);
  $('hourDetail').innerHTML = `<b>${fmtDay(h.time)} ${fmtHour(h.time)}</b>: grade <b>${h.grade}</b> (${h.score}), ${esc(h.verdict)} · Kp ${h.kp.toFixed(2)} (${h.kpKind}) · ${h.sunlit ? 'daylight' : 'night'}<br>` +
    (fac.length ? fac.map((f) => `${esc(f.label)} <span class="muted">−${f.penalty.toFixed(1)}</span>`).join(' · ') : '<span class="muted">No penalties</span>') +
    `<div class="learn">${L.hourKid(h)}</div>`;
}

function renderDays() {
  $('dayCards').innerHTML = state.result.days
    .map((d, i) => {
      const cmes = state.parsed.enlil.filter((a) => sameLocalDay(a.arrival, d.date));
      return `<div class="day ${gClass(d.grade)}">
        <div class="top"><div><b>${i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtDay(d.date)}</b><div class="muted small">${fmtDay(d.date)}</div></div><div class="letter">${d.grade}</div></div>
        <div>${esc(d.verdict)} <span class="muted small">(${d.score})</span></div>
        <div class="small muted">Peak Kp ${d.kpMax.toFixed(2)} · ${d.bestWindow ? `best ${fmtHour(d.bestWindow.start)}–${fmtHour(d.bestWindow.end)}` : ''}</div>
        <ul>${d.drivers.filter((x) => x.penalty >= 1).map((x) => `<li>${esc(x.label)}</li>`).join('') || '<li>Clean</li>'}
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
          (d) => `<div class="ext ${gClass(d.grade)} ${d.confidence === 'Low' ? 'low' : ''}" title="${esc(d.source)} · confidence ${d.confidence}\nPeak Kp ≈ ${d.kpMax.toFixed(1)} · Ap ${d.ap}${d.f107 ? ` · F10.7 ${d.f107}` : ''}">
          <div>${d.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
          <div class="l">${d.grade}</div>
          <div class="muted">Kp ${d.kpMax.toFixed(0)}</div>
          ${d.cme ? '<div class="cme">CME</div>' : ''}
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
  const vis = state.sats.length ? visibleSatellites(state.sats, now, settings.lat, settings.lon, 0, settings.elevationMask) : [];
  const d = dop(vis);
  const counts = {};
  for (const v of vis) counts[v.constellation] = (counts[v.constellation] || 0) + 1;
  const tleErr = Object.entries(state.errors).filter(([k, v]) => k.startsWith('tle:') && v);
  $('satNote').textContent = state.sats.length
    ? `${vis.length} in view now · PDOP ${Number.isFinite(d.pdop) ? d.pdop.toFixed(2) : '∞'} · HDOP ${Number.isFinite(d.hdop) ? d.hdop.toFixed(2) : '∞'} · VDOP ${Number.isFinite(d.vdop) ? d.vdop.toFixed(2) : '∞'}`
    : tleErr.length
      ? `Couldn’t load element sets (${tleErr.map(([k]) => k.slice(4)).join(', ')})`
      : 'Loading element sets…';
  $('skyLegend').innerHTML = Object.entries(counts)
    .map(([c, n]) => `<span><span class="sw" style="background:${CONST_COLORS[c]}"></span>${c} ${n}</span>`)
    .join('');
  drawSkyplot($('skyplot'), vis);

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

function drawSkyplot(canvas, vis) {
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
  const players = { enlilPlayer: 'enlilFrames', ovationPlayer: hemi, lascoPlayer: 'lascoC3Frames', suviPlayer: 'suvi304Frames' };
  for (const [el, src] of Object.entries(players)) {
    if (state.players[el]?.src === src && Date.now() - state.players[el].t < 30 * 60000) continue;
    fetchJSON(SOURCES[src], { ttl: 15 * 60000 })
      .then((json) => {
        state.players[el]?.player?.pause?.();
        const root = $(el);
        const player = new FramePlayer(root, P.parseFrames(json), { maxFrames: src === 'enlilFrames' ? 200 : 96 });
        state.players[el] = { src, player, t: Date.now() };
        state.errors[src] = undefined;
      })
      .catch((e) => {
        state.errors[src] = String(e.message || e);
        $(el).querySelector('.player-time').innerHTML = `Couldn’t load frames. <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener">View on SWPC</a>`;
        renderFeeds();
      });
  }
  const drap = $('drapImg');
  drap.src = `${SOURCES.drapImage}?t=${Math.floor(Date.now() / 600000)}`;
  drap.onerror = () => {
    drap.replaceWith(Object.assign(document.createElement('div'), { className: 'muted', textContent: 'D-RAP image unavailable right now.' }));
  };

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
    saveSettings();
    $('locLabel').textContent = settings.label;
    computeGeometry();
    state.players.ovationPlayer = null;
    regrade();
    renderAll();
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
    drawSkyplot($('skyplot'), state.sats.length ? visibleSatellites(state.sats, new Date(), settings.lat, settings.lon, 0, settings.elevationMask) : []);
    drawAuroraMap($('auroraMap'), state.parsed.ovation, land, settings);
  });
}

// Exposed for debugging in the console.
window.gpsdash = { state, settings: () => settings, gradeFor };

boot();
