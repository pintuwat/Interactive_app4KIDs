// Sanity checks for the lesson data files. Exit code 1 on any problem.
import { readFileSync, existsSync } from 'node:fs';
const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url), 'utf8'));
const letters = read('letters'), words = read('words'), stories = read('stories'), sight = read('sightwords'), levels = read('levels'), prompts = read('prompts');
const errors = [];
const err = (m) => errors.push(m);

const ids = new Set(letters.items.map((l) => l.id));
if (ids.size !== letters.items.length) err('duplicate letter ids');
for (const id of [...letters.path, ...letters.extras]) if (!ids.has(id)) err(`path/extras references unknown letter ${id}`);
const plain = letters.items.filter((l) => l.kind === 'letter').map((l) => l.lower).sort().join('');
if (plain !== 'abcdefghijklmnopqrstuvwxyz') err('A-Z letters incomplete: ' + plain);
const order = 's a t p i n m d g o c k ck e u r h b f l j v w x y z q'.split(' ');
if (JSON.stringify(order) !== JSON.stringify(letters.path)) err('teaching order differs from CLAUDE.md');
for (const l of letters.items) {
  if (!l.tts || !l.name || !l.sound || !l.hint) err(`letter ${l.id}: missing tts/name/sound/hint`);
  if (l.words.length !== 3) err(`letter ${l.id}: needs exactly 3 sample words`);
  for (const [w, e] of l.words) if (!w || !e) err(`letter ${l.id}: bad word entry`);
}
const fam = new Set(words.families.map((f) => f.id));
if (words.words.length < 60) err(`only ${words.words.length} CVC words (need 60+)`);
for (const w of words.words) {
  if (w.w.length !== 3) err(`CVC word not 3 letters: ${w.w}`);
  if (!fam.has(w.f) || !w.w.endsWith(w.f)) err(`word ${w.w} does not belong to family ${w.f}`);
  if (typeof w.e === 'string' && w.e.startsWith('svg:') && !existsSync(new URL(`../assets/svg/${w.e.slice(4)}.svg`, import.meta.url))) err(`missing svg for ${w.w}`);
  for (const c of w.w) if (!ids.has(c)) err(`word ${w.w}: unknown letter ${c}`);
}
for (const f of 'at an ap ig in ip op ot og ug un ut en et'.split(' ')) if (!fam.has(f)) err(`family -${f} missing`);
const s = stories.stories;
for (const st of s) {
  const n = st.pages.reduce((a, p) => a + p.text.split(/\s+/).length, 0);
  if (n < 60 || n > 120) err(`story ${st.id}: ${n} words`);
  if (st.pages.length < 4 || st.pages.length > 6) err(`story ${st.id}: ${st.pages.length} pages`);
  if (!st.questions || st.questions.length < 2 || st.questions.length > 3) err(`story ${st.id}: needs 2-3 questions`);
  for (const q of st.questions || []) if (!q.choices[q.answer]) err(`story ${st.id}: bad answer index`);
}
if (new Set(s.map((x) => x.id)).size !== s.length) err('duplicate story ids');
if (sight.words.length < 40) err('sight words < 40');
for (const [k, v] of Object.entries(prompts.prompts)) if (v.split(/\s+/).length > 6) err(`prompt ${k} longer than 6 words`);
for (const k of ['1', '2', '3', 'all']) if (!levels.levels[k]) err('level ' + k + ' missing');

console.log(`${letters.items.length} sounds, ${words.words.length} CVC words, ${s.length} stories, ${sight.words.length} sight words, ${Object.keys(prompts.prompts).length} prompts`);
if (errors.length) { console.error('\n' + errors.map((e) => '✗ ' + e).join('\n')); process.exit(1); }
console.log('Data OK');
