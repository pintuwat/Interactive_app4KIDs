# Ollie's Phonics

An interactive phonics website for Thai children aged 3–8 (beginners). Children learn English **letter sounds** A–Z, blend CVC words (c‑a‑t → cat), play five no-lose games, and read **20 decodable bedtime stories** with Ollie the owl.

- Tablet-first, works on phones; 64px touch targets; voice instructions on every screen
- American 🇺🇸 or British 🇬🇧 accent per child (recorded audio first, then the device voice)
- Works **offline** as an installable app (PWA)
- No ads, no tracking, no external links; children use a nickname + emoji only (Thailand PDPA)
- Optional teacher accounts with classes and a progress dashboard (Phase 2)

## Quick start (on your computer)
```bash
python3 -m http.server 8080
```
Open http://localhost:8080 and create a child profile. (Offline mode is off on localhost so code changes show immediately; run `localStorage.setItem('kp.sw','1')` in the browser console to test it.)

## What is inside
| Area | What the child does |
|---|---|
| **Letters** | "Start here" path in the teaching order (s a t p i n …) plus an A–Z grid. Each lesson: big letter (tap = name), sound button (tap = /sound/), 3 picture words, US/UK compare button, finger tracing. |
| **Words** | 14 word families (‑at ‑an ‑ap ‑ig ‑in ‑ip ‑op ‑ot ‑og ‑ug ‑un ‑ut ‑en ‑et), 64 CVC words. Letters light up one by one with their sound, then the whole word and picture. Level 3: 40 Dolch sight words. |
| **Games** | Listen & Tap, First Sound, Bubble Pop, Build the Word (drag or tap), Rhyme Match, Sight Words. 6 rounds, max 2 tries then the answer is shown; always 1–3 stars, never a "lose" screen. Uses only letters the child has unlocked. |
| **Stories** | 20 decodable stories (10 for ages 3–6, 10 for ages 7–8) in a night theme: "Read to me" with word-by-word highlighting, or "I read" (tap each word). Target sounds in colour, 2–3 picture questions, a calm "Good night!" ending. |
| **Stars & stickers** | Stars for lessons, tracing, games and stories; a new sticker every 5 stars; a learning map with Ollie on the next step. |
| **Parent corner** 🔒 | Behind a maths question. Accent and level per child, progress summary (incl. sounds to practise), export/import progress, reset, printable A4 worksheets (tracing, CVC matching), sound effects, reduce motion, English/Thai labels. |

**Levels** (Parent corner): Level 1 (age 3–4) letters & sounds · Level 2 (5–6) CVC blending · Level 3 (7–8) digraphs, blends, magic e, long vowels, sight words, all stories · All (default).

## Project layout
```
index.html            the app (hash routes: #/letters, #/letter/s, #/blend/at, #/game/bubble-pop, #/story/rain-train …)
teacher.html          teacher dashboard (Phase 2)        privacy.html   privacy + PDPA consent note (EN/TH)
record-audio.html     record your own audio (Phase 3)
css/                  style.css, print.css (worksheets), teacher.css
js/app.js             shell        router.js  hash router         audio.js  ALL sound (recorded → speech)
js/progress.js        ALL progress (one module)   storage/local.js + storage/api.js (class sync)
js/phonics.js         decodability rules (shared with tools)       data.js  loads /data
js/screens/           one module per screen          js/games/  one module per game + game-base.js
data/                 letters, words, stories, sightwords, prompts, stickers, levels, i18n (all content lives here)
audio/us, audio/gb    recordings + manifest.json     assets/  mascot, icons, svg pictures
server/               Phase 2 Node.js API + SQL migrations + tests
tools/                build + check scripts (see below)
```

## Editing content
All lesson content is JSON in `/data`; no content is hard-coded in the UI.
- **Letters / sounds**: `data/letters.json` (`tts` is the spelling the device voice says for the sound, e.g. `"hmm"` for /m/, `"buh"` for /b/). Never use repeated letters like `mmm`/`sss`: voices read them as letter names. After changing one, run `python3 tools/voice-check.py` on a Mac; better still, record real audio. US/UK differences use `{ "us": …, "gb": … }` (e.g. Z = zee/zed) and words flagged `"diff"`.
- **Words**: `data/words.json`. **Spoken instructions**: `data/prompts.json` (max 6 words).
- **Stories**: edit `tools/stories-source.py`, then
  ```bash
  python3 tools/stories-source.py && node tools/check-stories.mjs
  ```
  The checker fails if any word is not a sight word and cannot be sounded out with the sounds taught up to that story. The teacher review list is in [STORY-REVIEW.md](STORY-REVIEW.md).

## Recording your own audio (recommended)
Browser voices often say letter *names* instead of *sounds* and some tablets have no British voice. Record once and every device sounds the same:
1. Open `/record-audio.html` (from the Parent corner) on https or localhost, choose 🇺🇸 or 🇬🇧.
2. Record the missing items (letter sounds, names, words, instructions, story pages). Takes are kept in that browser until you download.
3. **Download zip**, unzip into `audio/` (it contains `us/` or `gb/`), run `node tools/build-audio-manifest.mjs`, commit and deploy.
Missing files fall back to the device voice in the same accent. Recording only one accent is fine.

## Tools
| Command | What it does |
|---|---|
| `node tools/validate-data.mjs` | checks all data files (26 letters, 60+ CVC words, story sizes, prompts ≤ 6 words …) |
| `node tools/check-stories.mjs` | decodability check + teacher review list |
| `node tools/contrast.mjs` | WCAG colour contrast of the UI colour pairs |
| `python3 tools/voice-check.py` | macOS: checks the US/UK voices SAY each letter sound instead of spelling it ("mmm" → "em em em") |
| `node tools/build-audio-manifest.mjs` | lists recordings in `audio/manifest.json` |
| `node tools/build-precache.mjs` | offline file list + cache version (the Docker build runs this) |
| `node tools/offline-test.mjs` | real headless Chrome: installs the service worker, goes offline, checks the app |
| `cd server && npm test` | API tests with an in-process PostgreSQL |
| `cd server && npm run dev:memory` | demo API on :3001 with a throw-away database |

## Deploy
- Phase 1 (static site): [DEPLOY.md](DEPLOY.md) — Docker (nginx:alpine, amd64/arm64) on Coolify, Oracle Cloud ports 80/443.
- Phase 2 (teachers, PostgreSQL, API, backups): [DEPLOY-PHASE2.md](DEPLOY-PHASE2.md).
- Checklists: [TABLET-TEST.md](TABLET-TEST.md), [TEST-PHASE2.md](TEST-PHASE2.md). Quality report: [QA-REPORT.md](QA-REPORT.md).
