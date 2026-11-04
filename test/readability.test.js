// Checks that the reading-level ruler itself is honest, so a low score on the
// Learn-mode text means the text is easy, not that the ruler is broken.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { syllables, fkGrade } from './readability.js';

// Dictionary syllable counts. Kept apart from the words the rules were first written
// against; three of them (ideas, areas, played) later led to small rule fixes.
const DICTIONARY = {
  creature: 2, theater: 3, piano: 3, violin: 3, triangle: 3, cereal: 3, period: 3, museum: 3, hyena: 3, client: 2,
  quiet: 2, liar: 2, power: 2, flower: 2, tower: 2, shower: 2, buyer: 2, payment: 2, eyes: 1, noise: 1, voice: 1,
  choice: 1, juice: 1, house: 1, mouse: 1, cause: 1, laugh: 1, though: 1, through: 1, rhythm: 2, family: 3,
  chocolate: 3, different: 3, interesting: 4, vegetable: 4, comfortable: 4, beautiful: 3, animal: 3, elephant: 3,
  umbrella: 3, banana: 3, tomato: 3, potato: 3, computer: 3, telephone: 3, television: 4, information: 4,
  education: 4, situation: 4, celebration: 4, temperature: 4, dangerous: 3, enormous: 3, nervous: 2, famous: 2,
  serious: 3, obvious: 3, previous: 3, delicious: 3, ferocious: 3, mysterious: 4, ruined: 2, fluid: 2, science: 2,
  society: 4, variety: 4, anxiety: 4, create: 2, created: 3, creating: 3, ideas: 3, areas: 3, reality: 4, theory: 3,
  geography: 4, neon: 2, leopard: 2, people: 2, pioneer: 3, stadium: 3, medium: 3, premium: 3, radius: 3, genius: 2,
  helium: 3, studio: 3, audio: 3, patio: 3, ratio: 2, rodeo: 3, cooperate: 4, zoo: 1, cooking: 2, seeing: 2,
  doing: 2, flying: 2, crying: 2, playing: 2, staying: 2, likes: 1, hopes: 1, rides: 1, notes: 1, tables: 2,
  circles: 2, puzzles: 2, kisses: 2, wishes: 2, watches: 2, judges: 2, roses: 2, wasted: 2, painted: 2, hated: 2,
  added: 2, walked: 1, played: 1, cried: 1, moved: 1, loved: 1, named: 1, baseball: 2, sometimes: 2, lifetime: 2,
  homework: 2, timeline: 2,
};

test('syllable estimate matches the dictionary for at least 85% of words', () => {
  const entries = Object.entries(DICTIONARY);
  const wrong = entries.filter(([w, n]) => syllables(w) !== n);
  const bias = entries.reduce((s, [w, n]) => s + syllables(w) - n, 0);
  const pct = (100 * (entries.length - wrong.length)) / entries.length;
  console.log(`  ${pct.toFixed(0)}% exact, net bias ${bias} syllables over ${entries.length} words`);
  assert.ok(pct >= 85, `only ${pct.toFixed(0)}% exact: ${wrong.map(([w]) => w).join(', ')}`);
  assert.ok(Math.abs(bias) <= 8, `net bias ${bias}: the counter leans one way`);
});

test('easy text scores low and dense technical text scores high', () => {
  const easy = fkGrade('The cat sat on the mat.');
  const dense = fkGrade(
    'Each hour starts at 100 and loses points for Kp, flare odds (sunlit side only), proton odds (high latitude), the post-sunset equatorial scintillation window, real-time southward Bz and fast wind, aurora overhead, and poor PDOP. Penalties scale with your geomagnetic latitude and your work profile (RTK/survey, drone, ag guidance, general nav). The day grade blends the average and the worst hour of your work hours (60/40).',
  );
  const adult = fkGrade(
    'Geomagnetic storms produce steep ionospheric gradients that degrade carrier-phase ambiguity resolution. Receivers operating at high magnetic latitudes experience more frequent loss of lock during intense scintillation events.',
  );
  console.log(`  "The cat sat on the mat." ${easy.toFixed(1)} · README paragraph ${dense.toFixed(1)} · technical paragraph ${adult.toFixed(1)}`);
  assert.ok(easy <= 1, `easy sentence scored ${easy.toFixed(1)}`);
  assert.ok(dense >= 10, `dense README paragraph scored only ${dense.toFixed(1)}`);
  assert.ok(adult >= 14, `technical paragraph scored only ${adult.toFixed(1)}`);
});

test('ending rules: -ed and -es', () => {
  assert.equal(syllables('started'), 2);
  assert.equal(syllables('jumped'), 1);
  assert.equal(syllables('boxes'), 2);
  assert.equal(syllables('makes'), 1);
  assert.equal(syllables('bubbles'), 2);
});
