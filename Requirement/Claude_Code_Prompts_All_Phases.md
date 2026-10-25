# Claude Code Prompts: Kids Phonics Website (Ages 3-8)

Interactive phonics website for Thai children aged 3-8. A-Z beginner lessons, sample words (CAT, MAT), and 10 bedtime stories.

## How to use
1. Create an empty folder (e.g. `phonics-kids`), run `claude` inside it, and paste the prompts **in order**.
2. Check each phase on a tablet before starting the next.
3. Prompt 0 creates a `CLAUDE.md` file, so the rules are remembered across every phase.

## Plan summary
| Phase | Goal | Storage |
|---|---|---|
| 1 (A-D) | Personal use: letters, blending, games, 10 stories, PWA, Docker | localStorage only |
| 2 | Teacher login, classes, dashboard | PostgreSQL (Coolify database) + small Node.js API |
| 3 | Recorded audio, more content, levels, Thai labels, polish | PostgreSQL + audio files |

Hosting: Coolify on an Oracle Cloud instance (may be ARM/arm64).

---

## Prompt 0: Project setup (paste first)

```
I'm a kids' English teacher in Thailand. We are building an interactive phonics website for children aged 3-8 (beginner level). Please act as an expert front-end developer and a phonics teacher.

First, create a CLAUDE.md file in this project containing the rules below, then create the folder structure and a README. Do not build features yet.

## Project goal
Thai children aged 3-8 learn English phonics A-Z with simple sample words (CAT, MAT, etc.) and practice through 10 decodable bedtime stories.

## Rules (put these in CLAUDE.md)
- Tablet-first, responsive, works on phones too.
- Big touch targets (64px minimum), rounded friendly fonts, bright but calm colors, one task per screen.
- Voice instructions for every screen so non-readers can use it alone.
- Child-facing text: very simple English, max 6 words per instruction.
- Feedback is always positive ("Try again!"), never a failure screen.
- No ads, no external links, no pop-ups, no tracking. Never collect real names or personal data from children (avatar/nickname only). Thailand PDPA applies.
- Teach LETTER SOUNDS (/a/, /b/), not only letter names.
- Teaching order: s, a, t, p, i, n, m, d, g, o, c, k, ck, e, u, r, h, b, f, l, j, v, w, x, y, z, q. A-Z menu is also available.
- Lesson content (letters, words, games, stories) lives in separate JSON/JS data files, never hard-coded in UI code.
- Progress saving lives in ONE separate module (so a database can replace it later).
- Plain HTML/CSS/JS, no build tools, no frameworks, in Phase 1.
- Audio: wrapped in one audio module (audio.js). Check for a recorded file /audio/<accent>/<id>.mp3 first (accent = us or gb), then fall back to browser speechSynthesis in the same accent.
- Two accents: American English (en-US) and British English (en-GB). Each child profile has an accent setting (default American), changeable on the profile picker and in the Parent corner. Letter names, letter sounds, words and stories are all played in the chosen accent.
- Keep sample words and stories accent-neutral where possible. Avoid words whose spelling, meaning or vowel sound differs between American and British English (e.g. mom/mum, color/colour, truck/lorry). If a difference is unavoidable, store both versions in the data file with us/gb fields. Known differences to handle: letter Z (zee / zed) and the short o in hot, dog, pot (American /ɑ/, British /ɒ/).
- Deployment: Docker (nginx) on Coolify, Oracle Cloud (may be ARM/arm64).
- Phase 1 = personal use, localStorage only. Phase 2 = teacher login with PostgreSQL (Coolify database) and a small Node.js API. Phase 3 = polish and audio.

## Folder structure to create
index.html, /css, /js (app.js, audio.js, progress.js, router.js, games/), /data (letters.json, words.json, stories.json), /assets (images, svg), /audio (subfolders us/ and gb/), manifest.json, service-worker.js, Dockerfile, nginx.conf, README.md

Then show me the plan and wait for my approval before Phase 1.
```

---

## Prompt 1A: Home, profiles, letters

```
Start Phase 1A. Follow CLAUDE.md.

Build:
1. Home screen: friendly mascot (simple SVG animal, original design), 4 big buttons: Letters, Words, Games, Stories. A small Parent corner icon.
2. Profile picker: "Who is playing?" with up to 5 child avatars (emoji or SVG), add/rename/delete profile. No passwords. Progress saved per profile in localStorage through progress.js. Each profile also saves an accent setting: American (en-US) or British (en-GB), shown as a big US / UK flag toggle, default American.
3. Letters section: A-Z grid, plus a "Start here" path in the teaching order (s, a, t, p, i, n first).
4. Letter lesson screen: big uppercase + lowercase, the sound, a picture (emoji or SVG), 2-3 sample words, tap-to-hear for letter, sound and word. Include one tracing screen using canvas with finger/mouse tracing and a simple guide.
5. Stars awarded on completing each letter.
6. audio.js with an accent setting (en-US or en-GB) and a slow rate for kids. Use recorded files from /audio/us/ and /audio/gb/ first, then speechSynthesis. Pick the best installed voice for the accent, and show a note in the Parent corner if no voice for that accent is installed on the device.
7. Fill data/letters.json for ALL 26 letters (sound hint, 3 sample words with emoji). Add accent fields (us/gb) for the letter name where they differ (Z = zee / zed) and for any sample word that sounds different.
8. On each letter lesson, add a small "US / UK" button so a parent or teacher can hear the same sound in the other accent for comparison.

Make it a clean, working prototype I can open with a local server (python3 -m http.server). Tell me how to test and what to check on a tablet.
```

---

## Prompt 1B: Blending and games

```
Continue with Phase 1B.

Build:
1. Blending lessons (CVC): show c - a - t, each letter lights up with its sound, then the whole word "cat" with a picture. Word families: -at, -an, -ap, -ig, -in, -ip, -op, -ot, -og, -ug, -un, -ut, -en, -et. Fill data/words.json with at least 60 CVC words (word, emoji/picture, family).
2. Five games, each 2-3 minutes, no losing:
   - Listen & Tap: hear a word, tap the right picture
   - Build the Word: drag letters into slots (c + a + t)
   - Beginning Sound: match the first sound to the picture
   - Bubble Pop: pop the bubble with the right letter/sound
   - Rhyme Match: cat → mat
3. Each game: 5-8 rounds, random from the unlocked letters/words for that child, cheerful sound/animation on correct, gentle retry on wrong (max 2 tries then show the answer).
4. Stars and stickers: a sticker book screen, new sticker every N stars.
5. A learning map screen: a path with the mascot showing lesson progress.

Keep games as separate files in /js/games/ with one shared game interface. All game audio must play in the child's accent. In words.json, flag any word whose spelling or pronunciation differs between American and British English. Tell me how to test.
```

---

## Prompt 1C: 10 bedtime stories

```
Continue with Phase 1C: the 10 decodable bedtime stories.

Write data/stories.json with 10 stories, each 60-120 words, in simple present or past tense, using ONLY:
- words that can be sounded out with the sounds taught up to that story
- a small list of sight words (the, a, is, on, in, and, to, I, he, she, it, was, said, we, you, my, of)
Target-sound words are marked so they can be colored.
Keep the stories accent-neutral: avoid words that differ between American and British English (mom/mum, color/colour, truck/lorry). Each story must work when narrated in either accent, and rhymes must rhyme in both.

Stories and focus:
1. The Cat on the Mat (short a)
2. Pip the Pig (short i)
3. The Red Hen (short e)
4. The Dog on the Log (short o)
5. The Bug in the Mug (short u)
6. The Ship and the Fish (sh)
7. Chip the Chick (ch)
8. The Moon and the Spoon (oo)
9. The Cake by the Lake (magic e)
10. The Rain Train (ai)

Each story: 4-6 short pages with one illustration each (simple original SVG or emoji scene), and a calm ending (sleepy tone, "Good night").

Story reader screen:
- Night mode theme (dark blue, soft colors), slower narration rate
- Word-by-word highlighting while reading aloud
- Tap any word to hear it
- Modes: "Read to me" and "I read" (child taps each word)
- Target-sound words in color
- 2-3 picture comprehension questions at the end
- Stars when finished; story list shows which are done

After writing, list for each story which words are "sight words" and which are decodable, so I (the teacher) can review. Also flag any word that is pronounced differently in American and British English. Tell me how to test.
```

---

## Prompt 1D: PWA, parent corner, Docker, Coolify

```
Continue with Phase 1D: finish Phase 1 for deployment.

Build:
1. PWA: manifest.json (name, icons, standalone, landscape-friendly) and service-worker.js that caches all pages, data, images and audio (both accents; cache the child's selected accent first) so it works fully offline. Include a version number to update the cache.
2. Parent corner (protected by a simple math question like 7 + 5, so small children can't enter): per-profile accent setting (American / British), per-profile progress summary (letters done, words, stories, stars), export/import progress as a JSON file, reset progress, and printable worksheets (A4, print CSS): letter tracing sheet and CVC word-matching sheet generated from the data files.
3. Dockerfile (nginx:alpine, works on arm64 and amd64) and nginx.conf with gzip, caching for static assets, correct MIME types for manifest and service worker, and no caching for service-worker.js.
4. DEPLOY.md: step-by-step guide to deploy on Coolify from a Git repo (Dockerfile build pack), set domain and HTTPS, and open ports 80/443 in the Oracle security list and the instance firewall.
5. A final test checklist for tablet (iPad and Android): audio works, offline works, add to home screen works, touch targets, no horizontal scroll.

Then review the whole Phase 1 code for bugs, accessibility (contrast, button size) and performance, and fix anything you find.
```

---

## Prompt 2: Teacher login and dashboard (PostgreSQL + Node.js API)

```
Start Phase 2: teacher accounts and classes. Phase 1 must keep working without login (guest/personal mode stays).

Design:
- Database: PostgreSQL created as a Coolify Database resource in the same Coolify project. Use its internal connection URL (not exposed to the internet).
- Backend: small Node.js API (Express or Fastify) in /server with its own Dockerfile (works on arm64 and amd64), deployed on Coolify as a separate application. It reads DATABASE_URL and secrets from environment variables. Use plain SQL migration files, no heavy ORM.
- Tables:
  - teachers (id, email, password_hash, created_at)
  - classes (id, teacher_id, name, class_code unique, created_at)
  - students (id, class_id, nickname, avatar, created_at) with NO real name, NO email, NO birth date
  - progress (id, student_id, type letter/word/story/game, item_id, stars, updated_at), unique per student + type + item
- Auth: teachers log in with email + password (argon2 or bcrypt), short-lived JWT in an httpOnly cookie, login rate limit. Children never use a password or email: they enter a class code, pick an avatar/nickname, and get a limited student token that can only write that student's own progress.
- API endpoints: teacher register/login/logout, create class (readable class code), add/remove students, dashboard data (per student letters/stories finished, stars, last played, most-missed sounds/words, class summary), CSV export, student join, progress upsert, delete student data.
- Security: parameterized queries only, input validation, teachers see only their own classes (check ownership on every query), CORS limited to the site domain, helmet headers, HTTPS only, rate limiting, no secrets in the repo (.env.example only).
- Frontend: progress.js keeps the same interface; add a second storage adapter that calls the API. Local-first: save to localStorage and sync when online (offline play must still work). Add a separate teacher.html for login, classes, students and the dashboard.
- Privacy: add a short privacy page in simple English and Thai, a note for parent consent (PDPA), and a "delete student data" button.
- Backups: use Coolify's scheduled backups for the PostgreSQL database, saved to the server's local disk (no S3). Document how to download a backup file to my computer every month, and how to restore it. Explain that backups on the same server are lost if the server is lost.
- Deployment: write DEPLOY-PHASE2.md with steps: create PostgreSQL in Coolify, deploy the API, set environment variables, set the domain, connect the frontend.

First show me the SQL schema and the API endpoint list for approval, then implement. Add a manual test checklist for the API and the sync logic, including a check that one teacher cannot read another teacher's class.
```

---

## Prompt 3: Polish, real audio, more content

```
Start Phase 3: polish and content.

1. Recorded audio in two accents: build a simple recorder page (record-audio.html) for me, the teacher, to record each letter sound, letter name, sample words and story sentences in the browser. I choose the accent (American or British) before recording. Save files by accent and id (e.g. /audio/us/sound-a.mp3, /audio/gb/sound-a.mp3, /audio/us/word-cat.mp3), show which items are still missing for each accent, and download each accent as a zip. Update audio.js to use the child's accent folder first, then speechSynthesis in that accent if a file is missing. If I can only record one accent, the other stays speech-only.
2. Content expansion: add digraphs (sh, ch, th, ck), blends (bl, st, tr), long vowels, and 10 more stories for 7-8 year olds, plus 40 sight words (Dolch pre-primer and primer) with games.
3. Levels: Level 1 (age 3-4: letters and sounds), Level 2 (age 5-6: CVC blending), Level 3 (age 7-8: digraphs, magic e, story reading). The child's profile has a level that sets what is shown.
4. Thai support: optional Thai labels for parent corner and menus (not child lessons), with a language toggle.
5. Quality: accessibility audit (contrast, screen reader labels, reduce motion setting), performance (image sizes, lazy loading), Lighthouse PWA score, and a tablet test report.
6. Update README, DEPLOY.md and CLAUDE.md to match the final project.

Work in small steps and commit after each.
```

---

## Reference: design decisions

**Data and login**
- Phase 1 is personal use: no login, no database. Progress in localStorage per child profile, with export/import.
- Phase 2: teacher login with PostgreSQL (a Coolify Database resource) and a small Node.js API. Children join with a class code and pick an avatar or nickname. No real names, emails, photos or birth dates.
- Backups: Coolify scheduled backups save to the server's local disk (no S3 needed). Download a backup file to your computer every month, because backups on the same server are lost if the server is lost.
- Thailand PDPA applies if data from children is collected. Parents or schools should consent.

**Hosting**
- Phase 1 is a static site, served by nginx in Docker on Coolify. HTTPS is required for PWA and offline mode.
- Open ports 80 and 443 in both the Oracle security list and the instance firewall.
- If the Oracle instance is ARM (Ampere), use multi-arch images such as `nginx:alpine`.

**Accents (American and British)**
- Each child profile has an accent setting (default American, en-US), changeable on the profile picker and in the Parent corner.
- Audio files live in /audio/us/ and /audio/gb/. If a recording is missing, the site falls back to browser speech in the same accent.
- Browser voices depend on the device. Apple devices usually include both American and British voices, but some Android tablets and desktop browsers may not have a British voice installed. Recording your own audio (Phase 3) solves this.
- Known differences to watch: letter Z (zee / zed), the short o in hot, dog, pot, and pairs like color/colour, mom/mum, truck/lorry. The sample words and stories avoid these where possible.
- Most consonant sounds and the short vowels a, e, i, u are very similar in both accents, so the main work is the audio itself.

**Teaching notes**
- Teach letter sounds first, not only names. Start with s, a, t, p, i, n so real words (sat, pin, tap) can be built quickly.
- Review the story word lists in Prompt 1C. As the teacher, check that words are decodable for your students.
- Browser voices differ by device. If a letter sound is wrong (e.g. "ay" instead of /a/), that is a good reason to start recording your own audio (Phase 3).

## Tips for working with Claude Code
- Use plan mode (Shift+Tab) for Prompt 0 and Prompt 2 so it shows a plan before editing.
- After each phase, run `git commit` and test on a real tablet. Ask for small fixes right then ("make the buttons bigger, the bubbles slower").
