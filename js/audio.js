// The ONLY place that makes sound. Order of preference for any spoken item:
//   1. a recorded file  /audio/<accent>/<id>.<ext>   (listed in /audio/manifest.json, so no 404 spam)
//   2. browser speechSynthesis with a voice for the same accent (en-US or en-GB)
// All speaking functions return a Promise that always resolves (never rejects) when the sound ends or is cut off.

import { data, byAccent } from './data.js';

const LANG = { us: 'en-US', gb: 'en-GB' };
const KID_RATE = 0.8;       // slow, clear speech for children
const STORY_RATE = 0.7;     // even slower at bedtime

let accent = 'us';
let manifest = { us: {}, gb: {} };
let voices = [];
let token = 0;              // each new sound cancels the previous one
let currentAudio = null;
let unlocked = false;
const listeners = new Set();

const GOOD_NAMES = {
  us: [/samantha/i, /ava\b/i, /allison/i, /nicky/i, /google us english/i, /aria/i, /jenny/i, /zira/i],
  gb: [/daniel/i, /kate/i, /serena/i, /martha/i, /google uk english female/i, /google uk english male/i, /libby/i, /sonia/i, /hazel/i],
};
const QUALITY = /(premium|enhanced|natural|neural|siri)/i;

function refreshVoices() {
  if (!('speechSynthesis' in window)) return;
  voices = window.speechSynthesis.getVoices() || [];
  listeners.forEach((fn) => fn());
}

export const audio = {
  get accent() { return accent; },

  async init() {
    try {
      const r = await fetch('audio/manifest.json', { cache: 'no-cache' });
      if (r.ok) manifest = { us: {}, gb: {}, ...(await r.json()) };
    } catch { /* offline or no recordings yet: speech only */ }
    if ('speechSynthesis' in window) {
      refreshVoices();
      window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
    }
    // Speech and audio need one user gesture on iOS before they may play.
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      try {
        if ('speechSynthesis' in window) {
          const u = new SpeechSynthesisUtterance(' ');
          u.volume = 0;
          window.speechSynthesis.speak(u);
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  },

  setAccent(a) { accent = a === 'gb' ? 'gb' : 'us'; },

  onVoicesChanged(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /** Is there a speech voice (or recorded audio) for this accent on this device? */
  voiceStatus(a = accent) {
    const v = pickVoice(a);
    const recorded = Object.keys(manifest[a] || {}).length;
    return { found: !!v, name: v ? v.name : '', recorded, supported: 'speechSynthesis' in window };
  },

  hasRecording(id, a = accent) { return !!manifest[a]?.[id]; },

  stop() {
    token++;
    stopCurrent();
  },

  /**
   * Speak/play one item.
   * opts: { id, text, rate, pitch, accent, onBoundary(charIndex), onStart({recorded,duration}) }
   * text may be a string or {us, gb}.
   */
  play(opts) {
    const myToken = ++token;
    stopCurrent();
    const a = opts.accent || accent;
    const text = byAccent(opts.text, a);
    const ext = opts.id && manifest[a]?.[opts.id];
    if (ext) {
      return playFile(`audio/${a}/${opts.id}.${ext}`, myToken, opts).then((ok) => (ok ? undefined : speak(text, a, myToken, opts)));
    }
    return speak(text, a, myToken, opts);
  },

  // --- convenient wrappers: every call states the id so recordings and speech stay in sync ---
  sound(item, o = {}) { return this.play({ id: `sound-${item.id}`, text: item.tts, rate: KID_RATE * 0.9, ...o }); },
  letterName(item, o = {}) { return this.play({ id: `name-${item.id}`, text: item.name, rate: KID_RATE, ...o }); },
  word(w, o = {}) { return this.play({ id: `word-${w.toLowerCase()}`, text: w, rate: KID_RATE, ...o }); },
  sight(w, o = {}) { return this.play({ id: `sight-${w.toLowerCase()}`, text: w, rate: KID_RATE, ...o }); },
  prompt(key, o = {}) {
    const text = data.prompts[key];
    if (!text) return Promise.resolve();
    return this.play({ id: `prompt-${key}`, text, rate: KID_RATE, ...o });
  },
  praise(o = {}) { return this.prompt('praise_' + (1 + Math.floor(Math.random() * 5)), o); },
  retry(o = {}) { return this.prompt('retry_' + (1 + Math.floor(Math.random() * 3)), o); },
  storyText(storyId, page, text, o = {}) {
    return this.play({ id: `story-${storyId}-${page}`, text, rate: STORY_RATE, ...o });
  },

  KID_RATE, STORY_RATE,
};

function stopCurrent() {
  if (currentAudio) {
    try { currentAudio.pause(); } catch { /* ignore */ }
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }
}

function playFile(url, myToken, opts) {
  return new Promise((resolve) => {
    const el = new Audio(url);
    currentAudio = el;
    let done = false;
    const finish = (ok) => { if (!done) { done = true; resolve(ok); } };
    el.addEventListener('loadedmetadata', () => opts.onStart?.({ recorded: true, duration: el.duration * 1000 }));
    el.addEventListener('ended', () => finish(true));
    el.addEventListener('error', () => finish(false));
    el.play().then(() => { if (myToken !== token) { el.pause(); finish(true); } }).catch(() => finish(false));
    el.addEventListener('pause', () => { if (myToken !== token) finish(true); });
  });
}

function speak(text, a, myToken, opts) {
  return new Promise((resolve) => {
    if (!text || !('speechSynthesis' in window)) { resolve(); return; }
    let done = false;
    const finish = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG[a];
    const v = pickVoice(a);
    if (v) u.voice = v;
    u.rate = opts.rate || KID_RATE;
    u.pitch = opts.pitch || 1.05;
    u.onend = finish;
    u.onerror = finish;
    if (opts.onBoundary) u.onboundary = (e) => { if (myToken === token && e.name !== 'sentence') opts.onBoundary(e.charIndex); };
    u.onstart = () => opts.onStart?.({ recorded: false, duration: estimate(text, u.rate) });
    // Some browsers never fire onend; never leave a game waiting.
    const timer = setTimeout(finish, estimate(text, u.rate) + 2500);
    try {
      window.speechSynthesis.speak(u);
    } catch { finish(); }
    // If we were cancelled by a newer sound, resolve soon after.
    const watch = setInterval(() => { if (myToken !== token || done) { clearInterval(watch); finish(); } }, 120);
  });
}

function estimate(text, rate) {
  return Math.max(700, (text.length * 95) / (rate || 1));
}

function pickVoice(a) {
  if (!voices.length) return null;
  const want = LANG[a].toLowerCase();
  const norm = (v) => (v.lang || '').replace('_', '-').toLowerCase();
  const cands = voices.filter((v) => norm(v) === want);
  if (!cands.length) return null;
  const score = (v) => {
    let s = 0;
    if (QUALITY.test(v.name)) s += 4;
    GOOD_NAMES[a].forEach((re, i) => { if (re.test(v.name)) s += 3 - Math.min(i, 2) * 0.1; });
    if (v.localService) s += 1;
    return s;
  };
  return cands.sort((x, y) => score(y) - score(x))[0];
}

