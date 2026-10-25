// Tiny database wrapper: db.query(sql, params) -> { rows }. Parameterized queries only.
// Production uses node-postgres; tests inject an in-process PGlite with the same shape.
import pg from 'pg';

export function createPool(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10, idleTimeoutMillis: 30000 });
  pool.on('error', (e) => console.error('db pool error', e.code || e.message));
  return {
    query: (text, params = []) => pool.query(text, params),
    close: () => pool.end(),
  };
}
