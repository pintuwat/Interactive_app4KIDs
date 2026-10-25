# CLAUDE.md — Kids Phonics Website

Interactive phonics website for Thai children aged 3-8 (beginner level). The owner is a kids' English teacher in Thailand. Act as an expert front-end developer **and** a phonics teacher.

## Project goal
Thai children aged 3-8 learn English phonics A-Z with simple sample words (CAT, MAT, ...) and practice through decodable bedtime stories (10 in Phase 1, 20 after Phase 3).

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
- Keep sample words and stories accent-neutral. Avoid words whose spelling, meaning or vowel sound differs between American and British English (mom/mum, color/colour, truck/lorry). If a difference is unavoidable, store both versions with `us`/`gb` fields. Known differences: letter Z (zee / zed) and the short o in hot, dog, pot (US /ɑ/, UK /ɒ/). Flag such words with `"diff": true`.
- Deployment: Docker (nginx:alpine) on Coolify, Oracle Cloud (may be ARM/arm64). All images must be multi-arch.
- Phase 1 = personal use, localStorage only. Phase 2 = teacher login with PostgreSQL (Coolify database) and a small Node.js API in `/server`. Phase 3 = polish, recorded audio, levels, Thai labels.

## Conventions
- Child-facing instruction strings live in `data/prompts.json` (id -> text) so they can be recorded in Phase 3. Never hard-code spoken text in screens; call `audio.prompt('key')`.
- Thai (UI language toggle) only appears in menus and the Parent corner, never in child lessons. Strings: `data/i18n.json`.
- Screens are ES modules in `js/screens/` exporting `render(root, params, app)` and optionally returning a cleanup function.
- Games live in `js/games/`, extend `Game` from `game-base.js`.
- No real names for children: profiles store a nickname + emoji avatar only.
- After changing any cached file bump nothing manually: `node tools/build-precache.mjs` hashes the files (Docker build runs it).

## Commands
- Dev server: `python3 -m http.server 8080` (from repo root), open http://localhost:8080
- Precache list: `node tools/build-precache.mjs`
- Audio manifest (after adding recordings): `node tools/build-audio-manifest.mjs`
- Story decodability check: `node tools/check-stories.mjs`
- Data validation: `node tools/validate-data.mjs`
- API tests: `cd server && npm test`
