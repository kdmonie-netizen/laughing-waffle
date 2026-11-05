// Regression tests for the fixes from KJM_GPS_Conditions_AUDIT_2026-11-05.md.
// Each test is the audit's own scenario (Pensacola, RTK / Survey, 6 am-6 pm
// Central). The audit's separate audit_tests/ folder lives on the office PC;
// these cover the same IDs so `npm test` can't go green with the bugs back.
process.env.TZ = 'America/Chicago';

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { gradeConditions } from '../public/js/grading.js';
import { DEFAULT_SETTINGS } from '../public/js/config.js';
import { apToKp } from '../public/js/parsers.js';
import { buildHealth } from '../public/js/health.js';
import { fetchText, staleFeeds, staleLimit } from '../public/js/fetch.js';
import * as E from '../public/js/explain.js';

const H = 3600000;
const PNS = { lat: 30.42, lon: -87.22, label: 'Pensacola, FL', profile: 'survey', workStart: 6, workEnd: 18, elevationMask: 10 };
const NOW = new Date('2026-11-05T16:00:00Z'); // 10 am Central

/** 3-hour Kp slots from 4 Nov 00Z to 8 Nov 24Z; fn(slotStart) gives each Kp. */
function slots(fn, { skip = () => false, now = NOW } = {}) {
  const out = [];
  for (let i = 0; i < 40; i++) {
    const t = new Date(Date.UTC(2026, 10, 4) + i * 3 * H);
    if (skip(t)) continue;
    out.push({ time: t, kp: fn(t), kind: t < now ? 'observed' : 'predicted' });
  }
  return out;
}
const run = (o = {}) => gradeConditions({ settings: PNS, now: NOW, kpForecast: slots(() => 2), ...o });
const today = (r, key = '2026-11-05') => r.days.find((d) => d.key === key);
const noonSlot = (t) => t.getUTCDate() === 5 && t.getUTCHours() === 18; // 12-3 pm Central

test('GPS-C1: one 3-hour G2 (Kp 6) in the work day is not a go, and no "perfect" best window', () => {
  const d = today(run({ kpForecast: slots((t) => (noonSlot(t) ? 6 : 2)) }));
  assert.ok(['D', 'F'].includes(d.grade), `day is ${d.grade} (${d.score})`);
  assert.equal(d.worstHour.grade, 'F');
  assert.equal(d.bestWindow.good, false);
  assert.equal(d.bestWindow.partial, true, 'the quiet morning is still shown as a usable stretch');
  for (const kp of [7, 8]) assert.equal(today(run({ kpForecast: slots((t) => (noonSlot(t) ? kp : 2)) })).grade, 'F');
});

test('GPS-C2: a storm that has started marks this hour and the next two, and the day', () => {
  const r = run({ realtime: { bz30: -20, speed: 750 } });
  const i = r.hours.indexOf(r.now);
  for (const h of r.hours.slice(i, i + 3)) assert.ok(['D', 'F'].includes(h.grade), `${h.time.toLocaleTimeString()} is ${h.grade}`);
  assert.ok(['D', 'F'].includes(today(r).grade), `day is ${today(r).grade}`);

  const kp8 = run({ realtime: { kpNow: 8 } });
  const j = kp8.hours.indexOf(kp8.now);
  for (const h of kp8.hours.slice(j, j + 3)) assert.equal(h.grade, 'F');
  assert.equal(today(kp8).grade, 'F');

  // A fresher, worse number on the hour it belongs to: Geospace model Kp and the propagated wind.
  const model = run({ realtime: { kpModel: [{ time: new Date(+NOW + 1.5 * H), kp: 7 }] } });
  assert.equal(model.hours.find((h) => +h.time === Math.floor((+NOW + 1.5 * H) / H) * H).grade, 'F');
  const prop = run({ realtime: { bz30: -2, propagated: [{ arrival: new Date(+NOW + 1.2 * H), bz: -25, speed: 650 }] } });
  const hit = prop.hours.find((h) => +h.time === Math.floor((+NOW + 1.2 * H) / H) * H);
  assert.ok(hit.factors.some((f) => f.key === 'bz' && /arriving/.test(f.label)), 'propagated Bz used on its arrival hour');

  // The tables no longer flatten: an extreme cloud scores worse than a strong one.
  const bz = (v) => run({ realtime: { bz30: v } }).now.factors.find((f) => f.key === 'bz').penalty;
  assert.ok(bz(-45) > bz(-30));
});

test('GPS-C3: a modelled CME arriving today changes today’s letter (direct hit, Kp 8)', () => {
  const r = run({ cmeArrivals: [{ arrival: new Date('2026-11-05T19:00:00Z'), glancing: false, kpEstimate: [6, 8] }] });
  assert.equal(today(r).grade, 'F');
  const k7 = run({ cmeArrivals: [{ arrival: new Date('2026-11-05T19:00:00Z'), glancing: false, kpEstimate: [7] }] });
  assert.ok(!['A', 'B', 'C'].includes(today(k7).grade));
});

test('GPS-H1: an all-day Kp 5 is not a go for RTK / Survey, but drone/nav keep their scale', () => {
  const d = today(run({ kpForecast: slots(() => 5) }));
  assert.ok(['D', 'F'].includes(d.grade), `day is ${d.grade} (${d.score})`);
  assert.ok(d.capReasons.some((c) => /storm level/.test(c)));
  const nav = today(run({ kpForecast: slots(() => 5), settings: { ...PNS, profile: 'nav' } }));
  assert.ok(nav.score > d.score && nav.capReasons.length === 0);
  const below = today(run({ kpForecast: slots(() => 4.67) }));
  assert.equal(below.capReasons.length, 0, 'Kp 4.67 (5-) is below G1');
});

test('GPS-H2: days 4-45 carry a trend and confidence, never an A-F go letter', () => {
  const r = run({ outlook27: Array.from({ length: 20 }, (_, i) => ({ date: new Date(Date.UTC(2026, 10, 5 + i)), f107: 140, ap: 5, kpMax: i === 9 ? 5 : 2 })) });
  assert.ok(r.extended.length > 10);
  for (const d of r.extended) {
    assert.equal(d.grade, undefined);
    assert.ok(!/go|excellent/i.test(d.trendLabel), d.trendLabel);
    assert.ok(['Medium', 'Low'].includes(d.confidence));
  }
  assert.equal(r.extended[0].trendLabel, 'Quiet trend');
  assert.equal(r.extended.find((d) => d.kpMax === 5).trendLabel, 'Storm possible');
});

test('GPS-H3: lower-48 K raises the hour; deep Dst or a big TEC anomaly rules out a go', () => {
  const midK = [{ time: new Date('2026-11-05T18:00:00Z'), k: 5 }];
  const d = today(run({ midLatK: midK }));
  assert.ok(['D', 'F'].includes(d.grade), `mid-lat K 5 → ${d.grade}`);
  assert.ok(d.hours.some((h) => /lower-48/.test(h.factors[0]?.label || '')));
  for (const rt of [{ dst: -120 }, { tecAnomaly: 12 }]) {
    const x = today(run({ realtime: rt }));
    assert.ok(!['A', 'B', 'C'].includes(x.grade), JSON.stringify(rt));
    assert.ok(x.capReasons.length, 'the card says which reading did it');
  }
  assert.equal(today(run({ realtime: { dst: -60, tecAnomaly: 6 } })).grade, 'A', 'moderate readings do not block');
});

test('GPS-H4: the app opens on Pensacola', () => {
  assert.equal(DEFAULT_SETTINGS.label, 'Pensacola, FL');
  assert.equal(DEFAULT_SETTINGS.lat, 30.42);
  assert.equal(DEFAULT_SETTINGS.lon, -87.22);
});

test('GPS-H5: a saved copy older than its limit is an error, not a successful update', async () => {
  const realFetch = globalThis.fetch;
  const realNow = Date.now;
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  try {
    let t = Date.UTC(2026, 10, 3, 12);
    Date.now = () => t;
    const ok = (body) => async () => ({ ok: true, status: 200, text: async () => body });
    const notFound = async () => ({ ok: false, status: 404, text: async () => '' });
    const url = 'https://services.swpc.noaa.gov/test/h5.json';
    globalThis.fetch = async (u) => (String(u).startsWith('api/health') ? { ok: false } : ok('[1]')());
    assert.equal(await fetchText(url, { persist: true }), '[1]');

    globalThis.fetch = async (u) => (String(u).startsWith('api/health') ? { ok: false } : notFound());
    t += 30 * 60000; // 30 min later: a young saved copy may stand in, and is reported
    assert.equal(await fetchText(url, { persist: true, force: true }), '[1]');
    assert.equal(staleFeeds().length, 1);

    t += 2 * 86400000; // two days later: too old to stand in
    await assert.rejects(fetchText(url, { persist: true, force: true }), /HTTP 404/);
    assert.ok(staleLimit(5 * 60000) <= 86400000);
  } finally {
    globalThis.fetch = realFetch;
    Date.now = realNow;
    delete globalThis.localStorage;
  }
});

test('GPS-H6: a failed CME download puts a warning on the grade card', () => {
  const r = run({ cmeCheck: 'unavailable' });
  assert.ok(r.warnings.some((w) => /CME check did not load/.test(w)));
  assert.ok(today(r).warnings.length, 'today carries the warning');
  assert.equal(run().warnings.length, 0);
});

test('GPS-M1: a glancing CME keeps the model’s highest Kp', () => {
  const r = run({ cmeArrivals: [{ arrival: new Date('2026-11-15T12:00:00Z'), glancing: true, kpEstimate: [6, 8] }], outlook27: Array.from({ length: 20 }, (_, i) => ({ date: new Date(Date.UTC(2026, 10, 5 + i)), f107: 140, ap: 5, kpMax: 2 })) });
  const d = r.extended.find((x) => x.key === '2026-11-15');
  assert.equal(d.kpMax, 8);
  assert.equal(d.cme.glancing, true);
});

test('GPS-M2: Learn lines match the numbers and the grade', () => {
  const k = E.factorKid({ key: 'kp', label: 'Kp 4.67 geomagnetic activity' });
  assert.match(k, /4\.7/);
  assert.match(k, /a little shaky/);
  assert.match(E.factorKid({ key: 'kp', label: 'Kp 6.6 geomagnetic activity' }), /6\.6/);
  const mid = E.statKid('mlat', 39.3);
  assert.match(mid, /middle/);
  assert.doesNotMatch(mid, /twinkle/);
  assert.doesNotMatch(E.statKid('aurora', 0), /good for gps/i);
  assert.doesNotMatch(E.GRADE_KID.C + E.GRADE_KID.D, /you can still go out|you can work/i);
});

test('GPS-M3: a sunlit evening hour past UTC midnight still gets today’s flare odds', () => {
  const now = new Date('2026-07-15T15:00:00Z'); // 10 am CDT
  const r = gradeConditions({
    settings: { ...PNS, workEnd: 21 },
    now,
    kpForecast: (() => {
      const out = [];
      for (let i = 0; i < 40; i++) out.push({ time: new Date(Date.UTC(2026, 6, 14) + i * 3 * H), kp: 2, kind: 'predicted' });
      return out;
    })(),
    scales: { days: [{ date: '2026-07-15', rMinorProb: 0, rMajorProb: 90, sProb: 0 }, { date: '2026-07-16', rMinorProb: 0, rMajorProb: 0, sProb: 0 }] },
  });
  const h = r.hours.find((x) => x.time.getDate() === 15 && x.time.getHours() === 19);
  assert.ok(h.sunlit, '7 pm CDT in July is still daylight');
  assert.ok(h.factors.some((f) => f.key === 'flare' && f.penalty > 20), 'flare odds applied');
});

test('GPS-M4: a hole in the Kp forecast during work hours is unknown, never an A', () => {
  const r = run({ kpForecast: slots(() => 2, { skip: noonSlot }) });
  const d = today(r);
  assert.ok(!['A', 'B', 'C'].includes(d.grade), `day is ${d.grade}`);
  assert.ok(d.flags.some((f) => /hole/.test(f)));
  assert.ok(d.hours.some((h) => h.missing && h.time.getHours() === 12), 'the noon hour is on the strip, marked missing');
});

test('GPS-M5: the health notes say GLONASS and BeiDou were not checked', () => {
  const h = buildHealth({});
  assert.ok(h.notes.some((n) => /GLONASS and BeiDou/.test(n.constellation) && /not checked/.test(n.why)));
});

test('GPS-L1: Ap-to-Kp uses the published Kp 7 / Kp 8 anchors', () => {
  assert.equal(apToKp(207), 9);
  assert.equal(apToKp(132), 8);
});
