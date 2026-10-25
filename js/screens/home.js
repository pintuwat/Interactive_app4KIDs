import { h } from '../util.js';
import { mascot } from '../mascot.js';
import { currentProfile } from '../progress.js';
import { levelOf } from '../data.js';
import { t, sub } from '../i18n.js';

let greeted = false;

export function render(root, _params, app) {
  app.header({ title: '', back: false });
  const p = currentProfile();
  const lvl = levelOf(p);

  const tiles = [
    { key: 'letters', emoji: '🔤', label: 'Letters', href: '#/letters', cls: 'tile-a' },
    lvl.words && { key: 'words', emoji: '🐱', label: 'Words', href: '#/words', cls: 'tile-b' },
    { key: 'games', emoji: '🎈', label: 'Games', href: '#/games', cls: 'tile-c' },
    { key: 'stories', emoji: '🌙', label: 'Stories', href: '#/stories', cls: 'tile-d' },
  ].filter(Boolean);

  const owl = mascot('happy');
  const talk = () => app.audio.prompt('home_menu');
  owl.addEventListener('click', () => { app.sfx.tap(); talk(); });
  owl.setAttribute('role', 'button');
  owl.setAttribute('aria-label', 'Ollie the owl. Tap to hear.');
  owl.style.cursor = 'pointer';

  root.append(h('div', { class: 'home' },
    h('div', { class: 'home-hero' }, owl, h('div', { class: 'bubble-talk' }, `Hi, ${p.name}!`)),
    h('nav', { class: 'home-tiles', 'aria-label': 'Main menu' }, tiles.map((x) =>
      h('a', { class: `tile ${x.cls}`, href: x.href, onclick: () => app.sfx.tap() },
        h('span', { class: 'tile-emoji', 'aria-hidden': 'true' }, x.emoji), x.label, sub(x.key) && h('small', {}, sub(x.key))))),
    h('div', { class: 'home-extra' },
      h('a', { class: 'btn btn-sun', href: '#/map' }, '🗺️ ', 'My path'),
      h('a', { class: 'btn btn-coral', href: '#/stickers' }, '🌟 ', 'Stickers')),
    h('a', { class: 'icon-btn parent-link', href: '#/parent', 'aria-label': t('parent'), title: t('parent') }, '🔒'),
  ));

  if (!greeted) { greeted = true; setTimeout(() => app.audio.prompt('welcome'), 300); }
  else setTimeout(talk, 300);
}
