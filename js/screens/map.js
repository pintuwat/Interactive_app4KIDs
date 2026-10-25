// Learning map: a path of lessons with Ollie standing on the next one to do.
import { h } from '../util.js';
import { mascot } from '../mascot.js';
import { data, letterById, levelOf, storyById } from '../data.js';
import { currentProfile, starsFor } from '../progress.js';

export function render(root, _params, app) {
  app.header({ title: 'My path', back: '/' });
  const lvl = levelOf(currentProfile());
  const nodes = [];
  data.path.forEach((id) => { const l = letterById(id); nodes.push({ label: l.lower, sub: 'letter', href: `#/letter/${id}`, done: starsFor('letter', id) > 0, stars: starsFor('letter', id) }); });
  if (lvl.words) data.families.forEach((f) => {
    const ws = data.words.filter((w) => w.f === f.id);
    const d = ws.filter((w) => starsFor('word', w.w) > 0).length;
    nodes.push({ label: f.label, sub: 'words', href: `#/blend/${f.id}`, done: d === ws.length, stars: d === ws.length ? 3 : 0 });
  });
  data.stories.filter((s) => (s.level || 1) <= lvl.stories).forEach((s) => nodes.push({ label: '📖', sub: s.title.replace(/^The /, '').split(' ').slice(0, 2).join(' '), href: `#/story/${s.id}`, done: starsFor('story', s.id) > 0, stars: starsFor('story', s.id) }));
  const here = nodes.findIndex((n) => !n.done);

  root.append(h('div', { class: 'map' }, h('div', { class: 'map-path', role: 'list' }, nodes.map((n, i) =>
    h('a', { class: 'map-node' + (n.done ? ' done' : '') + (i === here ? ' here' : ''), role: 'listitem', href: n.href, 'aria-label': `${n.label} ${n.sub}${n.done ? ', done' : ''}` },
      i === here && h('span', { class: 'mini' }, mascot('happy')),
      h('span', { class: 'pad' }, n.label),
      h('small', {}, n.sub),
      n.stars > 0 && h('span', { class: 'st', 'aria-hidden': 'true' }, '⭐'.repeat(n.stars)))))));
  setTimeout(() => { root.querySelector('.here')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); app.audio.prompt('map_intro'); }, 300);
}
