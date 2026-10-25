// Small DOM + random helpers shared by every screen. No dependencies.

/** Create an element: h('button', {class:'btn', onclick: fn}, 'Text', child). */
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, kids);
  return el;
}

function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick n random distinct items (or one item when n is omitted). */
export function pick(arr, n) {
  if (n === undefined) return arr[Math.floor(Math.random() * arr.length)];
  return shuffle(arr).slice(0, n);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const uid = (p = 'x') => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** A picture node for a word: emoji text, or an inline SVG file when e is 'svg:name'. */
export function pic(e, cls = '') {
  if (typeof e === 'string' && e.startsWith('svg:')) {
    return h('img', { class: 'pic pic-svg ' + cls, src: `assets/svg/${e.slice(4)}.svg`, alt: '', loading: 'lazy', draggable: 'false' });
  }
  return h('span', { class: 'pic pic-emoji ' + cls, 'aria-hidden': 'true' }, e);
}

/** Tiny celebration burst of emoji pieces over an element. Respects reduced motion. */
export function burst(host, chars = ['⭐', '✨', '🎉', '💛']) {
  if (document.documentElement.dataset.motion === 'reduce') return;
  const box = h('div', { class: 'burst', 'aria-hidden': 'true' });
  for (let i = 0; i < 14; i++) {
    const a = (Math.PI * 2 * i) / 14;
    const d = 80 + Math.random() * 80;
    box.append(h('span', { class: 'burst-bit', style: { '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 'px', '--r': Math.round(Math.random() * 360) + 'deg' } }, pick(chars)));
  }
  host.append(box);
  setTimeout(() => box.remove(), 1200);
}

export function formatDate(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const a = h('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
