import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as E from '../public/js/explain.js';

// Flesch-Kincaid grade level. Syllables are estimated with the usual vowel-group
// heuristic, which is close enough to flag text that drifts above grade 5–6.
export function syllables(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

export function fkGrade(text) {
  const sentences = text.split(/[.!?]+(?:\s|$)/).filter((s) => /[a-z]/i.test(s)).length || 1;
  const words = text.match(/[A-Za-z0-9’']+/g) || [];
  const syl = words.reduce((s, w) => s + syllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59;
}

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
});

test('quiz answers point at a real choice', () => {
  for (const q of E.QUIZ) assert.ok(q.choices[q.answer], q.q);
});

test('mph conversion', () => {
  assert.equal(E.mph(400), '895,000');
  assert.equal(E.mph(800), '1.8 million');
});
