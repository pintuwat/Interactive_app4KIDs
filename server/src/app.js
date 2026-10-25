// Express app factory. createApp({ db, config }) so tests can inject an in-memory database.
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';

const TEACHER_COOKIE = 'kp_teacher';
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I so children can read it
const AVATARS = ['🐶', '🐱', '🐰', '🦊', '🐼', '🐸', '🦁', '🐯', '🐵', '🐧', '🐻', '🦄'];
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 4);

const uuid = z.string().uuid();
const email = z.string().trim().toLowerCase().email().max(200);
const password = z.string().min(10, 'Use at least 10 characters').max(200);
// Nicknames: letters, numbers, spaces and a few symbols. No emails / long strings that could hold real names.
const nickname = z.string().trim().min(1).max(20).regex(/^[\p{L}\p{N} ._-]+$/u, 'Letters and numbers only');
const avatar = z.string().trim().min(1).max(16);
const classCode = z.string().transform((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')).pipe(z.string().length(6));

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const notFound = () => new HttpError(404, 'Not found');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const parse = (schema, data) => {
  const r = schema.safeParse(data);
  if (!r.success) throw new HttpError(400, r.error.issues[0]?.message || 'Invalid input');
  return r.data;
};

export function createApp({ db, config }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  // ---------- security headers, HTTPS, CORS ----------
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' }, hsts: config.production ? { maxAge: 15552000 } : false }));
  if (config.production && !config.allowInsecure) {
    app.use((req, res, next) => (req.secure || req.path === '/api/health' ? next() : res.status(426).json({ error: 'HTTPS required' })));
  }
  app.use(cors({
    origin(origin, cb) { cb(null, !origin || config.corsOrigins.includes(origin)); },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 600,
  }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const limiter = (windowMs, max) => (config.rateLimit ? rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many tries. Please wait and try again.' } }) : (req, res, next) => next());
  app.use('/api', limiter(15 * 60 * 1000, 600));
  const loginLimit = limiter(15 * 60 * 1000, 10);
  const registerLimit = limiter(60 * 60 * 1000, 10);
  const joinLimit = limiter(15 * 60 * 1000, 300); // a whole class can share one school IP

  // ---------- auth helpers ----------
  const signTeacher = (id) => jwt.sign({ role: 'teacher' }, config.jwtSecret, { subject: id, expiresIn: `${config.teacherTokenHours}h`, algorithm: 'HS256' });
  const signStudent = (id, classId) => jwt.sign({ role: 'student', cid: classId }, config.jwtSecret, { subject: id, expiresIn: `${config.studentTokenDays}d`, algorithm: 'HS256' });
  const verify = (token, role) => {
    try {
      const p = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
      return p.role === role && typeof p.sub === 'string' ? p : null;
    } catch { return null; }
  };
  const setCookie = (res, token) => res.cookie(TEACHER_COOKIE, token, { httpOnly: true, secure: config.production, sameSite: 'lax', maxAge: config.teacherTokenHours * 3600 * 1000, path: '/api' });

  // Cookie auth + a custom header on state-changing calls = CSRF protection (cross-site pages cannot send it).
  const requireTeacher = wrap(async (req, res, next) => {
    const p = verify(req.cookies[TEACHER_COOKIE], 'teacher');
    if (!p) throw new HttpError(401, 'Please log in');
    if (req.method !== 'GET' && req.get('X-Requested-With') !== 'kp') throw new HttpError(403, 'Missing header');
    const r = await db.query('SELECT id FROM teachers WHERE id = $1', [p.sub]);
    if (!r.rows.length) throw new HttpError(401, 'Please log in');
    req.teacherId = p.sub;
    next();
  });

  const requireStudent = wrap(async (req, res, next) => {
    const m = /^Bearer (.+)$/.exec(req.get('Authorization') || '');
    const p = m && verify(m[1], 'student');
    if (!p) throw new HttpError(401, 'Please join a class');
    const r = await db.query('SELECT s.id, s.class_id, s.nickname, s.avatar FROM students s WHERE s.id = $1', [p.sub]);
    if (!r.rows.length) throw new HttpError(401, 'Please join a class');
    req.student = r.rows[0];
    next();
  });

  // ---------- health ----------
  app.get('/api/health', wrap(async (req, res) => { await db.query('SELECT 1'); res.json({ ok: true }); }));

  // ---------- teachers ----------
  app.post('/api/teacher/register', registerLimit, wrap(async (req, res) => {
    if (!config.allowRegistration) throw new HttpError(403, 'Registration is closed');
    const body = parse(z.object({ email, password, inviteCode: z.string().max(100).optional() }), req.body);
    if (config.registrationCode) {
      const a = Buffer.from(body.inviteCode || ''), b = Buffer.from(config.registrationCode);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new HttpError(403, 'Invite code is not correct');
    }
    const hash = await bcrypt.hash(body.password, config.bcryptRounds);
    try {
      const r = await db.query('INSERT INTO teachers (email, password_hash) VALUES ($1, $2) RETURNING id, email', [body.email, hash]);
      setCookie(res, signTeacher(r.rows[0].id));
      res.status(201).json({ teacher: r.rows[0] });
    } catch (e) {
      if (e.code === '23505') throw new HttpError(409, 'This email is already registered');
      throw e;
    }
  }));

  app.post('/api/teacher/login', loginLimit, wrap(async (req, res) => {
    const body = parse(z.object({ email, password: z.string().max(200) }), req.body);
    const r = await db.query('SELECT id, email, password_hash FROM teachers WHERE email = $1', [body.email]);
    const row = r.rows[0];
    const ok = await bcrypt.compare(body.password, row ? row.password_hash : DUMMY_HASH); // same work either way
    if (!row || !ok) throw new HttpError(401, 'Email or password is not correct');
    setCookie(res, signTeacher(row.id));
    res.json({ teacher: { id: row.id, email: row.email } });
  }));

  app.post('/api/teacher/logout', (req, res) => {
    res.clearCookie(TEACHER_COOKIE, { httpOnly: true, secure: config.production, sameSite: 'lax', path: '/api' });
    res.status(204).end();
  });

  app.get('/api/teacher/me', requireTeacher, wrap(async (req, res) => {
    const r = await db.query('SELECT id, email FROM teachers WHERE id = $1', [req.teacherId]);
    res.json({ teacher: r.rows[0] });
  }));

  // ---------- classes (every query is scoped to the logged-in teacher) ----------
  async function ownedClass(teacherId, classId) {
    parse(uuid, classId);
    const r = await db.query('SELECT id, name, class_code, created_at FROM classes WHERE id = $1 AND teacher_id = $2', [classId, teacherId]);
    if (!r.rows.length) throw notFound(); // 404, not 403: do not reveal that another teacher's class exists
    return r.rows[0];
  }
  const classOut = (c, extra = {}) => ({ id: c.id, name: c.name, classCode: c.class_code, createdAt: c.created_at, ...extra });

  app.get('/api/classes', requireTeacher, wrap(async (req, res) => {
    const r = await db.query(
      `SELECT c.id, c.name, c.class_code, c.created_at, COUNT(s.id)::int AS students
         FROM classes c LEFT JOIN students s ON s.class_id = c.id
        WHERE c.teacher_id = $1 GROUP BY c.id ORDER BY c.created_at DESC`, [req.teacherId]);
    res.json({ classes: r.rows.map((c) => classOut(c, { students: c.students })) });
  }));

  app.post('/api/classes', requireTeacher, wrap(async (req, res) => {
    const { name } = parse(z.object({ name: z.string().trim().min(1).max(60) }), req.body);
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = Array.from({ length: 6 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');
      try {
        const r = await db.query('INSERT INTO classes (teacher_id, name, class_code) VALUES ($1, $2, $3) RETURNING id, name, class_code, created_at', [req.teacherId, name, code]);
        return res.status(201).json({ class: classOut(r.rows[0], { students: 0 }) });
      } catch (e) { if (e.code !== '23505') throw e; }
    }
    throw new HttpError(500, 'Could not create a class code, please try again');
  }));

  app.delete('/api/classes/:id', requireTeacher, wrap(async (req, res) => {
    parse(uuid, req.params.id);
    const r = await db.query('DELETE FROM classes WHERE id = $1 AND teacher_id = $2', [req.params.id, req.teacherId]);
    if (!r.rowCount) throw notFound();
    res.status(204).end();
  }));

  app.post('/api/classes/:id/students', requireTeacher, wrap(async (req, res) => {
    const cls = await ownedClass(req.teacherId, req.params.id);
    const body = parse(z.object({ students: z.array(z.object({ nickname, avatar: avatar.optional() })).min(1).max(40) }), req.body);
    const count = (await db.query('SELECT COUNT(*)::int AS n FROM students WHERE class_id = $1', [cls.id])).rows[0].n;
    if (count + body.students.length > config.maxStudentsPerClass) throw new HttpError(400, `A class can have at most ${config.maxStudentsPerClass} students`);
    const created = [];
    for (const [i, s] of body.students.entries()) {
      try {
        const r = await db.query('INSERT INTO students (class_id, nickname, avatar) VALUES ($1, $2, $3) RETURNING id, nickname, avatar', [cls.id, s.nickname, s.avatar || AVATARS[(count + i) % AVATARS.length]]);
        created.push(r.rows[0]);
      } catch (e) { if (e.code !== '23505') throw e; } // duplicate nickname in class: skip
    }
    res.status(201).json({ students: created });
  }));

  // delete a student AND all their progress (PDPA "right to erasure")
  app.delete('/api/students/:id', requireTeacher, wrap(async (req, res) => {
    parse(uuid, req.params.id);
    const r = await db.query('DELETE FROM students s USING classes c WHERE s.id = $1 AND s.class_id = c.id AND c.teacher_id = $2', [req.params.id, req.teacherId]);
    if (!r.rowCount) throw notFound();
    res.status(204).end();
  }));

  async function dashboardRows(classId) {
    const students = (await db.query(
      `SELECT s.id, s.nickname, s.avatar, s.created_at,
              COUNT(*) FILTER (WHERE p.type = 'letter' AND p.stars > 0)::int AS letters,
              COUNT(*) FILTER (WHERE p.type = 'word'   AND p.stars > 0)::int AS words,
              COUNT(*) FILTER (WHERE p.type = 'story'  AND p.stars > 0)::int AS stories,
              COUNT(*) FILTER (WHERE p.type IN ('game')  AND p.stars > 0)::int AS games,
              COALESCE(SUM(p.stars), 0)::int AS stars,
              MAX(p.updated_at) AS last_played
         FROM students s LEFT JOIN progress p ON p.student_id = s.id
        WHERE s.class_id = $1 GROUP BY s.id ORDER BY s.nickname`, [classId])).rows;
    return students;
  }

  app.get('/api/classes/:id/dashboard', requireTeacher, wrap(async (req, res) => {
    const cls = await ownedClass(req.teacherId, req.params.id);
    const students = await dashboardRows(cls.id);
    const missed = (await db.query(
      `SELECT p.type, p.item_id, SUM(p.misses)::int AS misses, COUNT(DISTINCT p.student_id)::int AS students
         FROM progress p JOIN students s ON s.id = p.student_id
        WHERE s.class_id = $1 AND p.misses > 0 AND p.type IN ('letter', 'word', 'sight')
        GROUP BY p.type, p.item_id ORDER BY misses DESC LIMIT 40`, [cls.id])).rows;
    const top = (types) => missed.filter((m) => types.includes(m.type)).slice(0, 5).map((m) => ({ id: m.item_id, misses: m.misses, students: m.students }));
    const n = students.length || 1;
    res.json({
      class: classOut(cls),
      summary: {
        students: students.length,
        totalStars: students.reduce((a, s) => a + s.stars, 0),
        avgLetters: Math.round((students.reduce((a, s) => a + s.letters, 0) / n) * 10) / 10,
        avgStories: Math.round((students.reduce((a, s) => a + s.stories, 0) / n) * 10) / 10,
        activeLast7Days: students.filter((s) => s.last_played && Date.now() - new Date(s.last_played).getTime() < 7 * 864e5).length,
      },
      students: students.map((s) => ({ id: s.id, nickname: s.nickname, avatar: s.avatar, letters: s.letters, words: s.words, stories: s.stories, games: s.games, stars: s.stars, lastPlayed: s.last_played })),
      mostMissed: { sounds: top(['letter']), words: top(['word', 'sight']) },
    });
  }));

  const csvCell = (v) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  app.get('/api/classes/:id/export.csv', requireTeacher, wrap(async (req, res) => {
    const cls = await ownedClass(req.teacherId, req.params.id);
    const rows = await dashboardRows(cls.id);
    const head = ['nickname', 'avatar', 'letters_done', 'words_done', 'stories_done', 'games_played', 'stars', 'last_played'];
    const lines = [head.join(',')].concat(rows.map((s) => [s.nickname, s.avatar, s.letters, s.words, s.stories, s.games, s.stars, s.last_played ? new Date(s.last_played).toISOString() : ''].map(csvCell).join(',')));
    res.set('Content-Type', 'text/csv; charset=utf-8').set('Content-Disposition', `attachment; filename="class-${cls.class_code}.csv"`).send('﻿' + lines.join('\r\n') + '\r\n');
  }));

  // ---------- children join with a class code (no password, no email) ----------
  app.get('/api/join/:code', joinLimit, wrap(async (req, res) => {
    const code = parse(classCode, req.params.code);
    const c = await db.query('SELECT id, name FROM classes WHERE class_code = $1', [code]);
    if (!c.rows.length) throw notFound();
    const s = await db.query('SELECT id, nickname, avatar FROM students WHERE class_id = $1 ORDER BY nickname', [c.rows[0].id]);
    res.json({ className: c.rows[0].name, students: s.rows });
  }));

  app.post('/api/join', joinLimit, wrap(async (req, res) => {
    const body = parse(z.object({ code: classCode, studentId: uuid.optional(), nickname: nickname.optional(), avatar: avatar.optional() }), req.body);
    const c = await db.query('SELECT id, name FROM classes WHERE class_code = $1', [body.code]);
    if (!c.rows.length) throw notFound();
    const cls = c.rows[0];
    let student;
    if (body.studentId) {
      const r = await db.query('SELECT id, nickname, avatar FROM students WHERE id = $1 AND class_id = $2', [body.studentId, cls.id]);
      if (!r.rows.length) throw notFound();
      student = r.rows[0];
    } else if (body.nickname) {
      const count = (await db.query('SELECT COUNT(*)::int AS n FROM students WHERE class_id = $1', [cls.id])).rows[0].n;
      if (count >= config.maxStudentsPerClass) throw new HttpError(400, 'This class is full');
      try {
        student = (await db.query('INSERT INTO students (class_id, nickname, avatar) VALUES ($1, $2, $3) RETURNING id, nickname, avatar', [cls.id, body.nickname, body.avatar || AVATARS[count % AVATARS.length]])).rows[0];
      } catch (e) {
        if (e.code === '23505') throw new HttpError(409, 'That nickname is taken. Pick it from the list.');
        throw e;
      }
    } else throw new HttpError(400, 'Pick a name or add a new one');
    res.json({ token: signStudent(student.id, cls.id), student, className: cls.name });
  }));

  // ---------- student (limited token: can only touch their OWN progress) ----------
  app.get('/api/me', requireStudent, (req, res) => res.json({ student: { id: req.student.id, nickname: req.student.nickname, avatar: req.student.avatar } }));

  app.get('/api/me/progress', requireStudent, wrap(async (req, res) => {
    const r = await db.query('SELECT type, item_id, stars, attempts, misses, updated_at FROM progress WHERE student_id = $1', [req.student.id]);
    const items = {};
    for (const p of r.rows) items[`${p.type}:${p.item_id}`] = { s: p.stars, a: p.attempts, m: p.misses, u: new Date(p.updated_at).getTime() };
    res.json({ items });
  }));

  const progressItem = z.object({
    type: z.enum(['letter', 'word', 'story', 'game', 'sight']),
    id: z.string().min(1).max(64),
    stars: z.number().int().min(0).max(3),
    attempts: z.number().int().min(0).max(100000),
    misses: z.number().int().min(0).max(100000),
    updated: z.number().int().positive().optional(),
  });

  // Batch upsert. The client sends running totals, so GREATEST() makes retries and several devices safe.
  app.put('/api/me/progress', requireStudent, wrap(async (req, res) => {
    const { items } = parse(z.object({ items: z.array(progressItem).min(1).max(200) }), req.body);
    const uniq = new Map(items.map((i) => [`${i.type}:${i.id}`, i]));
    const rows = [...uniq.values()];
    const params = [req.student.id];
    const values = rows.map((i, n) => {
      const o = 1 + n * 6;
      params.push(i.type, i.id, i.stars, i.attempts, i.misses, new Date(Math.min(i.updated || Date.now(), Date.now())).toISOString());
      return `($1, $${o + 1}, $${o + 2}, $${o + 3}::smallint, $${o + 4}::int, $${o + 5}::int, $${o + 6}::timestamptz)`;
    });
    await db.query(
      `INSERT INTO progress (student_id, type, item_id, stars, attempts, misses, updated_at) VALUES ${values.join(',')}
       ON CONFLICT (student_id, type, item_id) DO UPDATE SET
         stars = GREATEST(progress.stars, EXCLUDED.stars),
         attempts = GREATEST(progress.attempts, EXCLUDED.attempts),
         misses = GREATEST(progress.misses, EXCLUDED.misses),
         updated_at = GREATEST(progress.updated_at, EXCLUDED.updated_at)`, params);
    res.json({ saved: rows.length });
  }));

  // A child (or parent) can erase themselves and all progress.
  app.delete('/api/me', requireStudent, wrap(async (req, res) => {
    await db.query('DELETE FROM students WHERE id = $1', [req.student.id]);
    res.status(204).end();
  }));

  // ---------- errors ----------
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Too large' });
    console.error('unhandled error', err.code || err.name); // never log request bodies or emails
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}
