// Teacher dashboard: login, classes, students, progress dashboard, CSV export.
// Talks to the Phase 2 API with a cookie (httpOnly, set by the server). No tokens are ever stored in the page.
import { h, formatDate } from '../util.js';

const base = ((window.KIDS_CONFIG && window.KIDS_CONFIG.apiUrl) || '').replace(/\/+$/, '');
const root = document.getElementById('app');
const who = document.getElementById('who');

async function api(path, { method = 'GET', body, raw } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-Requested-With'] = 'kp';
  let res;
  try { res = await fetch(base + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: 'include' }); }
  catch { return { ok: false, status: 0, error: 'No internet or the server is down.' }; }
  if (raw && res.ok) return { ok: true, status: res.status, blob: await res.blob() };
  let json = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { ok: res.ok, status: res.status, json, error: json?.error };
}

const msg = (kind, text) => h('p', { class: `t-msg ${kind}`, role: kind === 'err' ? 'alert' : 'status' }, text);
const confirmTwice = (btn, label, action) => {
  if (btn.dataset.armed) return action();
  btn.dataset.armed = '1';
  const old = btn.textContent;
  btn.textContent = '⚠ ' + label;
  setTimeout(() => { btn.dataset.armed = ''; btn.textContent = old; }, 4000);
};

async function start() {
  if (!base) {
    root.replaceChildren(h('div', { class: 't-card' }, h('h2', {}, 'Not set up yet'), h('p', {}, 'This website has no API address. Set the API_URL environment variable (see DEPLOY-PHASE2.md).')));
    return;
  }
  const me = await api('/api/teacher/me');
  if (me.ok) { who.textContent = me.json.teacher.email; classes(); } else loginView();
}

// ---------- login / register ----------
function loginView(mode = 'login', note) {
  const email = h('input', { class: 'field', type: 'email', autocomplete: 'username', required: true, 'aria-label': 'Email' });
  const pw = h('input', { class: 'field', type: 'password', autocomplete: mode === 'login' ? 'current-password' : 'new-password', required: true, minlength: mode === 'login' ? 1 : 10, 'aria-label': 'Password' });
  const invite = h('input', { class: 'field', type: 'text', autocomplete: 'off', 'aria-label': 'Invite code' });
  const out = h('div', {}, note || '');
  const form = h('form', { class: 't-form', style: { flexDirection: 'column', alignItems: 'flex-start' }, onsubmit: async (e) => {
    e.preventDefault();
    out.replaceChildren();
    const body = { email: email.value, password: pw.value };
    if (mode === 'register') body.inviteCode = invite.value || undefined;
    const r = await api(`/api/teacher/${mode}`, { method: 'POST', body });
    if (r.ok) { who.textContent = r.json.teacher.email; classes(); } else out.replaceChildren(msg('err', r.error || 'Something went wrong'));
  } },
    h('label', {}, 'Email', h('br'), email), h('label', {}, mode === 'login' ? 'Password' : 'Password (10+ characters)', h('br'), pw),
    mode === 'register' && h('label', {}, 'Invite code (if your school gave you one)', h('br'), invite),
    h('button', { class: 'btn btn-primary', type: 'submit' }, mode === 'login' ? 'Log in' : 'Create account'),
    out);
  root.replaceChildren(h('div', { class: 't-card' }, h('h2', {}, mode === 'login' ? 'Teacher log in' : 'New teacher account'), form,
    h('p', { class: 't-note' }, mode === 'login' ? 'No account yet? ' : 'Have an account? ',
      h('a', { href: '#', onclick: (e) => { e.preventDefault(); loginView(mode === 'login' ? 'register' : 'login'); } }, mode === 'login' ? 'Create one' : 'Log in')),
    h('p', { class: 't-note' }, 'Children never need an email or password. They join with a class code. ', h('a', { href: 'privacy.html' }, 'Privacy'))));
}

async function logout() {
  await api('/api/teacher/logout', { method: 'POST' });
  who.textContent = '';
  loginView();
}

// ---------- class list ----------
async function classes(note) {
  const r = await api('/api/classes');
  if (r.status === 401) return loginView();
  if (!r.ok) return root.replaceChildren(msg('err', r.error || 'Could not load classes'));
  const name = h('input', { class: 'field', type: 'text', maxlength: 60, placeholder: 'e.g. Kindergarten 1', 'aria-label': 'Class name', required: true });
  const out = h('div', {}, note || '');
  root.replaceChildren(
    h('div', { class: 't-card' }, h('h2', {}, 'My classes'),
      r.json.classes.length === 0 && h('p', {}, 'No classes yet. Create your first one below.'),
      h('div', { class: 't-grid' }, r.json.classes.map((c) => h('button', { class: 't-card t-class', type: 'button', onclick: () => classView(c.id) },
        h('b', {}, c.name), h('div', { class: 't-code' }, c.classCode), h('span', { class: 't-note' }, `${c.students} students`))))),
    h('div', { class: 't-card' }, h('h2', {}, 'New class'),
      h('form', { class: 't-form', onsubmit: async (e) => {
        e.preventDefault();
        const c = await api('/api/classes', { method: 'POST', body: { name: name.value } });
        if (c.ok) classView(c.json.class.id); else out.replaceChildren(msg('err', c.error || 'Error'));
      } }, name, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Create class')), out),
    h('div', { class: 't-card' }, h('button', { class: 'btn btn-small', type: 'button', onclick: logout }, 'Log out')));
}

// ---------- one class ----------
async function classView(id, note) {
  const r = await api(`/api/classes/${id}/dashboard`);
  if (r.status === 401) return loginView();
  if (!r.ok) return classes(msg('err', r.error || 'Class not found'));
  const { class: cls, summary, students, mostMissed } = r.json;
  const names = h('textarea', { class: 'field', placeholder: 'One nickname per line\nMimi\nBen\nNok', 'aria-label': 'Nicknames, one per line' });
  const out = h('div', {}, note || '');
  const tile = (label, value) => h('div', { class: 't-tile' }, h('b', {}, value), h('span', { class: 't-note' }, label));
  const chips = (list, empty) => list.length ? h('div', { class: 't-chips' }, list.map((m) => h('span', { class: 't-chip' }, `${m.id} · ${m.misses}×`))) : h('p', { class: 't-note' }, empty);

  root.replaceChildren(
    h('div', { class: 't-card t-printable' },
      h('button', { class: 'btn btn-small', type: 'button', onclick: () => classes() }, '← All classes'),
      h('h2', { style: { marginTop: '12px' } }, cls.name),
      h('p', {}, 'Class code (children type this):'),
      h('div', { class: 't-code', 'aria-label': 'Class code ' + cls.classCode.split('').join(' ') }, cls.classCode),
      h('div', { class: 't-form', style: { marginTop: '10px' } },
        h('button', { class: 'btn btn-small', type: 'button', onclick: () => window.print() }, '🖨 Print code'),
        h('button', { class: 'btn btn-small', type: 'button', onclick: async () => {
          const f = await api(`/api/classes/${id}/export.csv`, { raw: true });
          if (!f.ok) return out.replaceChildren(msg('err', 'Could not export'));
          const a = h('a', { href: URL.createObjectURL(f.blob), download: `class-${cls.classCode}.csv` });
          document.body.append(a); a.click(); a.remove();
        } }, '⬇ CSV'),
        h('button', { class: 'btn btn-small', type: 'button', onclick: () => classView(id) }, '⟳ Refresh'))),
    h('div', { class: 't-card' }, h('h2', {}, 'Class summary'), h('div', { class: 't-tiles' },
      tile('students', summary.students), tile('stars earned', summary.totalStars), tile('avg letters done', summary.avgLetters),
      tile('avg stories done', summary.avgStories), tile('played in last 7 days', summary.activeLast7Days))),
    h('div', { class: 't-card' }, h('h2', {}, 'Students'),
      students.length === 0 ? h('p', {}, 'No students yet. Add nicknames below, or children can add themselves with the class code.') :
        h('div', { class: 't-table-wrap' }, h('table', { class: 't' },
          h('thead', {}, h('tr', {}, ['', 'Nickname', 'Letters', 'Words', 'Stories', 'Games', 'Stars', 'Last played', ''].map((x) => h('th', {}, x)))),
          h('tbody', {}, students.map((s) => h('tr', {},
            h('td', {}, s.avatar), h('td', {}, s.nickname), h('td', {}, s.letters), h('td', {}, s.words), h('td', {}, s.stories), h('td', {}, s.games), h('td', {}, '⭐ ' + s.stars),
            h('td', {}, s.lastPlayed ? formatDate(s.lastPlayed) : '-'),
            h('td', {}, h('button', { class: 'btn btn-small btn-danger', type: 'button', 'aria-label': `Delete ${s.nickname} and all their data`, onclick: (e) => confirmTwice(e.currentTarget, 'Delete all data?', async () => {
              const d = await api(`/api/students/${s.id}`, { method: 'DELETE' });
              classView(id, d.ok ? msg('ok', `${s.nickname} and all their data were deleted.`) : msg('err', d.error || 'Error'));
            }) }, 'Delete')))))))),
    h('div', { class: 't-card' }, h('h2', {}, 'Needs practice'),
      h('p', { class: 't-note' }, 'Most-missed (number of wrong taps across the class).'),
      h('b', {}, 'Sounds'), chips(mostMissed.sounds, 'Nothing yet.'), h('b', {}, 'Words'), chips(mostMissed.words, 'Nothing yet.')),
    h('div', { class: 't-card' }, h('h2', {}, 'Add students'),
      h('p', { class: 't-note' }, 'Use nicknames only. Please do not enter real names, emails or birth dates.'),
      h('form', { class: 't-form', onsubmit: async (e) => {
        e.preventDefault();
        const list = names.value.split('\n').map((x) => x.trim()).filter(Boolean).map((nickname) => ({ nickname }));
        if (!list.length) return;
        const a = await api(`/api/classes/${id}/students`, { method: 'POST', body: { students: list } });
        classView(id, a.ok ? msg('ok', `${a.json.students.length} added.`) : msg('err', a.error || 'Error'));
      } }, names, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Add')), out),
    h('div', { class: 't-card' }, h('h2', {}, 'Parent consent (PDPA)'),
      h('p', {}, 'Before children join, ask a parent or the school to agree. A sample note is on the ', h('a', { href: 'privacy.html#consent' }, 'privacy page'), '.')),
    h('div', { class: 't-card' }, h('button', { class: 'btn btn-small btn-danger', type: 'button', onclick: (e) => confirmTwice(e.currentTarget, 'Delete class and ALL its data?', async () => {
      const d = await api(`/api/classes/${id}`, { method: 'DELETE' });
      classes(d.ok ? msg('ok', 'Class deleted.') : msg('err', d.error || 'Error'));
    }) }, 'Delete this class')));
}

start();
