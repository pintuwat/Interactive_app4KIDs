// Loads the JSON lesson data once and exposes small helpers over it.
// All lesson content lives in /data; nothing about letters, words or stories is hard-coded elsewhere.

export const data = {
  letters: [], path: [], extras: [], words: [], families: [], prompts: {},
  sightwords: [], stickers: [], starsPerSticker: 5, levels: {}, i18n: {}, stories: [], storyMeta: {},
};

let loaded = null;

export function loadData() {
  if (loaded) return loaded;
  loaded = (async () => {
    const get = (f) => fetch(`data/${f}.json`).then((r) => {
      if (!r.ok) throw new Error('Cannot load ' + f);
      return r.json();
    });
    const [letters, words, prompts, sight, stickers, levels, i18n, stories] = await Promise.all(
      ['letters', 'words', 'prompts', 'sightwords', 'stickers', 'levels', 'i18n', 'stories'].map(get));

    data.letters = letters.items.map(normalizeLetter);
    data.path = letters.path;
    data.extras = letters.extras;
    data.words = words.words;
    data.families = words.families;
    data.prompts = prompts.prompts;
    data.sightwords = sight.words.map((w) => w.w);
    data.stickers = stickers.stickers;
    data.starsPerSticker = stickers.starsPerSticker;
    data.levels = levels.levels;
    data.i18n = i18n;
    data.stories = stories.stories;
    data.storyMeta = stories.meta || {};
    return data;
  })();
  return loaded;
}

function normalizeLetter(it) {
  return {
    ...it,
    words: it.words.map(([w, e, flags]) => ({ w, e, ...(flags || {}) })),
  };
}

/** Resolve a value that may be a plain string or {us, gb}. */
export function byAccent(v, accent) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return v[accent] ?? v.us ?? '';
}

export const letterById = (id) => data.letters.find((l) => l.id === id);
export const pathLetters = () => data.path.map(letterById);
export const extraLetters = () => data.extras.map(letterById);
export const wordInfo = (w) => data.words.find((x) => x.w === w);
export const storyById = (id) => data.stories.find((s) => s.id === id);

/** The 26 plain letters A-Z in alphabet order. */
export function alphabet() {
  return data.letters.filter((l) => l.kind === 'letter').sort((a, b) => a.lower.localeCompare(b.lower));
}

/** Every picture word we can use in listen/tap style games: CVC words + letter sample words. */
export function vocabulary() {
  const out = new Map();
  for (const l of data.letters) {
    for (const w of l.words) {
      if (!out.has(w.w)) out.set(w.w, { w: w.w, e: w.e, first: l.kind === 'letter' && !w.pos ? l.id : null, diff: w.diff, source: l.id, level: l.level || 1 });
    }
  }
  for (const w of data.words) {
    if (w.weak) continue;
    out.set(w.w, { w: w.w, e: w.e, first: w.w[0], diff: w.diff, source: 'cvc', family: w.f, level: 2 });
  }
  return [...out.values()];
}

/** Level settings for a profile ('all' = everything). */
export function levelOf(profile) {
  const key = profile?.level && data.levels[profile.level] ? profile.level : 'all';
  return data.levels[key];
}
