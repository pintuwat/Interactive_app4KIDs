// Sounds as children SEE them: the /s/ label, one colour per SOUND (c, k and ck are all /k/, so all the same colour),
// words split into sound bubbles, and the letter card (picture + /sound/ + letter).
import { h, pic } from './util.js';
import { letterById } from './data.js';
import { segment } from './phonics.js';

/** Label of a course sound without slashes: c -> 'k', a_e -> 'ay'. */
export const soundLabel = (id) => letterById(id)?.sound.replace(/\//g, '') ?? id;

// Vowel sounds are warm (they stand out in every word); consonants spread over greens, blues and purples.
const WARM = { a: 6, e: 28, i: 330, o: 44, u: 350, ay: 16, ee: 52, eye: 300, oh: 36, oo: 318, yoo: 340, ar: 20, or: 40, aw: 56, er: 310 };
const COOL = ['s', 't', 'p', 'n', 'm', 'd', 'g', 'k', 'r', 'h', 'b', 'f', 'l', 'j', 'v', 'w', 'ks', 'y', 'z', 'kw', 'sh', 'ch', 'th', 'ng', 'bl', 'st', 'tr'];

function hue(label) {
  if (label in WARM) return WARM[label];
  const i = COOL.indexOf(label);
  if (i >= 0) return Math.round(95 + (i * 137.508) % 175);   // golden angle: neighbours in the list look different
  let n = 0;
  for (const c of label) n = (n * 31 + c.charCodeAt(0)) % 360;
  return n;
}

/** CSS variables for one sound: --s (line/border), --s-bg (bubble), --s-ink (text, dark enough to read). */
export function soundStyle(label) {
  if (label === 'uh') return { '--s': '#9aa3ad', '--s-bg': '#eef0f3', '--s-ink': '#4b5563' }; // the lazy vowel: grey
  const x = hue(label);
  return { '--s': `hsl(${x} 70% 50%)`, '--s-bg': `hsl(${x} 90% 93%)`, '--s-ink': `hsl(${x} 65% 27%)` };
}

/** /k/ with soft slashes. */
export const slashed = (label) => [h('span', { class: 'slash' }, '/'), label, h('span', { class: 'slash' }, '/')];

/**
 * A word split into sounds: [{g: 'c', s: 'k'}, {g: 'a', s: 'a'}, {g: 't', s: 't'}]; s = '' for a silent letter.
 * Hand-written in the data (flags.sounds) when the phonics rules cannot split it (apple, alligator), else segment().
 */
export function wordSounds(w, accent, manual) {
  const list = Array.isArray(manual) ? manual : manual?.[accent];
  if (list) return list.map((t) => { const [g, s] = t.split('='); return { g, s: s ?? g }; });
  const parts = segment(w, accent);
  return parts && parts.map((p) => ({ g: p.g, s: p.id ? soundLabel(p.id) : '' }));
}

/** The word with a coloured line under the letters of each sound. hot(part) = letters to colour too. */
export function soundWord(parts, hot = () => false) {
  return h('span', { class: 'sw' + (parts.map((p) => p.g).join('').length > 6 ? ' long' : '') }, parts.map((p) => h('span', {
    class: (p.s ? 'sw-g' : 'sw-g silent') + (hot(p) ? ' hot' : ''), style: p.s ? soundStyle(p.s) : null }, p.g)));
}

/** One bubble per sound: /k/ /a/ /t/. */
export function soundBubbles(parts) {
  const sounds = parts.filter((p) => p.s);
  return h('span', { class: 'snd-bubbles' + (sounds.length > 4 ? ' many' : ''), 'aria-hidden': 'true' },
    sounds.map((p) => h('span', { class: 'snd-bubble', style: soundStyle(p.s) }, slashed(p.s))));
}

/** The letter as shown small on a card: Zz, sh, a-e. */
export const letterText = (item) => (item.kind === 'letter' ? item.upper + item.lower : item.lower.replace('_', '-'));

/** Inside of a letter card: picture of the key word, the sound big, the letter small, the word. */
export function letterCardParts(item, { word = true } = {}) {
  const label = soundLabel(item.id);
  return [
    pic(item.key[1], 'lc-pic'),
    h('span', { class: 'lc-sound', style: soundStyle(label) }, slashed(label)),
    h('span', { class: 'lc-letter' }, letterText(item)),
    word && h('span', { class: 'lc-word' }, item.key[0]),
  ];
}
