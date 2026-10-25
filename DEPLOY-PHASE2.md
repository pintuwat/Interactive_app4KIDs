# Phase 2: teacher accounts (PostgreSQL + Node.js API) on Coolify

Phase 1 (the website) keeps working without any of this: guest/personal mode never needs a server.
Phase 2 adds a **PostgreSQL database**, a small **API** (`/server`), the **teacher dashboard** (`teacher.html`) and an optional **"join a class"** flow for children.

```
tablet ──https──► phonics.example.com   (static site, nginx)        ← Phase 1 app + teacher.html
tablet ──https──► api.example.com       (Node.js API)  ──internal──► PostgreSQL (Coolify database, NOT public)
```
Use two **sub-domains of the same domain** (e.g. `phonics.example.com` and `api.example.com`). They count as the same *site*, so the teacher's login cookie is sent to the API.

## 1. Create the PostgreSQL database in Coolify
1. In the same Coolify **Project** as the website: **+ New → Database → PostgreSQL** (version 16 or newer).
2. Name it `phonics-db`. Leave **"Make it publicly available" OFF**.
3. Start it. Open the database page and copy the **Postgres URL (internal)** — it looks like
   `postgres://postgres:PASSWORD@phonics-db-xxxx:5432/postgres`. The API uses this internal URL; the database is never exposed to the internet.

## 2. Deploy the API
1. **+ New → Application** → same Git repository, branch `main`.
2. **Build Pack: Dockerfile**, **Base Directory: `/server`**, **Dockerfile location: `/Dockerfile`**, **Port: `3000`**.
3. **Domains:** `https://api.example.com` (HTTPS is mandatory; the API refuses plain http in production).
4. **Environment variables** (Coolify → Environment Variables; never commit them):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | the internal Postgres URL from step 1 |
| `JWT_SECRET` | a long random string: run `openssl rand -base64 48` |
| `CORS_ORIGIN` | `https://phonics.example.com` (the website, exact origin, https) |
| `REGISTRATION_CODE` | optional invite code you give to your teachers (recommended) |
| `ALLOW_REGISTRATION` | `true` while teachers sign up, then set `false` |
| `TRUST_PROXY` | `1` |

5. Deploy. On start the API creates the tables automatically (plain SQL migration `server/migrations/001_init.sql`).
6. Check: open `https://api.example.com/api/health` → `{"ok":true}`.

## 3. Connect the website
1. Open the **website** application in Coolify → Environment Variables → add `API_URL=https://api.example.com` → **Redeploy**.
   (The container writes `env.js` from this variable at start; without it the site stays in guest mode.)
2. Open `https://phonics.example.com/teacher.html` → **Create one** → register (use your invite code).
3. Create a class → note the 6-letter **class code** → add student nicknames (or let children add themselves).
4. On a child's tablet: profile picker → 🏫 → type the class code → consent box → tap your picture.

## 4. How privacy and security are handled
- Children: nickname + emoji avatar only. No real name, email, birth date or photo exist in the database schema.
- Teacher passwords are hashed with bcrypt. Login uses a short-lived (8 h) JWT in an `httpOnly`, `Secure`, `SameSite=Lax` cookie, plus a custom request header on every change (CSRF protection). Login is rate limited.
- Children get a *student token* that can only read/write **their own** progress. It cannot list classes or see classmates' progress.
- Every teacher query checks ownership; another teacher's class answers `404`.
- SQL uses parameters only. Input is validated. CORS only allows your website. HTTP security headers (helmet) are on. The API refuses non-HTTPS.
- Deleting a student, or a class, removes all their progress (`ON DELETE CASCADE`).

## 5. Backups (PostgreSQL → server local disk, no S3)
Coolify can schedule database backups itself.
1. Open the **PostgreSQL resource → Backups → + New Scheduled Backup**.
2. Frequency (cron): daily at 02:00 → `0 2 * * *`. Retention: keep e.g. the last 14 backups. **Storage: Local** (leave S3 off).
3. Run **Backup now** once and confirm a backup execution is listed.

> ⚠️ **Backups on the same server are lost if the server is lost** (instance deleted, disk failure, Oracle terminates an idle free instance). That is why you should **download a backup to your own computer every month**.

**Download a backup to your computer (monthly)**
- In Coolify: PostgreSQL → Backups → open the schedule → in the list of executions use **Download** next to the newest one.
- Or from your computer (replace host and file name):
  ```bash
  ssh ubuntu@YOUR_SERVER_IP 'sudo ls -lt /data/coolify/backups/databases/*/ | head'
  scp ubuntu@YOUR_SERVER_IP:/path/to/the/backup-file.dmp ~/Backups/phonics-2026-11.dmp
  ```
  (The exact folder is shown on the backup page in Coolify.) Keep the file somewhere safe: it contains children's nicknames and progress, so treat it as private data.

**Restore**
1. Easiest: Coolify → PostgreSQL resource → Backups → **Import / Restore** (upload your `.dmp` file). The labels can differ slightly between Coolify versions.
2. Manual (works anywhere with PostgreSQL client tools). The backup is a `pg_dump` file. Check its type with `file backup.dmp`.
   ```bash
   # custom format (.dmp):
   pg_restore --clean --if-exists --no-owner -d "postgres://USER:PASSWORD@HOST:5432/DBNAME" backup.dmp
   # plain SQL (.sql):
   psql "postgres://USER:PASSWORD@HOST:5432/DBNAME" < backup.sql
   ```
3. Restart the API application, then log in as a teacher and check the dashboard.

**Test your backup once** by restoring it into a throwaway database before you need it for real.

## 6. Updating / operations
- Push to Git → Deploy the website and/or API. New SQL migrations run automatically at API start.
- Logs: Coolify → API application → Logs. The API never logs emails, passwords or request bodies.
- To stop new teacher sign-ups: set `ALLOW_REGISTRATION=false` and redeploy the API.
- Run the automated API tests on your computer: `cd server && npm install && npm test` (uses an in-process PostgreSQL, no setup).

See [TEST-PHASE2.md](TEST-PHASE2.md) for the manual checklist (API, sync, cross-teacher access).
