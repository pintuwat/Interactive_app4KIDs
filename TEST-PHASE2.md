# Phase 2 manual test checklist (API + sync)

Automated: `cd server && npm test` (18 tests: auth, ownership, student token limits, validation, rate limit, CSV, deletion).
Do the manual checks below against the real deployment (API + website). Use two browsers (or a private window) for the two teachers.

## API basics
- [ ] `https://api…/api/health` → `{"ok":true}`; `http://api…` (no TLS) is refused (426) or redirected
- [ ] Register teacher A (with the invite code, if set). Wrong invite code is refused
- [ ] Password under 10 characters is refused
- [ ] Log out, log in with a wrong password → generic error "Email or password is not correct"
- [ ] Ten wrong logins in a row → "Too many tries" (429)
- [ ] The login cookie is `HttpOnly` and `Secure` (browser dev tools → Application → Cookies)

## One teacher cannot read another teacher's class  ⭐
- [ ] Teacher A creates class "A" and adds a student "Mimi"
- [ ] Teacher B (different browser) logs in: class list is **empty**
- [ ] In B's browser console run (use A's class id from A's address/Network tab):
  `fetch(API + '/api/classes/<A-class-id>/dashboard', {credentials:'include'}).then(r => r.status)` → **404**
- [ ] Same for `/export.csv`, `DELETE /api/classes/<id>`, `DELETE /api/students/<id>` → all **404**
- [ ] Teacher A still sees class "A" and Mimi unchanged

## Join and sync (child device)
- [ ] Profile picker shows the 🏫 button only when `API_URL` is set
- [ ] Join with the class code in lower case / with a dash → works; wrong code → "Class not found"
- [ ] Join screen requires the consent box
- [ ] Pick "Mimi" from the list → profile gets Mimi's name/avatar → "You are in …!"
- [ ] Complete a letter lesson + a game → within ~5 s the teacher dashboard shows stars (press ⟳)
- [ ] **Offline**: airplane mode, play 2 lessons (everything works) → network on → progress appears on the dashboard within a minute (or when the app is reopened)
- [ ] Two tablets joined as the same student → stars/finished items merge (nothing is lost, best stars kept)
- [ ] Wrong answers show up under **Needs practice** (sounds / words)
- [ ] Parent corner → Class panel shows the class and "0 waiting"; **Leave class** keeps local progress; **Erase online data** removes the student from the dashboard

## Teacher tools
- [ ] Add 3 nicknames in one go → they appear; adding an email-like nickname ("a@b.com") is refused
- [ ] CSV downloads and opens in a spreadsheet; no formula runs from a nickname that starts with "-"
- [ ] Delete a student → disappears, tablet's sync shows "Class link expired" (token no longer valid)
- [ ] Delete the class → students and progress are gone

## Backups
- [ ] Scheduled backup exists in Coolify and **Backup now** succeeds
- [ ] A backup file was downloaded to your own computer this month
- [ ] Restore test into a throwaway database succeeded
