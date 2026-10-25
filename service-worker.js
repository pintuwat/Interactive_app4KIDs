/* Ollie's Phonics service worker.
 * - Precaches the whole app (list in precache.json, version stamped by tools/build-precache.mjs) so it works offline.
 * - Audio recordings live in a separate cache; the page asks us to fetch the child's accent first.
 * - Never touches cross-origin requests (the Phase 2 API) or non-GET requests. */
const VERSION = 'aee107d80d';
const APP_CACHE = 'kp-app-' + VERSION;
const AUDIO_CACHE = 'kp-audio';
const NETWORK_FIRST = ['precache.json', 'env.js', 'audio/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const res = await fetch('precache.json', { cache: 'reload' });
    const { files } = await res.json();
    const cache = await caches.open(APP_CACHE);
    // addAll is all-or-nothing; fetch with reload so the HTTP cache cannot serve stale files.
    await cache.addAll(files.map((f) => new Request(f, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('kp-app-') && k !== APP_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'cache-audio') event.waitUntil(cacheAudio(msg.order || ['us', 'gb']));
  if (msg.type === 'skip-waiting') self.skipWaiting();
});

async function cacheAudio(order) {
  try {
    const res = await fetch('audio/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const manifest = await res.json();
    const cache = await caches.open(AUDIO_CACHE);
    const wanted = new Set();
    for (const accent of order) {
      for (const [id, ext] of Object.entries(manifest[accent] || {})) {
        const url = new URL(`audio/${accent}/${id}.${ext}`, self.registration.scope).href;
        wanted.add(url);
        if (!(await cache.match(url))) {
          try { const r = await fetch(url); if (r.ok) await cache.put(url, r); } catch { /* try again next time */ }
        }
      }
    }
    // drop recordings that were deleted from the server
    for (const req of await cache.keys()) if (!wanted.has(req.url)) await cache.delete(req);
  } catch { /* offline: nothing to do */ }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname.slice(new URL(self.registration.scope).pathname.length);

  if (NETWORK_FIRST.includes(path)) { event.respondWith(networkFirst(req)); return; }
  if (req.mode === 'navigate') { event.respondWith(navigation(req)); return; }
  event.respondWith(cacheFirst(req));
});

async function navigation(req) {
  const cache = await caches.open(APP_CACHE);
  const hit = await cache.match(req.url, { ignoreSearch: true }) || await cache.match('index.html');
  if (hit) return hit;
  try { return await fetch(req); } catch { return (await cache.match('index.html')) || Response.error(); }
}

async function networkFirst(req) {
  const cache = await caches.open(APP_CACHE);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (await (await caches.open(AUDIO_CACHE)).match(req)) || Response.error();
  }
}

async function cacheFirst(req) {
  const hit = (await (await caches.open(APP_CACHE)).match(req.url)) || (await (await caches.open(AUDIO_CACHE)).match(req.url));
  if (hit) return req.headers.has('range') ? rangeResponse(req, hit) : hit;
  try {
    return await fetch(req);
  } catch {
    return Response.error();
  }
}

/** Safari asks for byte ranges on audio; Cache API returns whole bodies, so slice here. */
async function rangeResponse(req, res) {
  const buf = await res.clone().arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range'));
  const start = m && m[1] ? parseInt(m[1], 10) : 0;
  const end = m && m[2] ? Math.min(parseInt(m[2], 10), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`, 'Content-Length': String(end - start + 1) },
  });
}
