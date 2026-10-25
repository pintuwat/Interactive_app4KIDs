// Plain SQL migrations: every migrations/*.sql file runs once, in name order. No ORM.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const dir = fileURLToPath(new URL('../migrations', import.meta.url));

export async function migrate(db) {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const done = new Set((await db.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    await db.query(readFileSync(join(dir, f), 'utf8'));
    await db.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
    console.log('migrated', f);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { createPool } = await import('./db.js');
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL is not set'); process.exit(1); }
  const db = createPool(url);
  try { await migrate(db); console.log('migrations up to date'); } finally { await db.close(); }
}
