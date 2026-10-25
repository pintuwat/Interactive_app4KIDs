// Pure phonics helpers shared by the story reader (browser) and tools/check-stories.mjs (Node).
// Keep this file free of DOM and imports.

export const CONSONANTS = 'bcdfghjklmnprstvwxz'; // y handled below, q needs u, c/k both allowed
export const SHORT_VOWELS = ['a', 'e', 'i', 'o', 'u'];
// Multi-letter graphemes the course teaches. Longest first so 'igh' wins over 'i'.
const GRAPHEMES = ['igh', 'ai', 'oo', 'sh', 'ch', 'th', 'ee', 'oa', 'ck', 'ar', 'or', 'er', 'ir', 'ur', 'ow', 'ou'];
const C = '[bcdfghjklmnprstvwxz]';

export const clean = (w) => w.toLowerCase().replace(/[^a-z]/g, '');

/** Split page text into display tokens (word + attached punctuation) preserving punctuation. */
export function splitWords(text) {
  return text.split(/\s+/).filter(Boolean);
}

/**
 * Can this word be sounded out using ONLY the sounds taught so far?
 * taught: list like ['a','i','sh','a_e','igh'] (short vowels, graphemes, magic-e patterns like 'a_e').
 * All single consonants (and blends of them) are assumed known.
 */
export function isDecodable(word, taught) {
  const w = clean(word);
  if (!w) return true;
  const vowels = taught.filter((t) => t.length === 1);
  const graphemes = taught.filter((t) => t.length >= 2 && !t.includes('_')).sort((a, b) => b.length - a.length);
  const magic = taught.filter((t) => t.includes('_')).map((t) => t[0]);
  // magic e: ...V C e (optionally + s). Only decodable once that pattern is taught.
  const m = new RegExp(`^(.*)([aiou])(${C})e(s?)$`).exec(w);
  if (m) return magic.includes(m[2]) && parse(m[1], vowels, graphemes, true);
  return parse(w, vowels, graphemes, true);
}

function parse(w, vowels, graphemes, atStart) {
  if (w === '') return true;
  for (const g of graphemes) if (w.startsWith(g) && parse(w.slice(g.length), vowels, graphemes, false)) return true;
  const c = w[0];
  if (c === 'q' && w[1] === 'u' && vowels.includes('u')) return parse(w.slice(2), vowels, graphemes, false);
  if (CONSONANTS.includes(c)) return parse(w.slice(1), vowels, graphemes, false);
  if (c === 'y' && atStart) return parse(w.slice(1), vowels, graphemes, false);
  // two vowel letters in a row are only allowed as a taught grapheme (handled above)
  // vowel + r/w/y (bird, cow, day) is a different sound: needs its own taught grapheme, handled above
  if (vowels.includes(c) && !'aeiou'.includes(w[1] || '-') && !'rwy'.includes(w[1] || '-')) return parse(w.slice(1), vowels, graphemes, false);
  return false;
}

/** Does a (decodable, non-sight) word contain the story's target sound? target may be 'ir|ur|er'. */
export function isTarget(word, target) {
  const w = clean(word);
  if (!w || !target) return false;
  return target.split('|').some((t) => targetOne(w, t));
}

function targetOne(w, t) {
  if (t.includes('_')) return new RegExp(`${t[0]}${C}e(s?)$`).test(w);
  if (t.length === 1) {
    // a lone vowel target must not be part of a digraph or a magic-e pattern
    let s = w.replace(new RegExp(`${t}${C}e(s?)$`), '#');
    for (const g of GRAPHEMES) s = s.split(g).join('#');
    return s.includes(t);
  }
  return w.includes(t);
}

const BATH = new Set(['bath', 'path', 'grass', 'class', 'fast', 'last', 'past', 'ask', 'plant', 'pass', 'mask', 'task', 'glass', 'blast', 'cast', 'vast', 'mast', 'staff', 'half', 'after', 'basket', 'castle']);

/** Words whose pronunciation differs between American and British English (for teacher review). */
export function accentNote(word) {
  const w = clean(word);
  if (BATH.has(w)) return 'a: US /æ/ vs UK /ɑː/';
  if (w === 'zebra') return 'e: US zee- vs UK zeb-';
  let s = w;
  for (const g of GRAPHEMES) s = s.split(g).join('#');
  // r-controlled vowels (ar, or, er, ir, ur): US says the r, UK usually does not
  if (/(ar|or|er|ir|ur)/.test(w) && !/^(?:[^aeiou]*)$/.test(w)) return 'r-controlled vowel: US says the r, UK often does not';
  if (new RegExp(`${C}o${C}`).test(s) && !new RegExp(`o${C}e$`).test(w)) return 'short o: US /ɑ/ vs UK /ɒ/';
  if (/^o/.test(s) && !/^o[^aeiou]*e$/.test(w)) return 'short o: US /ɑ/ vs UK /ɒ/';
  return '';
}
