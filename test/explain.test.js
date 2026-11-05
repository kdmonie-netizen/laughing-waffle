import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as E from '../public/js/explain.js';
import { fkGrade } from './readability.js';

const strip = (s) => s.replace(/<[^>]+>/g, '');

test('learn-mode text reads at about a 5th-grade level overall', () => {
  const all = E.allText().join(' ');
  const g = fkGrade(all);
  console.log(`  Flesch-Kincaid grade, all learn text: ${g.toFixed(1)}`);
  assert.ok(g <= 5.5, `overall grade ${g.toFixed(1)} is above 5.5`);
});

test('no single explanation reads above 7th grade', () => {
  const worst = E.allText()
    .map((t) => ({ t, g: fkGrade(t) }))
    .sort((a, b) => b.g - a.g);
  for (const w of worst.slice(0, 3)) console.log(`  ${w.g.toFixed(1)}  ${w.t.slice(0, 70)}…`);
  assert.ok(worst[0].g <= 7, `"${worst[0].t.slice(0, 60)}…" is grade ${worst[0].g.toFixed(1)}`);
});

test('the live "right now", hour and day lines also read below 7th grade', () => {
  const lines = [
    ...[0.7, 3.3, 4.3, 5.7, 8].map((v) => E.statKid('kp', v)),
    ...[2, -6, -15].map((v) => E.statKid('bz', v)),
    ...[380, 600, 820].map((v) => E.statKid('speed', v)),
    ...[3e-7, 2e-5, 3e-4].map((v) => E.statKid('xray', v)),
    ...[0.3, 25].map((v) => E.statKid('protons', v)),
    ...[1, 12, 45].map((v) => E.statKid('aurora', v)),
    ...[{ count: 11, pdop: 1.6 }, { count: 8, pdop: 3.1 }, { count: 6, pdop: 5.4 }].map((v) => E.statKid('sats', v)),
    ...[65, 48, 20].map((v) => E.statKid('mlat', v)),
    ...'ABCDF'.split('').map((g) => E.dayKid({ grade: g })),
    E.hourKid({ grade: 'D', factors: [{ key: 'kp', label: 'Kp 5.3 geomagnetic activity', penalty: 30 }] }),
    E.hourKid({ grade: 'A', factors: [] }),
    ...['kp', 'flare', 'flareNow', 'proton', 'protonNow', 'scint', 'bz', 'speed', 'aurora', 'pdop', 'flux'].map((key) =>
      E.factorKid({ key, label: key === 'kp' ? 'Kp 6.0 geomagnetic activity' : 'x 5' }),
    ),
  ].map(strip);
  const worst = lines.map((t) => ({ t, g: fkGrade(t) })).sort((a, b) => b.g - a.g)[0];
  console.log(`  worst live line: ${worst.g.toFixed(1)}  ${worst.t.slice(0, 70)}`);
  assert.ok(worst.g <= 7, `"${worst.t}" is grade ${worst.g.toFixed(1)}`);
});

test('every explanation box on the page has text', async () => {
  const { readFile } = await import('node:fs/promises');
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const topics = [...html.matchAll(/class="learn" data-topic="(\w+)"/g)].map((m) => m[1]);
  assert.ok(topics.length >= 20, `only ${topics.length} boxes`);
  for (const t of topics) assert.ok(E.SECTIONS[t], `no SECTIONS text for data-topic="${t}"`);
});

test('every grading factor has a plain-language explanation', () => {
  const samples = [
    { key: 'kp', label: 'Kp 6.7 geomagnetic activity' },
    { key: 'kp', label: 'Kp 1.3 geomagnetic activity' },
    { key: 'flare', label: 'Flare risk' },
    { key: 'flareNow', label: 'R3 radio blackout in progress' },
    { key: 'proton', label: 'Proton event chance 5%' },
    { key: 'protonNow', label: 'S1 radiation storm in progress' },
    { key: 'scint', label: 'Post-sunset equatorial scintillation window' },
    { key: 'bz', label: 'IMF Bz -15.6 nT southward (30-min mean)' },
    { key: 'speed', label: 'Solar wind 723 km/s' },
    { key: 'aurora', label: 'Aurora probability 35% overhead' },
    { key: 'pdop', label: 'PDOP 5.2 (7 sats)' },
    { key: 'flux', label: 'High solar flux' },
  ];
  for (const f of samples) {
    const s = E.factorKid(f);
    assert.ok(s && s !== f.label, `no kid text for ${f.key}`);
  }
  assert.match(E.factorKid(samples[0]), /space storm/);
  assert.match(E.factorKid(samples[7]), /Bz<\/button> -16/);
  assert.match(E.factorKid(samples[8]), /1\.6 million miles per hour/);
});

test('every glossary link in the text points at a real glossary entry', () => {
  const html = [
    ...Object.values(E.SECTIONS),
    ...E.STORY.map((s) => s.text),
    ...['kp', 'flare', 'flareNow', 'proton', 'protonNow', 'scint', 'bz', 'speed', 'aurora', 'pdop'].map((key) => E.factorKid({ key, label: 'x 5' })),
  ].join(' ');
  const keys = [...html.matchAll(/data-term="(\w+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 20);
  for (const k of keys) assert.ok(E.GLOSSARY[k], `missing glossary entry "${k}"`);
});

test('todayKid explains the grade, the reasons and the best window', () => {
  const day = {
    grade: 'C',
    drivers: [{ key: 'kp', label: 'Kp 5.0 geomagnetic activity', penalty: 30 }],
    bestWindow: { start: new Date('2026-11-04T15:00:00'), end: new Date('2026-11-04T18:00:00'), good: true },
  };
  const html = E.todayKid(day, { grade: 'D' });
  assert.match(html, /Today gets a C/);
  assert.match(html, /space storm/);
  assert.match(html, /Best time to work/);
  assert.match(html, /Right now<\/b> it is a D/);
  assert.match(E.todayKid({ grade: 'A', drivers: [], bestWindow: null }), /Space is calm/);
  assert.match(E.todayKid({ grade: 'F', drivers: [], bestWindow: null }), /Today gets an F\./);
});

test('quiz answers point at a real choice', () => {
  for (const q of E.QUIZ) assert.ok(q.choices[q.answer], q.q);
});

test('mph conversion', () => {
  assert.equal(E.mph(400), '895,000');
  assert.equal(E.mph(800), '1.8 million');
});
