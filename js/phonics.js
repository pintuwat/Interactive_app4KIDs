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

// Sounds a word can be split into for "sound it out" (ids of data/letters.json), longest first.
const SEGMENTS = ['sh', 'ch', 'th', 'ck', 'ai', 'ee', 'oa', 'oo', 'qu', ...[...'bdfglmnprstz'].map((c) => c + c)];
const SEGMENT_ID = { qu: 'q' }; // a doubled letter (ll, ss, gg ...) is one sound: its letter

/**
 * Split a one-syllable phonics word into its sounds: 'ant' -> [{g:'a',id:'a'}, {g:'n',id:'n'}, {g:'t',id:'t'}].
 * Magic e: 'cake' -> c, a (id a_e), k, e (id null = silent). Returns null when the word cannot be sounded out
 * with the course's sounds (two syllables, ar/or/ow, silent letters, ...), so no button is shown for it.
 * accent matters for long u: tube is /tuːb/ in American, /tjuːb/ in British.
 */
export function segment(word, accent = 'us') {
  const w = clean(word);
  // vowel + r (door, star), all (ball), wa/wo (watch, wolf) are not the taught vowel sounds
  if (/[aeiou]r/.test(w) || /all/.test(w) || /w[ao]/.test(w)) return null;
  const magic = new RegExp(`^(.*)([aiou])(${C})e$`).exec(w);
  const body = magic ? magic[1] : w;
  const parts = [];
  for (let k = 0; k < body.length;) {
    const g = SEGMENTS.find((s) => body.startsWith(s, k)) || body[k];
    const vowel = 'aeiou'.includes(g[0]) && g !== 'qu';
    if (vowel && g.length === 1 && 'aeiouwyr'.includes(body[k + 1] || '-')) return null;
    if (vowel && g.length === 1 && k + 1 === body.length && !magic) return null; // final a/o: not a short vowel
    if (g === 'y' && k > 0) return null;
    if (body.startsWith('mb', k) || body.startsWith('kn', k) || body.startsWith('wr', k) || body.startsWith('ng', k)) return null;
    parts.push({ g, id: SEGMENT_ID[g] || (g.length === 2 && g[0] === g[1] && !vowel ? g[0] : g), vowel });
    k += g.length;
  }
  if (magic) {
    const [, before, v, c] = magic;
    const last = before.slice(-1);
    // long u says "oo" after r, l, j (rule, June), and in American also after t, d, n, s (tube)
    const u = v === 'u' && ('rlj'.includes(last) || (accent === 'us' && 'tdns'.includes(last))) ? 'oo' : `${v}_e`;
    parts.push({ g: v, id: u, vowel: true }, { g: c, id: c === 's' ? 'z' : c }, { g: 'e', id: null }); // nose: s says z
  }
  if (parts.filter((p) => p.vowel).length !== 1) return null;
  return parts.map(({ g, id }) => ({ g, id }));
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
