// Teacher recorder: pick an accent, record every spoken item, keep takes in this browser (IndexedDB),
// then download one zip per accent and unzip it into /audio/ (see README "Recording your own audio").
import { h } from '../util.js';
import { loadData, data } from '../data.js';
import { buildItems } from './items.js';
import { toWav } from './wav.js';
import { makeZip } from '../zip.js';

const app = document.getElementById('app');
let accent = null;
let items = [];
let server = { us: {}, gb: {} };    // recordings already deployed (audio/manifest.json)
let local = new Map();              // `${accent}/${id}` -> Uint8Array (wav)
let filter = 'missing';
let group = 'all';
let index = 0;
let recorder = null, stream = null, chunks = [], meterRaf = 0;

// ---------- IndexedDB (takes survive reloads until you download them) ----------
const DB = 'kp-recorder', STORE = 'takes';
const idb = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE);
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
async function dbAll() {
  const db = await idb();
  return new Promise((res) => {
    const out = new Map();
    const tx = db.transaction(STORE).objectStore(STORE).openCursor();
    tx.onsuccess = (e) => { const c = e.target.result; if (c) { out.set(c.key, new Uint8Array(c.value)); c.continue(); } else res(out); };
    tx.onerror = () => res(out);
  });
}
async function dbPut(key, val) { const db = await idb(); return new Promise((res) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(val.buffer, key); tx.oncomplete = res; }); }
async function dbDel(key) { const db = await idb(); return new Promise((res) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = res; }); }

const status = (it) => (local.has(`${accent}/${it.id}`) ? 'new' : server[accent]?.[it.id] ? 'ok' : 'miss');
const visible = () => items.filter((it) => (group === 'all' || it.group === group) && (filter === 'all' || status(it) === 'miss'));

async function start() {
  await loadData();
  try { const r = await fetch('audio/manifest.json', { cache: 'no-cache' }); if (r.ok) server = { us: {}, gb: {}, ...(await r.json()) }; } catch { /* none yet */ }
  try { local = await dbAll(); } catch { local = new Map(); }
  pickAccent();
}

function pickAccent() {
  app.replaceChildren(h('div', { class: 't-card rec-current' },
    h('h2', {}, 'Which accent will you record?'),
    h('p', {}, 'Record in a quiet room. Hold the tablet or microphone about 20 cm away. You can record one accent only: the other stays with the device voice.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn btn-primary big-play', type: 'button', onclick: () => choose('us') }, '🇺🇸 American'),
      h('button', { class: 'btn btn-primary big-play', type: 'button', onclick: () => choose('gb') }, '🇬🇧 British'))));
}

function choose(a) {
  accent = a;
  items = buildItems(data, a);
  index = 0;
  draw();
}

function counts() {
  const c = { ok: 0, new: 0, miss: 0 };
  for (const it of items) c[status(it)]++;
  return c;
}

function draw() {
  const list = visible();
  if (index >= list.length) index = Math.max(0, list.length - 1);
  const cur = list[index];
  const c = counts();
  const groups = ['all', ...new Set(items.map((i) => i.group))];
  const recBtn = h('button', { class: 'btn rec-btn' + (recorder ? ' on' : ''), type: 'button', disabled: !cur, onclick: () => (recorder ? stop(cur) : rec()) }, recorder ? '■ Stop' : '● Record');
  app.replaceChildren(
    h('div', { class: 't-card' },
      h('div', { class: 't-form' },
        h('b', {}, accent === 'us' ? '🇺🇸 American' : '🇬🇧 British'),
        h('button', { class: 'btn btn-small', type: 'button', onclick: () => { stopStream(); pickAccent(); } }, 'Change accent'),
        h('span', {}, `✔ on server: ${c.ok} · ● new here: ${c.new} · ✗ missing: ${c.miss} / ${items.length}`)),
      h('div', { class: 't-form', style: { marginTop: '10px' } },
        h('label', {}, 'Show ', h('select', { class: 'select', onchange: (e) => { filter = e.target.value; index = 0; draw(); } },
          h('option', { value: 'missing', selected: filter === 'missing' }, 'missing only'), h('option', { value: 'all', selected: filter === 'all' }, 'everything'))),
        h('label', {}, 'Group ', h('select', { class: 'select', onchange: (e) => { group = e.target.value; index = 0; draw(); } }, groups.map((g) => h('option', { value: g, selected: g === group }, g)))),
        h('button', { class: 'btn btn-primary btn-small', type: 'button', disabled: c.new === 0, onclick: downloadZip }, `⬇ Download ${accent.toUpperCase()} zip (${c.new})`))),
    h('div', { class: 't-card rec-current' },
      cur ? [
        h('p', { class: 't-note' }, `${cur.group} · ${index + 1} of ${list.length} · `, h('code', {}, cur.id)),
        h('div', { class: 'rec-say' }, cur.say),
        cur.hint && h('p', { class: 't-note' }, cur.hint),
        h('div', { class: 'meter' }, h('i', { id: 'meter' })),
        h('div', { class: 'row' },
          h('button', { class: 'btn', type: 'button', disabled: index === 0, onclick: () => { index--; draw(); } }, '⬅'),
          recBtn,
          h('button', { class: 'btn', type: 'button', disabled: status(cur) === 'miss', onclick: () => play(cur) }, '▶ Play'),
          local.has(`${accent}/${cur.id}`) && h('button', { class: 'btn btn-small btn-danger', type: 'button', onclick: async () => { await dbDel(`${accent}/${cur.id}`); local.delete(`${accent}/${cur.id}`); draw(); } }, '🗑'),
          h('button', { class: 'btn', type: 'button', disabled: index >= list.length - 1, onclick: () => { index++; draw(); } }, '➡')),
      ] : h('p', {}, filter === 'missing' ? '🎉 Nothing missing in this group!' : 'No items.')),
    h('div', { class: 't-card' }, h('h2', {}, 'All items'), h('div', { class: 'rec-list' }, list.map((it, i) => {
      const st = status(it);
      return h('div', { class: 'rec-row' },
        h('span', { class: st === 'ok' ? 'st-ok' : st === 'new' ? 'st-new' : 'st-miss', title: st }, st === 'ok' ? '✔' : st === 'new' ? '●' : '✗'),
        h('code', {}, it.id), h('span', { class: 'say' }, it.say),
        h('button', { class: 'btn btn-small', type: 'button', onclick: () => { index = i; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, 'Go'));
    }))),
    h('div', { class: 't-card' }, h('h2', {}, 'After downloading'),
      h('ol', {}, h('li', {}, 'Unzip into the project folder audio/ (it contains a us/ or gb/ folder).'),
        h('li', {}, 'Run: node tools/build-audio-manifest.mjs'), h('li', {}, 'Commit and deploy. Files are WAV; you may convert them to MP3 with ffmpeg and run the manifest tool again.'))));
}

async function rec() {
  try {
    stream = stream || await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch { alert('The microphone is blocked. Allow it in the browser settings (https or localhost is required).'); return; }
  chunks = [];
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  recorder.start();
  meter();
  draw();
}

async function stop(cur) {
  const r = recorder;
  recorder = null;
  cancelAnimationFrame(meterRaf);
  await new Promise((res) => { r.onstop = res; r.stop(); });
  const wav = await toWav(new Blob(chunks, { type: r.mimeType || 'audio/webm' }));
  const key = `${accent}/${cur.id}`;
  local.set(key, wav);
  await dbPut(key, wav);
  await play(cur);
  if (filter === 'missing') draw(); else { index++; draw(); }
}

function meter() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const an = ctx.createAnalyser();
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Float32Array(an.fftSize);
    const tick = () => {
      if (!recorder) { ctx.close(); return; }
      an.getFloatTimeDomainData(buf);
      let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
      const el = document.getElementById('meter'); if (el) el.style.width = Math.min(100, peak * 140) + '%';
      meterRaf = requestAnimationFrame(tick);
    };
    tick();
  } catch { /* no meter */ }
}

function stopStream() { stream?.getTracks().forEach((t) => t.stop()); stream = null; }

function play(it) {
  const key = `${accent}/${it.id}`;
  const url = local.has(key) ? URL.createObjectURL(new Blob([local.get(key)], { type: 'audio/wav' })) : `audio/${accent}/${it.id}.${server[accent][it.id]}`;
  const a = new Audio(url);
  return new Promise((res) => { a.onended = res; a.onerror = res; a.play().catch(res); });
}

function downloadZip() {
  const files = [...local].filter(([k]) => k.startsWith(accent + '/')).map(([k, v]) => ({ name: `${k}.wav`, data: v }));
  const blob = makeZip(files);
  const a = h('a', { href: URL.createObjectURL(blob), download: `ollie-audio-${accent}-${new Date().toISOString().slice(0, 10)}.zip` });
  document.body.append(a); a.click(); a.remove();
}

start();
