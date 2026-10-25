// Story reader: night theme, slow narration, word-by-word highlighting, tap-a-word, two reading modes, questions.
import { h, sleep, burst, shuffle } from '../util.js';
import { data, storyById } from '../data.js';
import * as progress from '../progress.js';
import { mascot } from '../mascot.js';
import { clean, isTarget, isDecodable, splitWords } from '../phonics.js';

export function render(root, params, app) {
  const story = storyById(params.id);
  if (!story) { app.nav('/stories'); return; }
  document.body.dataset.theme = 'night';
  app.header({ title: story.title, back: '/stories' });
  const { audio } = app;
  const sight = new Set(data.storyMeta.sight.map((w) => w.toLowerCase()));
  let alive = true;
  let run = 0;          // cancels stale narration
  let mode = null;      // 'listen' | 'read'
  let page = 0;
  let timers = [];
  const storyNo = data.stories.indexOf(story) + 1;

  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  // ---------- intro ----------
  function intro() {
    root.replaceChildren(h('div', { class: 'reader' },
      h('div', { class: 'scene', 'aria-hidden': 'true' }, story.emoji),
      h('h2', { class: 'game-prompt' }, story.title),
      h('div', { class: 'mode-pick' },
        h('button', { class: 'btn btn-primary big-play', type: 'button', onclick: () => start('listen') }, '👂 Read to me'),
        h('button', { class: 'btn big-play', type: 'button', onclick: () => start('read') }, '📖 I read'))));
    setTimeout(() => audio.prompt('story_mode'), 250);
  }

  function start(m) {
    mode = m;
    page = 0;
    app.sfx.tap();
    showPage();
  }

  // ---------- page ----------
  function showPage() {
    run++;
    clearTimers();
    const p = story.pages[page];
    const tokens = splitWords(p.text);
    const readSet = new Set();
    const els = tokens.map((tok, i) => {
      const w = clean(tok);
      const target = !sight.has(w) && isDecodable(w, story.taught) && isTarget(w, story.target);
      const el = h('button', { class: 'w' + (target ? ' target' : ''), type: 'button', onclick: async () => {
        audio.word(w);
        el.classList.add('hl');
        setTimeout(() => el.classList.remove('hl'), 700);
        if (mode === 'read') { el.classList.add('read'); readSet.add(i); if (readSet.size === tokens.length) ready(); }
      } }, tok);
      return el;
    });
    const textEl = h('div', { class: 'story-text' + (mode === 'read' ? ' iread' : ''), 'aria-live': 'polite' }, els.flatMap((e, i) => [e, ' ']));
    const prev = h('button', { class: 'btn', type: 'button', 'aria-label': 'Previous page', disabled: page === 0, onclick: () => { page--; showPage(); } }, '⬅');
    const replay = h('button', { class: 'btn btn-sun', type: 'button', 'aria-label': 'Read this page', onclick: () => narrate(els, p, tokens) }, '🔊');
    const last = page === story.pages.length - 1;
    const next = h('button', { class: 'btn btn-primary', type: 'button', 'aria-label': last ? 'Finish' : 'Next page', onclick: () => { if (last) questions(); else { page++; showPage(); } } }, last ? '✔' : '➡');
    const dots = h('div', { class: 'dots', 'aria-hidden': 'true' }, story.pages.map((_, i) => h('span', { class: 'dot' + (i < page ? ' ok' : i === page ? ' on' : '') })));
    const ready = () => { next.classList.add('pulse'); app.sfx.correct(); };

    root.replaceChildren(h('div', { class: 'reader' }, dots, h('div', { class: 'scene', 'aria-hidden': 'true' }, p.scene), textEl, h('div', { class: 'row' }, prev, replay, next)));
    root.scrollTop = 0;

    if (mode === 'listen') setTimeout(() => narrate(els, p, tokens, next), 500);
    else setTimeout(() => audio.prompt('story_i_read'), 400);
  }

  /** Read the page aloud and move a highlight across the words. */
  async function narrate(els, p, tokens, nextBtn) {
    const id = ++run;
    clearTimers();
    els.forEach((e) => e.classList.remove('hl'));
    // char offset of every token inside the page text, so speech boundary events can map to words
    const starts = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(p.text))) starts.push([m.index, m.index + m[0].length]);
    let gotBoundary = false;
    const mark = (i) => { if (id !== run) return; els.forEach((e, k) => e.classList.toggle('hl', k === i)); };
    const startTimed = (duration) => {
      if (gotBoundary || id !== run) return;
      const weights = tokens.map((t) => t.length + 2 + (/[.,!?]$/.test(t) ? 3 : 0));
      const total = weights.reduce((a, b) => a + b, 0);
      let at = 0;
      tokens.forEach((_, i) => {
        timers.push(setTimeout(() => { if (!gotBoundary) mark(i); }, (at / total) * duration * 0.92));
        at += weights[i];
      });
    };
    await audio.storyText(story.id, page + 1, p.text, {
      onBoundary: (ci) => {
        gotBoundary = true;
        const i = starts.findIndex(([a, b]) => ci >= a && ci < b);
        if (i >= 0) mark(i);
      },
      onStart: ({ duration }) => { timers.push(setTimeout(() => startTimed(duration), 700)); },
    });
    if (id !== run || !alive) return;
    els.forEach((e) => e.classList.remove('hl'));
    nextBtn?.classList.add('pulse');
  }

  // ---------- questions ----------
  async function questions() {
    run++;
    clearTimers();
    const qs = story.questions || [];
    let firstTry = 0;
    for (let qi = 0; qi < qs.length && alive; qi++) {
      const ok = await askQuestion(qs[qi], qi + 1, qs.length);
      if (ok) firstTry++;
    }
    if (!alive) return;
    finish(firstTry, qs.length);
  }

  function askQuestion(q, n, total) {
    return new Promise((resolve) => {
      let tries = 0;
      let done = false;
      const choices = shuffle(q.choices.map((c, i) => ({ ...c, correct: i === q.answer })));
      const btns = choices.map((c) => h('button', { class: 'choice', type: 'button', 'aria-label': c.t, onclick: async () => {
        if (done) return;
        if (c.correct) {
          done = true;
          btn(c).classList.add('good');
          app.sfx.correct(); burst(btn(c));
          await audio.praise();
          await sleep(300);
          resolve(tries === 0);
        } else {
          tries++;
          btn(c).classList.add('nudge');
          app.sfx.nudge();
          if (tries >= 2) {
            done = true;
            btns[choices.findIndex((x) => x.correct)].classList.add('reveal');
            await audio.prompt('reveal');
            await sleep(1200);
            resolve(false);
          } else { await audio.retry(); }
        }
      } }, h('span', { class: 'pic-emoji', 'aria-hidden': 'true', style: { fontSize: '4.4rem' } }, c.e), h('span', { class: 'ctext' }, c.t)));
      const btn = (c) => btns[choices.indexOf(c)];
      root.replaceChildren(h('div', { class: 'reader q-card' },
        h('div', { class: 'dots', 'aria-hidden': 'true' }, Array.from({ length: total }, (_, i) => h('span', { class: 'dot' + (i < n - 1 ? ' ok' : i === n - 1 ? ' on' : '') }))),
        h('p', { class: 'q-text' }, q.q),
        h('button', { class: 'btn btn-sun', type: 'button', 'aria-label': 'Hear the question', onclick: () => audio.play({ id: `story-${story.id}-q${n}`, text: q.q, rate: audio.KID_RATE }) }, '🔊'),
        h('div', { class: 'choices' }, btns)));
      setTimeout(() => audio.play({ id: `story-${story.id}-q${n}`, text: q.q, rate: audio.KID_RATE }), 300);
    });
  }

  // ---------- end ----------
  async function finish(firstTry, total) {
    const stars = 1 + (total ? 1 : 0) + (firstTry === total ? 1 : 0);
    progress.record('story', story.id, { stars: Math.min(3, stars) });
    root.replaceChildren(h('div', { class: 'reader result' },
      mascot('sleepy'),
      h('div', { class: 'stars', 'aria-label': `${stars} stars` }, '⭐'.repeat(Math.min(3, stars))),
      h('p', { class: 'game-prompt' }, '🌙 ' + (data.storyMeta.ending || 'Good night!')),
      h('div', { class: 'row' },
        h('button', { class: 'btn btn-primary', type: 'button', onclick: () => intro() }, '🔁 Read again'),
        h('a', { class: 'btn', href: '#/stories' }, '📚 Stories'),
        story !== data.stories[data.stories.length - 1] && h('a', { class: 'btn btn-sun', href: `#/story/${data.stories[storyNo]?.id}` }, 'Next ➡'))));
    app.sfx.star();
    burst(root.firstChild);
    await audio.prompt('story_end');
  }

  intro();
  return () => { alive = false; run++; clearTimers(); };
}
