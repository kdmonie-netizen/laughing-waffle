// Local (lower-atmosphere) weather for the job site, as inputs to the two RTK
// grades. Sources are free and public domain: the NWS API (api.weather.gov)
// and the NOAA Storm Prediction Center's convective outlooks.
//
// What matters for RTK math (see docs/weather-and-gps.md):
//   - Rain itself does almost nothing to L-band signals (< 0.01 dB/km).
//   - Water vapor delays the signal (wet delay, up to ~0.4 m in a Gulf summer),
//     and it is not removed by dual-frequency. Uniform humidity mostly cancels
//     between reference and rover; GRADIENTS do the damage: storm cells,
//     sea-breeze fronts, squall lines and cold fronts. They show up first in HEIGHT.
//   - Network RTK interpolates between stations ~40-70 km apart, so anything
//     smaller than that (a thunderstorm cell, a sea-breeze front) is invisible to it.
//   - A short own base (≤5 km) shares most of the same air as the rover.
// So the inputs are: thunderstorm chance (the best free proxy for convective
// cells), front passage, the SPC outlook category, and moisture as a multiplier.

const HOUR = 3600000;

/** ISO-8601 duration ("PT1H", "P2DT18H", "P3D") → milliseconds. */
export function isoDurationMs(s) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(String(s || ''));
  if (!m) return null;
  return ((+m[1] || 0) * 24 + (+m[2] || 0)) * HOUR + (+m[3] || 0) * 60000;
}

/** One NWS gridpoint layer → Map(hourStartMs → value), expanding merged durations to hours. */
export function expandLayer(layer, convert = (v) => v) {
  const out = new Map();
  for (const v of layer?.values || []) {
    const [startS, durS] = String(v.validTime || '').split('/');
    const start = Date.parse(startS);
    const dur = isoDurationMs(durS);
    if (!Number.isFinite(start) || !dur) continue;
    const val = v.value == null ? null : convert(v.value);
    for (let t = Math.floor(start / HOUR) * HOUR; t < start + dur; t += HOUR) out.set(t, val);
  }
  return out;
}

const unitIs = (layer, re) => re.test(String(layer?.uom || ''));
function toC(layer) {
  return unitIs(layer, /degF/) ? (v) => ((v - 32) * 5) / 9 : (v) => v;
}
function toKmh(layer) {
  if (unitIs(layer, /m_s-1/)) return (v) => v * 3.6;
  if (unitIs(layer, /kt/)) return (v) => v * 1.852;
  return (v) => v;
}
function toHpa(layer) {
  if (unitIs(layer, /inHg/)) return (v) => v * 33.8639;
  if (unitIs(layer, /hPa|mbar/)) return (v) => v;
  // wmoUnit:Pa, or unlabeled: decide by size
  return (v) => (v > 2000 ? v / 100 : v > 200 ? v : v * 33.8639);
}

/** NWS coverage word → rough chance (%), per NWS forecast terminology. */
export function coverageToPct(c) {
  switch (String(c || '').toLowerCase()) {
    case 'slight_chance':
    case 'isolated':
      return 20;
    case 'chance':
    case 'scattered':
      return 40;
    case 'likely':
    case 'numerous':
    case 'occasional':
    case 'frequent':
    case 'periods':
      return 65;
    case 'definite':
    case 'widespread':
      return 85;
    default:
      return c ? 30 : null;
  }
}

/**
 * /points/{lat},{lon} → where the forecast grid and alerts live.
 */
export function parsePoints(json) {
  const p = json?.properties || {};
  if (!p.gridId || p.gridX == null || p.gridY == null) return null;
  return {
    gridId: p.gridId,
    gridX: p.gridX,
    gridY: p.gridY,
    gridUrl: p.forecastGridData || `https://api.weather.gov/gridpoints/${p.gridId}/${p.gridX},${p.gridY}`,
    timeZone: p.timeZone || null,
  };
}

/**
 * /gridpoints/{wfo}/{x},{y} raw layers → hourly records, sorted by time.
 * An empty layer means "unknown", never zero.
 */
export function parseGridpoint(json) {
  const p = json?.properties;
  if (!p) return null;
  const L = (k, conv) => expandLayer(p[k], conv);
  const temp = L('temperature', toC(p.temperature));
  const dew = L('dewpoint', toC(p.dewpoint));
  const rh = L('relativeHumidity');
  const wdir = L('windDirection');
  const wspd = L('windSpeed', toKmh(p.windSpeed));
  const pop = L('probabilityOfPrecipitation');
  const thunder = L('probabilityOfThunder');
  const qpf = L('quantitativePrecipitation');
  const pres = L('pressure', toHpa(p.pressure));
  // weather: an array of {coverage, weather, intensity} per period
  const wx = new Map();
  for (const v of p.weather?.values || []) {
    const [startS, durS] = String(v.validTime || '').split('/');
    const start = Date.parse(startS);
    const dur = isoDurationMs(durS);
    if (!Number.isFinite(start) || !dur) continue;
    const items = (Array.isArray(v.value) ? v.value : []).filter((x) => x && x.weather);
    for (let t = Math.floor(start / HOUR) * HOUR; t < start + dur; t += HOUR) wx.set(t, items);
  }
  const times = new Set([...temp.keys(), ...dew.keys(), ...pop.keys(), ...wx.keys(), ...thunder.keys()]);
  const hours = [...times]
    .sort((a, b) => a - b)
    .map((t) => {
      const items = wx.get(t) || [];
      const tsItems = items.filter((x) => /thunder/.test(String(x.weather)));
      const wxThunder = tsItems.length ? Math.max(...tsItems.map((x) => coverageToPct(x.coverage) ?? 30)) : null;
      const pThunder = thunder.has(t) ? thunder.get(t) : null;
      return {
        time: new Date(t),
        tempC: temp.get(t) ?? null,
        dewC: dew.get(t) ?? null,
        rh: rh.get(t) ?? null,
        windDir: wdir.get(t) ?? null,
        windKmh: wspd.get(t) ?? null,
        pop: pop.get(t) ?? null,
        qpfMm: qpf.get(t) ?? null,
        pressureHpa: pres.get(t) ?? null,
        // probabilityOfThunder is often empty; the weather coverage words are the fallback.
        thunderPct: pThunder != null ? Math.max(pThunder, wxThunder ?? 0) : wxThunder ?? (items.length || pop.has(t) ? 0 : null),
        thunderFrom: pThunder != null ? 'probabilityOfThunder' : wxThunder != null ? 'weather coverage' : null,
        weather: items.map((x) => [x.coverage, x.intensity, x.weather].filter(Boolean).join(' ').replace(/_/g, ' ')),
      };
    });
  return { updated: p.updateTime ? new Date(p.updateTime) : null, hours };
}

/** Smallest angle between two wind directions, degrees. */
const angleDiff = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/**
 * A front (or strong outflow / sea-breeze boundary) passing near hour t:
 * looks 3 h back and 3 h ahead for
 *   - dewpoint falling ≥ 4 °C in 3 h, or
 *   - pressure changing ≥ 3 hPa in 3 h, or
 *   - wind turning ≥ 90° in 3 h together with dewpoint falling ≥ 2 °C.
 * Thresholds are engineering judgment (see docs/weather-and-gps.md §7.2):
 * NGS, NRCan and OPUS-RS guidance all say to avoid frontal passages, but
 * none gives a number.
 */
export function frontNear(hours, t, span = 3) {
  const at = new Map(hours.map((h) => [+h.time, h]));
  let why = null;
  for (let s = t - span * HOUR; s <= t + span * HOUR - 3 * HOUR && !why; s += HOUR) {
    const a = at.get(s);
    const b = at.get(s + 3 * HOUR);
    if (!a || !b) continue;
    const dDew = a.dewC != null && b.dewC != null ? b.dewC - a.dewC : null;
    const dP = a.pressureHpa != null && b.pressureHpa != null ? b.pressureHpa - a.pressureHpa : null;
    const turn = a.windDir != null && b.windDir != null && (a.windKmh ?? 0) >= 5 && (b.windKmh ?? 0) >= 5 ? angleDiff(a.windDir, b.windDir) : null;
    if (dDew != null && dDew <= -4) why = `dewpoint falls ${Math.abs(dDew).toFixed(1)} °C in 3 h`;
    else if (dP != null && Math.abs(dP) >= 3) why = `pressure changes ${Math.abs(dP).toFixed(1)} hPa in 3 h`;
    else if (turn != null && turn >= 90 && dDew != null && dDew <= -2) why = `wind turns ${Math.round(turn)}° and dewpoint falls ${Math.abs(dDew).toFixed(1)} °C in 3 h`;
  }
  return why;
}

/** NWS active alerts for the point; keeps the ones that cut correction links (cell/power). */
export function parseAlerts(json) {
  return (json?.features || [])
    .map((f) => f.properties || {})
    .map((a) => ({
      event: a.event || '',
      headline: a.headline || a.event || '',
      onset: a.onset ? new Date(a.onset) : a.effective ? new Date(a.effective) : null,
      ends: a.ends ? new Date(a.ends) : a.expires ? new Date(a.expires) : null,
      severity: a.severity || '',
    }))
    .filter((a) => a.event);
}
export const LINK_ALERTS = /^(Hurricane Warning|Tropical Storm Warning|Storm Surge Warning|Extreme Wind Warning)$/i;

// SPC categorical outlook DN codes.
export const SPC_LABEL = { 2: 'General thunderstorms', 3: 'Marginal risk', 4: 'Slight risk', 5: 'Enhanced risk', 6: 'Moderate risk', 8: 'High risk' };

/** SPC "YYYYMMDDHHMM" (UTC) → Date. */
export function spcTime(s) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(String(s || ''));
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])) : null;
}

function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** GeoJSON Polygon/MultiPolygon contains (lon, lat)? Holes respected. */
export function pointInGeometry(geom, lon, lat) {
  if (!geom) return false;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  return polys.some((rings) => rings.length && inRing(lon, lat, rings[0]) && !rings.slice(1).some((h) => inRing(lon, lat, h)));
}

/** One SPC categorical GeoJSON → the highest category covering the site, with its valid window. */
export function spcAtSite(json, lat, lon) {
  let best = null;
  for (const f of json?.features || []) {
    const pr = f.properties || {};
    const dn = Number(pr.DN);
    if (!SPC_LABEL[dn]) continue;
    if (!pointInGeometry(f.geometry, lon, lat)) continue;
    if (!best || dn > best.dn) best = { dn, label: SPC_LABEL[dn], valid: spcTime(pr.VALID), expire: spcTime(pr.EXPIRE) };
  }
  if (best) return best;
  // Nothing covers the site: still report the outlook's window so "none" is a real answer.
  const pr = json?.features?.[0]?.properties;
  return pr ? { dn: 0, label: 'No thunder area', valid: spcTime(pr.VALID), expire: spcTime(pr.EXPIRE) } : null;
}

/**
 * Everything the grade needs, per hour.
 * @returns {{ok:boolean, hours:Array, alerts:Array, spc:Array, updated:Date|null}}
 */
export function buildLocalWeather({ grid = null, alerts = [], spc = [] } = {}) {
  const hours = grid?.hours || [];
  const at = (t) => {
    const h = hours.find((x) => +x.time === t) || null;
    const outlook = spc.filter((o) => o && o.valid && o.expire && t >= +o.valid && t < +o.expire).reduce((a, b) => (!a || b.dn > a.dn ? b : a), null);
    const linkAlert = alerts.find((a) => LINK_ALERTS.test(a.event) && (!a.onset || t + HOUR > +a.onset) && (!a.ends || t < +a.ends)) || null;
    return {
      thunderPct: h?.thunderPct ?? null,
      thunderFrom: h?.thunderFrom ?? null,
      dewC: h?.dewC ?? null,
      front: h ? frontNear(hours, t) : null,
      spc: outlook,
      linkAlert,
      known: !!h,
    };
  };
  return { ok: hours.length > 0, hours, alerts, spc, updated: grid?.updated || null, at };
}
