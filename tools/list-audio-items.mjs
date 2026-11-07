// Prints every spoken item of the app as JSON { us: [{group, id, say}], gb: [...] } (the same list record-audio.html shows).
// Used by tools/kokoro-tts.py. Usage: node tools/list-audio-items.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
globalThis.fetch = async (url) => ({ ok: true, json: async () => JSON.parse(readFileSync(root + url, 'utf8')) });
const { loadData, data } = await import('../js/data.js');
const { buildItems } = await import('../js/recorder/items.js');
await loadData();
console.log(JSON.stringify({ us: buildItems(data, 'us'), gb: buildItems(data, 'gb') }));
