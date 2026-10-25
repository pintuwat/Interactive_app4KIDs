// Printable A4 worksheets generated from the data files. Rendered into #print-root; css/print.css hides everything else.
import { h, pic, shuffle } from './util.js';
import { data, letterById } from './data.js';

function root() {
  let el = document.getElementById('print-root');
  if (!el) { el = h('div', { id: 'print-root' }); document.body.append(el); }
  el.replaceChildren();
  return el;
}

function print(el) {
  const clear = () => { el.replaceChildren(); window.removeEventListener('afterprint', clear); };
  window.addEventListener('afterprint', clear);
  setTimeout(() => window.print(), 150);
}

const NS = 'http://www.w3.org/2000/svg';
function svgLetter(text, { dotted }) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 120 110');
  svg.setAttribute('class', 'ws-letter');
  const t = document.createElementNS(NS, 'text');
  t.setAttribute('x', '60'); t.setAttribute('y', '88'); t.setAttribute('text-anchor', 'middle');
  t.setAttribute('font-size', text.length > 1 ? '60' : '96');
  t.setAttribute('font-family', 'Arial Rounded MT Bold, Chalkboard SE, Comic Sans MS, sans-serif');
  t.setAttribute('font-weight', 'bold');
  if (dotted) { t.setAttribute('fill', 'none'); t.setAttribute('stroke', '#555'); t.setAttribute('stroke-width', '1.6'); t.setAttribute('stroke-dasharray', '4 4'); }
  else { t.setAttribute('fill', '#222'); }
  t.textContent = text;
  svg.append(t);
  return svg;
}

/** Letter tracing sheet: 6 letters, each row has one solid model and 5 dotted letters to trace. */
export function tracingSheet(ids, name = '') {
  const el = root();
  el.append(h('section', { class: 'ws' },
    h('header', { class: 'ws-head' }, h('h1', {}, 'Trace the letters ✏️'), h('span', {}, 'Name: ' + (name || '____________'))),
    ...ids.map((id) => {
      const l = letterById(id);
      const lower = l.lower, upper = l.kind === 'letter' ? l.upper : null;
      return h('div', { class: 'ws-row' },
        h('div', { class: 'ws-model' }, svgLetter(upper || lower, { dotted: false })),
        ...(upper ? [h('div', { class: 'ws-cell' }, svgLetter(upper, { dotted: true })), h('div', { class: 'ws-cell' }, svgLetter(upper, { dotted: true }))] : []),
        h('div', { class: 'ws-model' }, svgLetter(lower, { dotted: false })),
        ...Array.from({ length: upper ? 2 : 4 }, () => h('div', { class: 'ws-cell' }, svgLetter(lower, { dotted: true }))),
        h('div', { class: 'ws-pic' }, pic(l.words[0].e), h('small', {}, l.words[0].w)));
    })));
  print(el);
}

/** CVC matching sheet: draw a line from each picture to its word. */
export function matchingSheet(familyId, name = '') {
  const el = root();
  let pool = data.words.filter((w) => !w.weak && (familyId === 'mixed' || w.f === familyId));
  if (pool.length < 6) pool = pool.concat(shuffle(data.words.filter((w) => !w.weak && !pool.includes(w))).slice(0, 6 - pool.length));
  const six = shuffle(pool).slice(0, 6);
  const right = shuffle(six);
  el.append(h('section', { class: 'ws' },
    h('header', { class: 'ws-head' }, h('h1', {}, 'Match the word ✏️'), h('span', {}, 'Name: ' + (name || '____________'))),
    h('div', { class: 'ws-match' },
      h('div', { class: 'ws-col' }, six.map((w) => h('div', { class: 'ws-item' }, pic(w.e), h('span', { class: 'ws-dot' })))),
      h('div', { class: 'ws-col' }, right.map((w) => h('div', { class: 'ws-item right' }, h('span', { class: 'ws-dot' }), h('b', {}, w.w))))),
    h('p', { class: 'ws-foot' }, 'Say each word. Draw a line from the picture to the word.')));
  print(el);
}
