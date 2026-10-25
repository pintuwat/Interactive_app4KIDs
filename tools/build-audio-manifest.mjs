// Scans audio/us and audio/gb and writes audio/manifest.json = { us: { "sound-a": "mp3" }, gb: {...} }.
// audio.js reads this so it never requests a recording that does not exist.
// Usage: node tools/build-audio-manifest.mjs [dir]   (default: repo root)
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] || fileURLToPath(new URL('..', import.meta.url));
const OK = new Set(['.mp3', '.m4a', '.wav', '.ogg', '.webm']);
const manifest = { us: {}, gb: {} };
for (const accent of Object.keys(manifest)) {
  const dir = join(root, 'audio', accent);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    const ext = extname(f).toLowerCase();
    if (OK.has(ext)) manifest[accent][basename(f, extname(f))] = ext.slice(1);
  }
}
writeFileSync(join(root, 'audio', 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`audio manifest: us=${Object.keys(manifest.us).length}, gb=${Object.keys(manifest.gb).length}`);
