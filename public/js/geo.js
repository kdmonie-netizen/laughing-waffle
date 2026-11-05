// Small geophysics helpers: geomagnetic latitude, sun elevation, local solar time.

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// IGRF-14 (epoch 2025) centred-dipole north geomagnetic pole.
const POLE_LAT = 80.8 * D2R;
const POLE_LON = -72.8 * D2R;

/** Geomagnetic (dipole) latitude in degrees. */
export function geomagneticLatitude(latDeg, lonDeg) {
  const lat = latDeg * D2R;
  const lon = lonDeg * D2R;
  const s =
    Math.sin(lat) * Math.sin(POLE_LAT) +
    Math.cos(lat) * Math.cos(POLE_LAT) * Math.cos(lon - POLE_LON);
  return Math.asin(Math.max(-1, Math.min(1, s))) * R2D;
}

/** Sun elevation above the horizon in degrees (NOAA low-precision formula). */
export function solarElevation(date, latDeg, lonDeg) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * D2R;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * D2R;
  const eps = (23.439 - 0.0000004 * n) * D2R;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const lst = (gmst * 15 + lonDeg) * D2R;
  const ha = lst - ra;
  const lat = latDeg * D2R;
  const el = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha));
  return el * R2D;
}

/** Local mean solar time (hours 0–24) at a longitude. */
export function localSolarHour(date, lonDeg) {
  const utcH = date.getUTCHours() + date.getUTCMinutes() / 60;
  return (((utcH + lonDeg / 15) % 24) + 24) % 24;
}

export function latitudeBand(mlat) {
  const a = Math.abs(mlat);
  if (a >= 65) return 'polar / auroral';
  if (a >= 55) return 'sub-auroral';
  if (a >= 25) return 'mid-latitude';
  return 'equatorial / low-latitude';
}
