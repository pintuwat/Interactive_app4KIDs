// Child joins a class with a class code: no password, no email. Picks an existing nickname/avatar or adds a new one.
import { h } from '../util.js';
import * as progress from '../progress.js';
import { AVATARS } from '../progress.js';
import { cloudConfigured } from '../config.js';
import { lookupClass, joinClass, linkProfile } from '../storage/api.js';
import { t } from '../i18n.js';

export function render(root, _params, app) {
  app.header({ title: 'Join class', back: '/' });
  const profile = progress.currentProfile();
  if (!cloudConfigured()) { root.append(h('p', { class: 'oops' }, 'Classes are not turned on.')); return; }
  if (!profile) { app.nav('/profiles'); return; }
  if (profile.cloud && !profile.cloud.invalid) { done(profile.cloud.className); return; }
  stepCode();

  function stepCode() {
    let agreed = false;
    const msg = h('p', { class: 'warn', hidden: true });
    const code = h('input', { class: 'text-in', type: 'text', maxlength: 8, placeholder: 'ABC123', 'aria-label': 'Class code', autocomplete: 'off', autocapitalize: 'characters', style: { textTransform: 'uppercase', letterSpacing: '.2em' } });
    const next = h('button', { class: 'btn btn-primary big-play', type: 'button', disabled: true, onclick: go }, 'Next ➡');
    const consent = h('input', { type: 'checkbox', id: 'consent', style: { width: '28px', height: '28px' }, onchange: (e) => { agreed = e.target.checked; next.disabled = !agreed; } });
    async function go() {
      msg.hidden = true;
      const c = code.value.trim();
      if (c.replace(/[^a-z0-9]/gi, '').length !== 6) { show('Check the class code.'); return; }
      next.disabled = true;
      try {
        const r = await lookupClass(c);
        if (!r.ok) { show(r.status === 404 ? 'Class not found. Try again.' : 'Please try again.'); next.disabled = false; return; }
        stepPick(c, r.json);
      } catch { show('No internet. Try again later.'); next.disabled = false; }
    }
    const show = (m) => { msg.textContent = m; msg.hidden = false; };
    code.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !next.disabled) go(); });
    root.replaceChildren(h('div', { class: 'stack narrow' },
      h('h2', { class: 'game-prompt' }, 'Class code'),
      code,
      h('label', { class: 'panel', for: 'consent', style: { display: 'flex', gap: '14px', alignItems: 'flex-start', cursor: 'pointer' } }, consent,
        h('span', { style: { fontSize: '.95rem', textAlign: 'left' } },
          'Grown-up: my school or parent says OK. The teacher can see stars and progress. We never save real names. ',
          h('a', { href: 'privacy.html' }, t('privacy')))),
      msg, next));
    code.focus();
  }

  function stepPick(codeValue, info) {
    let avatar = AVATARS[0];
    const nick = h('input', { class: 'text-in', type: 'text', maxlength: 20, placeholder: 'Nickname', 'aria-label': 'Nickname', autocomplete: 'off' });
    const msg = h('p', { class: 'warn', hidden: true });
    const avBtns = AVATARS.map((a) => h('button', { class: 'avatar-opt', type: 'button', 'aria-pressed': String(a === avatar), onclick: () => { avatar = a; avBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === a))); } }, a));
    async function choose(payload) {
      const r = await joinClass({ code: codeValue, ...payload }).catch(() => null);
      if (!r || !r.ok) { msg.textContent = r?.status === 409 ? 'That name is taken. Tap it in the list.' : r?.status === 400 ? 'Use letters and numbers.' : 'Please try again.'; msg.hidden = false; return; }
      progress.updateProfile(profile.id, { name: r.json.student.nickname, avatar: r.json.student.avatar });
      linkProfile(profile.id, { token: r.json.token, student: r.json.student, className: r.json.className, code: codeValue });
      done(r.json.className);
    }
    root.replaceChildren(h('div', { class: 'stack narrow' },
      h('h2', { class: 'game-prompt' }, info.className),
      info.students.length > 0 && [h('p', { class: 'hint' }, 'Tap your picture'), h('div', { class: 'profile-grid' }, info.students.map((s) => h('button', { class: 'profile-card', type: 'button', style: { width: '140px', minHeight: '150px' }, onclick: () => choose({ studentId: s.id }) }, h('span', { class: 'avatar' }, s.avatar), h('span', { class: 'pname' }, s.nickname))))],
      h('h3', {}, 'I am new'),
      nick, h('div', { class: 'avatar-pick' }, avBtns),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => { if (nick.value.trim()) choose({ nickname: nick.value.trim(), avatar }); } }, '✔ Join'),
      msg));
  }

  function done(className) {
    root.replaceChildren(h('div', { class: 'stack' }, h('div', { class: 'celebrate-emoji' }, '🏫'), h('p', { class: 'game-prompt' }, `You are in ${className}!`), h('a', { class: 'btn btn-primary big-play', href: '#/' }, '🏠 Home')));
    app.audio.prompt('praise_4');
  }
}
