// Verifies every story word is either a sight word or can be sounded out with the sounds taught up to that story.
// Prints a teacher review list (sight vs decodable vs US/UK differences). Exit code 1 if any word fails.
import { readFileSync } from 'node:fs';
import { isDecodable, isTarget, clean, accentNote, splitWords } from '../js/phonics.js';

const file = new URL('../data/stories.json', import.meta.url);
const { meta, stories } = JSON.parse(readFileSync(file, 'utf8'));
const sight = new Set(meta.sight.map((w) => w.toLowerCase()));
let bad = 0;

for (const [i, s] of stories.entries()) {
  const sightS = new Set([...sight, ...(s.extraSight || [])]);
  const dec = new Map(), sig = new Map(), diff = new Map(), fail = new Map(), tgt = new Set();
  let n = 0;
  for (const [pi, p] of s.pages.entries()) {
    for (const raw of splitWords(p.text)) {
      const w = clean(raw);
      if (!w) continue;
      n++;
      if (sightS.has(w)) { sig.set(w, (sig.get(w) || 0) + 1); continue; }
      if (isDecodable(w, s.taught)) {
        dec.set(w, (dec.get(w) || 0) + 1);
        if (isTarget(w, s.target)) tgt.add(w);
        const note = accentNote(w);
        if (note) diff.set(w, note);
      } else fail.set(w, `page ${pi + 1}`);
    }
  }
  const sizeOk = n >= 60 && n <= 120, pagesOk = s.pages.length >= 4 && s.pages.length <= 6;
  console.log(`\n${i + 1}. ${s.title}  [${s.focus}]  ${n} words, ${s.pages.length} pages ${sizeOk && pagesOk ? '' : '  <-- SIZE PROBLEM'}`);
  console.log(`   taught: ${s.taught.join(' ')}   target: ${s.target}`);
  console.log(`   sight words used (${sig.size}): ${[...sig.keys()].join(', ')}`);
  console.log(`   decodable (${dec.size}): ${[...dec.keys()].join(', ')}`);
  console.log(`   target-sound words (${tgt.size}): ${[...tgt].join(', ')}`);
  if (diff.size) console.log(`   US/UK differences: ${[...diff].map(([w, n2]) => `${w} (${n2})`).join('; ')}`);
  if (fail.size) { bad += fail.size; console.log(`   !! NOT DECODABLE: ${[...fail].map(([w, where]) => `${w} (${where})`).join(', ')}`); }
  if (!sizeOk || !pagesOk) bad++;
  if (tgt.size < 5) { bad++; console.log('   !! too few target-sound words'); }
}
console.log(bad ? `\n${bad} problem(s) found.` : '\nAll stories pass.');
process.exit(bad ? 1 : 0);
