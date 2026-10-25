// Pure phonics helpers shared by the story reader (browser) and tools/check-stories.mjs (Node).
// Keep this file free of DOM and imports.

export const CONSONANTS = 'bcdfghjklmnprstvwxz'; // y handled below, q needs u, c/k both allowed
export const SHORT_VOWELS = ['a', 'e', 'i', 'o', 'u'];
const DIGRAPHS = ['sh', 'ch', 'th', 'oo', 'ai', 'ee', 'oa', 'ck'];

export const clean = (w) => w.toLowerCase().replace(/[^a-z]/g, '');

/** Split page text into display tokens (word + attached punctuation) preserving punctuation. */
export function splitWords(text) {
  return text.split(/\s+/).filter(Boolean);
}

/**
 * Can this word be sounded out using ONLY the sounds taught so far?
 * taught: list like ['a','i','sh','a_e'] (short vowels, digraphs, magic-e patterns like 'a_e').
 * All single consonants are assumed known.
 */
export function isDecodable(word, taught) {
  const w = clean(word);
  if (!w) return true;
  const vowels = taught.filter((t) => t.length === 1);
  const digraphs = taught.filter((t) => t.length === 2 && !t.includes('_'));
  const magic = taught.filter((t) => t.includes('_')).map((t) => t[0]);
  // magic e: ...V C e (optionally + s). Only decodable once that pattern is taught.
  const m = /^(.*)([aiou])([bcdfghjklmnprstvwxz])e(s?)$/.exec(w);
  if (m) return magic.includes(m[2]) && parse(m[1], vowels, digraphs, true);
  return parse(w, vowels, digraphs, true);
}

function parse(w, vowels, digraphs, atStart) {
  if (w === '') return true;
  for (const d of digraphs) if (w.startsWith(d) && parse(w.slice(2), vowels, digraphs, false)) return true;
  const c = w[0];
  if (c === 'q' && w[1] === 'u' && vowels.includes('u')) return parse(w.slice(2), vowels, digraphs, false);
  if (CONSONANTS.includes(c)) return parse(w.slice(1), vowels, digraphs, false);
  if (c === 'y' && atStart) return parse(w.slice(1), vowels, digraphs, false);
  // two vowel letters in a row are only allowed as a taught digraph (handled above)
  if (vowels.includes(c) && !'aeiou'.includes(w[1] || '-')) return parse(w.slice(1), vowels, digraphs, false);
  return false;
}

/** Does a (decodable, non-sight) word contain the story's target sound? */
export function isTarget(word, target) {
  const w = clean(word);
  if (!w || !target) return false;
  if (target.includes('_')) {
    const v = target[0];
    return new RegExp(`${v}[bcdfghjklmnprstvwxz]e(s?)$`).test(w);
  }
  if (target.length === 1) {
    const s = w.replace(/ai|oo|sh|ch|th|ee|oa|ck/g, '#').replace(new RegExp(`${target}[bcdfghjklmnprstvwxz]e(s?)$`), '#');
    return s.includes(target);
  }
  return w.includes(target);
}

/** Words whose pronunciation differs between American and British English (for teacher review). */
export function accentNote(word) {
  const w = clean(word);
  const s = w.replace(/ai|oo|sh|ch|th|ee|oa|ck/g, '#');
  if (/[bcdfghjklmnprstvwxz]o[bcdfghjklmnprstvwxz]/.test(s) && !/o[bcdfghjklmnprstvwxz]e$/.test(w) && !/^o[a-z]*e$/.test(w)) return 'short o: US /ɑ/ vs UK /ɒ/';
  if (/^o[bcdfghjklmnprstvwxz]/.test(s)) return 'short o: US /ɑ/ vs UK /ɒ/';
  if (w === 'bath') return 'a: US /æ/ vs UK /ɑː/';
  if (w === 'zebra') return 'e: US zee- vs UK zeb-';
  return '';
}
