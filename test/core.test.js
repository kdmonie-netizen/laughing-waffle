import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as P from '../public/js/parsers.js';
import { gradeConditions, interp, TABLES } from '../public/js/grading.js';
import { geomagneticLatitude, solarElevation } from '../public/js/geo.js';
import { buildSatrecs, visibleSatellites, dop, geometryTimeline } from '../public/js/gnss.js';
import { shue, dynamicPressure, l1TravelMinutes } from '../public/js/sims/magnetosphere.js';
import { dbmArrival, enlilEarthArrivals } from '../public/js/sims/cme.js';
import * as H from './helpers.js';

const NOW = new Date('2026-11-04T15:00:00Z');
const DENVER = { lat: 39.74, lon: -104.99, label: 'Denver', profile: 'survey', workStart: 0, workEnd: 24, elevationMask: 10 };

// ---------------------------------------------------------------- parsers
test('toRows accepts both SWPC JSON shapes', () => {
  const arrays = [['time_tag', 'Kp'], ['2026-11-04 00:00:00.000', '2.33']];
  const objects = [{ time_tag: '2026-11-04T00:00:00', Kp: 2.33 }];
  const a = P.parseKpObserved(arrays);
  const o = P.parseKpObserved(objects);
  assert.equal(a.length, 1);
  assert.equal(a[0].kp, 2.33);
  assert.equal(o[0].kp, 2.33);
  assert.equal(a[0].time.toISOString(), '2026-11-04T00:00:00.000Z');
  assert.equal(+a[0].time, +o[0].time);
});

test('parseKpForecast keeps observed/estimated/predicted kinds', () => {
  const rows = P.parseKpForecast(H.kpForecastArrays(NOW, [1, 2, 3, 4, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]));
  const kinds = new Set(rows.map((r) => r.kind));
  assert.ok(kinds.has('observed') && kinds.has('predicted'));
  assert.equal(rows[4].scale, 'G1');
});

test('parseScales maps forecast days and probabilities', () => {
  const s = P.parseScales(H.scalesJSON(NOW, { rMinor: [35, 30, 25], rMajor: [10, 5, 5], sProb: [5, 1, 1], g: [1, 0, 0] }));
  assert.equal(s.days.length, 3);
  assert.equal(s.days[0].date, '2026-11-04');
  assert.equal(s.days[0].rMinorProb, 35);
  assert.equal(s.days[0].rMajorProb, 10);
  assert.equal(s.days[0].G, 1);
});

test('parse27Day reads date, flux, Ap and largest Kp', () => {
  const rows = P.parse27Day(H.outlook27Text(NOW, [[135, 12, 4], [140, 8, 3], [150, 25, 5]]));
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[2], { date: new Date('2026-11-06T00:00:00Z'), f107: 150, ap: 25, kpMax: 5 });
});

test('parse45Day splits Ap and F10.7 blocks', () => {
  const aps = Array.from({ length: 45 }, (_, i) => 5 + (i % 7));
  const fl = Array.from({ length: 45 }, (_, i) => 130 + i);
  const r = P.parse45Day(H.ap45Text(NOW, aps, fl));
  assert.equal(r.ap.length, 45);
  assert.equal(r.f107.length, 45);
  assert.equal(r.ap[0].ap, 5);
  assert.equal(r.f107[44].f107, 174);
  assert.equal(r.ap[44].date.toISOString().slice(0, 10), '2026-12-18');
});

// Real NOAA samples saved 4 Nov 2026 (test/fixtures/). The solar wind files
// list SOLAR1 (active) and ACE (inactive) side by side, newest first.
const fixture = async (name) => {
  const { readFile } = await import('node:fs/promises');
  const text = await readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
  return name.endsWith('.json') ? JSON.parse(text) : text;
};

test('parsePlasma reads the real-time wind file: active spacecraft only, oldest first', async () => {
  const rows = P.parsePlasma(await fixture('rtsw_wind_1m.json'));
  assert.deepEqual(rows.map((r) => r.speed), [374.3, 371.6, 372.7, 374.1, 375.7]); // SOLAR1 only
  assert.equal(rows.at(-1).time.toISOString(), '2026-11-04T21:33:00.000Z'); // 21:34 has only an inactive ACE row
  assert.equal(rows.at(-1).density, 1.48);
  assert.ok(rows.every((r, i) => i === 0 || r.time > rows[i - 1].time));
});

test('parseMag reads the real-time magnetometer file: active spacecraft only, oldest first', async () => {
  const rows = P.parseMag(await fixture('rtsw_mag_1m.json'));
  assert.deepEqual(rows.map((r) => r.bz), [-1.41, -1.27, -0.91, -1.16, -0.89, -0.47]); // not ACE's −2.3…−2.9
  assert.equal(rows.at(-1).bt, 2.86);
  assert.equal(rows.at(-1).time.toISOString(), '2026-11-04T21:35:00.000Z');
});

test('real-time files: inactive decoys never leak in, and files without the flag still work', () => {
  const w = P.parsePlasma(H.rtswWind(NOW, { speed: 700 }, 60));
  const m = P.parseMag(H.rtswMag(NOW, { bz: -12 }, 60));
  assert.equal(w.length, 61);
  assert.equal(m.length, 61);
  assert.ok(w.every((r) => r.speed < 1000 && r.density < 100), 'ACE decoy speed leaked in');
  assert.ok(m.every((r) => r.bz > -20 && r.bt < 50), 'ACE decoy Bz leaked in');
  assert.equal(+w.at(-1).time, +NOW);
  // Old SWPC table shape (no `active` field) still parses.
  assert.equal(P.parsePlasma(H.plasmaArrays(NOW, {}, 10)).length, 11);
  assert.equal(P.parseMag(H.magArrays(NOW, {}, 10)).length, 11);
});

test('parse45Day reads NOAA’s 45-day JSON and its new text file the same way', async () => {
  const j = P.parse45Day(await fixture('45-day-forecast.json'));
  const t = P.parse45Day(await fixture('45-day-forecast.txt'));
  for (const r of [j, t]) {
    assert.equal(r.ap.length, 45);
    assert.equal(r.f107.length, 45);
    assert.equal(r.ap[0].date.toISOString(), '2026-11-04T00:00:00.000Z');
    assert.equal(r.ap[0].ap, 5);
    assert.equal(r.ap[23].ap, 30); // 27 Nov
    assert.equal(r.f107[0].f107, 100);
    assert.equal(r.f107[44].f107, 80);
  }
  assert.deepEqual(j.ap.map((x) => x.ap), t.ap.map((x) => x.ap));
  assert.deepEqual(j.f107.map((x) => x.f107), t.f107.map((x) => x.f107));
});

test('parseIssued reads the SWPC issue stamp', () => {
  assert.equal(P.parseIssued(':Issued: 2026 Nov 03 2105 UTC').toISOString(), '2026-11-03T21:05:00.000Z');
});

test('flare class and NOAA scale helpers', () => {
  assert.equal(P.flareClass(2.3e-5), 'M2.3');
  assert.equal(P.flareClass(1.2e-4), 'X1.2');
  assert.equal(P.flareClass(4e-7), 'B4.0');
  assert.equal(P.rScaleFromFlux(5e-5), 2);
  assert.equal(P.rScaleFromFlux(1e-4), 3);
  assert.equal(P.sScaleFromFlux(12), 1);
  assert.equal(P.gScaleFromKp(6.33), 2);
});

test('apToKp maps quiet and storm Ap sensibly', () => {
  assert.ok(P.apToKp(5) >= 1.5 && P.apToKp(5) <= 3);
  assert.ok(P.apToKp(48) >= 5.5);
  assert.equal(P.apToKp(400), 9);
});

test('parseOvation indexes the 1° grid by lat/lon', () => {
  const coords = [];
  for (let lon = 0; lon < 360; lon++) for (let lat = -90; lat <= 90; lat++) coords.push([lon, lat, lat === 50 && lon === 255 ? 42 : 0]);
  const o = P.parseOvation({ 'Observation Time': '2026-11-04T14:50:00Z', 'Forecast Time': '2026-11-04T15:30:00Z', coordinates: coords });
  assert.equal(o.at(50, -105), 42); // -105 E == 255 E
  assert.equal(o.at(10, 0), 0);
});

test('parseTLE splits 3-line element sets', () => {
  const sets = P.parseTLE(H.syntheticGpsTLE(NOW));
  assert.equal(sets.length, 30);
  assert.match(sets[0].name, /PRN 01/);
});

// ------------------------------------------------------------------- geo
test('geomagnetic latitude is plausible for known places', () => {
  const denver = geomagneticLatitude(39.74, -104.99);
  const fairbanks = geomagneticLatitude(64.84, -147.72);
  const quito = geomagneticLatitude(-0.18, -78.47);
  assert.ok(denver > 45 && denver < 52, `Denver ${denver}`);
  assert.ok(fairbanks > 63, `Fairbanks ${fairbanks}`);
  assert.ok(Math.abs(quito) < 15, `Quito ${quito}`);
});

test('sun elevation: high at local noon, below horizon at midnight', () => {
  // Denver solar noon ≈ 19:00 UTC in November
  assert.ok(solarElevation(new Date('2026-11-04T19:00:00Z'), 39.74, -104.99) > 25);
  assert.ok(solarElevation(new Date('2026-11-05T07:00:00Z'), 39.74, -104.99) < -30);
});

// ------------------------------------------------------------------ gnss
test('SGP4 geometry on a GPS-like constellation gives realistic sats/PDOP', () => {
  const sats = buildSatrecs({ GPS: H.syntheticGpsTLE(NOW) });
  assert.equal(sats.length, 30);
  const vis = visibleSatellites(sats, NOW, DENVER.lat, DENVER.lon, 0, 10);
  assert.ok(vis.length >= 5 && vis.length <= 14, `visible ${vis.length}`);
  const d = dop(vis);
  assert.ok(d.pdop > 1 && d.pdop < 6, `PDOP ${d.pdop}`);
  const tl = geometryTimeline(sats, NOW, 2, 30, DENVER.lat, DENVER.lon, 10);
  assert.equal(tl.length, 5);
});

test('DOP: fewer than 4 satellites is unusable', () => {
  assert.equal(dop([{ az: 0, el: 45 }, { az: 90, el: 45 }, { az: 180, el: 45 }]).pdop, Infinity);
});

// --------------------------------------------------------------- grading
function scenario({ kp = 1.67, rt = {}, scales = {}, settings = DENVER, geometry = [] } = {}) {
  const kps = Array(48).fill(kp);
  return gradeConditions({
    settings,
    kpForecast: P.parseKpForecast(H.kpForecastArrays(NOW, kps)),
    scales: P.parseScales(H.scalesJSON(NOW, scales)),
    realtime: rt,
    geometry,
    outlook27: P.parse27Day(H.outlook27Text(NOW, Array.from({ length: 27 }, (_, i) => [140, 6, i === 10 ? 6 : 2]))),
    outlook45: P.parse45Day(H.ap45Text(NOW, Array(45).fill(5), Array(45).fill(140))),
    now: NOW,
  });
}

test('quiet day grades A', () => {
  const r = scenario();
  assert.equal(r.days[0].grade, 'A');
  assert.ok(r.hours.length >= 24);
  assert.ok(r.extended.length > 20, 'extended outlook covers 27- and 45-day ranges');
});

test('Kp 7 storm grades F for survey work, better for plain navigation', () => {
  const storm = scenario({ kp: 7 });
  assert.equal(storm.days[0].grade, 'F');
  const nav = scenario({ kp: 7, settings: { ...DENVER, profile: 'nav' } });
  assert.ok(nav.days[0].score > storm.days[0].score);
});

test('storm penalty is larger at high magnetic latitude than near the equator', () => {
  const fairbanks = scenario({ kp: 5, settings: { ...DENVER, lat: 64.84, lon: -147.72 } });
  const quito = scenario({ kp: 5, settings: { ...DENVER, lat: -0.18, lon: -78.47 } });
  const kpPen = (r) => r.hours[0].factors.find((f) => f.key === 'kp').penalty;
  assert.ok(kpPen(fairbanks) > kpPen(quito));
});

test('a storm onset (southward Bz, fast wind, aurora) marks this hour and the next two, not later ones', () => {
  const r = scenario({ rt: { bz30: -18, speed: 750, aurora: 35 } });
  assert.ok(r.now, 'current hour present');
  const keys = r.now.factors.map((f) => f.key);
  assert.ok(keys.includes('bz') && keys.includes('aurora') && keys.includes('speed'));
  const i = r.hours.indexOf(r.now);
  for (const h of r.hours.slice(i + 1, i + 3)) assert.ok(h.factors.some((f) => f.key === 'bz'), `${h.time} should carry the onset`);
  assert.ok(!r.hours[i + 3].factors.some((f) => f.key === 'bz'), 'three hours on, the live reading no longer applies');
  assert.ok(!r.hours[0].factors.some((f) => f.key === 'bz'), 'past hours are not charged');
});

test('a 3-hour Kp 6 storm inside the work day makes the day an F, not a go', () => {
  const kps = Array(48).fill(2);
  kps[16 + 6] = 6; // one slot in the middle of today
  const r = gradeConditions({ settings: { ...DENVER, workStart: 0, workEnd: 24 }, kpForecast: P.parseKpForecast(H.kpForecastArrays(NOW, kps)), now: NOW });
  const day = r.days.find((d) => d.hours.some((h) => h.kp === 6));
  assert.equal(day.grade, 'F');
  assert.equal(day.bestWindow.good, false, 'the quiet hours are a usable stretch, not a "best window" for the day');
});

test('flare odds only penalise sunlit hours', () => {
  const r = scenario({ scales: { rMinor: [60, 60, 60], rMajor: [40, 40, 40] } });
  const day = r.hours.find((h) => h.sunlit);
  const night = r.hours.find((h) => !h.sunlit);
  assert.ok(day.factors.some((f) => f.key === 'flare'));
  assert.ok(!night.factors.some((f) => f.key === 'flare'));
});

test('bad geometry (PDOP 8) lowers the grade', () => {
  const t0 = new Date(NOW);
  t0.setHours(0, 0, 0, 0);
  const geometry = Array.from({ length: 72 * 6 }, (_, i) => ({ time: new Date(+t0 + i * 600000), pdop: 8, count: 6 }));
  const r = scenario({ geometry });
  assert.ok(r.days[0].score < 80);
});

test('interp clamps and interpolates', () => {
  assert.equal(interp(TABLES.kp, 4.5), 21);
  assert.equal(interp(TABLES.kp, -1), 0);
  assert.equal(interp(TABLES.kp, 12), 95);
});

// ---------------------------------------------------------- simulations
test('Shue magnetopause: ~10–11 Re in nominal wind, compressed in a storm', () => {
  const nominal = shue(0, dynamicPressure(5, 400)).r0;
  const storm = shue(-25, dynamicPressure(40, 900)).r0;
  assert.ok(nominal > 9.5 && nominal < 11.5, `nominal ${nominal}`);
  assert.ok(storm < 6.6, `storm ${storm}`);
});

test('L1 travel time at 400 km/s is about an hour', () => {
  assert.ok(Math.abs(l1TravelMinutes(400) - 62.5) < 0.1);
});

test('DBM: with v0 = w the CME coasts; fast CMEs decelerate', () => {
  const coast = dbmArrival({ v0: 400, w: 400, gamma: 0.2e-7 });
  const expectH = (149597870.7 - 21.5 * 695700) / 400 / 3600;
  assert.ok(Math.abs(coast.hours - expectH) < 0.05);
  const fast = dbmArrival({ v0: 1500, w: 400, gamma: 0.2e-7 });
  assert.ok(fast.hours > 30 && fast.hours < 60, `fast ${fast.hours}`);
  assert.ok(fast.speed < 1500 && fast.speed > 400);
});

test('enlilEarthArrivals keeps Earth impacts only', () => {
  const sims = [
    { simulationID: 'a', estimatedShockArrivalTime: '2026-11-06T10:00Z', isEarthGB: false, kp_90: 6, kp_180: 7, cmeInputs: [{ speed: 900 }] },
    { simulationID: 'b', estimatedShockArrivalTime: null, impactList: [{ location: 'Mars', arrivalTime: '2026-11-08T00:00Z' }] },
  ];
  const r = enlilEarthArrivals(sims);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].kpEstimate, [6, 7]);
});
