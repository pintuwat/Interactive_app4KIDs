// The ONE module that owns child profiles and progress.
// Screens never touch localStorage or the API directly; they call these functions.
// Storage is layered: local.js always saves; remote adapters (storage/api.js, Phase 2) are
// registered with registerRemote() and receive every change so a database can mirror it.
//
// Item key: `${type}:${id}` where type is letter | word | story | game | sight.
//   item = { s: stars (0-3, best), a: attempts, m: misses, u: last updated (ms) }

import * as local from './storage/local.js';
import { uid } from './util.js';

export const MAX_PROFILES = 5;
export const AVATARS = ['🐶', '🐱', '🐰', '🦊', '🐼', '🐸', '🦁', '🐯', '🐵', '🐧', '🐻', '🦄'];
export const TYPES = ['letter', 'word', 'story', 'game', 'sight'];

const fresh = () => ({ v: 1, profiles: [], currentId: null, settings: { lang: 'en', mute: false, motion: 'auto' } });
let state = normalize(local.load());
const remotes = [];
const handlers = {};

function normalize(s) {
  const base = fresh();
  if (!s || typeof s !== 'object') return base;
  const out = { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) } };
  out.profiles = (s.profiles || []).slice(0, MAX_PROFILES).map((p) => ({
    id: p.id || uid('p'),
    name: String(p.name || 'Friend').slice(0, 12),
    avatar: p.avatar || AVATARS[0],
    accent: p.accent === 'gb' ? 'gb' : 'us',
    level: p.level || 'all',
    items: p.items && typeof p.items === 'object' ? p.items : {},
    stickers: Number(p.stickers) || 0,
    created: p.created || Date.now(),
    cloud: p.cloud || null,
  }));
  if (!out.profiles.find((p) => p.id === out.currentId)) out.currentId = null;
  return out;
}

function persist() { local.save(state); }
function emit(ev, payload) { (handlers[ev] || []).forEach((fn) => fn(payload)); }

export const on = (ev, fn) => {
  (handlers[ev] = handlers[ev] || []).push(fn);
  return () => { handlers[ev] = handlers[ev].filter((f) => f !== fn); };
};

/** Remote adapters implement { onRecord(profile, type, id, item), onProfileRemoved(profile) }. */
export function registerRemote(adapter) { remotes.push(adapter); }

// ---------- profiles ----------
export const profiles = () => state.profiles;
export const currentProfile = () => state.profiles.find((p) => p.id === state.currentId) || null;
export const profileById = (id) => state.profiles.find((p) => p.id === id) || null;

export function createProfile({ name, avatar, accent = 'us', level = 'all' }) {
  if (state.profiles.length >= MAX_PROFILES) return null;
  const p = normalize({ profiles: [{ id: uid('p'), name: (name || '').trim() || 'Friend', avatar, accent, level }] }).profiles[0];
  state.profiles.push(p);
  state.currentId = p.id;
  persist();
  emit('profiles', p);
  return p;
}

export function updateProfile(id, patch) {
  const p = profileById(id);
  if (!p) return null;
  if ('name' in patch) p.name = String(patch.name).trim().slice(0, 12) || p.name;
  if ('avatar' in patch) p.avatar = patch.avatar;
  if ('accent' in patch) p.accent = patch.accent === 'gb' ? 'gb' : 'us';
  if ('level' in patch) p.level = patch.level;
  if ('cloud' in patch) p.cloud = patch.cloud;
  persist();
  emit('profiles', p);
  return p;
}

export function deleteProfile(id) {
  const p = profileById(id);
  if (!p) return;
  state.profiles = state.profiles.filter((x) => x.id !== id);
  if (state.currentId === id) state.currentId = null;
  persist();
  remotes.forEach((r) => r.onProfileRemoved?.(p));
  emit('profiles', null);
}

export function selectProfile(id) {
  if (!profileById(id)) return null;
  state.currentId = id;
  persist();
  emit('profiles', currentProfile());
  return currentProfile();
}

export function signOutProfile() {
  state.currentId = null;
  persist();
  emit('profiles', null);
}

// ---------- settings (device wide) ----------
export const settings = () => state.settings;
export function setSetting(key, value) {
  state.settings[key] = value;
  persist();
  emit('settings', state.settings);
}

// ---------- progress ----------
const key = (type, id) => `${type}:${id}`;

export function getItem(type, id, profile = currentProfile()) {
  return profile?.items[key(type, id)] || null;
}

export const starsFor = (type, id, profile = currentProfile()) => getItem(type, id, profile)?.s || 0;
export const isDone = (type, id, profile = currentProfile()) => starsFor(type, id, profile) > 0;

/**
 * Record an attempt/result. stars only ever go up (best result is kept).
 * Returns the number of NEW stars earned (so the UI can celebrate).
 */
export function record(type, id, { stars = 0, attempts = 1, misses = 0 } = {}) {
  const p = currentProfile();
  if (!p) return 0;
  const k = key(type, id);
  const item = p.items[k] || { s: 0, a: 0, m: 0, u: 0 };
  const gained = Math.max(0, Math.min(3, stars) - item.s);
  item.s += gained;
  item.a += attempts;
  item.m += misses;
  item.u = Date.now();
  p.items[k] = item;
  const before = p.stickers;
  const owed = stickersOwed(p);
  if (owed > before) p.stickers = owed;
  persist();
  remotes.forEach((r) => r.onRecord?.(p, type, id, item));
  emit('change', { type, id, gained });
  if (owed > before) emit('sticker', { count: owed, index: owed - 1 });
  return gained;
}

export function totalStars(profile = currentProfile()) {
  if (!profile) return 0;
  return Object.values(profile.items).reduce((n, i) => n + (i.s || 0), 0);
}

export function stickersOwed(profile, perSticker = 5, max = 999) {
  return Math.min(max, Math.floor(totalStars(profile) / (stickersPer.value || perSticker)));
}
export const stickersPer = { value: 5 };

export function doneCount(type, profile = currentProfile()) {
  if (!profile) return 0;
  const pre = type + ':';
  return Object.entries(profile.items).filter(([k, v]) => k.startsWith(pre) && v.s > 0).length;
}

export function items(type, profile = currentProfile()) {
  if (!profile) return [];
  const pre = type + ':';
  return Object.entries(profile.items).filter(([k]) => k.startsWith(pre)).map(([k, v]) => ({ id: k.slice(pre.length), ...v }));
}

export function resetProfile(id) {
  const p = profileById(id);
  if (!p) return;
  p.items = {};
  p.stickers = 0;
  persist();
  emit('change', { reset: true });
}

// ---------- export / import ----------
export function exportData(profileId) {
  const list = profileId ? state.profiles.filter((p) => p.id === profileId) : state.profiles;
  const clean = list.map(({ cloud, ...rest }) => rest); // never export cloud tokens
  return JSON.stringify({ app: 'kids-phonics', version: 1, exported: new Date().toISOString(), profiles: clean }, null, 1);
}

/** Merge an exported file into this device. Best stars win. Returns a summary. */
export function importData(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { return { ok: false, error: 'not-json' }; }
  if (obj?.app !== 'kids-phonics' || !Array.isArray(obj.profiles)) return { ok: false, error: 'wrong-file' };
  let added = 0, merged = 0, skipped = 0;
  for (const raw of obj.profiles) {
    const incoming = normalize({ profiles: [raw] }).profiles[0];
    if (!incoming) continue;
    const existing = state.profiles.find((p) => p.id === incoming.id);
    if (existing) {
      for (const [k, v] of Object.entries(incoming.items)) {
        const cur = existing.items[k];
        if (!cur) existing.items[k] = v;
        else existing.items[k] = { s: Math.max(cur.s, v.s), a: Math.max(cur.a, v.a), m: Math.max(cur.m, v.m), u: Math.max(cur.u, v.u) };
      }
      existing.stickers = Math.max(existing.stickers, stickersOwed(existing));
      merged++;
    } else if (state.profiles.length < MAX_PROFILES) {
      incoming.stickers = Math.max(incoming.stickers, stickersOwed(incoming));
      state.profiles.push(incoming);
      added++;
    } else skipped++;
  }
  persist();
  emit('profiles', null);
  emit('change', { imported: true });
  return { ok: true, added, merged, skipped };
}

/** Replace the whole progress with the server copy (used on first sync of a class profile). */
export function mergeItems(profileId, remoteItems) {
  const p = profileById(profileId);
  if (!p) return;
  for (const [k, v] of Object.entries(remoteItems)) {
    const cur = p.items[k];
    if (!cur || (v.u || 0) > (cur.u || 0)) p.items[k] = { s: Math.max(v.s, cur?.s || 0), a: v.a, m: v.m, u: v.u };
  }
  persist();
  emit('change', { merged: true });
}
