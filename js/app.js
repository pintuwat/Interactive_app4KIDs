// App shell: loads data, wires the header, profile accent, celebrations, then starts the router.
import { loadData, data } from './data.js';
import { audio } from './audio.js';
import { sfx } from './sfx.js';
import * as progress from './progress.js';
import * as router from './router.js';
import { h, burst } from './util.js';
import { t } from './i18n.js';
import { startSync } from './sync.js';

const $ = (id) => document.getElementById(id);

const app = {
  data, audio, sfx, progress, t,
  nav: (path) => router.navigate(path),
  header({ title = '', back = '/', hide = false } = {}) {
    $('title').textContent = title;
    const bar = $('topbar');
    bar.hidden = hide || !progress.currentProfile();
    const btn = $('btn-back');
    btn.hidden = !back;
    btn.dataset.target = back || '';
    btn.textContent = back === '/' ? '\u{1F3E0}' : '←';
    btn.setAttribute('aria-label', back === '/' ? 'Home' : 'Back');
    refreshChrome();
  },
  /** Big full-screen celebration. Resolves when dismissed (or after a timeout). */
  celebrate({ emoji = '⭐', text = '', voiceKey } = {}) {
    return new Promise((resolve) => {
      const card = h('button', { class: 'celebrate', type: 'button', onclick: close }, h('span', { class: 'celebrate-emoji', 'aria-hidden': 'true' }, emoji), h('span', { class: 'celebrate-text' }, text));
      $('overlay').append(card);
      burst(card);
      sfx.star();
      if (voiceKey) audio.prompt(voiceKey);
      const timer = setTimeout(close, 3200);
      function close() { clearTimeout(timer); card.remove(); resolve(); }
    });
  },
};
window.__app = app;

function refreshChrome() {
  const p = progress.currentProfile();
  $('stars').textContent = progress.totalStars();
  const av = $('btn-profile');
  av.textContent = p ? p.avatar : '';
  av.setAttribute('aria-label', p ? `${p.name}. Change player` : 'Change player');
}

function applySettings() {
  const s = progress.settings();
  const reduce = s.motion === 'reduce' || (s.motion === 'auto' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  document.documentElement.dataset.motion = reduce ? 'reduce' : 'full';
  sfx.setMuted(s.mute);
}

function applyProfile() {
  const p = progress.currentProfile();
  audio.setAccent(p ? p.accent : 'us');
  refreshChrome();
}

// Offline mode. On localhost the worker stays OFF unless you run  localStorage.setItem('kp.sw', '1')  in the console,
// so editing files during development never serves stale cached code.
function registerWorker() {
  if (!('serviceWorker' in navigator)) return;
  const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  let allowLocal = false;
  try { allowLocal = localStorage.getItem('kp.sw') === '1'; } catch { /* ignore */ }
  if (location.protocol !== 'https:' && !(local && allowLocal)) return;
  navigator.serviceWorker.register('service-worker.js').then(() => cacheAudio())
    .catch(() => { /* offline mode unavailable, site still works */ });
}

/** Ask the worker to download recordings, the child's accent first. */
function cacheAudio() {
  if (!('serviceWorker' in navigator)) return;
  const first = audio.accent;
  navigator.serviceWorker.ready
    .then((reg) => reg.active?.postMessage({ type: 'cache-audio', order: [first, first === 'us' ? 'gb' : 'us'] }))
    .catch(() => {});
}

async function boot() {
  await loadData();
  progress.stickersPer.value = data.starsPerSticker;
  await audio.init();
  applySettings();
  applyProfile();

  $('btn-back').addEventListener('click', () => {
    const target = $('btn-back').dataset.target;
    if (target) router.navigate(target);
  });
  $('btn-profile').addEventListener('click', () => router.navigate('/profiles'));

  progress.on('profiles', () => { applyProfile(); applySettings(); cacheAudio(); });
  progress.on('settings', applySettings);
  progress.on('change', refreshChrome);
  progress.on('sticker', async ({ index }) => {
    const emoji = data.stickers[index % data.stickers.length];
    await app.celebrate({ emoji, text: 'New sticker!', voiceKey: 'new_sticker' });
  });

  startSync(app);
  registerWorker();

  if (!progress.currentProfile() && location.hash !== '#/parent') location.hash = '#/profiles';
  await router.start(app);
}

boot().catch((err) => {
  console.error(err);
  $('screen').replaceChildren(h('p', { class: 'oops' }, 'Oops! Please reload the page.'));
});
