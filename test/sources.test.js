// Tests for the sources added in 1.2.0, on real samples saved 4 Nov 2026
// (test/fixtures/). See health.js for why the GPS outage file outranks the
// operational advisory.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as P from '../public/js/parsers.js';
import * as Hh from '../public/js/health.js';
import { buildSatrecs, visibleSatellites, geometryTimeline } from '../public/js/gnss.js';
import * as E from '../public/js/explain.js';
import * as H from './helpers.js';
import { fkGrade } from './readability.js';

const F = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');
const NOW = new Date('2026-11-04T22:00:00Z');
const sat = (constellation, name) => ({ constellation, name });

// ------------------------------------------------------------- GPS health
test('NAVCEN advisory: rows, sections, JDAY windows', () => {
  const oa = Hh.parseNavcenOA(F('navcen-opsadvisory.oa1'));
  assert.equal(oa.issued.toISOString(), '2026-11-04T00:00:00.000Z');
  const byNanu = Object.fromEntries(oa.notices.map((n) => [n.nanu, n]));
  assert.equal(byNanu['2026097'].section, 'forecasts');
  assert.equal(byNanu['2026097'].prn, 18);
  assert.equal(byNanu['2026097'].type, 'FCSTDV');
  assert.equal(byNanu['2026097'].start.toISOString(), '2026-10-29T21:00:00.000Z'); // JDAY 302
  assert.equal(byNanu['2026097'].stop.toISOString(), '2026-10-30T09:00:00.000Z');
  assert.equal(byNanu['2026048'].section, 'advisories');
  assert.equal(byNanu['2026048'].type, 'UNUSUFN');
  assert.equal(byNanu['2026048'].stop, null);
  assert.equal(byNanu['2014038'].prn, null); // GENERAL rows have no PRN
});

test('NAVCEN outage file: every outage with start and end', () => {
  const sof = Hh.parseSof(F('navcen-sof-2026.xml'));
  assert.equal(sof.created.toISOString(), '2026-10-30T03:06:00.000Z');
  assert.equal(sof.outages.length, 45);
  const prn11 = sof.outages.find((o) => o.ref === '2026049');
  assert.deepEqual([prn11.prn, prn11.type, prn11.start.toISOString(), prn11.end.toISOString()], [11, 'UNUSABLE', '2026-06-26T16:12:00.000Z', '2026-06-26T19:08:00.000Z']);
});

test('the stale "until further notice" lines do NOT take PRN 11 and 25 out today', () => {
  const h = Hh.buildHealth({ oa: Hh.parseNavcenOA(F('navcen-opsadvisory.oa1')), sof: Hh.parseSof(F('navcen-sof-2026.xml')) }, NOW);
  assert.equal(h.usable(sat('GPS', 'GPS BIII-5  (PRN 11)'), NOW), true);
  assert.equal(h.usable(sat('GPS', 'GPS BIIF-1  (PRN 25)'), NOW), true);
  assert.equal(h.usable(sat('GPS', 'GPS BIIF-8  (PRN 03)'), NOW), true); // FCSTEXTD, closed by FCSTSUMM 2026054
  assert.deepEqual(h.excludedNow.filter((e) => e.constellation === 'GPS'), []);
  // ...but the real outages still count at the time they happened.
  assert.equal(h.usable(sat('GPS', 'GPS BIII-5  (PRN 11)'), new Date('2026-06-26T17:00:00Z')), false);
  assert.equal(h.usable(sat('GPS', 'GPS BIII-2  (PRN 18)'), new Date('2026-10-30T01:00:00Z')), false);
  // PRN 18 came back at 03:04 (summary), before the forecast's 09:00.
  assert.equal(h.usable(sat('GPS', 'GPS BIII-2  (PRN 18)'), new Date('2026-10-30T05:00:00Z')), true);
});

test('without the outage file, advisory "until further notice" lines are shown, not applied', () => {
  const h = Hh.buildHealth({ oa: Hh.parseNavcenOA(F('navcen-opsadvisory.oa1')) }, NOW);
  assert.equal(h.usable(sat('GPS', 'GPS BIII-5  (PRN 11)'), NOW), true);
  assert.deepEqual(h.notes.map((n) => n.id).sort(), ['PRN 03', 'PRN 11', 'PRN 25']); // FCSTEXTD too
  assert.equal(h.known.GPSconfirmed, false);
});

test('an open outage with no later notice IS applied; a scheduled window applies only inside it', () => {
  const oa = Hh.parseNavcenOA(
    [
      '2. CURRENT ADVISORIES AND FORECASTS :',
      'A. FORECASTS:',
      '2026120       051200Z NOV 2026    07   FCSTMX       312/1400-312/2000',
      'B. ADVISORIES:',
      '2026121       061200Z NOV 2026    09   UNUSUFN      310/0300-/',
    ].join('\n'),
  );
  const sof = Hh.parseSof('<CREATION YEAR="2026" DOY="309" HR="00" MIN="00" SEC="00" /><HISTORICAL SVID="5" SVN="50" NAME="NANU" TYPE="FCSTSUMM" REFERENCE="2026001" START_YEAR="2026" START_DOY="010" START_HR="01" START_MIN="00" START_SEC="00" END_YEAR="2026" END_DOY="010" END_HR="02" END_MIN="00" END_SEC="00" />');
  const h = Hh.buildHealth({ oa, sof }, new Date('2026-11-07T00:00:00Z'));
  assert.equal(h.usable(sat('GPS', 'GPS BIIF-7  (PRN 09)'), new Date('2026-11-07T00:00:00Z')), false); // open, not closed
  assert.equal(h.usable(sat('GPS', 'GPS BIIRM-6 (PRN 07)'), new Date('2026-11-08T15:00:00Z')), false); // JDAY 312 = 8 Nov
  assert.equal(h.usable(sat('GPS', 'GPS BIIRM-6 (PRN 07)'), new Date('2026-11-08T21:00:00Z')), true);
  assert.deepEqual(h.scheduled.map((s) => s.id), ['PRN 07']);
  assert.deepEqual(h.excludedNow.map((s) => s.id), ['PRN 09']);
});

test('review fixes: FCSTEXTD applies until closed; an unrelated later outage does not cancel a window', () => {
  const at = new Date('2026-07-10T06:00:00Z');
  const oa = Hh.parseNavcenOA('A. FORECASTS:\n2026053       100507Z JUL 2026    03   FCSTEXTD     190/1800-/');
  const emptySof = Hh.parseSof('<CREATION YEAR="2026" DOY="191" HR="00" MIN="00" SEC="00" /><HISTORICAL SVID="5" SVN="50" NAME="NANU" TYPE="FCSTSUMM" REFERENCE="2026001" START_YEAR="2026" START_DOY="010" START_HR="01" START_MIN="00" START_SEC="00" END_YEAR="2026" END_DOY="010" END_HR="02" END_MIN="00" END_SEC="00" />');
  assert.equal(Hh.buildHealth({ oa, sof: emptySof }, at).usable(sat('GPS', 'GPS BIIF-8  (PRN 03)'), at), false);
  // Closed once the outage file has the later summary (the real 4 Nov state).
  const real = Hh.parseSof(F('navcen-sof-2026.xml'));
  const after = new Date('2026-07-11T00:00:00Z'); // the real outage ran 9 Jul 23:37 to 10 Jul 07:55
  assert.equal(Hh.buildHealth({ oa, sof: real }, after).usable(sat('GPS', 'GPS BIIF-8  (PRN 03)'), after), true);
  assert.equal(Hh.buildHealth({ oa, sof: real }, at).usable(sat('GPS', 'GPS BIIF-8  (PRN 03)'), at), false); // inside it
  // Maintenance next week; meanwhile an unrelated short outage gets a later NANU.
  const oa2 = Hh.parseNavcenOA('A. FORECASTS:\n2026120       051200Z NOV 2026    07   FCSTMX       312/1400-312/2000');
  const sof2 = Hh.parseSof('<HISTORICAL SVID="7" SVN="48" NAME="NANU" TYPE="UNUSABLE" REFERENCE="2026121" START_YEAR="2026" START_DOY="309" START_HR="01" START_MIN="00" START_SEC="00" END_YEAR="2026" END_DOY="309" END_HR="03" END_MIN="00" END_SEC="00" />');
  const h2 = Hh.buildHealth({ oa: oa2, sof: sof2 }, new Date('2026-11-06T00:00:00Z'));
  assert.equal(h2.usable(sat('GPS', 'GPS BIIRM-6 (PRN 07)'), new Date('2026-11-08T15:00:00Z')), false);
  assert.deepEqual(h2.scheduled.map((x) => x.id), ['PRN 07']);
  // ...but its own summary (overlapping, later) does close it.
  const sof3 = Hh.parseSof('<HISTORICAL SVID="7" SVN="48" NAME="NANU" TYPE="FCSTSUMM" REFERENCE="2026125" START_YEAR="2026" START_DOY="312" START_HR="14" START_MIN="05" START_SEC="00" END_YEAR="2026" END_DOY="312" END_HR="15" END_MIN="00" END_SEC="00" />');
  const h3 = Hh.buildHealth({ oa: oa2, sof: sof3 }, new Date('2026-11-09T00:00:00Z'));
  assert.equal(h3.usable(sat('GPS', 'GPS BIIRM-6 (PRN 07)'), new Date('2026-11-08T16:00:00Z')), true);
  assert.equal(h3.usable(sat('GPS', 'GPS BIIRM-6 (PRN 07)'), new Date('2026-11-08T14:30:00Z')), false);
});

test('a January notice about a late-December outage lands in the previous year', () => {
  const oa = Hh.parseNavcenOA('B. ADVISORIES:\n2027002       021200Z JAN 2027    12   UNUSABLE     365/2200-001/0400');
  assert.equal(oa.notices[0].start.toISOString(), '2026-12-31T22:00:00.000Z');
  assert.equal(oa.notices[0].stop.toISOString(), '2027-01-01T04:00:00.000Z');
});

test('a positive Dst jump is not called quiet', () => {
  assert.match(E.statKid('dst', 35), /blast of solar wind/);
  assert.match(E.statKid('dst', 5), /quiet/);
});

test('a December notice about a January outage lands in the next year', () => {
  const oa = Hh.parseNavcenOA('A. FORECASTS:\n2026150       281200Z DEC 2026    12   FCSTMX       003/1400-003/2000');
  assert.equal(oa.notices[0].start.toISOString(), '2027-01-03T14:00:00.000Z');
  const wrap = Hh.parseNavcenOA('A. FORECASTS:\n2026151       301200Z DEC 2026    12   FCSTMX       365/2200-001/0400');
  assert.equal(wrap.notices[0].stop.toISOString(), '2027-01-01T04:00:00.000Z');
});

// --------------------------------------------------------- Galileo health
test('Galileo GSC table: every satellite, and the four not usable', () => {
  const g = Hh.parseGalileoStatus(F('gsc-constellation-table.html'));
  assert.equal(g.length, 32);
  assert.deepEqual(g.filter((x) => x.status !== 'USABLE').map((x) => x.svid).sort(), ['E01', 'E14', 'E18', 'E22']);
  const h = Hh.buildHealth({ galileo: g }, NOW);
  assert.equal(h.usable(sat('Galileo', 'GSAT0201 (GALILEO 5)'), NOW), false);
  assert.equal(h.usable(sat('Galileo', 'GSAT0101 (GALILEO-PFM)'), NOW), true);
  assert.equal(h.usable(sat('GLONASS', 'COSMOS 2456 (747)'), NOW), true); // no feed: counts
});

test('health lists change PDOP: an excluded satellite leaves the sky and the timeline', () => {
  const sats = buildSatrecs({ GPS: H.syntheticGpsTLE(NOW) });
  const all = visibleSatellites(sats, NOW, 39.74, -104.99, 0, 10);
  assert.ok(all.length >= 5);
  const drop = all[0].name;
  const usable = (s) => s.name !== drop;
  const some = visibleSatellites(sats, NOW, 39.74, -104.99, 0, 10, usable);
  assert.equal(some.length, all.length - 1);
  const [a] = geometryTimeline(sats, NOW, 0, 10, 39.74, -104.99, 10);
  const [b] = geometryTimeline(sats, NOW, 0, 10, 39.74, -104.99, 10, usable);
  assert.equal(b.count, a.count - 1);
  assert.ok(b.pdop >= a.pdop);
});

// ------------------------------------------------------- other new feeds
test('Dst, model Kp and propagated wind parse oldest first', () => {
  const dst = P.parseDst(JSON.parse(F('kyoto-dst.json')));
  assert.deepEqual([dst.length, dst.at(-1).dst, dst.at(-1).time.toISOString()], [167, -11, '2026-11-04T21:00:00.000Z']);
  const kp = P.parseKpModel(JSON.parse(F('geospace_pred_est_kp_1_hour.json')));
  assert.ok(kp.length > 100 && kp.every((r, i) => i === 0 || r.time >= kp[i - 1].time));
  const pr = P.parsePropagated(JSON.parse(F('propagated-solar-wind-1-hour.json')));
  const last = pr.at(-1);
  assert.equal(last.time.toISOString(), '2026-11-04T22:17:00.000Z');
  assert.equal(last.arrival.toISOString(), '2026-11-04T23:13:45.000Z');
  assert.equal(last.bz, -2.09);
});

test('3-day predictions: mid-latitude odds and K', () => {
  const d = P.parseDaypre(F('3-day-solar-geomag-predictions.txt'));
  assert.deepEqual(d.dates.map((x) => x.toISOString().slice(0, 10)), ['2026-11-05', '2026-11-06', '2026-11-07']);
  assert.deepEqual(d.probMid, { active: [30, 30, 35], minor: [15, 20, 25], major: [1, 5, 5] });
  assert.deepEqual(d.midKMax, [3, 4, 5]);
  assert.equal(d.midK.length, 8);
});

test('CORS: 0–360° longitudes, distances, nearest first', () => {
  const c = P.parseCors(JSON.parse(F('cors-query.json')), 30.4213, -87.2169);
  assert.equal(c[0].site, 'N302');
  assert.equal(c[1].site, 'PCLA');
  assert.ok(Math.abs(c[1].km - 5.9) < 0.2, String(c[1].km));
  assert.ok(c.every((s) => s.lon < 0 && s.lon > -90)); // 272.8 → -87.2
  assert.ok(c.every((s, i) => i === 0 || s.km >= c[i - 1].km));
  assert.deepEqual(c[1].gnss, ['GLO', 'GPS']);
  const url = P.corsQueryUrl('https://x/FeatureServer/2', 30.42, -87.22);
  const where = new URL(url).searchParams.get('where');
  assert.match(where, /status='Operational'/);
  assert.match(where, /lon BETWEEN 271\.\d+ AND 274\.\d+/);
});

test('GloTEC: the grid cell nearest the site', () => {
  const g = JSON.parse(F('glotec-frame-cut.geojson'));
  const pns = P.glotecNearest(g, 30.4213, -87.2169);
  assert.deepEqual([pns.cellLat, pns.cellLon], [31.25, -87.5]);
  assert.equal(pns.time.toISOString(), '2026-11-04T21:55:00.000Z');
  assert.ok(pns.tec > 20 && pns.tec < 25);
  assert.ok(pns.anomaly < 0);
  assert.equal(P.glotecNearest({ features: [] }, 0, 0), null);
  // Across the date line: a site at 179.9° E picks the cell at -177.5°, not 177.5° away.
  const dl = { time_tag: '2026-11-04T00:00:00Z', features: [{ geometry: { coordinates: [-177.5, 0] }, properties: { tec: 1 } }, { geometry: { coordinates: [172.5, 0] }, properties: { tec: 2 } }] };
  assert.equal(P.glotecNearest(dl, 0, 179.9).tec, 1);
});

test('new Learn lines read below 7th grade', () => {
  const lines = [
    ...[null, { anomaly: 12 }, { anomaly: 5 }, { anomaly: -6 }, { anomaly: 0 }].map((v) => E.statKid('tec', v)),
    ...[-10, -40, -70, -150].map((v) => E.statKid('dst', v)),
    ...[2, 4.3, 6].map((v) => E.statKid('kpNext', v)),
  ];
  for (const t of lines) assert.ok(fkGrade(t) <= 7, `"${t}" is grade ${fkGrade(t).toFixed(1)}`);
  for (const k of ['health', 'cors', 'waas', 'glotecMap', 'wamipe']) assert.ok(E.SECTIONS[k], k);
  for (const k of ['waas', 'cors', 'dst']) assert.ok(E.GLOSSARY[k], k);
});
