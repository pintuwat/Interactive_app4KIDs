# Quality report (Phase 3)

Date: 2026-10-25. Scope: everything in this repository. **Not yet tested on a real iPad or Android tablet**, so use [TABLET-TEST.md](TABLET-TEST.md) on real devices before classroom use.

## Automated checks (all passing)
| Check | Command | Result |
|---|---|---|
| Data files | `node tools/validate-data.mjs` | 41 sounds, 64 CVC words, 20 stories, 40 sight words, 43 prompts (all ≤ 6 words) |
| Story decodability | `node tools/check-stories.mjs` | 20/20 stories: every non-sight word decodable with the sounds taught so far; 60–120 words; 6 pages |
| Colour contrast (WCAG) | `node tools/contrast.mjs` | 16/16 UI colour pairs pass (body text ≥ 4.5:1, large text ≥ 3:1) |
| API | `cd server && npm test` | 18/18 incl. *one teacher cannot read another teacher's class*, student token limited to own progress, CSV formula injection, rate limit |
| Offline (real headless Chrome) | `node tools/offline-test.mjs` | service worker active, 66/66 files cached; home, story list, reader, Bubble Pop, lesson all work with the network off |

## Browser tests (Chrome engine, emulated sizes)
- **Flows driven end to end:** create profile → lesson (letter, sound, words, star) → tracing → blending → all 6 games to the result screen (incl. wrong answers and the 2-try reveal) → story in both modes + questions → stars/stickers → Parent corner (maths gate, summary, worksheets, settings) → levels 1/2/3 (menus, games, stories filter correctly) → Thai labels.
- **Phase 2 end to end** with the in-memory API: teacher registers, creates a class, adds 3 nicknames → child joins with the code (lower case + dash accepted), picks "Mimi" → progress syncs to the dashboard (stars, letters, most-missed sound and word) → API stopped: progress keeps working locally and stays queued.
- **Recorded audio:** a `us` recording is used instead of speech; `gb` falls back to the device voice. Recorder page lists 700 items per accent; the zip and WAV writers were checked with `unzip -t` and `file` (16-bit mono 22.05 kHz PCM).
- **Layout:** no horizontal scroll at 375×812 (phone) and 1024×768 (tablet landscape) on 15 screens; every child-facing button/link ≥ 64×64 px (Parent corner and teacher pages use 48 px buttons, adults only).

## Accessibility
- All buttons have text or `aria-label` (e.g. letter tiles say "s. 2 stars"; avatar button says "Mimi. Change player"); decorative emoji are `aria-hidden`.
- Focus is visible (`:focus-visible` outline). Celebrations use `aria-live`.
- **Reduce motion:** follows the device setting by default; can be forced on/off in the Parent corner (disables animation and the burst effects).
- Night theme for stories keeps ≥ 9:1 text contrast. Target-sound words use colour **and** are spoken; no information depends on colour only.
- Text is not selectable in the child area (avoids accidental selection on tablets); it is selectable in the Parent corner and teacher pages.

## Performance
- Whole app (66 files) ≈ 375 KB raw / **≈ 218 KB gzipped**; no frameworks, no web fonts, no images except 3 small PNG icons (≈ 49 KB total after compression) and 2 SVGs. Emoji are used for pictures.
- Screens and games are lazy-loaded ES modules; SVG pictures use `loading="lazy"`.
- nginx: gzip, ETag revalidation for code/data, 7-day cache for images/audio, `no-store` for the service worker.

## Bugs found and fixed during this review
1. Profile picker crashed when profiles already existed (temporal-dead-zone on a helper) → fixed.
2. Parent corner showed an empty page after the maths gate (same kind of error) → fixed.
3. Sticker book overflowed horizontally on phones → fixed.
4. Some child buttons (accent flag, edit, upper/lower case on tracing) were 48 px → now 64 px.
5. Coral text (lowercase letter, target letter in words) had 2.3:1 contrast → darker coral, 5.2:1.
6. nginx `types {}` at server level would have replaced all MIME types (JS modules would fail) → special types now set per location.
7. Deleting a profile on one tablet would also erase the child's class record → now only an explicit "Erase online data" does that.
8. Decodability rules were too generous for vowel + r/w/y (bird, farm, slow) → tightened; stories re-checked.

## Not verified here (please check)
- **Real tablets** (iPad Safari, Android Chrome): speech voices, audio unlock on first tap, touch dragging, add-to-home-screen.
- **Speech quality of isolated sounds**: device voices may still say "ay" for /a/. Respellings are tunable in `data/letters.json`; recording your own audio fixes it for good.
- **Docker image build and nginx config** (Docker/nginx are not installed on this machine). The config was reviewed by hand.
- **Coolify deployment, real PostgreSQL, scheduled backups and restore.** The API was tested against an in-process PostgreSQL (PGlite), not a real server.
- Lighthouse: run it in Chrome DevTools on the deployed https site (the newest Lighthouse no longer has a separate PWA score; installability = manifest + icons + service worker + https, all present).
