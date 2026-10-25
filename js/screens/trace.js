import { h, burst, sleep } from '../util.js';
import { letterById } from '../data.js';
import * as progress from '../progress.js';

const FONT = '"Arial Rounded MT Bold", "Chalkboard SE", "Comic Sans MS", ui-rounded, system-ui, sans-serif';
const COLORS = ['#e8590c', '#1c7ed6', '#2f9e44'];

export function render(root, params, app) {
  const item = letterById(params.id);
  if (!item) { app.nav('/letters'); return; }
  app.header({ title: 'Trace', back: `/letter/${item.id}` });

  let upper = item.kind === 'letter';
  let color = COLORS[0];
  let tries = 0;
  let drawing = false;
  let last = null;
  let moved = 0;

  const wrap = h('div', { class: 'trace-wrap' });
  const guide = h('canvas', { 'aria-hidden': 'true' });
  const ink = h('canvas', { role: 'img', 'aria-label': `Trace the letter ${item.lower} with your finger` });
  guide.style.pointerEvents = 'none';
  wrap.append(guide, ink);

  const text = () => (upper ? item.upper : item.lower).replace(/_/g, '·');

  function size() {
    const r = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    for (const c of [guide, ink]) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
    ink.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    drawGuide();
  }

  function layout(ctx, w, hgt) {
    const t = text();
    let fs = hgt * 0.78;
    ctx.font = `bold ${fs}px ${FONT}`;
    const mw = ctx.measureText(t).width;
    if (mw > w * 0.86) { fs *= (w * 0.86) / mw; ctx.font = `bold ${fs}px ${FONT}`; }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    return { t, x: w / 2, y: hgt / 2 + fs * 0.34, fs };
  }

  function drawGuide() {
    const ctx = guide.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = guide.width / dpr, hgt = guide.height / dpr;
    ctx.clearRect(0, 0, w, hgt);
    // baseline + midline help
    ctx.strokeStyle = '#d7e3ee'; ctx.lineWidth = 2; ctx.setLineDash([8, 10]);
    for (const f of [0.28, 0.5, 0.78]) { ctx.beginPath(); ctx.moveTo(14, hgt * f); ctx.lineTo(w - 14, hgt * f); ctx.stroke(); }
    const L = layout(ctx, w, hgt);
    ctx.fillStyle = '#eef3f8';
    ctx.fillText(L.t, L.x, L.y);
    ctx.setLineDash([12, 12]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#9db3c6';
    ctx.strokeText(L.t, L.x, L.y);
    ctx.setLineDash([]);
  }

  function pos(e) {
    const r = ink.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  ink.addEventListener('pointerdown', (e) => {
    drawing = true; ink.setPointerCapture(e.pointerId); last = pos(e);
    const ctx = ink.getContext('2d');
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(last.x, last.y, 13, 0, Math.PI * 2); ctx.fill();
    e.preventDefault();
  });
  ink.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    const ctx = ink.getContext('2d');
    ctx.strokeStyle = color; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    moved += Math.hypot(p.x - last.x, p.y - last.y);
    last = p;
  });
  const up = () => { drawing = false; };
  ink.addEventListener('pointerup', up);
  ink.addEventListener('pointercancel', up);

  /** Share of the guide letter that the child's ink covers (0-1), sampled on a small grid. */
  function coverage() {
    const N = 96;
    const a = document.createElement('canvas'); a.width = a.height = N;
    const b = document.createElement('canvas'); b.width = b.height = N;
    const actx = a.getContext('2d'); const bctx = b.getContext('2d');
    const r = wrap.getBoundingClientRect();
    const sx = N / r.width, sy = N / r.height;
    actx.setTransform(sx, 0, 0, sy, 0, 0);
    const L = layout(actx, r.width, r.height);
    actx.fillStyle = '#000'; actx.fillText(L.t, L.x, L.y);
    bctx.drawImage(ink, 0, 0, N, N);
    const ga = actx.getImageData(0, 0, N, N).data;
    const gb = bctx.getImageData(0, 0, N, N).data;
    let total = 0, hit = 0;
    for (let i = 3; i < ga.length; i += 4) {
      if (ga[i] > 128) { total++; if (gb[i] > 60) hit++; }
    }
    return total ? hit / total : 0;
  }

  function clear() {
    const ctx = ink.getContext('2d');
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ink.width, ink.height); ctx.restore();
    moved = 0;
  }

  const swatches = COLORS.map((c) => h('button', { class: 'swatch', type: 'button', style: { background: c }, 'aria-label': 'Colour', 'aria-pressed': String(c === color), onclick: () => {
    color = c; swatches.forEach((s, i) => s.setAttribute('aria-pressed', String(COLORS[i] === c)));
  } }));

  const caseBtn = item.kind === 'letter' && h('button', { class: 'btn btn-small', type: 'button', onclick: () => { upper = !upper; caseBtn.textContent = upper ? 'a' : 'A'; clear(); drawGuide(); } }, 'a');

  const done = h('button', { class: 'btn btn-primary', type: 'button', onclick: finish }, '✔ Done');
  const clearBtn = h('button', { class: 'btn', type: 'button', onclick: () => { app.sfx.tap(); clear(); } }, '↺ Clear');

  async function finish() {
    tries++;
    const c = coverage();
    if (moved < 80 || (c < 0.28 && tries < 3)) {
      app.sfx.nudge();
      await app.audio.retry();
      return;
    }
    const gained = progress.record('letter', item.id, { stars: 2 });
    app.sfx.star();
    burst(wrap);
    await app.audio.prompt('trace_done');
    if (gained) await sleep(300);
    app.nav(`/letter/${item.id}`);
  }

  root.append(h('div', { class: 'stack' },
    h('p', { class: 'game-prompt' }, 'Trace the letter.'),
    wrap,
    h('div', { class: 'row' }, swatches, caseBtn, clearBtn, done)));

  requestAnimationFrame(size);
  const onResize = () => size();
  window.addEventListener('resize', onResize);
  setTimeout(() => app.audio.prompt('letter_trace'), 250);
  return () => window.removeEventListener('resize', onResize);
}
