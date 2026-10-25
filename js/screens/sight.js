// Sight words (Dolch pre-primer, Level 3): tap a card to hear it; each heard word earns a star.
import { h, burst } from '../util.js';
import { data, levelOf } from '../data.js';
import * as progress from '../progress.js';

export function render(root, _params, app) {
  if (!levelOf(progress.currentProfile()).extras) { app.nav('/'); return; }
  app.header({ title: 'Sight words', back: '/words' });
  const cards = data.sightwords.map((w) => {
    const id = w.toLowerCase();
    const b = h('button', { class: 'family-btn' + (progress.isDone('sight', id) ? ' done' : ''), type: 'button', style: { minWidth: '140px' }, onclick: async () => {
      app.sfx.tap();
      await app.audio.sight(w);
      if (progress.record('sight', id, { stars: 1, attempts: 0 })) { b.classList.add('done'); burst(b); }
    } }, w);
    return b;
  });
  root.append(h('div', { class: 'stack' },
    h('p', { class: 'game-prompt' }, '👀 Tap a word.'),
    h('div', { class: 'family-grid' }, cards),
    h('a', { class: 'btn btn-primary big-play', href: '#/game/sight-words' }, '🎮 Play')));
  setTimeout(() => app.audio.prompt('letter_lesson'), 250);
}
