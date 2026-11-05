// Local weather (NWS + SPC) and the two RTK grades (1.4.0).
process.env.TZ = 'America/Chicago';

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as Wx from '../public/js/weather.js';
import { gradeConditions, modeSettings } from '../public/js/grading.js';
import * as H from './helpers.js';
import * as WL from '../public/js/wxlearn.js';

const HOUR = 3600000;
const NOW = new Date('2026-07-15T15:00:00Z'); // 10 am CDT, summer
const PNS = { lat: 30.42, lon: -87.22, label: 'Pensacola, FL', profile: 'survey', workStart: 6, workEnd: 18, elevationMask: 10, baselineKm: 5, link: 'uhf' };
const startLocal = (() => {
  const d = new Date(NOW);
  d.setHours(0, 0, 0, 0);
  return +d;
})();
const at = (localHour, day = 0) => startLocal + (day * 24 + localHour) * HOUR;

function kp(fn = () => 2) {
  const out = [];
  for (let i = 0; i < 40; i++) {
    const t = new Date(Date.UTC(2026, 6, 14) + i * 3 * HOUR);
    out.push({ time: t, kp: fn(t), kind: t < NOW ? 'observed' : 'predicted' });
  }
  return out;
}
function lw(gridOpts = {}, { spc = [], alerts = [] } = {}) {
  return Wx.buildLocalWeather({ grid: Wx.parseGridpoint(H.nwsGridpoint(NOW, gridOpts)), alerts, spc });
}
const run = (o = {}) => gradeConditions({ settings: PNS, now: NOW, kpForecast: kp(), ...o });
const today = (r) => r.days[0];

// ------------------------------------------------------------- parsing
test('ISO durations and merged validTime ranges expand to hours', () => {
  assert.equal(Wx.isoDurationMs('PT1H'), HOUR);
  assert.equal(Wx.isoDurationMs('P2DT18H'), 66 * HOUR);
  assert.equal(Wx.isoDurationMs('P3D'), 72 * HOUR);
  const m = Wx.expandLayer({ values: [{ validTime: '2026-07-15T12:00:00+00:00/PT3H', value: 40 }] });
  assert.equal(m.size, 3);
  assert.equal(m.get(Date.parse('2026-07-15T14:00:00Z')), 40);
});

test('gridpoint parse: units, thunder fallback from weather coverage, empty layer means unknown', () => {
  const g = Wx.parseGridpoint(H.nwsGridpoint(NOW, { thunder: null, wx: (t) => (new Date(t).getHours() === 15 ? [{ coverage: 'likely', weather: 'thunderstorms', intensity: null }] : []) }));
  assert.ok(g.hours.length >= 160);
  const h15 = g.hours.find((h) => new Date(h.time).getHours() === 15);
  assert.equal(h15.thunderPct, 65);
  assert.equal(h15.thunderFrom, 'weather coverage');
  const h9 = g.hours.find((h) => new Date(h.time).getHours() === 9);
  assert.equal(h9.thunderPct, 0, 'no thunder in the coverage words and PoP known → 0');
  assert.equal(h9.pressureHpa, null, 'empty pressure layer stays unknown');
  const f = Wx.parseGridpoint({ properties: { temperature: { uom: 'wmoUnit:degF', values: [{ validTime: '2026-07-15T15:00:00+00:00/PT1H', value: 86 }] } } });
  assert.equal(Math.round(f.hours[0].tempC), 30);
});

test('front detection: a 4 °C dewpoint drop in 3 h, or a 3 hPa pressure jump', () => {
  const drop = at(14);
  const g = Wx.parseGridpoint(H.nwsGridpoint(NOW, { dewC: (t) => (t >= drop ? 17 : 22) }));
  assert.match(Wx.frontNear(g.hours, at(13)), /dewpoint falls 5\.0/);
  assert.equal(Wx.frontNear(g.hours, at(6)), null);
  const p = Wx.parseGridpoint(H.nwsGridpoint(NOW, { pressure: (t) => (t >= at(16) ? 101900 : 101500) }));
  assert.match(Wx.frontNear(p.hours, at(15)), /pressure changes 4\.0 hPa/);
});

test('SPC outlook: point-in-polygon picks the highest category over the site and its time window', () => {
  const o = Wx.spcAtSite(H.spcOutlook(NOW, 4), 30.42, -87.22);
  assert.equal(o.dn, 4);
  assert.equal(o.label, 'Slight risk');
  assert.equal(Wx.spcAtSite(H.spcOutlook(NOW, 4), 40, -100).dn, 0, 'outside every polygon');
  assert.equal(+Wx.spcTime('202607151200'), Date.UTC(2026, 6, 15, 12));
});

test('alerts: only link-cutting warnings are kept as such', () => {
  const a = Wx.parseAlerts({ features: [{ properties: { event: 'Tropical Storm Warning', onset: NOW.toISOString(), ends: new Date(+NOW + 2 * 86400000).toISOString() } }, { properties: { event: 'Heat Advisory' } }] });
  assert.equal(a.length, 2);
  assert.ok(Wx.LINK_ALERTS.test(a[0].event) && !Wx.LINK_ALERTS.test(a[1].event));
});

// ------------------------------------------------------------- grading
test('two grades are always returned, network and base/rover', () => {
  const r = run({ localWeather: lw() });
  assert.ok(r.hours.every((h) => h.modes.network && h.modes.base));
  assert.ok(today(r).modes.network.grade && today(r).modes.base.grade);
  assert.equal(today(r).grade, today(r).modes.network.grade, 'top-level fields are the network grade');
  assert.equal(today(r).modes.network.grade, 'A');
});

test('rain alone and humidity alone cost nothing', () => {
  const r = run({ localWeather: lw({ pop: () => 100, dewC: () => 25 }) });
  assert.equal(today(r).modes.network.grade, 'A');
  assert.ok(!today(r).hours.some((h) => h.factors.some((f) => f.kind === 'wx')));
});

test('afternoon thunderstorms: network held at D, short UHF base stays a go', () => {
  const r = run({ localWeather: lw({ thunder: (t) => (new Date(t).getHours() >= 13 && new Date(t).getHours() < 17 ? 60 : 0), dewC: () => 23 }) });
  const d = today(r);
  assert.ok(['D', 'F'].includes(d.modes.network.grade), `network ${d.modes.network.grade}`);
  assert.ok(d.modes.network.capReasons.some((c) => /Thunderstorms likely/.test(c)));
  assert.ok(['A', 'B', 'C'].includes(d.modes.base.grade), `base ${d.modes.base.grade}`);
  // A 15 km base sees more of the storm's air and is capped like the network.
  const long = run({ settings: { ...PNS, baselineKm: 15 }, localWeather: lw({ thunder: (t) => (new Date(t).getHours() >= 13 && new Date(t).getHours() < 17 ? 60 : 0), dewC: () => 23 }) });
  assert.ok(['D', 'F'].includes(today(long).modes.base.grade));
});

test('humid air makes the storm penalty 1.5 times bigger', () => {
  const pen = (dew) => run({ localWeather: lw({ thunder: () => 40, dewC: () => dew }) }).hours.find((h) => h.isNow).modes.network.factors.find((f) => f.key === 'thunder').penalty;
  assert.ok(Math.abs(pen(23) / pen(18) - 1.5) < 1e-9);
});

test('a front in the afternoon lowers the network more than a 5 km base', () => {
  const r = run({ localWeather: lw({ dewC: (t) => (t >= at(14) ? 15 : 21) }) });
  const h = r.hours.find((x) => x.time.getHours() === 14 && x.time.getDate() === 15);
  const n = h.modes.network.factors.find((f) => f.key === 'front').penalty;
  const b = h.modes.base.factors.find((f) => f.key === 'front').penalty;
  assert.ok(Math.abs(b / n - 0.5) < 1e-9);
  assert.ok(h.modes.network.score < h.modes.base.score);
});

test('SPC slight risk counts, but not on top of the thunder chance', () => {
  const spc = [Wx.spcAtSite(H.spcOutlook(NOW, 4), 30.42, -87.22)];
  const r = run({ localWeather: lw({ thunder: () => 20 }, { spc }) });
  const f = r.now.modes.network.factors.filter((x) => x.kind === 'wx');
  assert.equal(f.length, 1);
  assert.match(f[0].label, /SPC outlook: Slight risk/);
});

test('tropical storm warning: network F, base on UHF not held, base on cell held', () => {
  const alerts = Wx.parseAlerts({ features: [{ properties: { event: 'Tropical Storm Warning', onset: new Date(+NOW - HOUR).toISOString(), ends: new Date(+NOW + 2 * 86400000).toISOString() } }] });
  const r = run({ localWeather: lw({}, { alerts }) });
  assert.equal(today(r).modes.network.grade, 'F');
  assert.notEqual(today(r).modes.base.grade, 'F');
  const cell = run({ settings: { ...PNS, link: 'cell' }, localWeather: lw({}, { alerts }) });
  assert.equal(today(cell).modes.base.grade, 'F');
});

test('no NWS forecast: summer afternoons get the default sea-breeze penalty and a warning', () => {
  const r = run({ localWeather: Wx.buildLocalWeather({}) });
  assert.ok(r.warnings.some((w) => /Local weather \(NWS\) did not load/.test(w)));
  const h = r.hours.find((x) => x.time.getHours() === 14 && x.time.getDate() === 15);
  assert.ok(h.factors.some((f) => f.key === 'summer'));
  const morning = r.hours.find((x) => x.time.getHours() === 9 && x.time.getDate() === 15);
  assert.ok(!morning.factors.some((f) => f.key === 'summer'));
});

test('space weather: a 5 km base takes 60% of the ionosphere and holds a go at Kp 5', () => {
  const r = run({ kpForecast: kp(() => 5), localWeather: lw() });
  const d = today(r);
  assert.ok(['D', 'F'].includes(d.modes.network.grade));
  assert.ok(['A', 'B', 'C'].includes(d.modes.base.grade), `base ${d.modes.base.grade}`);
  const k6 = today(run({ kpForecast: kp(() => 6), localWeather: lw() }));
  assert.ok(['D', 'F'].includes(k6.modes.base.grade), 'Kp 6 holds the short base too');
  const h = r.hours.find((x) => x.isNow);
  const kn = h.modes.network.factors.find((f) => f.key === 'kp').penalty;
  const kb = h.modes.base.factors.find((f) => f.key === 'kp').penalty;
  assert.ok(Math.abs(kb / kn - 0.6) < 1e-9);
});

test('baseline length: >10 km costs points, >20 km is never better than C', () => {
  const m = modeSettings({ baselineKm: 25 });
  assert.equal(m.base.iono, 1.2);
  assert.equal(m.base.wx, 1.25);
  const d = today(run({ settings: { ...PNS, baselineKm: 25 }, localWeather: lw() }));
  assert.ok(!['A', 'B'].includes(d.modes.base.grade));
  assert.ok(d.modes.base.capReasons.some((c) => /past the usual 10-20 km/.test(c)));
});

test('weather learning area: no safety topics slipped in', () => {
  const all = JSON.stringify(WL).toLowerCase();
  for (const w of ['lightning', 'osha', 'heat index', 'part 107', 'shelter']) assert.ok(!all.includes(w), w);
});
