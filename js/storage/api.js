// Storage adapter #2: mirrors a class-linked profile's progress to the Phase 2 API.
// Local-first: progress.js has ALREADY saved to localStorage; this adapter queues changes in an outbox and
// sends them when online. Playing offline never fails and nothing is lost if the network drops.
import { config } from '../config.js';
import * as progress from '../progress.js';

const OUTBOX_KEY = 'kidsphonics.outbox.v1';   // { [profileId]: { "letter:s": {type,id,stars,attempts,misses,updated} } }
const FLUSH_DELAY = 1500;
let timer = null;
let busy = false;
let started = false;
const listeners = new Set();

const base = () => config.apiUrl.replace(/\/+$/, '');

function readBox() {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY)) || {}; } catch { return {}; }
}
function writeBox(box) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(box)); } catch { /* storage blocked: sync is best effort */ }
}

export const pendingCount = (profileId) => Object.keys(readBox()[profileId] || {}).length;
export const onSyncChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const notify = () => listeners.forEach((f) => f());

/** Low-level API call. Students use a bearer token (no cookies are sent). */
export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (method !== 'GET') headers['X-Requested-With'] = 'kp';
  const res = await fetch(base() + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: 'omit' });
  let json = null;
  try { json = await res.json(); } catch { /* 204 */ }
  return { ok: res.ok, status: res.status, json };
}

export const lookupClass = (code) => api(`/api/join/${encodeURIComponent(code)}`);
export const joinClass = (payload) => api('/api/join', { method: 'POST', body: payload });

/** Connect a local profile to a student record and upload what it already has. */
export function linkProfile(profileId, { token, student, className, code }) {
  progress.updateProfile(profileId, { cloud: { token, studentId: student.id, nickname: student.nickname, className, code: String(code).toUpperCase() } });
  const p = progress.profileById(profileId);
  const box = readBox();
  box[profileId] = box[profileId] || {};
  for (const [k, v] of Object.entries(p.items)) {
    const [type, ...rest] = k.split(':');
    box[profileId][k] = { type, id: rest.join(':'), stars: v.s, attempts: v.a, misses: v.m, updated: v.u };
  }
  writeBox(box);
  pull(p).then(() => flushAll());
}

export function unlinkProfile(profileId) {
  progress.updateProfile(profileId, { cloud: null });
  const box = readBox();
  delete box[profileId];
  writeBox(box);
  notify();
}

/** Ask the server to erase this child (PDPA), then unlink. */
export async function eraseCloud(profileId) {
  const p = progress.profileById(profileId);
  if (!p?.cloud) return { ok: true };
  const r = await api('/api/me', { method: 'DELETE', token: p.cloud.token });
  if (r.ok || r.status === 401) { unlinkProfile(profileId); return { ok: true }; }
  return { ok: false };
}

function onRecord(profile, type, id, item) {
  if (!profile.cloud || profile.cloud.invalid) return;
  const box = readBox();
  (box[profile.id] = box[profile.id] || {})[`${type}:${id}`] = { type, id, stars: item.s, attempts: item.a, misses: item.m, updated: item.u };
  writeBox(box);
  notify();
  clearTimeout(timer);
  timer = setTimeout(flushAll, FLUSH_DELAY);
}

// Deleting a profile on ONE device must not erase the child's class record (they may use another tablet).
// Erasing online data is an explicit action in the Parent corner (eraseCloud).
function onProfileRemoved(profile) {
  const box = readBox();
  delete box[profile.id];
  writeBox(box);
}

export async function pull(profile) {
  if (!profile?.cloud || profile.cloud.invalid || !navigator.onLine) return;
  try {
    const r = await api('/api/me/progress', { token: profile.cloud.token });
    if (r.ok) progress.mergeItems(profile.id, r.json.items);
    else if (r.status === 401) markInvalid(profile);
  } catch { /* offline */ }
}

function markInvalid(profile) {
  progress.updateProfile(profile.id, { cloud: { ...profile.cloud, invalid: true } });
  notify();
}

export async function flushAll() {
  if (busy || !navigator.onLine) return;
  busy = true;
  try {
    for (const p of progress.profiles()) {
      if (!p.cloud || p.cloud.invalid) continue;
      const box = readBox();
      const entries = Object.entries(box[p.id] || {});
      for (let i = 0; i < entries.length; i += 200) {
        const chunk = entries.slice(i, i + 200);
        let r;
        try { r = await api('/api/me/progress', { method: 'PUT', token: p.cloud.token, body: { items: chunk.map(([, v]) => v) } }); } catch { return; }
        if (r.status === 401 || r.status === 404) { markInvalid(p); break; }
        if (!r.ok) break; // try again later; items stay queued
        const fresh = readBox();
        for (const [k, v] of chunk) if (fresh[p.id]?.[k]?.updated === v.updated) delete fresh[p.id][k]; // keep anything changed meanwhile
        writeBox(fresh);
      }
    }
  } finally { busy = false; notify(); }
}

export function startApiSync() {
  if (started) return;
  started = true;
  progress.registerRemote({ onRecord, onProfileRemoved });
  window.addEventListener('online', flushAll);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) flushAll(); });
  setInterval(flushAll, 60000);
  progress.profiles().forEach((p) => pull(p));
  flushAll();
}
