import { h } from '../util.js';
import { data } from '../data.js';
import { currentProfile, totalStars } from '../progress.js';

export function render(root, _params, app) {
  app.header({ title: 'Stickers', back: '/' });
  const p = currentProfile();
  const per = data.starsPerSticker;
  const total = totalStars();
  const earned = p.stickers;
  const into = total % per;
  const list = data.stickers;
  root.append(h('div', { class: 'stack' },
    h('p', { class: 'game-prompt' }, `⭐ ${total}  ·  🌟 ${earned}`),
    h('div', { class: 'progress-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': per, 'aria-valuenow': into, 'aria-label': 'Stars to next sticker' }, h('i', { style: { width: (into / per) * 100 + '%' } })),
    h('p', { class: 'hint' }, `${per - into} ⭐ → 🌟`),
    h('div', { class: 'sticker-grid' }, list.map((s, i) => i < earned
      ? h('div', { class: 'sticker' + (i === earned - 1 ? ' new' : ''), role: 'img', 'aria-label': 'Sticker ' + (i + 1) }, s)
      : h('div', { class: 'sticker locked', 'aria-hidden': 'true' }, '?')))));
  setTimeout(() => app.audio.prompt('stickers_intro'), 250);
}
