// Every spoken item in the app, with the audio id audio.js looks for (/audio/<accent>/<id>.<ext>).
import { byAccent } from '../data.js';
import { clean, splitWords } from '../phonics.js';

export function buildItems(data, accent) {
  const items = [];
  const seen = new Set();
  const add = (group, id, say, hint = '') => { if (!seen.has(id)) { seen.add(id); items.push({ group, id, say, hint }); } };
  for (const l of data.letters) {
    add('Letter sounds', `sound-${l.id}`, l.sound, `Say only the SOUND, short and clear (${l.hint})`);
    add('Letter names', `name-${l.id}`, byAccent(l.name, accent).replace(/^(.)/, (c) => c.toUpperCase()), l.kind === 'letter' ? `The letter NAME of ${l.upper}` : `Name of ${l.lower}`);
  }
  for (const l of data.letters) for (const w of l.words) add('Words', `word-${w.w.toLowerCase()}`, w.w);
  for (const w of data.words) add('Words', `word-${w.w}`, w.w);
  for (const w of data.sightwords) add('Words', `word-${w.toLowerCase()}`, w);
  for (const s of data.stories) for (const p of s.pages) for (const t of splitWords(p.text)) { const w = clean(t); if (w) add('Story words', `word-${w}`, w); }
  for (const [k, v] of Object.entries(data.prompts)) add('Instructions', `prompt-${k}`, v);
  for (const s of data.stories) {
    s.pages.forEach((p, i) => add(`Stories`, `story-${s.id}-${i + 1}`, p.text, `${s.title}, page ${i + 1}. Read slowly and calmly.`));
    (s.questions || []).forEach((q, i) => add(`Stories`, `story-${s.id}-q${i + 1}`, q.q, `${s.title}, question ${i + 1}`));
  }
  return items;
}
