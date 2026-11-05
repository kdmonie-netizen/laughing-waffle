import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUIZZES } from '../public/js/quizzes.js';

const all = QUIZZES.flatMap((q) => q.questions.map((x) => ({ ...x, quiz: q.id })));

test('10 quizzes of 10 questions, each with one valid answer', () => {
  assert.equal(QUIZZES.length, 10);
  for (const q of QUIZZES) {
    assert.equal(q.questions.length, 10, q.id);
    assert.ok(q.title && q.intro, q.id);
    for (const x of q.questions) {
      assert.ok(x.choices.length >= 3 && x.choices.length <= 4, x.q);
      assert.ok(Number.isInteger(x.answer) && x.answer >= 0 && x.answer < x.choices.length, x.q);
      assert.equal(new Set(x.choices).size, x.choices.length, `duplicate choice: ${x.q}`);
      assert.ok(x.why.length > 20 && x.ref, x.q);
    }
  }
});

test('the right answer is spread across positions, not always the same slot', () => {
  const counts = [0, 0, 0, 0];
  for (const x of all) counts[x.answer]++;
  for (const c of counts.slice(0, 3)) assert.ok(c >= 15, `answer positions ${counts}`);
});

test('no "all/none of the above", no choice letters in explanations', () => {
  for (const x of all) {
    assert.ok(!x.choices.some((c) => /\b(all|none) of the above\b/i.test(c)), x.q);
    assert.ok(!/\b(choice|option|answer) [A-D]\b/.test(x.why), x.q);
  }
});

test('no crew-safety topics (the owner asked for the GPS math only)', () => {
  const text = JSON.stringify(QUIZZES).toLowerCase();
  for (const w of ['lightning safety', 'flash-to-bang', 'when thunder roars', 'osha', 'heat index', 'heat stress', 'part 107', 'shelter', '30-30', 'drone']) assert.ok(!text.includes(w), w);
});

test('nothing from the knowledge base’s "do not quiz" list (FPRN ports, IP, station count, NGS RT classes)', () => {
  const text = JSON.stringify(QUIZZES);
  for (const re of [/48\.223/, /40\.121/, /\b2[045]000\b/, /nearly 100/i, /\b14 ?km\b/i, /\bRT[1-4]\b/, /1-2 cm/]) assert.ok(!re.test(text), String(re));
});

test('no two questions are the same', () => {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const seen = new Map();
  for (const x of all) {
    const k = norm(x.q);
    assert.ok(!seen.has(k), `${x.quiz} repeats ${seen.get(k)}: ${x.q}`);
    seen.set(k, x.quiz);
  }
});
