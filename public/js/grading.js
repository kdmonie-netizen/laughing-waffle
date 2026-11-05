// The GPS-day grading model.
//
// Every hour gets a 0–100 score: 100 minus penalties for each thing known to
// hurt GNSS positioning. Penalties are scaled by your geomagnetic latitude
// (storms hit high latitudes harder) and by the work profile (RTK survey is
// far more sensitive than phone-grade navigation).
//
//   Kp (geomagnetic storm)        → ionospheric gradients, scintillation, RTK fix loss
//   R-scale flare probability     → solar radio bursts / sudden TEC jumps, sunlit side only
//   S-scale proton probability    → polar-cap absorption / receiver noise, high latitude only
//   Post-sunset equatorial window → plasma-bubble scintillation, low latitude only
//   Real-time Bz / wind speed     → storm onset: charged to this hour and the next two
//   OVATION aurora at your site   → auroral oval overhead = phase scintillation
//   PDOP / satellite count        → plain geometry from the GNSS almanac
//
// The Kp used for an hour is the worst of: NOAA's 3-day forecast, the live
// 1-minute estimate (this hour and the next two), NOAA's Geospace model Kp,
// NOAA's lower-48 (mid-latitude) K, and a NASA-modelled CME arrival.
//
// Some readings don't subtract points, they forbid a "go" (score held at D):
// a survey hour at storm level (Kp 5+), Dst at or below -100 nT, an on-site
// TEC anomaly above 10, and a hole in the Kp forecast during work hours.
//
// TWO grades per hour (1.4.0): FDOT network RTK (FPRN) and own base + rover.
// They share one list of causes, scaled per mode: ionospheric and local-weather
// causes grow with the base/rover baseline, and are fixed for the network
// (whose ~40-70 km station spacing can't see storm cells or sea-breeze fronts).
// Local weather (NWS + SPC) adds thunderstorm chance, front passage and
// moisture; rain on its own adds nothing (see docs/weather-and-gps.md).
//
// The day letter follows the worst work hour whenever that hour is a D or F,
// so a calm morning can't average away a storm afternoon. Days 4-45 get a
// trend word (quiet / active / storm possible), never a go letter.
//
// Thresholds are deliberately readable lookup tables so they're easy to tune.

import { geomagneticLatitude, solarElevation, localSolarHour } from './geo.js';
import { apToKp } from './parsers.js';
import { PROFILES } from './config.js';

/** Piecewise-linear interpolation over [[x, y], ...] sorted by x. */
export function interp(table, x) {
  if (x == null || Number.isNaN(x)) return 0;
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    const [x0, y0] = table[i - 1];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return table[table.length - 1][1];
}

export const TABLES = {
  kp: [[0, 0], [2, 0], [3, 4], [4, 12], [5, 30], [6, 50], [7, 70], [8, 85], [9, 95]],
  latFactor: [[0, 0.6], [20, 0.6], [40, 0.8], [50, 1.0], [58, 1.3], [65, 1.5], [90, 1.4]],
  pdop: [[2, 0], [3, 3], [4, 8], [6, 20], [10, 40]],
  bz: [[-50, 45], [-30, 30], [-20, 20], [-10, 10], [-5, 0]],
  speed: [[500, 0], [600, 5], [800, 10], [1000, 15], [1500, 25]],
  aurora: [[5, 0], [10, 10], [30, 25], [60, 35]],
};

export const GRADES = [
  { min: 90, grade: 'A', verdict: 'Excellent: go' },
  { min: 80, grade: 'B', verdict: 'Good: go' },
  { min: 70, grade: 'C', verdict: 'Fair: go, with extra checks' },
  { min: 55, grade: 'D', verdict: 'Poor: expect float / slow inits' },
  { min: -Infinity, grade: 'F', verdict: 'No-go for precision work' },
];

export function gradeFor(score) {
  return GRADES.find((g) => score >= g.min);
}

const HOUR = 3600000;
/** Live readings (L1 is ~30-60 min upstream) count for this hour and the next two. */
export const LIVE_HOURS = 3;
/** A modelled CME raises Kp from 6 h before to 12 h after its arrival (model error is ~±10 h). */
export const CME_WINDOW = { before: 6, after: 12 };
/** Highest score that still reads D: used when a reading forbids a "go". */
export const NO_GO_CAP = 69;
export const DST_NO_GO = -100;
export const TEC_NO_GO = 10;
const D_CAP = NO_GO_CAP;
const C_CAP = 79;
const F_CAP = 40;

/**
 * The two RTK modes. Factors by kind:
 *   iono  - Kp, Bz, wind speed, the storm-time SED window: differential ionosphere,
 *           grows with distance to the reference
 *   wx    - local weather (thunder, fronts, SPC outlook): differential troposphere
 *   track - flares, scintillation, aurora, protons: hits every receiver alike
 *   geom  - PDOP: the same sky for both
 */
export function modeSettings(settings) {
  const km = Number.isFinite(+settings.baselineKm) && +settings.baselineKm > 0 ? +settings.baselineKm : 5;
  const link = settings.link === 'cell' ? 'cell' : 'uhf';
  const step = (a, b, c, d) => (km <= 5 ? a : km <= 10 ? b : km <= 20 ? c : d);
  return {
    network: { key: 'network', label: 'FDOT network (FPRN)', short: 'Network', iono: 1, wx: 1, thunderCap: true, link: 'cell', km: null },
    base: {
      key: 'base',
      label: `Base + rover (${km} km, ${link === 'uhf' ? 'UHF' : 'cell'})`,
      short: 'Base/rover',
      iono: step(0.6, 0.8, 1, 1.2),
      wx: step(0.5, 0.75, 1, 1.25),
      thunderCap: km > 10,
      link,
      km,
    },
  };
}

/** Local-weather penalty tables (points before the profile factor). Engineering judgment; calibrate with check shots. */
export const WX = {
  thunder: [[15, 0], [30, 6], [50, 14], [101, 20]], // upper bound (exclusive) → points
  spc: { 2: 6, 3: 6, 4: 14, 5: 20, 6: 20, 8: 20 },
  front: 18,
  humidDewC: 22, // ≈ 72 °F: humid Gulf air makes storm and front gradients sharper
  humidX: 1.5,
  thunderCapPct: 50,
  summerAfternoon: 6, // only when no NWS forecast loaded: May-Oct, 12-19 local
};
const thunderPen = (pct) => (pct == null ? 0 : WX.thunder.find(([lim]) => pct < lim)[1]);

/** Days 4-45: a trend, not a go/no-go letter. */
export function trendFor(kp) {
  if (kp >= 7) return { trend: 'storm', trendLabel: 'Strong storm possible' };
  if (kp >= 5) return { trend: 'storm', trendLabel: 'Storm possible' };
  if (kp >= 4) return { trend: 'active', trendLabel: 'Active' };
  if (kp >= 3) return { trend: 'unsettled', trendLabel: 'Unsettled' };
  return { trend: 'quiet', trendLabel: 'Quiet trend' };
}

function dayKeyLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function dayKeyUTC(d) {
  return d.toISOString().slice(0, 10);
}

function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Sum factors, scale by profile, apply caps, return the scored record.
 * caps: strings (hold at D) or {text, max} (hold at that score).
 */
function finish(factors, profileFactor, caps = []) {
  const scaled = factors
    .filter((f) => f.penalty > 0.05)
    .map((f) => ({ ...f, penalty: f.penalty * profileFactor }));
  const total = scaled.reduce((s, f) => s + f.penalty, 0);
  let score = Math.max(0, Math.round(100 - total));
  const cs = caps.map((c) => (typeof c === 'string' ? { text: c, max: NO_GO_CAP } : c));
  for (const c of cs) score = Math.min(score, c.max);
  const g = gradeFor(score);
  return { score, grade: g.grade, verdict: g.verdict, factors: scaled.sort((a, b) => b.penalty - a.penalty), caps: cs.map((c) => c.text) };
}

/** Score one hour for one mode from the shared causes. */
function scoreMode(m, shared, ctx) {
  const factors = shared.factors.map((f) => ({ ...f, penalty: f.penalty * (f.kind === 'iono' ? m.iono : f.kind === 'wx' ? m.wx : 1) }));
  const caps = [...shared.caps];
  if (m.km != null && m.km > 10) factors.push({ key: 'baseline', kind: 'mode', label: `Baseline ${m.km} km: past ~10 km, fixing gets less reliable`, penalty: 8 });
  if (m.km != null && m.km > 20) caps.push({ text: `Baseline ${m.km} km is past the usual 10-20 km single-base limit`, max: C_CAP });
  // Survey storm rule: a short own base shares most of the ionosphere with the rover, so it holds one Kp step longer.
  const stormKp = ctx.profile.stormKp == null ? null : m.key === 'base' && m.km <= 5 ? ctx.profile.stormKp + 1 : ctx.profile.stormKp;
  if (stormKp != null && ctx.kp >= stormKp) caps.push(`Kp ${ctx.kp.toFixed(1)} is NOAA storm level (G${Math.min(5, Math.max(1, Math.floor(ctx.kp) - 4))}): no-go for ${ctx.profile.label}`);
  if (ctx.thunderCap && m.thunderCap) caps.push(ctx.thunderCap);
  if (ctx.linkAlert && m.link === 'cell') caps.push({ text: `${ctx.linkAlert}: cell and power outages likely, corrections may stop`, max: F_CAP });
  return finish(factors, ctx.profileFactor, caps);
}

const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

/**
 * Build the hourly timeline, per-day grades for the 3-day window, and
 * extended-outlook trends from the 27-day and 45-day products.
 *
 * @param {object} p
 * @param {object} p.settings      lat, lon, profile, workStart, workEnd
 * @param {Array}  p.kpForecast    parsed noaa-planetary-k-index-forecast
 * @param {object} p.scales        parsed noaa-scales
 * @param {object} p.realtime      { kpNow, bz30, speed, rNow, sNow, aurora,
 *                                   kpModel:[{time,kp}], propagated:[{arrival,bz,speed}],
 *                                   dst (nT), tecAnomaly (TECU, null if model-only) }
 * @param {Array}  p.geometry      geometryTimeline() samples (optional)
 * @param {Array}  p.outlook27     parsed 27-day outlook
 * @param {object} p.outlook45     parsed 45-day forecast
 * @param {Array}  p.cmeArrivals   NASA WSA-Enlil predicted Earth arrivals
 * @param {Array}  p.midLatK       NOAA lower-48 K forecast, [{time, k}] per 3-hour UTC slot
 * @param {string} p.cmeCheck      'ok' or 'unavailable' (NASA DONKI failed to load)
 * @param {object} p.localWeather  buildLocalWeather() from weather.js (NWS + SPC), or null
 * @param {Date}   p.now
 */
export function gradeConditions({
  settings,
  kpForecast = [],
  scales = null,
  realtime = {},
  geometry = [],
  outlook27 = [],
  outlook45 = { ap: [], f107: [] },
  cmeArrivals = [],
  midLatK = [],
  cmeCheck = 'ok',
  localWeather = null,
  now = new Date(),
}) {
  const modes = modeSettings(settings);
  const { lat, lon } = settings;
  const profile = PROFILES[settings.profile] || PROFILES.survey;
  const profileFactor = profile.factor;
  const mlat = geomagneticLatitude(lat, lon);
  const absM = Math.abs(mlat);
  const latF = interp(TABLES.latFactor, absM);
  const polarF = absM >= 60 ? 1 : 0.2;
  const f107 = outlook27[0]?.f107 ?? outlook45.f107?.[0]?.f107 ?? 140;
  const scintF = f107 >= 150 ? 1.5 : 1;

  const scaleByDate = new Map((scales?.days || []).map((d) => [d.date, d]));

  // Kp lookup by 3-hour slot.
  const kpSlots = kpForecast.map((r) => ({ start: r.time.getTime(), kp: r.kp, kind: r.kind }));
  const kpAt = (t) => {
    let best = null;
    for (const s of kpSlots) if (t >= s.start && t < s.start + 3 * HOUR) best = s;
    return best;
  };
  const firstSlot = kpSlots.length ? Math.min(...kpSlots.map((s) => s.start)) : 0;
  const lastSlotEnd = kpSlots.length ? Math.max(...kpSlots.map((s) => s.start)) + 3 * HOUR : 0;

  const midKAt = (t) => {
    let k = null;
    for (const m of midLatK) if (m.time && t >= +m.time && t < +m.time + 3 * HOUR && m.k != null) k = Math.max(k ?? 0, m.k);
    return k;
  };
  const modelKpIn = (t) => {
    const v = (realtime.kpModel || []).filter((r) => +r.time >= t && +r.time < t + HOUR).map((r) => r.kp);
    return v.length ? Math.max(...v) : null;
  };
  // CME arrivals: no cap for a glancing blow (the model's own Kp stands).
  const cmeKp = (a) => (a.kpEstimate?.length ? Math.max(...a.kpEstimate) : 5);
  const cmeAt = (t) => {
    let best = null;
    for (const a of cmeArrivals) {
      const at = +a.arrival;
      if (t + HOUR > at - CME_WINDOW.before * HOUR && t < at + CME_WINDOW.after * HOUR && (!best || cmeKp(a) > cmeKp(best))) best = a;
    }
    return best;
  };

  const pdopInHour = (t) => {
    let worst = null;
    for (const g of geometry) {
      const gt = g.time.getTime();
      if (gt >= t && gt < t + HOUR && (worst === null || g.pdop > worst.pdop)) worst = g;
    }
    return worst;
  };

  // ---- hourly timeline: from local midnight today, 72 h --------------------
  const t0 = startOfLocalDay(now).getTime();
  const hours = [];
  const currentHourStart = Math.floor(now.getTime() / HOUR) * HOUR;
  for (let h = 0; h < 72; h++) {
    const t = t0 + h * HOUR;
    const mid = new Date(t + HOUR / 2);
    const isNow = t === currentHourStart;
    const live = t >= currentHourStart && t < currentHourStart + LIVE_HOURS * HOUR;
    const slot = kpAt(t);
    if (!slot) {
      // Inside the forecast's span but no slot: a hole, which is "unknown", never "quiet".
      if (kpSlots.length && t >= firstSlot && t < lastSlotEnd) {
        const miss = { score: null, grade: '?', verdict: 'No Kp forecast for this hour', factors: [], caps: ['No Kp forecast for this hour'] };
        hours.push({ time: new Date(t), kp: null, kpKind: 'missing', missing: true, sunlit: solarElevation(mid, lat, lon) > -2, isNow, live, ...miss, modes: { network: miss, base: miss } });
      }
      continue;
    }
    const factors = [];
    const caps = [];

    // The worst Kp any source gives for this hour.
    let kp = slot.kp;
    let kpFrom = '';
    const raise = (v, from) => {
      if (v != null && v > kp) {
        kp = v;
        kpFrom = from;
      }
    };
    if (live) raise(realtime.kpNow, 'live estimate');
    raise(modelKpIn(t), 'NOAA Geospace model');
    raise(midKAt(t), 'lower-48 K forecast');
    const cme = cmeAt(t);
    if (cme) raise(cmeKp(cme), `NASA CME ${cme.glancing ? 'glancing blow' : 'arrival'} model`);
    factors.push({ key: 'kp', kind: 'iono', label: `Kp ${kp.toFixed(1)} geomagnetic activity${kpFrom ? ` (${kpFrom})` : ''}`, penalty: interp(TABLES.kp, kp) * latF });
    // Storm-time afternoons over the US Southeast: storm-enhanced density plumes, ~17-23 UT.
    const utcH = new Date(t).getUTCHours();
    if (kp >= 5 && utcH >= 17 && utcH < 23) factors.push({ key: 'sed', kind: 'iono', label: 'Storm-time afternoon (17-23 UT): ionosphere plumes over the Southeast', penalty: 8 });

    const sunEl = solarElevation(mid, lat, lon);
    const sunlit = sunEl > -2;
    // Flare/proton odds are UTC-day products; the hour sits on a local day. Use the worse of the two.
    const scs = [scaleByDate.get(dayKeyUTC(mid)), scaleByDate.get(dayKeyLocal(mid))].filter(Boolean);
    if (scs.length && sunlit) {
      const flarePen = (sc) => ((sc.rMajorProb || 0) / 100) * 35 + ((sc.rMinorProb || 0) / 100) * 8;
      const sc = scs.reduce((a, b) => (flarePen(b) > flarePen(a) ? b : a));
      factors.push({ key: 'flare', kind: 'track', label: `Flare risk (R1-R2 ${sc.rMinorProb ?? 0}%, R3+ ${sc.rMajorProb ?? 0}%) on sunlit side`, penalty: flarePen(sc) });
    }
    const sProb = Math.max(0, ...scs.map((sc) => sc.sProb || 0));
    if (sProb) {
      factors.push({ key: 'proton', kind: 'track', label: `Proton event chance ${sProb}%`, penalty: (sProb / 100) * 10 * polarF });
    }
    const lst = localSolarHour(mid, lon);
    if (absM < 25 && (lst >= 19 || lst < 2)) {
      factors.push({ key: 'scint', kind: 'track', label: 'Post-sunset equatorial scintillation window', penalty: 8 * scintF });
    }
    const geo = pdopInHour(t);
    if (geo) {
      const pen = geo.count < 5 || !Number.isFinite(geo.pdop) ? 50 : interp(TABLES.pdop, geo.pdop);
      factors.push({ key: 'pdop', kind: 'geom', label: `PDOP ${Number.isFinite(geo.pdop) ? geo.pdop.toFixed(1) : '∞'} (${geo.count} sats)`, penalty: pen });
    }
    if (live) addLiveFactors(factors, caps, realtime, t, { isNow, sunlit, polarF });

    // ---- local weather (lower atmosphere) --------------------------------
    const wx = localWeather?.ok ? localWeather.at(t) : null;
    let thunderCap = null;
    let linkAlert = null;
    if (wx?.known) {
      const humid = wx.dewC != null && wx.dewC >= WX.humidDewC ? WX.humidX : 1;
      const humidNote = humid > 1 ? `, humid air (dewpoint ${Math.round(wx.dewC)} °C) sharpens it` : '';
      const tp = thunderPen(wx.thunderPct);
      const sp = wx.spc ? WX.spc[wx.spc.dn] || 0 : 0;
      if (tp || sp) {
        const label = tp >= sp ? `Thunderstorm chance ${Math.round(wx.thunderPct)}%: storm cells make wet-delay gradients` : `SPC outlook: ${wx.spc.label}`;
        factors.push({ key: 'thunder', kind: 'wx', label: label + humidNote, penalty: Math.max(tp, sp) * humid });
      }
      if (wx.front) factors.push({ key: 'front', kind: 'wx', label: `Front passing (${wx.front}): reference and rover see different air${humidNote}`, penalty: WX.front * humid });
      if (wx.thunderPct != null && wx.thunderPct > WX.thunderCapPct) thunderCap = `Thunderstorms likely (${Math.round(wx.thunderPct)}%): cells smaller than the network's station spacing`;
      else if (wx.spc && wx.spc.dn >= 5) thunderCap = `SPC ${wx.spc.label} for severe storms`;
      if (wx.linkAlert) linkAlert = wx.linkAlert.event;
    } else if (!localWeather?.ok) {
      const lm = new Date(t).getMonth() + 1;
      const lh = new Date(t).getHours();
      if (lm >= 5 && lm <= 10 && lh >= 12 && lh < 19) factors.push({ key: 'summer', kind: 'wx', label: 'Summer afternoon: sea-breeze storms likely (no NWS forecast loaded)', penalty: WX.summerAfternoon });
    }

    const ctx = { kp, profile, profileFactor, thunderCap, linkAlert };
    const shared = { factors, caps };
    const net = scoreMode(modes.network, shared, ctx);
    const base = scoreMode(modes.base, shared, ctx);
    hours.push({ time: new Date(t), kp, kpKind: kpFrom ? `${slot.kind}, raised by ${kpFrom}` : slot.kind, sunlit, isNow, live, wx, ...net, modes: { network: net, base } });
  }

  // ---- per-day grades over work hours, per mode ---------------------------
  const dayMap = new Map();
  for (const h of hours) {
    const key = dayKeyLocal(h.time);
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key).push(h);
  }
  const inWork = (h) => {
    const hr = h.time.getHours();
    return hr >= settings.workStart && hr < settings.workEnd;
  };
  const view = (h, mode) => ({ ...h, ...h.modes[mode] });
  const gradeDay = (list, mode, m) => {
    const all = list.map((h) => view(h, mode));
    const work = all.filter(inWork);
    const use = work.length ? work : all;
    const known = use.filter((h) => !h.missing);
    const flags = [];
    let score;
    let blendScore = null;
    let worstHour = null;
    if (known.length) {
      const avg = mean(known.map((h) => h.score));
      worstHour = known.reduce((a, b) => (b.score < a.score ? b : a));
      blendScore = Math.round(0.6 * avg + 0.4 * worstHour.score);
      // GPS-C1: a D or F work hour sets the day letter. Calm hours can't average it away.
      score = worstHour.score < 70 ? Math.min(blendScore, worstHour.score) : blendScore;
    } else {
      score = NO_GO_CAP;
    }
    if (use.some((h) => h.missing)) {
      flags.push('The Kp forecast has a hole during work hours. Those hours are unknown, not quiet.');
      score = Math.min(score, NO_GO_CAP);
    }
    // One line per kind of reason: the storm rule is reported once, at its peak Kp.
    const storm = use.filter((h) => (h.caps || []).some((c) => c.includes('NOAA storm level')));
    const capReasons = [...new Set(use.flatMap((h) => (h.caps || []).filter((c) => !c.includes('NOAA storm level') && !(h.missing && c.startsWith('No Kp forecast')))))];
    if (storm.length) {
      const peak = Math.max(...storm.map((h) => h.kp));
      capReasons.unshift(`Kp reaches ${peak.toFixed(1)} in work hours, NOAA storm level (G1 or worse): no-go for ${profile.label}${mode === 'base' && m.km <= 5 ? ' on a short base' : ''}`);
    }
    const g = gradeFor(score);
    return {
      mode,
      label: m.label,
      score,
      blendScore,
      grade: g.grade,
      verdict: g.verdict,
      drivers: topDrivers(use),
      bestWindow: bestWindow(all, settings),
      worstHour,
      flags,
      capReasons,
    };
  };
  const days = [];
  for (const [key, list] of dayMap) {
    const net = gradeDay(list, 'network', modes.network);
    const base = gradeDay(list, 'base', modes.base);
    days.push({
      key,
      date: new Date(`${key}T12:00:00`),
      ...net,
      modes: { network: net, base },
      kpMax: list.some((h) => h.kp != null) ? Math.max(...list.filter((h) => h.kp != null).map((h) => h.kp)) : null,
      warnings: [],
      hours: list,
      confidence: 'High',
      source: 'NOAA 3-day Kp + R/S probabilities' + (geometry.length ? ' + live GNSS geometry' : '') + (localWeather?.ok ? ' + NWS local weather' : ''),
    });
  }

  // ---- extended outlook (27-day, then 45-day): trends, not go letters ------
  const covered = new Set(days.map((d) => d.key));
  const extended = [];
  const pushExtended = (date, kpMax, ap, f107v, source, confidence) => {
    const key = dayKeyUTC(date);
    if (covered.has(key) || date.getTime() < t0 - 86400000) return;
    covered.add(key);
    // A NASA-modelled CME arrival beyond NOAA's 3-day window raises the peak Kp.
    const cme = cmeArrivals.find((a) => dayKeyUTC(a.arrival) === key) || null;
    if (cme) kpMax = Math.max(kpMax, cmeKp(cme));
    extended.push({ key, date: new Date(`${key}T12:00:00`), kpMax, ap, f107: f107v, source, confidence, cme, ...trendFor(kpMax) });
  };
  for (const d of outlook27) pushExtended(d.date, d.kpMax, d.ap, d.f107, 'NOAA 27-day outlook (repeats what the Sun did one rotation ago)', 'Medium');
  const flux45 = new Map((outlook45.f107 || []).map((f) => [dayKeyUTC(f.date), f.f107]));
  for (const d of outlook45.ap || []) {
    pushExtended(d.date, apToKp(d.ap), d.ap, flux45.get(dayKeyUTC(d.date)) ?? null, 'USAF/NOAA 45-day Ap', 'Low');
  }
  extended.sort((a, b) => a.date - b.date);

  // ---- warnings that belong on the grade card ------------------------------
  const warnings = [];
  if (cmeCheck === 'unavailable') warnings.push('CME check did not load. This letter does not include a possible eruption.');
  if (days[0]) days[0].warnings = warnings;

  const nowHour = hours.find((h) => h.isNow) || null;
  if (localWeather && !localWeather.ok) warnings.push('Local weather (NWS) did not load. Summer afternoons get a default storm penalty; nothing else from local weather is in these letters.');
  return { mlat, latFactor: latF, profileFactor, modes, hours, days, extended, warnings, now: nowHour };
}

/** Live readings, charged to this hour and the next two (the time L1 wind takes to arrive, plus slack). */
function addLiveFactors(factors, caps, rt, t, { isNow, sunlit, polarF }) {
  // NOAA's propagated L1 wind says which hour each reading reaches Earth; use it when it's worse.
  const arriving = (rt.propagated || []).filter((r) => +r.arrival >= t && +r.arrival < t + HOUR);
  const bzArr = mean(arriving.map((r) => r.bz).filter((v) => v != null));
  const spArr = mean(arriving.map((r) => r.speed).filter((v) => v != null));
  const bz = [rt.bz30, bzArr].filter((v) => v != null);
  const bzUse = bz.length ? Math.min(...bz) : null;
  const sp = [rt.speed, spArr].filter((v) => v != null);
  const spUse = sp.length ? Math.max(...sp) : null;
  if (bzUse != null && bzUse < -5) {
    const from = bzArr != null && (rt.bz30 == null || bzArr < rt.bz30) ? 'arriving this hour' : '30-min mean';
    factors.push({ key: 'bz', kind: 'iono', label: `IMF Bz ${bzUse.toFixed(1)} nT southward (${from})`, penalty: interp(TABLES.bz, bzUse) });
  }
  if (spUse != null && spUse > 500) {
    factors.push({ key: 'speed', kind: 'iono', label: `Solar wind ${Math.round(spUse)} km/s`, penalty: interp(TABLES.speed, spUse) });
  }
  // A flare's radio burst lasts minutes: this hour only.
  if (isNow && rt.rNow >= 1 && sunlit) {
    factors.push({ key: 'flareNow', kind: 'track', label: `R${rt.rNow} radio blackout in progress`, penalty: rt.rNow >= 3 ? 35 : 8 });
  }
  if (rt.sNow >= 1) {
    factors.push({ key: 'protonNow', kind: 'track', label: `S${rt.sNow} radiation storm in progress`, penalty: 15 * polarF });
  }
  if (rt.aurora != null && rt.aurora > 5) {
    factors.push({ key: 'aurora', kind: 'track', label: `Aurora probability ${Math.round(rt.aurora)}% overhead`, penalty: interp(TABLES.aurora, rt.aurora) });
  }
  if (rt.dst != null && rt.dst <= DST_NO_GO) caps.push(`Dst ${Math.round(rt.dst)} nT: a major storm is under way`);
  if (rt.tecAnomaly != null && rt.tecAnomaly > TEC_NO_GO) caps.push(`Ionosphere (TEC) ${rt.tecAnomaly.toFixed(1)} TECU above normal at your site`);
}

function topDrivers(hours) {
  const agg = new Map();
  for (const h of hours) {
    for (const f of h.factors) {
      const cur = agg.get(f.key);
      if (!cur || f.penalty > cur.penalty) agg.set(f.key, f);
    }
  }
  return [...agg.values()].sort((a, b) => b.penalty - a.penalty).slice(0, 3);
}

/**
 * Longest run of A/B hours inside work hours.
 * good: true only when every work hour is A or B. When some work hours are
 * worse, the run is still returned (partial: true) so the crew can see the
 * usable stretch, but it is never presented as "the day is fine".
 */
export function bestWindow(hours, settings) {
  const work = hours.filter((h) => {
    const hr = h.time.getHours();
    return hr >= settings.workStart && hr < settings.workEnd;
  });
  const list = work.length ? work : hours;
  const known = list.filter((h) => !h.missing);
  const allGood = list.length > 0 && list.every((h) => !h.missing && h.score >= 80);
  let best = null;
  let run = [];
  const flush = () => {
    if (run.length && (!best || run.length > best.length)) best = [...run];
    run = [];
  };
  for (const h of list) {
    if (!h.missing && h.score >= 80) run.push(h);
    else flush();
  }
  flush();
  if (!best) {
    if (!known.length) return null;
    const top = known.reduce((a, b) => (b.score > a.score ? b : a));
    return { start: top.time, end: new Date(top.time.getTime() + HOUR), score: top.score, good: false, partial: false };
  }
  return {
    start: best[0].time,
    end: new Date(best[best.length - 1].time.getTime() + HOUR),
    score: Math.round(best.reduce((s, h) => s + h.score, 0) / best.length),
    good: allGood,
    partial: !allGood,
  };
}
