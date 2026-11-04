// Reading-level helpers for the Learn-mode tests.
//
// Flesch-Kincaid grade = 0.39 × (words / sentences) + 11.8 × (syllables / word) − 15.59
//
// The syllable count is an estimate (no dictionary). The plain "count the vowel
// groups" rule undercounts badly: it reads "radio", "science" and "idea" as
// fewer syllables than they have, and it drops the "-ed" in "started" and the
// "-es" in "boxes". That made hard text look easy. The rules below fix the
// common cases. test/readability.test.js checks them against dictionary counts
// and against passages with known grade levels.

// Compound words whose first part ends in a silent "e" ("forecast", "spacecraft").
const SILENT_E_PREFIX = /^(?:fore|space|some|life|time|home|side|base|more|where|there|here|care|safe|wise|like|line|make|take|use|whole|hope|lone|game|stone|tide)(?=[^aeiouy])/;

export function syllables(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;

  let extra = 0;
  // Endings. "-ed" is its own syllable only after t or d (started, needed).
  if (/[^aeiouy]ed$|[aeiou]yed$/.test(w)) {
    if (/[td]ed$/.test(w)) extra++;
    w = w.slice(0, -2);
  } else if (/[^aeiouy]les$/.test(w)) {
    w = w.slice(0, -1); // bubbles → bubble, handled by the "-le" rule below
  } else if (/(?:[sxzcg]|ch|sh)es$/.test(w)) {
    extra++; // boxes, places, changes, pushes
    w = w.slice(0, -2);
  } else if (/[^aeiouy]es$/.test(w)) {
    w = w.slice(0, -2); // makes, poles
  }
  // Silent final "e", except consonant + "le" (table, people, little).
  if (/e$/.test(w) && !/[^aeiouy]le$/.test(w) && !/[aeiouy]e$/.test(w)) w = w.slice(0, -1);
  w = w.replace(/^y/, '');

  let n = (w.match(/[aeiouy]+/g) || []).length;

  // Two vowels side by side that are said separately (hiatus).
  if (/ia/.test(w) && !/(?:c|t|s)ia/.test(w)) n++; // radiation, giant (not special, social)
  if (/[^q]ua/.test(w)) n++; // dual, equatorial (not equator)
  if (/io/.test(w) && !/(?:[tscgx]|ll|n)io(?:n|us)/.test(w)) n++; // radio, ionosphere, curious (not nation, million, precious)
  if (/eo/.test(w) && !/peo/.test(w)) n++; // video, geometry (not people)
  if (/iu|uo/.test(w)) n++;
  if (/[^q]ue[lt]/.test(w)) n++; // fuel, duet
  if (/iet|scien|[^ct]ient/.test(w)) n++; // quiet, diet, science, client (not patient)
  if (/eas?$|crea|reac|^real$/.test(w)) n++; // idea, area, create, react (not great)
  if (/[aeiou]ye/.test(w)) n++; // layer, player
  if (/oe[mt]/.test(w)) n++; // poem, poet
  if (/[aeiouy]ing$/.test(w)) n++; // being, going
  if (/every/.test(w)) n--; // ev-ry
  if (SILENT_E_PREFIX.test(word.toLowerCase())) n--;

  return Math.max(1, n + extra);
}

export function fkGrade(text) {
  const sentences = text.split(/[.!?]+(?:\s|$)/).filter((s) => /[a-z]/i.test(s)).length || 1;
  const words = text.match(/[A-Za-z0-9’']+/g) || [];
  if (!words.length) return 0;
  const syl = words.reduce((s, w) => s + syllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59;
}
