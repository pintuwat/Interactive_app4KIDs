// Writes <dir>/precache.json (list of app files + content hash) and stamps the hash into <dir>/service-worker.js,
// so every release gets a new cache automatically. Usage: node tools/build-precache.mjs [dir]   (default: repo root)
// Audio recordings are NOT precached here: the service worker fetches them per accent (see service-worker.js).
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SKIP_DIRS = new Set(['node_modules', 'server', 'tools', 'Requirement', 'audio', '.git', '.claude']);
const SKIP_FILES = new Set(['precache.json', 'service-worker.js', 'env.js', 'Dockerfile', 'nginx.conf', '.DS_Store', '.gitignore', '.dockerignore', 'security-headers.conf']);
const EXT = new Set(['.html', '.css', '.js', '.json', '.svg', '.png', '.jpg', '.webp', '.ico', '.woff2']);

export function listFiles(dir) {
  const out = [];
  (function walk(d) {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) { if (!SKIP_DIRS.has(name)) walk(p); continue; }
      if (SKIP_FILES.has(name) || !EXT.has(extname(name))) continue;
      out.push(relative(dir, p).split(sep).join('/'));
    }
  })(dir);
  return out;
}

export function build(dir) {
  const files = listFiles(dir);
  const hash = createHash('sha1');
  for (const f of files) { hash.update(f); hash.update(readFileSync(join(dir, f))); }
  const sw = readFileSync(join(dir, 'service-worker.js'), 'utf8');
  hash.update(sw.replace(/const VERSION = '[^']*';/, ''));
  const version = hash.digest('hex').slice(0, 10);
  writeFileSync(join(dir, 'precache.json'), JSON.stringify({ version, files: ['./', ...files] }, null, 1));
  writeFileSync(join(dir, 'service-worker.js'), sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`));
  return { version, count: files.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] || fileURLToPath(new URL('..', import.meta.url));
  const { version, count } = build(dir);
  console.log(`precache: ${count} files, version ${version}`);
}
