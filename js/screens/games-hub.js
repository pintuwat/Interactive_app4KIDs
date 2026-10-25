import { h } from '../util.js';
import { levelOf } from '../data.js';
import { currentProfile, starsFor } from '../progress.js';
import { t } from '../i18n.js';

const GAMES = [
  ['listen-tap', 'Listen & Tap', '👂', '#a9dcf8', 'Hear a word. Tap the picture.'],
  ['beginning-sound', 'First Sound', '🔤', '#ffd978', 'Which letter starts it?'],
  ['bubble-pop', 'Bubble Pop', '💭', '#c9bdf9', 'Pop the right bubble.'],
  ['build-word', 'Build the Word', '🧩', '#ffb3a2', 'Drag the letters.'],
  ['rhyme-match', 'Rhyme Match', '🎵', '#7bcf8f', 'cat, mat!'],
  ['sight-words', 'Sight Words', '👀', '#f7c6e0', 'Tap the word you hear.'],
];

export async function render(root, params, app) {
  const lvl = levelOf(currentProfile());
  if (params.id) return play(root, params.id, app, lvl);

  app.header({ title: 'Games', back: '/' });
  const list = GAMES.filter(([id]) => lvl.games.includes(id));
  root.append(h('div', { class: 'game-grid' }, list.map(([id, title, icon, color, hint]) =>
    h('a', { class: 'game-card', href: `#/game/${id}`, style: { background: color }, onclick: () => app.sfx.tap() },
      h('span', { class: 'gi', 'aria-hidden': 'true' }, icon), title,
      h('small', {}, '⭐'.repeat(starsFor('game', id)) || hint)))));
  setTimeout(() => app.audio.prompt('games_menu'), 250);
}

async function play(root, id, app, lvl) {
  if (!lvl.games.includes(id)) { app.nav('/games'); return; }
  const mod = await import(`../games/${id}.js`);
  const Game = mod.default;
  app.header({ title: Game.meta.title, back: '/games' });
  const game = new Game(app, root);
  window.__game = game; // handy for manual testing in the console
  game.start();
  return () => game.destroy();
}
