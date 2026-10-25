import { h } from '../util.js';
import { data, levelOf } from '../data.js';
import { currentProfile, starsFor } from '../progress.js';

export function render(root, _params, app) {
  document.body.dataset.theme = 'night';
  app.header({ title: 'Stories', back: '/' });
  const lvl = levelOf(currentProfile());
  const list = data.stories.filter((s) => (s.level || 1) <= lvl.stories);
  root.append(h('div', { class: 'story-list' }, list.map((s, i) => {
    const stars = starsFor('story', s.id);
    return h('a', { class: 'story-card' + (stars ? ' done' : ''), href: `#/story/${s.id}`, 'aria-label': `${s.title}${stars ? ', finished' : ''}` },
      h('span', { class: 'se', 'aria-hidden': 'true' }, s.emoji),
      h('span', {}, h('b', {}, `${data.stories.indexOf(s) + 1}. ${s.title}`), h('small', {}, s.focus)),
      stars > 0 && h('span', { class: 'check', 'aria-hidden': 'true' }, '⭐'.repeat(stars)));
  })));
  setTimeout(() => app.audio.prompt('stories_menu'), 250);
}
