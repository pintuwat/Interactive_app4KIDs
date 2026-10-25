import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, client, registerTeacher } from './helpers.js';

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.close(); });

const newTeacher = async (email) => { const api = client(srv.base); await registerTeacher(api, email); return api; };
const newClass = async (api, name = 'Class A') => (await api.post('/api/classes', { name })).json.class;
const addStudents = async (api, cls, names) => (await api.post(`/api/classes/${cls.id}/students`, { students: names.map((nickname) => ({ nickname })) })).json.students;

test('teacher register, login, wrong password, logout', async () => {
  const api = client(srv.base);
  assert.equal((await api.post('/api/teacher/register', { email: 'a@example.com', password: 'short' })).status, 400, 'weak password');
  assert.equal((await api.post('/api/teacher/register', { email: 'not-an-email', password: 'long-enough-password' })).status, 400);
  const reg = await api.post('/api/teacher/register', { email: 'A@Example.com', password: 'long-enough-password' });
  assert.equal(reg.status, 201);
  assert.equal(reg.json.teacher.email, 'a@example.com', 'email lower-cased');
  assert.match(reg.headers.getSetCookie().join(), /kp_teacher=.*HttpOnly/i);
  assert.equal((await api.get('/api/teacher/me')).json.teacher.email, 'a@example.com');
  assert.equal((await api.post('/api/teacher/register', { email: 'a@example.com', password: 'long-enough-password' })).status, 409);

  const other = client(srv.base);
  assert.equal((await other.post('/api/teacher/login', { email: 'a@example.com', password: 'wrong-password-here' })).status, 401);
  assert.equal((await other.post('/api/teacher/login', { email: 'nobody@example.com', password: 'wrong-password-here' })).status, 401);
  assert.equal((await other.post('/api/teacher/login', { email: 'a@example.com', password: 'long-enough-password' })).status, 200);
  assert.equal((await other.get('/api/teacher/me')).status, 200);
  assert.equal((await other.post('/api/teacher/logout')).status, 204);
  assert.equal((await other.get('/api/teacher/me')).status, 401);
});

test('passwords are stored hashed', async () => {
  await newTeacher('hash@example.com');
  const r = await srv.db.query("SELECT password_hash FROM teachers WHERE email = 'hash@example.com'");
  assert.match(r.rows[0].password_hash, /^\$2[aby]\$/);
});

test('teacher endpoints need login and the CSRF header', async () => {
  const anon = client(srv.base);
  assert.equal((await anon.get('/api/classes')).status, 401);
  assert.equal((await anon.post('/api/classes', { name: 'x' })).status, 401);
  const api = await newTeacher('csrf@example.com');
  const noHeader = await api.call('POST', '/api/classes', { body: { name: 'Sneaky' }, headers: { 'X-Requested-With': '' } });
  assert.equal(noHeader.status, 403);
});

test('class lifecycle: create, readable code, list, delete', async () => {
  const api = await newTeacher('life@example.com');
  const cls = await newClass(api, 'Kindergarten 1');
  assert.match(cls.classCode, /^[A-HJ-KM-NP-Z2-9]{6}$/);
  assert.equal((await api.post('/api/classes', { name: '' })).status, 400);
  const list = await api.get('/api/classes');
  assert.deepEqual(list.json.classes.map((c) => c.name), ['Kindergarten 1']);
  assert.equal((await api.del(`/api/classes/${cls.id}`)).status, 204);
  assert.equal((await api.get('/api/classes')).json.classes.length, 0);
  assert.equal((await api.del(`/api/classes/${cls.id}`)).status, 404);
});

test('SECURITY: one teacher cannot read or change another teacher\'s class', async () => {
  const alice = await newTeacher('alice@example.com');
  const bob = await newTeacher('bob@example.com');
  const cls = await newClass(alice, 'Alice class');
  const [kid] = await addStudents(alice, cls, ['Mimi']);

  assert.deepEqual((await bob.get('/api/classes')).json.classes, [], 'bob list is empty');
  for (const [name, res] of [
    ['dashboard', await bob.get(`/api/classes/${cls.id}/dashboard`)],
    ['csv', await bob.get(`/api/classes/${cls.id}/export.csv`)],
    ['add students', await bob.post(`/api/classes/${cls.id}/students`, { students: [{ nickname: 'Evil' }] })],
    ['delete class', await bob.del(`/api/classes/${cls.id}`)],
    ['delete student', await bob.del(`/api/students/${kid.id}`)],
  ]) assert.equal(res.status, 404, `${name} must be 404 for another teacher`);

  // and nothing was changed
  const dash = await alice.get(`/api/classes/${cls.id}/dashboard`);
  assert.equal(dash.status, 200);
  assert.equal(dash.json.students.length, 1);
});

test('children join with a class code and see only nicknames and avatars', async () => {
  const api = await newTeacher('join@example.com');
  const cls = await newClass(api);
  await addStudents(api, cls, ['Mimi', 'Ben']);
  const anon = client(srv.base);
  const info = await anon.get(`/api/join/${cls.classCode.toLowerCase().replace(/^(...)/, '$1-')}`); // lower case + dash still works
  assert.equal(info.status, 200);
  assert.deepEqual(info.json.students.map((s) => s.nickname).sort(), ['Ben', 'Mimi']);
  assert.deepEqual(Object.keys(info.json.students[0]).sort(), ['avatar', 'id', 'nickname'], 'no other fields leak');
  assert.equal((await anon.get('/api/join/ZZZZZZ')).status, 404);

  const j = await anon.post('/api/join', { code: cls.classCode, studentId: info.json.students[0].id });
  assert.equal(j.status, 200);
  assert.ok(j.json.token);
  const self = await anon.post('/api/join', { code: cls.classCode, nickname: 'Newbie', avatar: '🐸' });
  assert.equal(self.status, 200);
  assert.equal((await anon.post('/api/join', { code: cls.classCode, nickname: 'Newbie' })).status, 409, 'duplicate nickname');
  assert.equal((await anon.post('/api/join', { code: cls.classCode, nickname: 'me@mail.com' })).status, 400, 'no email-like nicknames');
  assert.equal((await anon.post('/api/join', { code: cls.classCode })).status, 400);
  assert.equal((await anon.post('/api/join', { code: 'ZZZZZZ', nickname: 'X' })).status, 404);
});

async function joinedStudent(api, cls, nick) {
  const anon = client(srv.base);
  const r = await anon.post('/api/join', { code: cls.classCode, nickname: nick });
  return { token: r.json.token, id: r.json.student.id, api: anon };
}

test('student token can only read and write its own progress', async () => {
  const t = await newTeacher('prog@example.com');
  const cls = await newClass(t);
  const a = await joinedStudent(t, cls, 'Anna');
  const b = await joinedStudent(t, cls, 'Bobby');

  const put = await a.api.put('/api/me/progress', { items: [
    { type: 'letter', id: 's', stars: 2, attempts: 3, misses: 1 },
    { type: 'story', id: 'pip-the-pig', stars: 3, attempts: 1, misses: 0 },
  ] }, { token: a.token });
  assert.equal(put.status, 200);
  assert.equal(put.json.saved, 2);

  const mine = (await a.api.get('/api/me/progress', { token: a.token })).json.items;
  assert.equal(mine['letter:s'].s, 2);
  assert.equal(mine['story:pip-the-pig'].s, 3);
  const theirs = (await b.api.get('/api/me/progress', { token: b.token })).json.items;
  assert.deepEqual(theirs, {}, 'Bobby sees none of Anna\'s progress');

  // the body cannot name another student: any studentId field is ignored/rejected, rows land on the token owner
  await b.api.put('/api/me/progress', { items: [{ type: 'letter', id: 'a', stars: 1, attempts: 1, misses: 0, studentId: a.id }] }, { token: b.token });
  const rows = (await srv.db.query('SELECT student_id FROM progress WHERE type = $1 AND item_id = $2', ['letter', 'a'])).rows;
  assert.deepEqual(rows.map((r) => r.student_id), [b.id]);

  // student token is not a teacher
  assert.equal((await a.api.get('/api/classes', { token: a.token })).status, 401);
  assert.equal((await client(srv.base).get('/api/me/progress')).status, 401, 'no token');
  assert.equal((await client(srv.base).get('/api/me/progress', { token: 'garbage' })).status, 401);
  // teacher cookie is not a student
  assert.equal((await t.get('/api/me/progress')).status, 401);
});

test('progress upserts keep the best stars and totals (safe retries)', async () => {
  const t = await newTeacher('upsert@example.com');
  const cls = await newClass(t);
  const s = await joinedStudent(t, cls, 'Cleo');
  const put = (items) => s.api.put('/api/me/progress', { items }, { token: s.token });
  await put([{ type: 'word', id: 'cat', stars: 3, attempts: 4, misses: 2 }]);
  await put([{ type: 'word', id: 'cat', stars: 1, attempts: 2, misses: 1 }]); // older/lower data must not overwrite
  const items = (await s.api.get('/api/me/progress', { token: s.token })).json.items;
  assert.deepEqual([items['word:cat'].s, items['word:cat'].a, items['word:cat'].m], [3, 4, 2]);
  assert.equal((await srv.db.query('SELECT COUNT(*)::int AS n FROM progress WHERE student_id = $1', [s.id])).rows[0].n, 1, 'still one row');
});

test('progress validation', async () => {
  const t = await newTeacher('valid@example.com');
  const cls = await newClass(t);
  const s = await joinedStudent(t, cls, 'Dana');
  const put = (items) => s.api.put('/api/me/progress', { items }, { token: s.token });
  assert.equal((await put([{ type: 'hack', id: 'x', stars: 1, attempts: 1, misses: 0 }])).status, 400);
  assert.equal((await put([{ type: 'letter', id: 'x', stars: 9, attempts: 1, misses: 0 }])).status, 400);
  assert.equal((await put([{ type: 'letter', id: "x'; DROP TABLE progress;--", stars: 1, attempts: 1, misses: 0 }])).status, 200, 'SQL text is just data');
  assert.equal((await put([])).status, 400);
  assert.equal((await put(Array.from({ length: 201 }, (_, i) => ({ type: 'letter', id: 'l' + i, stars: 1, attempts: 1, misses: 0 })))).status, 400);
  assert.equal((await srv.db.query('SELECT COUNT(*)::int AS n FROM progress')).rows[0].n > 0, true, 'table still exists');
});

test('dashboard summary, most-missed lists, and CSV export', async () => {
  const t = await newTeacher('dash@example.com');
  const cls = await newClass(t, 'Dash');
  const a = await joinedStudent(t, cls, 'Eve');
  const b = await joinedStudent(t, cls, '-cmd'); // starts with '-' (allowed char) so a spreadsheet could read it as a formula
  await a.api.put('/api/me/progress', { items: [
    { type: 'letter', id: 's', stars: 3, attempts: 5, misses: 4 },
    { type: 'letter', id: 'a', stars: 1, attempts: 2, misses: 1 },
    { type: 'word', id: 'cat', stars: 1, attempts: 3, misses: 2 },
    { type: 'story', id: 'pip-the-pig', stars: 2, attempts: 1, misses: 0 },
    { type: 'game', id: 'bubble-pop', stars: 2, attempts: 1, misses: 0 },
  ] }, { token: a.token });
  await b.api.put('/api/me/progress', { items: [{ type: 'letter', id: 's', stars: 1, attempts: 2, misses: 3 }] }, { token: b.token });

  const d = (await t.get(`/api/classes/${cls.id}/dashboard`)).json;
  assert.equal(d.summary.students, 2);
  assert.equal(d.summary.totalStars, 3 + 1 + 1 + 2 + 2 + 1);
  const eve = d.students.find((s) => s.nickname === 'Eve');
  assert.deepEqual([eve.letters, eve.words, eve.stories, eve.games, eve.stars], [2, 1, 1, 1, 9]);
  assert.ok(eve.lastPlayed);
  assert.equal(d.mostMissed.sounds[0].id, 's');
  assert.equal(d.mostMissed.sounds[0].misses, 7);
  assert.equal(d.mostMissed.sounds[0].students, 2);
  assert.equal(d.mostMissed.words[0].id, 'cat');

  const csv = await t.get(`/api/classes/${cls.id}/export.csv`);
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  assert.match(csv.text, /nickname,avatar,letters_done/);
  assert.match(csv.text, /Eve,/);
  assert.ok(!/^-cmd/m.test(csv.text), 'formula-like nickname is neutralised');
  assert.match(csv.text, /^'-cmd/m);
  assert.equal((await t.post(`/api/classes/${cls.id}/students`, { students: [{ nickname: '=1+1|x' }] })).status, 400, 'odd characters rejected');
});

test('deleting a student erases their progress and token', async () => {
  const t = await newTeacher('erase@example.com');
  const cls = await newClass(t);
  const s = await joinedStudent(t, cls, 'Finn');
  await s.api.put('/api/me/progress', { items: [{ type: 'letter', id: 's', stars: 1, attempts: 1, misses: 0 }] }, { token: s.token });
  assert.equal((await t.del(`/api/students/${s.id}`)).status, 204);
  assert.equal((await srv.db.query('SELECT COUNT(*)::int AS n FROM progress WHERE student_id = $1', [s.id])).rows[0].n, 0);
  assert.equal((await s.api.get('/api/me/progress', { token: s.token })).status, 401, 'old token stops working');
});

test('a child can erase their own data (DELETE /api/me)', async () => {
  const t = await newTeacher('self@example.com');
  const cls = await newClass(t);
  const s = await joinedStudent(t, cls, 'Gigi');
  assert.equal((await s.api.del('/api/me', { token: s.token })).status, 204);
  assert.equal((await srv.db.query('SELECT COUNT(*)::int AS n FROM students WHERE id = $1', [s.id])).rows[0].n, 0);
});

test('deleting a class erases students and progress', async () => {
  const t = await newTeacher('cascade@example.com');
  const cls = await newClass(t);
  const s = await joinedStudent(t, cls, 'Hugo');
  await s.api.put('/api/me/progress', { items: [{ type: 'letter', id: 's', stars: 1, attempts: 1, misses: 0 }] }, { token: s.token });
  await t.del(`/api/classes/${cls.id}`);
  assert.equal((await srv.db.query('SELECT COUNT(*)::int AS n FROM progress WHERE student_id = $1', [s.id])).rows[0].n, 0);
  assert.equal((await srv.db.query('SELECT COUNT(*)::int AS n FROM students WHERE id = $1', [s.id])).rows[0].n, 0);
});

test('bad ids and bodies return clean errors', async () => {
  const t = await newTeacher('bad@example.com');
  assert.equal((await t.get('/api/classes/not-a-uuid/dashboard')).status, 400);
  assert.equal((await t.del('/api/students/not-a-uuid')).status, 400);
  const raw = await fetch(srv.base + '/api/teacher/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
  assert.equal(raw.status, 400);
  assert.equal((await t.get('/api/nope')).status, 404);
});

test('CORS only allows the configured website origin', async () => {
  const ok = await fetch(srv.base + '/api/health', { headers: { Origin: 'https://site.test' } });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://site.test');
  assert.equal(ok.headers.get('access-control-allow-credentials'), 'true');
  const evil = await fetch(srv.base + '/api/health', { headers: { Origin: 'https://evil.test' } });
  assert.equal(evil.headers.get('access-control-allow-origin'), null);
  assert.ok(ok.headers.get('x-content-type-options'), 'helmet headers present');
});

test('class size is limited', async () => {
  const small = await startServer({ maxStudentsPerClass: 2 });
  try {
    const t = client(small.base); await registerTeacher(t, 'cap@example.com');
    const cls = (await t.post('/api/classes', { name: 'Tiny' })).json.class;
    assert.equal((await t.post(`/api/classes/${cls.id}/students`, { students: [{ nickname: 'a' }, { nickname: 'b' }, { nickname: 'c' }] })).status, 400);
    assert.equal((await t.post(`/api/classes/${cls.id}/students`, { students: [{ nickname: 'a' }, { nickname: 'b' }] })).status, 201);
    assert.equal((await client(small.base).post('/api/join', { code: cls.classCode, nickname: 'late' })).status, 400);
  } finally { await small.close(); }
});

test('registration can be closed or require an invite code', async () => {
  const closed = await startServer({ allowRegistration: false });
  try { assert.equal((await client(closed.base).post('/api/teacher/register', { email: 'x@example.com', password: 'long-enough-password' })).status, 403); } finally { await closed.close(); }
  const invite = await startServer({ registrationCode: 'school-secret' });
  try {
    const api = client(invite.base);
    assert.equal((await api.post('/api/teacher/register', { email: 'x@example.com', password: 'long-enough-password' })).status, 403);
    assert.equal((await api.post('/api/teacher/register', { email: 'x@example.com', password: 'long-enough-password', inviteCode: 'wrong' })).status, 403);
    assert.equal((await api.post('/api/teacher/register', { email: 'x@example.com', password: 'long-enough-password', inviteCode: 'school-secret' })).status, 201);
  } finally { await invite.close(); }
});

test('login is rate limited', async () => {
  const limited = await startServer({ rateLimit: true });
  try {
    const api = client(limited.base);
    let last;
    for (let i = 0; i < 12; i++) last = await api.post('/api/teacher/login', { email: 'a@example.com', password: 'whatever-password' });
    assert.equal(last.status, 429);
  } finally { await limited.close(); }
});
