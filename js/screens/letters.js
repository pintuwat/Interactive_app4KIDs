import { h } from '../util.js';
import { data, alphabet, pathLetters, extraLetters, levelOf } from '../data.js';
import { currentProfile, starsFor } from '../progress.js';
import { t } from '../i18n.js';

function tile(l, nextId) {
  const s = starsFor('letter', l.id);
  return h('a', { class: 'letter-tile' + (s ? ' done' : '') + (l.id === nextId ? ' next' : ''), href: `#/letter/${l.id}`, 'aria-label': `${l.lower}. ${s} stars.` },
    l.kind === 'letter' ? [l.upper + l.lower] : l.lower,
    h('span', { class: 'st', 'aria-hidden': 'true' }, '⭐'.repeat(s)));
}

export function render(root, _params, app) {
  app.header({ title: 'Letters', back: '/' });
  const lvl = levelOf(currentProfile());
  const path = pathLetters();
  const next = path.find((l) => !starsFor('letter', l.id))?.id;

  root.append(h('div', { class: 'wide' },
    h('h2', { class: 'section-title' }, '👣 ', t('start_here')),
    h('div', { class: 'path-row' }, path.map((l) => tile(l, next))),
    h('h2', { class: 'section-title' }, '🔤 ', t('all_letters')),
    h('div', { class: 'letter-grid' }, alphabet().map((l) => tile(l, null))),
    lvl.extras && [
      h('h2', { class: 'section-title' }, '✨ ', t('more_sounds')),
      h('div', { class: 'path-row' }, extraLetters().map((l) => tile(l, null))),
    ],
  ));
  setTimeout(() => app.audio.prompt('letters_menu'), 250);
}
