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
//   Real-time Bz / wind speed     → storm onset in the next hour or so
//   OVATION aurora at your site   → auroral oval overhead = phase scintillation
//   PDOP / satellite count        → plain geometry from the GNSS almanac
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
  bz: [[-30, 30], [-20, 20], [-10, 10], [-5, 0]],
  speed: [[500, 0], [600, 5], [800, 10], [1000, 15]],
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

/** Sum factors, scale by profile, and return the scored record. */
function finish(factors, profileFactor) {
  const scaled = factors
    .filter((f) => f.penalty > 0.05)
    .map((f) => ({ ...f, penalty: f.penalty * profileFactor }));
  const total = scaled.reduce((s, f) => s + f.penalty, 0);
  const score = Math.max(0, Math.round(100 - total));
  const g = gradeFor(score);
  return { score, grade: g.grade, verdict: g.verdict, factors: scaled.sort((a, b) => b.penalty - a.penalty) };
}

/**
 * Build the hourly timeline, per-day grades for the 3-day window, and
 * extended-outlook grades from the 27-day and 45-day products.
 *
 * @param {object} p
 * @param {object} p.settings      lat, lon, profile, workStart, workEnd
 * @param {Array}  p.kpForecast    parsed noaa-planetary-k-index-forecast
 * @param {object} p.scales        parsed noaa-scales
 * @param {object} p.realtime      { kpNow, bz30, speed, xrayFlux, protonFlux, aurora }
 * @param {Array}  p.geometry      geometryTimeline() samples (optional)
 * @param {Array}  p.outlook27     parsed 27-day outlook
 * @param {object} p.outlook45     parsed 45-day forecast
 * @param {Array}  p.cmeArrivals   NASA WSA-Enlil predicted Earth arrivals
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
  now = new Date(),
}) {
  const { lat, lon } = settings;
  const profileFactor = (PROFILES[settings.profile] || PROFILES.survey).factor;
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
    const slot = kpAt(t);
    if (!slot) continue; // beyond the forecast
    const factors = [];
    const isNow = t === currentHourStart;
    let kp = slot.kp;
    if (isNow && realtime.kpNow != null) kp = Math.max(kp, realtime.kpNow);
    factors.push({ key: 'kp', label: `Kp ${kp.toFixed(1)} geomagnetic activity`, penalty: interp(TABLES.kp, kp) * latF });

    const sunEl = solarElevation(mid, lat, lon);
    const sunlit = sunEl > -2;
    const sc = scaleByDate.get(dayKeyUTC(mid));
    if (sc && sunlit) {
      const p = ((sc.rMajorProb || 0) / 100) * 35 + ((sc.rMinorProb || 0) / 100) * 8;
      factors.push({ key: 'flare', label: `Flare risk (R1-R2 ${sc.rMinorProb ?? 0}%, R3+ ${sc.rMajorProb ?? 0}%) on sunlit side`, penalty: p });
    }
    if (sc && sc.sProb) {
      factors.push({ key: 'proton', label: `Proton event chance ${sc.sProb}%`, penalty: (sc.sProb / 100) * 10 * polarF });
    }
    const lst = localSolarHour(mid, lon);
    if (absM < 25 && (lst >= 19 || lst < 2)) {
      factors.push({ key: 'scint', label: 'Post-sunset equatorial scintillation window', penalty: 8 * scintF });
    }
    const geo = pdopInHour(t);
    if (geo) {
      const pen = geo.count < 5 || !Number.isFinite(geo.pdop) ? 50 : interp(TABLES.pdop, geo.pdop);
      factors.push({ key: 'pdop', label: `PDOP ${Number.isFinite(geo.pdop) ? geo.pdop.toFixed(1) : '∞'} (${geo.count} sats)`, penalty: pen });
    }
    if (isNow) addRealtimeFactors(factors, realtime, sunlit, polarF);

    hours.push({ time: new Date(t), kp, kpKind: slot.kind, sunlit, isNow, ...finish(factors, profileFactor) });
  }

  // ---- per-day grades over work hours -------------------------------------
  const dayMap = new Map();
  for (const h of hours) {
    const key = dayKeyLocal(h.time);
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key).push(h);
  }
  const days = [];
  for (const [key, list] of dayMap) {
    const work = list.filter((h) => {
      const hr = h.time.getHours();
      return hr >= settings.workStart && hr < settings.workEnd;
    });
    const use = work.length ? work : list;
    const avg = use.reduce((s, h) => s + h.score, 0) / use.length;
    const min = Math.min(...use.map((h) => h.score));
    const score = Math.round(0.6 * avg + 0.4 * min);
    const g = gradeFor(score);
    days.push({
      key,
      date: new Date(`${key}T12:00:00`),
      score,
      grade: g.grade,
      verdict: g.verdict,
      kpMax: Math.max(...list.map((h) => h.kp)),
      drivers: topDrivers(use),
      bestWindow: bestWindow(list, settings),
      worstHour: use.reduce((a, b) => (b.score < a.score ? b : a)),
      hours: list,
      confidence: 'High',
      source: 'NOAA 3-day Kp + R/S probabilities' + (geometry.length ? ' + live GNSS geometry' : ''),
    });
  }

  // ---- extended outlook (27-day, then 45-day) -----------------------------
  const covered = new Set(days.map((d) => d.key));
  const extended = [];
  const pushExtended = (date, kpMax, ap, f107v, source, confidence) => {
    const key = dayKeyUTC(date);
    if (covered.has(key) || date.getTime() < t0 - 86400000) return;
    covered.add(key);
    // A NASA-modelled CME arrival beyond NOAA's 3-day window raises the peak Kp.
    const cme = cmeArrivals.find((a) => dayKeyUTC(a.arrival) === key);
    if (cme) {
      const k = cme.kpEstimate.length ? Math.max(...cme.kpEstimate) : 5;
      kpMax = Math.max(kpMax, cme.glancing ? Math.min(k, 5) : k);
    }
    const factors = [{ key: 'kp', label: `Peak Kp ≈ ${kpMax.toFixed(1)}${cme ? ' (CME arrival modelled)' : ''}`, penalty: interp(TABLES.kp, kpMax) * latF }];
    if (f107v >= 150) {
      factors.push({ key: 'flux', label: `High solar flux (F10.7 ${f107v}): more flares, higher TEC`, penalty: f107v >= 200 ? 6 : 3 });
    }
    const r = finish(factors, profileFactor);
    extended.push({ key, date: new Date(`${key}T12:00:00`), kpMax, ap, f107: f107v, source, confidence, cme: cme || null, ...r });
  };
  for (const d of outlook27) pushExtended(d.date, d.kpMax, d.ap, d.f107, 'NOAA 27-day outlook', 'Medium');
  const flux45 = new Map((outlook45.f107 || []).map((f) => [dayKeyUTC(f.date), f.f107]));
  for (const d of outlook45.ap || []) {
    pushExtended(d.date, apToKp(d.ap), d.ap, flux45.get(dayKeyUTC(d.date)) ?? null, 'USAF/NOAA 45-day Ap', 'Low');
  }
  extended.sort((a, b) => a.date - b.date);

  const nowHour = hours.find((h) => h.isNow) || null;
  return { mlat, latFactor: latF, profileFactor, hours, days, extended, now: nowHour };
}

function addRealtimeFactors(factors, rt, sunlit, polarF) {
  if (rt.bz30 != null && rt.bz30 < -5) {
    factors.push({ key: 'bz', label: `IMF Bz ${rt.bz30.toFixed(1)} nT southward (30-min mean)`, penalty: interp(TABLES.bz, rt.bz30) });
  }
  if (rt.speed != null && rt.speed > 500) {
    factors.push({ key: 'speed', label: `Solar wind ${Math.round(rt.speed)} km/s`, penalty: interp(TABLES.speed, rt.speed) });
  }
  if (rt.rNow >= 1 && sunlit) {
    factors.push({ key: 'flareNow', label: `R${rt.rNow} radio blackout in progress`, penalty: rt.rNow >= 3 ? 35 : 8 });
  }
  if (rt.sNow >= 1) {
    factors.push({ key: 'protonNow', label: `S${rt.sNow} radiation storm in progress`, penalty: 15 * polarF });
  }
  if (rt.aurora != null && rt.aurora > 5) {
    factors.push({ key: 'aurora', label: `Aurora probability ${Math.round(rt.aurora)}% overhead`, penalty: interp(TABLES.aurora, rt.aurora) });
  }
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

/** Longest run of A/B hours inside work hours (falls back to best-scoring run). */
export function bestWindow(hours, settings) {
  const work = hours.filter((h) => {
    const hr = h.time.getHours();
    return hr >= settings.workStart && hr < settings.workEnd;
  });
  const list = work.length ? work : hours;
  let best = null;
  let run = [];
  const flush = () => {
    if (run.length && (!best || run.length > best.length)) best = [...run];
    run = [];
  };
  for (const h of list) {
    if (h.score >= 80) run.push(h);
    else flush();
  }
  flush();
  if (!best) {
    const top = list.reduce((a, b) => (b.score > a.score ? b : a), list[0]);
    return top ? { start: top.time, end: new Date(top.time.getTime() + HOUR), score: top.score, good: false } : null;
  }
  return {
    start: best[0].time,
    end: new Date(best[best.length - 1].time.getTime() + HOUR),
    score: Math.round(best.reduce((s, h) => s + h.score, 0) / best.length),
    good: true,
  };
}
