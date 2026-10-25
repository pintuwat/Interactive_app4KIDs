// Which letters/words a child has "unlocked", so games stay at the right level.
// A child starts with the first six letters of the teaching order; each finished letter unlocks more.
import { data, letterById, vocabulary } from '../data.js';
import { starsFor } from '../progress.js';

export function unlockedLetterIds() {
  const path = data.path;
  let done = 0;
  while (done < path.length && starsFor('letter', path[done]) > 0) done++;
  const n = Math.min(path.length, Math.max(6, done + 3));
  const set = new Set(path.slice(0, n));
  for (const id of path) if (starsFor('letter', id) > 0) set.add(id);
  return set;
}

/** Plain single letters (no digraphs) that are unlocked. */
export function gameLetters() {
  const un = unlockedLetterIds();
  return data.path.filter((id) => un.has(id)).map(letterById).filter((l) => l.kind === 'letter');
}

/** Letters that do NOT make the same sound as `l` (so c and k are never both offered). */
export function distractorLetters(l, pool, n) {
  return pool.filter((x) => x.id !== l.id && x.sound !== l.sound).sort(() => Math.random() - 0.5).slice(0, n);
}

/** CVC words whose three letters are all unlocked (falls back to all CVC words when too few). */
export function cvcWords(min = 4) {
  const un = unlockedLetterIds();
  const ok = data.words.filter((w) => !w.weak && [...w.w].every((c) => un.has(c)));
  return ok.length >= min ? ok : data.words.filter((w) => !w.weak);
}

/** Picture vocabulary starting with an unlocked letter (falls back to everything). */
export function pictureWords(min = 6) {
  const un = unlockedLetterIds();
  const all = vocabulary();
  const ok = all.filter((v) => v.first && un.has(v.first));
  return ok.length >= min ? ok : all;
}
