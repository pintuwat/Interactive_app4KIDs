// Copies the publishable static site into <out> (default: dist) and stamps the precache list.
// Used by the Dockerfile so server/, tools/, docs and requirement files never reach nginx.
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFiles, build } from './build-precache.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, process.argv[2] || 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of [...listFiles(root), 'service-worker.js']) {
  mkdirSync(join(out, f, '..'), { recursive: true });
  cpSync(join(root, f), join(out, f));
}
if (existsSync(join(root, 'audio'))) cpSync(join(root, 'audio'), join(out, 'audio'), { recursive: true });
execFileSync(process.execPath, [join(root, 'tools/build-audio-manifest.mjs'), out], { stdio: 'inherit' });
console.log(build(out));
