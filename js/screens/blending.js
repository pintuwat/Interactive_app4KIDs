// Blending lessons (CVC). /words = pick a family; /blend/:family = blend each word.
import { h, pic, sleep, burst } from '../util.js';
import { data, letterById, levelOf } from '../data.js';
import * as progress from '../progress.js';
import { starsFor } from '../progress.js';

export async function render(root, params, app) {
  if (!levelOf(progress.currentProfile()).words) { app.nav('/'); return; }
  if (!params.family) return families(root, app);
  return blend(root, params.family, app);
}

function families(root, app) {
  app.header({ title: 'Words', back: '/' });
  if (levelOf(progress.currentProfile()).extras) root.append(h('div', { class: 'row', style: { marginBottom: '16px' } }, h('a', { class: 'btn btn-sun', href: '#/sight' }, '👀 Sight words')));
  root.append(h('div', { class: 'family-grid' }, data.families.map((f) => {
    const ws = data.words.filter((w) => w.f === f.id);
    const done = ws.filter((w) => starsFor('word', w.w) > 0).length;
    return h('a', { class: 'family-btn' + (done === ws.length ? ' done' : ''), href: `#/blend/${f.id}`, style: { minWidth: '130px', padding: '10px 18px' }, 'aria-label': `Word family ${f.id}. ${done} of ${ws.length} done.` },
      h('span', {}, f.label), h('small', {}, `${done}/${ws.length}`));
  })));
  setTimeout(() => app.audio.prompt('words_menu'), 250);
}

function blend(root, familyId, app) {
  const fam = data.families.find((f) => f.id === familyId);
  const words = data.words.filter((w) => w.f === familyId);
  if (!fam || !words.length) { app.nav('/words'); return; }
  app.header({ title: fam.label, back: '/words' });
  const { audio } = app;
  let i = 0;
  let running = false;
  let alive = true;

  const lettersEl = h('div', { class: 'blend-letters' });
  const wordEl = h('div', { class: 'blend-word', 'aria-live': 'polite' });
  const picEl = h('div', { class: 'blend-pic' });
  const dots = h('div', { class: 'dots' }, words.map((w) => h('span', { class: 'dot' + (starsFor('word', w.w) ? ' ok' : '') })));
  const playBtn = h('button', { class: 'btn btn-primary big-play', type: 'button', onclick: () => run() }, '▶ Blend');
  const prev = h('button', { class: 'btn', type: 'button', 'aria-label': 'Previous word', onclick: () => go(-1) }, '⬅');
  const next = h('button', { class: 'btn', type: 'button', 'aria-label': 'Next word', onclick: () => go(1) }, '➡');

  function show() {
    const w = words[i];
    lettersEl.replaceChildren(...[...w.w].map((c, k) => h('button', { class: 'blend-letter' + (k > 0 ? ' family' : ''), type: 'button', 'aria-label': `Letter ${c}`, onclick: () => { audio.sound(letterById(c)); } }, c)));
    wordEl.textContent = '';
    picEl.replaceChildren();
    [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
  }

  async function run() {
    if (running) return;
    running = true;
    const w = words[i];
    show();
    const letters = [...lettersEl.children];
    for (let k = 0; k < letters.length && alive; k++) {
      letters[k].classList.add('lit');
      await audio.sound(letterById(w.w[k]));
      await sleep(250);
      letters[k].classList.remove('lit');
    }
    if (!alive) return;
    wordEl.textContent = w.w;
    picEl.replaceChildren(pic(w.e));
    picEl.classList.remove('pop');
    void picEl.offsetWidth;
    picEl.classList.add('pop');
    app.sfx.correct();
    await audio.word(w.w);
    const gained = progress.record('word', w.w, { stars: 1 });
    dots.children[i].classList.add('ok');
    if (gained) burst(picEl);
    running = false;
    if (words.every((x) => starsFor('word', x.w) > 0) && gained && i === words.length - 1) {
      await app.celebrate({ emoji: '🎉', text: `${fam.label} done!` });
    }
  }

  function go(d) {
    if (running) return;
    i = (i + d + words.length) % words.length;
    show();
    audio.word(words[i].w);
  }

  root.append(h('div', { class: 'blend-stage' }, dots, lettersEl, picEl, wordEl, h('div', { class: 'row' }, prev, playBtn, next)));
  show();
  setTimeout(() => audio.prompt('blend_intro'), 300);
  return () => { alive = false; };
}
