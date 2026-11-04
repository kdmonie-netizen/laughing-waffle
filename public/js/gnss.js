// GNSS geometry: propagate CelesTrak element sets with SGP4 (satellite.js)
// and compute satellites-in-view and dilution of precision for a location.

import * as satellite from '../vendor/satellite.es.js';
import { parseTLE } from './parsers.js';

const D2R = Math.PI / 180;

export function buildSatrecs(tleTextByConstellation) {
  const sats = [];
  for (const [constellation, text] of Object.entries(tleTextByConstellation)) {
    if (!text) continue;
    for (const t of parseTLE(text)) {
      try {
        const satrec = satellite.twoline2satrec(t.l1, t.l2);
        if (satrec.error) continue;
        sats.push({ name: t.name, constellation, satrec });
      } catch {
        /* skip malformed set */
      }
    }
  }
  return sats;
}

/**
 * Look angles (deg) for every satellite above the mask at `date`.
 * `usable(sat, date)` (optional) leaves out satellites the operators have
 * declared unusable at that time (see health.js).
 */
export function visibleSatellites(sats, date, lat, lon, heightKm = 0, maskDeg = 10, usable = null) {
  const observer = { latitude: lat * D2R, longitude: lon * D2R, height: heightKm };
  const gmst = satellite.gstime(date);
  const out = [];
  for (const s of sats) {
    if (usable && !usable(s, date)) continue;
    const pv = satellite.propagate(s.satrec, date);
    if (!pv || !pv.position) continue;
    const ecf = satellite.eciToEcf(pv.position, gmst);
    const look = satellite.ecfToLookAngles(observer, ecf);
    const el = look.elevation / D2R;
    if (el >= maskDeg) {
      out.push({
        name: s.name,
        constellation: s.constellation,
        az: ((look.azimuth / D2R) + 360) % 360,
        el,
      });
    }
  }
  return out;
}

function invert4(m) {
  // Gauss–Jordan on a 4×4 matrix (array of rows). Returns null if singular.
  const n = 4;
  const a = m.map((row, i) => [...row, ...[0, 0, 0, 0].map((_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-12) return null;
    [a[c], a[p]] = [a[p], a[c]];
    const div = a[c][c];
    for (let j = 0; j < 2 * n; j++) a[c][j] /= div;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = a[r][c];
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[c][j];
    }
  }
  return a.map((row) => row.slice(n));
}

/**
 * DOP from az/el (deg). Multi-constellation receivers solve one clock offset
 * per system; using a single clock term here keeps the numbers comparable
 * to planning tools and is slightly optimistic for mixed solutions.
 */
export function dop(visible) {
  if (visible.length < 4) return { pdop: Infinity, hdop: Infinity, vdop: Infinity, gdop: Infinity };
  const N = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  for (const s of visible) {
    const el = s.el * D2R;
    const az = s.az * D2R;
    const g = [-Math.cos(el) * Math.sin(az), -Math.cos(el) * Math.cos(az), -Math.sin(el), 1];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) N[i][j] += g[i] * g[j];
  }
  const Q = invert4(N);
  if (!Q) return { pdop: Infinity, hdop: Infinity, vdop: Infinity, gdop: Infinity };
  return {
    pdop: Math.sqrt(Q[0][0] + Q[1][1] + Q[2][2]),
    hdop: Math.sqrt(Q[0][0] + Q[1][1]),
    vdop: Math.sqrt(Q[2][2]),
    gdop: Math.sqrt(Q[0][0] + Q[1][1] + Q[2][2] + Q[3][3]),
  };
}

/** Sampled sats-in-view / PDOP series from `start` for `hours`. */
export function geometryTimeline(sats, start, hours, stepMin, lat, lon, maskDeg, usable = null) {
  const out = [];
  const steps = Math.floor((hours * 60) / stepMin);
  for (let i = 0; i <= steps; i++) {
    const t = new Date(start.getTime() + i * stepMin * 60000);
    const vis = visibleSatellites(sats, t, lat, lon, 0, maskDeg, usable);
    const d = dop(vis);
    const byConst = {};
    for (const v of vis) byConst[v.constellation] = (byConst[v.constellation] || 0) + 1;
    out.push({ time: t, count: vis.length, byConst, ...d });
  }
  return out;
}
