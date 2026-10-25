# CLAUDE.md — Kids Phonics Website

Interactive phonics website for Thai children aged 3-8 (beginner level). The owner is a kids' English teacher in Thailand. Act as an expert front-end developer **and** a phonics teacher.

## Project goal
Thai children aged 3-8 learn English phonics A-Z with simple sample words (CAT, MAT, ...) and practice through 20 decodable bedtime stories (1-10 ages 3-6, 11-20 ages 7-8).

Status: Phases 1, 2 and 3 are built. See README.md for the feature list and layout.

## Rules
- Tablet-first, responsive, works on phones too.
- Big touch targets (64px minimum), rounded friendly fonts, bright but calm colors, one task per screen.
- Voice instructions for every screen so non-readers can use it alone.
- Child-facing text: very simple English, max 6 words per instruction.
- Feedback is always positive ("Try again!"), never a failure screen.
- No ads, no external links, no pop-ups, no tracking. Never collect real names or personal data from children (avatar/nickname only). Thailand PDPA applies.
- Teach LETTER SOUNDS (/a/, /b/), not only letter names.
- Teaching order: s, a, t, p, i, n, m, d, g, o, c, k, ck, e, u, r, h, b, f, l, j, v, w, x, y, z, q. An A-Z menu is also available.
- Lesson content (letters, words, games, stories) lives in separate JSON data files in `/data`, never hard-coded in UI code.
- Progress saving lives in ONE module (`js/progress.js`) so a database can replace/extend it. Storage backends live in `js/storage/` (local = always, api = Phase 2 sync).
- Plain HTML/CSS/JS (ES modules), no build tools, no frameworks, in the browser app. (Small Node scripts in `/tools` generate the precache list and check story decodability. The Phase 2 API in `/server` is Node.js.)
- Audio: everything goes through `js/audio.js`. For an id, check for a recorded file `/audio/<accent>/<id>.<ext>` (accent = `us` or `gb`; listed in `/audio/manifest.json`), then fall back to browser `speechSynthesis` in the same accent.
- Two accents: American English (en-US) and British English (en-GB). Each child profile has an accent setting (default American), changeable on the profile picker and in the Parent corner. Letter names, letter sounds, words and stories all play in the chosen accent.
- Keep sample words and stories accent-neutral. Avoid words whose spelling, meaning or vowel sound differs between American and British English (mom/mum, color/colour, truck/lorry). If a difference is unavoidable, store both versions with `us`/`gb` fields. Known differences: letter Z (zee / zed) and the short o in hot, dog, pot (US /ɑ/, UK /ɒ/). Flag such words with `"diff": "o"` (or "z", "a") in the data files.
- Deployment: Docker (nginx:alpine) on Coolify, Oracle Cloud (may be ARM/arm64). All images must be multi-arch.
- Phase 1 = personal use, localStorage only. Phase 2 = teacher login with PostgreSQL (Coolify database) and a small Node.js API in `/server`. Phase 3 = polish, recorded audio, levels, Thai labels.

## Conventions
- Stories are written in `tools/stories-source.py` (generates `data/stories.json`). Every non-sight word must pass `node tools/check-stories.mjs` for the sounds listed in that story's `taught`. Base sight words: the, a, is, on, in, and, to, I, he, she, it, was, said, we, you, my, of; stories 11-20 may add a few Dolch words in `extraSight`. "Good night!" is spoken separately, not part of the text.
- Levels (`data/levels.json`): 1 = letters/sounds, 2 = + CVC blending, 3 = + digraphs, blends, long vowels, sight words, all stories; 'all' is the default.
- Audio ids: `sound-<letter>`, `name-<letter>`, `word-<word>` (also sight words and story words), `prompt-<key>`, `story-<id>-<page>`, `story-<id>-q<n>`. The recorder (`record-audio.html`) lists them all (`js/recorder/items.js`).
- Phase 2 API (`server/`): plain SQL migrations in `server/migrations`, parameterized queries only, every teacher query scoped by teacher_id, student tokens only touch their own progress. Tests: `cd server && npm test`.
- The site works without the API (guest mode). `env.js` (written by the container from `API_URL`) turns class sync on.
- Child-facing instruction strings live in `data/prompts.json` (id -> text) so they can be recorded in Phase 3. Never hard-code spoken text in screens; call `audio.prompt('key')`.
- Thai (UI language toggle) only appears in menus and the Parent corner, never in child lessons. Strings: `data/i18n.json`.
- Screens are ES modules in `js/screens/` exporting `render(root, params, app)` and optionally returning a cleanup function.
- Games live in `js/games/`, extend `Game` from `game-base.js`.
- No real names for children: profiles store a nickname + emoji avatar only.
- After changing any cached file bump nothing manually: `node tools/build-precache.mjs` hashes the files (Docker build runs it via `tools/build-site.mjs`).

## Commands
- Dev server: `python3 -m http.server 8080` (from repo root), open http://localhost:8080 (service worker is off on localhost unless `localStorage.kp.sw = '1'`)
- Offline smoke test (real headless Chrome): `node tools/offline-test.mjs`
- Contrast check: `node tools/contrast.mjs`
- Demo API with in-memory DB: `cd server && npm run dev:memory` (then set apiUrl in env.js)
- Precache list: `node tools/build-precache.mjs`
- Audio manifest (after adding recordings): `node tools/build-audio-manifest.mjs`
- Story decodability check: `node tools/check-stories.mjs`
- Data validation: `node tools/validate-data.mjs`
- API tests: `cd server && npm test`
