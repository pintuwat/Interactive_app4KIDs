import { h, pic, burst } from '../util.js';
import { data, letterById } from '../data.js';
import * as progress from '../progress.js';
import { sleep } from '../util.js';
import { segment } from '../phonics.js';
import { soundLabel, wordSounds, soundWord, soundBubbles, letterCardParts, soundStyle } from '../sounds.js';

/** Letters of a word that belong to this lesson's sound (coloured): a in ant, ck in duck, i...e in kite. */
function hotFor(item) {
  const label = soundLabel(item.id);
  const magic = item.id.endsWith('_e');
  return (parts) => {
    const hot = new Set(parts.filter((p) => p.s === label || (magic && p.g === item.lower[0] && 'aeiou'.includes(p.g))));
    if (magic && hot.size) parts.filter((p) => p.g === 'e' && !p.s).forEach((p) => hot.add(p));
    if (item.kind === 'blend') parts.forEach((p, k) => { if (p.g + (parts[k + 1]?.g || '') === item.lower) hot.add(p).add(parts[k + 1]); });
    return (p) => hot.has(p);
  };
}

export function render(root, params, app) {
  const item = letterById(params.id);
  if (!item) { app.nav('/letters'); return; }
  const { audio } = app;
  const single = audio.singleSounds;   // Phase 2 switch: config.js PLAY_SINGLE_SOUNDS
  const other = audio.accent === 'us' ? 'gb' : 'us';
  const heard = new Set();
  let awarded = progress.starsFor('letter', item.id) >= 1;
  app.header({ title: item.kind === 'letter' ? `${item.upper} ${item.lower}` : item.lower, back: '/letters' });

  const need = ['letter', ...(single ? ['sound'] : []), ...item.words.map((w) => 'w:' + w.w)];
  const mark = async (key, el) => {
    el?.classList.add('heard');
    heard.add(key);
    if (!awarded && need.every((k) => heard.has(k))) {
      awarded = true;
      const gained = progress.record('letter', item.id, { stars: 1 });
      if (gained) { app.sfx.star(); burst(root); await sleep(200); audio.praise(); }
      traceBtn.classList.add('pulse');
    }
  };

  // The letter card: picture, the sound written big (/a/), the letter small (Aa). Tap = the word (apple).
  const label = soundLabel(item.id);
  const letterCard = h('button', { class: 'letter-card big', type: 'button', style: soundStyle(label),
    'aria-label': `${item.lower} says ${label}, like ${item.key[0]}`, onclick: async () => {
      app.sfx.tap();
      letterCard.classList.add('playing');
      await audio.keyWord(item);
      letterCard.classList.remove('playing');
      mark('letter');
    } }, letterCardParts(item));

  // Phase 2 only (single sounds on): the sound button.
  const soundBtn = single && h('button', { class: 'btn btn-primary sound-btn', type: 'button', onclick: async () => {
    app.sfx.tap();
    await audio.sound(item);
    mark('sound');
  } }, '🔊 ', item.sound);

  const hot = hotFor(item);
  const cards = item.words.map((w) => {
    const parts = wordSounds(w.w, audio.accent, w.sounds);
    const card = h('button', { class: 'word-card', type: 'button', 'aria-label': w.w, onclick: async () => {
      app.sfx.tap();
      await audio.word(w.w);
      mark('w:' + w.w, card);
    } }, pic(w.e), parts ? [soundWord(parts, hot(parts)), soundBubbles(parts)] : h('span', { class: 'sw' }, w.w));
    const out = single && soundOut(w, () => mark('w:' + w.w, card));
    return out ? h('div', { class: 'word-item' }, card, out) : card;
  });

  // Phase 2 only: "sound it out" under a word: a ... n ... t ... ant. One-syllable words made of taught sounds.
  function soundOut(w, done) {
    const parts = w.diff === 'a' && audio.accent === 'gb' ? null : segment(w.w, audio.accent); // UK bath is not short a
    if (!parts) return null;
    const chips = parts.map((p) => h('span', { class: 'chip' + (p.id ? '' : ' silent') }, p.g));
    let busy = false;
    const btn = h('button', { class: 'sound-out', type: 'button', 'aria-label': `Sound it out: ${parts.map((p) => p.g).join(', ')}`, onclick: async () => {
      if (busy) return;
      busy = true;
      app.sfx.tap();
      for (let k = 0; k < parts.length; k++) {
        if (!parts[k].id) continue;
        const lit = parts[k].id.endsWith('_e') ? [chips[k], chips[chips.length - 1]] : [chips[k]]; // magic e lights up too
        lit.forEach((c) => c.classList.add('lit'));
        await audio.sound(letterById(parts[k].id));
        await sleep(220);
        lit.forEach((c) => c.classList.remove('lit'));
      }
      chips.forEach((c) => c.classList.add('lit'));
      await audio.word(w.w);
      chips.forEach((c) => c.classList.remove('lit'));
      busy = false;
      done();
    } }, h('span', { 'aria-hidden': 'true' }, '🔈'), chips);
    return btn;
  }

  const compare = h('button', { class: 'btn accent-mini', type: 'button', 'aria-label': `Hear it in ${other === 'gb' ? 'British' : 'American'} English`, onclick: async () => {
    app.sfx.tap();
    await audio.cue(item, { accent: other });
    for (const w of item.words) { await audio.word(w.w, { accent: other }); }
  } }, other === 'gb' ? '🇬🇧 UK' : '🇺🇸 US');

  const traceBtn = h('a', { class: 'btn btn-sun', href: `#/trace/${item.id}` }, '✏️ Trace');
  const all = item.kind === 'letter' || item.kind === 'digraph' ? data.path : data.extras;
  const nextId = all[all.indexOf(item.id) + 1];
  const nextBtn = nextId ? h('a', { class: 'btn btn-primary', href: `#/letter/${nextId}` }, 'Next ➡') : null;

  root.append(h('div', { class: 'lesson' },
    h('div', { class: 'letter-hero' }, letterCard, h('div', { class: 'stack', style: { gap: '10px' } }, soundBtn, h('p', { class: 'sound-hint' }, item.hint))),
    h('div', { class: 'word-cards' }, cards),
    h('div', { class: 'lesson-actions' }, traceBtn, compare, nextBtn)));

  // Opening a lesson plays the sound (Phase 2) or the letter card's word (now).
  setTimeout(() => audio.cue(item), 350);
}
