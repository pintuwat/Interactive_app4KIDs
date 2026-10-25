// Test harness: in-process PostgreSQL (PGlite) + the real Express app on a random port.
import { PGlite } from '@electric-sql/pglite';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { migrate } from '../src/migrate.js';

export async function memoryDb() {
  const pg = new PGlite();
  await pg.waitReady;
  return {
    async query(text, params = []) {
      if (!params.length && /;\s*\S/.test(text)) { // multi-statement migration file
        const rs = await pg.exec(text);
        return { rows: rs.at(-1)?.rows || [], rowCount: 0 };
      }
      const r = await pg.query(text, params);
      return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length };
    },
    close: () => pg.close(),
  };
}

export async function startServer(overrides = {}) { return startServerOn(0, overrides); }

export async function startServerOn(port, overrides = {}) {
  const db = await memoryDb();
  await migrate(db);
  const config = { ...loadConfig({ JWT_SECRET: 'x'.repeat(40), CORS_ORIGIN: 'https://site.test', RATE_LIMIT: 'off', BCRYPT_ROUNDS: '4' }), ...overrides };
  const app = createApp({ db, config });
  const server = await new Promise((res) => { const s = app.listen(port, '127.0.0.1', () => res(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { db, base, config, close: async () => { await new Promise((r) => server.close(r)); await db.close(); } };
}

/** Minimal API client with its own cookie jar (one per "person"). */
export function client(base) {
  let cookie = '';
  async function call(method, path, { body, token, headers = {} } = {}) {
    const h = { ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (cookie) h.Cookie = cookie;
    if (token) h.Authorization = `Bearer ${token}`;
    if (method !== 'GET' && !('X-Requested-With' in h)) h['X-Requested-With'] = 'kp';
    const res = await fetch(base + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
    const set = res.headers.getSetCookie?.() || [];
    for (const c of set) {
      const [pair] = c.split(';');
      if (/=;?$/.test(pair) || /Expires=Thu, 01 Jan 1970/.test(c)) cookie = '';
      else cookie = pair;
    }
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* csv or empty */ }
    return { status: res.status, json, text, headers: res.headers };
  }
  return { get: (p, o) => call('GET', p, o), post: (p, body, o) => call('POST', p, { body, ...o }), put: (p, body, o) => call('PUT', p, { body, ...o }), del: (p, o) => call('DELETE', p, o), call };
}

export async function registerTeacher(api, email = 't@example.com', password = 'correct-horse-battery') {
  const r = await api.post('/api/teacher/register', { email, password });
  if (r.status !== 201) throw new Error('register failed ' + r.status + ' ' + r.text);
  return r.json.teacher;
}
