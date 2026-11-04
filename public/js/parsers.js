// Parsers for NOAA SWPC products. SWPC has shipped two JSON shapes over the
// years (an array of arrays with a header row, and an array of objects), so
// every table parser goes through toRows(), which accepts either.

import { SWPC } from './config.js';

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** SWPC timestamps are UTC, often without a zone suffix ("2026-11-04 03:00:00.000"). */
export function parseTime(s) {
  if (s instanceof Date) return s;
  if (s == null) return null;
  let t = String(s).trim().replace(' ', 'T');
  if (!/[zZ]|[+-]\d\d:?\d\d$/.test(t)) t += 'Z';
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/** Normalise either SWPC JSON table shape into an array of lower-cased-key objects. */
export function toRows(json) {
  if (!Array.isArray(json) || json.length === 0) return [];
  if (Array.isArray(json[0])) {
    const header = json[0].map((h) => String(h).toLowerCase());
    return json.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
  }
  return json.map((o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.toLowerCase(), v])));
}

function pick(row, ...keys) {
  for (const k of keys) if (row[k] !== undefined) return row[k];
  return undefined;
}

export function parseKpObserved(json) {
  return toRows(json)
    .map((r) => ({ time: parseTime(r.time_tag), kp: num(pick(r, 'kp', 'kp_index', 'estimated_kp')) }))
    .filter((r) => r.time && r.kp !== null);
}

export function parseKpForecast(json) {
  return toRows(json)
    .map((r) => ({
      time: parseTime(r.time_tag),
      kp: num(r.kp),
      kind: String(r.observed || 'predicted').toLowerCase(),
      scale: r.noaa_scale || null,
    }))
    .filter((r) => r.time && r.kp !== null);
}

export function parseKp1m(json) {
  return toRows(json)
    .map((r) => ({ time: parseTime(r.time_tag), kp: num(pick(r, 'estimated_kp', 'kp_index')) }))
    .filter((r) => r.time && r.kp !== null);
}

export function parsePlasma(json) {
  return toRows(json)
    .map((r) => ({
      time: parseTime(r.time_tag),
      density: num(r.density),
      speed: num(r.speed),
      temperature: num(r.temperature),
    }))
    .filter((r) => r.time);
}

export function parseMag(json) {
  return toRows(json)
    .map((r) => ({
      time: parseTime(r.time_tag),
      bx: num(pick(r, 'bx_gsm', 'bx')),
      by: num(pick(r, 'by_gsm', 'by')),
      bz: num(pick(r, 'bz_gsm', 'bz')),
      bt: num(r.bt),
    }))
    .filter((r) => r.time);
}

/** GOES long-channel (0.1–0.8 nm) X-ray flux, W/m². */
export function parseXray(json) {
  return toRows(json)
    .filter((r) => String(r.energy || '').startsWith('0.1-0.8'))
    .map((r) => ({ time: parseTime(r.time_tag), flux: num(r.flux) }))
    .filter((r) => r.time && r.flux !== null && r.flux > 0);
}

/** GOES integral protons ≥10 MeV, pfu. */
export function parseProtons(json) {
  return toRows(json)
    .filter((r) => String(r.energy || '').replace(/\s/g, '') === '>=10MeV')
    .map((r) => ({ time: parseTime(r.time_tag), flux: num(r.flux) }))
    .filter((r) => r.time && r.flux !== null && r.flux > 0);
}

export function flareClass(flux) {
  if (!flux || flux <= 0) return '–';
  const classes = [
    ['X', 1e-4],
    ['M', 1e-5],
    ['C', 1e-6],
    ['B', 1e-7],
    ['A', 1e-8],
  ];
  for (const [c, base] of classes) {
    if (flux >= base) return `${c}${(flux / base).toFixed(1)}`;
  }
  return `A${(flux / 1e-8).toFixed(1)}`;
}

export function rScaleFromFlux(flux) {
  if (flux >= 2e-3) return 5;
  if (flux >= 1e-3) return 4;
  if (flux >= 1e-4) return 3;
  if (flux >= 5e-5) return 2;
  if (flux >= 1e-5) return 1;
  return 0;
}

export function sScaleFromFlux(pfu) {
  if (pfu >= 1e5) return 5;
  if (pfu >= 1e4) return 4;
  if (pfu >= 1e3) return 3;
  if (pfu >= 1e2) return 2;
  if (pfu >= 10) return 1;
  return 0;
}

export function gScaleFromKp(kp) {
  if (kp >= 9) return 5;
  if (kp >= 8) return 4;
  if (kp >= 7) return 3;
  if (kp >= 6) return 2;
  if (kp >= 5) return 1;
  return 0;
}

/**
 * noaa-scales.json: keys "-1" (yesterday), "0" (now) and "1".."3" (forecast
 * for today and the next two days). Forecast days carry R/S probabilities.
 */
export function parseScales(json) {
  if (!json || typeof json !== 'object') return null;
  const entry = (e) =>
    e && {
      date: e.DateStamp,
      R: num(e.R?.Scale),
      S: num(e.S?.Scale),
      G: num(e.G?.Scale),
      rMinorProb: num(e.R?.MinorProb),
      rMajorProb: num(e.R?.MajorProb),
      sProb: num(e.S?.Prob),
      gText: e.G?.Text || null,
    };
  const days = ['1', '2', '3'].map((k) => entry(json[k])).filter(Boolean);
  return { current: entry(json['0']), yesterday: entry(json['-1']), days };
}

function utcDate(y, monIdx, d) {
  return new Date(Date.UTC(y, monIdx, d));
}

/** 27-day outlook: one row per day with F10.7, Ap and the largest expected Kp. */
export function parse27Day(text) {
  const out = [];
  const re = /^\s*(\d{4})\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)/;
  for (const line of String(text || '').split(/\r?\n/)) {
    if (line.startsWith('#') || line.startsWith(':')) continue;
    const m = line.match(re);
    if (!m) continue;
    const mon = MONTHS[m[2].toLowerCase()];
    if (mon === undefined) continue;
    out.push({
      date: utcDate(+m[1], mon, +m[3]),
      f107: +m[4],
      ap: +m[5],
      kpMax: +m[6],
    });
  }
  return out;
}

/** 45-day forecast: "04Nov26 012" tokens, first block Ap, second block F10.7. */
export function parse45Day(text) {
  const src = String(text || '');
  const split = src.search(/F10\.7/i);
  const apPart = split >= 0 ? src.slice(0, split) : src;
  const fluxPart = split >= 0 ? src.slice(split) : '';
  const tokens = (part) => {
    const out = [];
    const re = /(\d{2})([A-Za-z]{3})(\d{2})\s+(\d{1,3})/g;
    let m;
    while ((m = re.exec(part))) {
      const mon = MONTHS[m[2].toLowerCase()];
      if (mon === undefined) continue;
      out.push({ date: utcDate(2000 + +m[3], mon, +m[1]), value: +m[4] });
    }
    return out;
  };
  return {
    ap: tokens(apPart).map((t) => ({ date: t.date, ap: t.value })),
    f107: tokens(fluxPart).map((t) => ({ date: t.date, f107: t.value })),
  };
}

/** The "Issued:" line common to SWPC text products. */
export function parseIssued(text) {
  const m = String(text || '').match(/:Issued:\s*(\d{4})\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2})(\d{2})\s*UTC/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], MONTHS[m[2].toLowerCase()], +m[3], +m[4], +m[5]));
}

/**
 * Daily Ap → the Kp a day with that Ap typically peaks at. Uses the standard
 * Kp↔ap equivalence table; a day's peak Kp usually sits about one step above
 * the Kp equivalent of its daily average, which is added here.
 */
const KP_AP = [
  [0, 0], [1, 4], [2, 7], [3, 15], [4, 27], [5, 48], [6, 80], [7, 140], [8, 240], [9, 400],
];
export function apToKp(ap) {
  if (ap == null) return null;
  for (let i = 1; i < KP_AP.length; i++) {
    const [k1, a1] = KP_AP[i];
    const [k0, a0] = KP_AP[i - 1];
    if (ap <= a1) {
      const avg = k0 + ((ap - a0) / (a1 - a0)) * (k1 - k0);
      return Math.min(9, Math.round((avg + 1) * 3) / 3);
    }
  }
  return 9;
}

/**
 * OVATION aurora nowcast: [lon 0..359, lat -90..90, probability %] triples on
 * a 1° grid. Returns an accessor plus the raw grid for map rendering.
 */
export function parseOvation(json) {
  if (!json || !Array.isArray(json.coordinates)) return null;
  const grid = new Float32Array(360 * 181);
  for (const c of json.coordinates) {
    const lon = ((Math.round(c[0]) % 360) + 360) % 360;
    const lat = Math.round(c[1]) + 90;
    if (lat < 0 || lat > 180) continue;
    grid[lat * 360 + lon] = c[2];
  }
  const at = (latDeg, lonDeg) => {
    const lon = ((Math.round(lonDeg) % 360) + 360) % 360;
    const lat = Math.max(0, Math.min(180, Math.round(latDeg) + 90));
    return grid[lat * 360 + lon];
  };
  return {
    observed: parseTime(json['Observation Time']),
    forecast: parseTime(json['Forecast Time']),
    grid,
    at,
  };
}

/** SWPC animation frame lists: [{url:"/images/...", time_tag}] → absolute URLs. */
export function parseFrames(json, base = SWPC) {
  if (!Array.isArray(json)) return [];
  return json
    .map((f) => ({
      url: f.url?.startsWith('http') ? f.url : `${base}${f.url}`,
      time: parseTime(f.time_tag) || null,
    }))
    .filter((f) => f.url);
}

export function parseAlerts(json) {
  if (!Array.isArray(json)) return [];
  return json
    .map((a) => ({
      id: a.product_id,
      issued: parseTime(a.issue_datetime),
      message: String(a.message || '').replace(/\r\n/g, '\n'),
    }))
    .filter((a) => a.issued)
    .sort((a, b) => b.issued - a.issued);
}

/** Pull "Space Weather Message Code" / headline line from an alert body. */
export function alertHeadline(message) {
  const lines = message.split('\n').map((l) => l.trim());
  const idx = lines.findIndex((l) => /^(ALERT|WARNING|WATCH|SUMMARY|EXTENDED WARNING|CONTINUED ALERT|CANCEL)/i.test(l));
  return idx >= 0 ? lines[idx] : lines.find((l) => l.length > 10) || 'SWPC message';
}

/** TLE text (3-line sets) → [{name, l1, l2}]. */
export function parseTLE(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter(Boolean);
  const out = [];
  for (let i = 0; i + 2 < lines.length + 1; i++) {
    if (lines[i + 1]?.startsWith('1 ') && lines[i + 2]?.startsWith('2 ')) {
      out.push({ name: lines[i].trim(), l1: lines[i + 1], l2: lines[i + 2] });
      i += 2;
    }
  }
  return out;
}
