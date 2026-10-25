import { h, pic, burst } from '../util.js';
import { data, letterById, byAccent } from '../data.js';
import * as progress from '../progress.js';
import { sleep } from '../util.js';

/** Wrap the target sound inside a word so it can be coloured. */
export function highlightWord(word, item) {
  let a = -1, len = 0, a2 = -1;
  const s = item.lower;
  if (item.kind === 'long' && s.includes('_')) {
    a = word.indexOf(s[0]);
    len = 1;
    if (word.endsWith('e')) a2 = word.length - 1;
  } else if (item.kind === 'long' || item.kind === 'digraph' || item.kind === 'blend' || item.kind === 'letter') {
    a = word.indexOf(s);
    len = s.length;
  }
  const w = item.words.find((x) => x.w === word);
  if (w?.pos === 'end') a = word.lastIndexOf(s);
  if (a < 0) return word;
  const out = [];
  for (let i = 0; i < word.length; i++) {
    const hot = (i >= a && i < a + len) || i === a2;
    out.push(hot ? h('span', { class: 'hl' }, word[i]) : word[i]);
  }
  return out;
}

export function render(root, params, app) {
  const item = letterById(params.id);
  if (!item) { app.nav('/letters'); return; }
  const { audio } = app;
  const other = audio.accent === 'us' ? 'gb' : 'us';
  const heard = new Set();
  let awarded = progress.starsFor('letter', item.id) >= 1;
  app.header({ title: item.kind === 'letter' ? `${item.upper} ${item.lower}` : item.lower, back: '/letters' });

  const need = ['letter', 'sound', ...item.words.map((w) => 'w:' + w.w)];
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

  const nameFor = () => byAccent(item.name, audio.accent);
  const letterBtn = h('button', { class: 'big-letter', type: 'button', 'aria-label': `Letter ${nameFor()}. Tap to hear.`, onclick: async () => {
    app.sfx.tap();
    await audio.letterName(item);
    mark('letter');
  } }, item.kind === 'letter' ? [h('span', {}, item.upper), h('span', { class: 'low' }, item.lower)] : h('span', {}, item.lower));

  const soundBtn = h('button', { class: 'btn btn-primary sound-btn', type: 'button', onclick: async () => {
    app.sfx.tap();
    await audio.sound(item);
    mark('sound');
  } }, '🔊 ', item.sound);

  const cards = item.words.map((w) => {
    const card = h('button', { class: 'word-card', type: 'button', 'aria-label': w.w, onclick: async () => {
      app.sfx.tap();
      await audio.word(w.w);
      mark('w:' + w.w, card);
    } }, pic(w.e), h('span', { class: 'wtext' }, highlightWord(w.w, item)));
    return card;
  });

  const compare = h('button', { class: 'btn accent-mini', type: 'button', 'aria-label': `Hear it in ${other === 'gb' ? 'British' : 'American'} English`, onclick: async () => {
    app.sfx.tap();
    await audio.letterName(item, { accent: other });
    await audio.sound(item, { accent: other });
    for (const w of item.words) { await audio.word(w.w, { accent: other }); }
  } }, other === 'gb' ? '🇬🇧 UK' : '🇺🇸 US');

  const traceBtn = h('a', { class: 'btn btn-sun', href: `#/trace/${item.id}` }, '✏️ Trace');
  const all = item.kind === 'letter' || item.kind === 'digraph' ? data.path : data.extras;
  const nextId = all[all.indexOf(item.id) + 1];
  const nextBtn = nextId ? h('a', { class: 'btn btn-primary', href: `#/letter/${nextId}` }, 'Next ➡') : null;

  root.append(h('div', { class: 'lesson' },
    h('div', { class: 'letter-hero' }, letterBtn, h('div', { class: 'stack', style: { gap: '10px' } }, soundBtn, h('p', { class: 'sound-hint' }, item.hint))),
    h('div', { class: 'word-cards' }, cards),
    h('div', { class: 'lesson-actions' }, traceBtn, compare, nextBtn)));

  // Sounds first (phonics): opening a lesson plays the SOUND only; tap the big letter for its name.
  setTimeout(() => audio.sound(item), 350);
}
