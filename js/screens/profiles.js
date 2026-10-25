import { h } from '../util.js';
import * as progress from '../progress.js';
import { AVATARS, MAX_PROFILES } from '../progress.js';
import { t } from '../i18n.js';
import { cloudConfigured } from '../config.js';

export function render(root, _params, app) {
  app.header({ title: '', back: progress.currentProfile() ? '/' : false, hide: !progress.currentProfile() });
  let mode = progress.profiles().length ? 'list' : { edit: 'new' };
  draw();

  function draw() {
    root.replaceChildren();
    if (mode === 'list') list(); else editor(mode.edit);
  }

  function list() {
    const cur = progress.currentProfile();
    root.append(h('div', { class: 'stack narrow' },
      h('h2', { class: 'game-prompt' }, 'Who is playing?'),
      h('div', { class: 'profile-grid' },
        progress.profiles().map((p) => h('div', { class: 'stack', style: { gap: '8px' } },
          h('button', { class: 'profile-card' + (cur?.id === p.id ? ' current' : ''), type: 'button', 'aria-label': `${p.name}. Play.`, onclick: () => choose(p) },
            h('span', { class: 'avatar', 'aria-hidden': 'true' }, p.avatar), h('span', { class: 'pname' }, p.name)),
          h('div', { class: 'row', style: { gap: '8px' } },
            flagButton(p),
            cloudConfigured() && h('button', { class: 'btn', type: 'button', 'aria-label': `Join a class as ${p.name}`, onclick: () => { progress.selectProfile(p.id); app.nav('/join'); } }, p.cloud && !p.cloud.invalid ? '🏫✔' : '🏫'),
            h('button', { class: 'btn', type: 'button', 'aria-label': `Edit ${p.name}`, onclick: () => { mode = { edit: p.id }; draw(); } }, '✏️')))),
        progress.profiles().length < MAX_PROFILES && h('button', { class: 'profile-card add', type: 'button', 'aria-label': 'Add a new friend', onclick: () => { mode = { edit: 'new' }; draw(); } },
          h('span', { class: 'avatar', 'aria-hidden': 'true' }, '➕'), h('span', { class: 'pname' }, 'New'))),
    ));
    setTimeout(() => app.audio.prompt(progress.profiles().length ? 'who_playing' : 'new_friend'), 250);
  }

  function flagButton(p) {
    const b = h('button', { class: 'btn', type: 'button', 'aria-label': `Accent: ${p.accent === 'gb' ? 'British' : 'American'}. Tap to change.`, onclick: () => {
      const next = p.accent === 'gb' ? 'us' : 'gb';
      progress.updateProfile(p.id, { accent: next });
      if (progress.currentProfile()?.id === p.id) app.audio.setAccent(next);
      b.textContent = label(next);
      app.audio.prompt('who_playing', { accent: next });
    } }, label(p.accent));
    return b;
  }
  function label(a) { return a === 'gb' ? '🇬🇧 UK' : '🇺🇸 US'; }

  function choose(p) {
    app.sfx.tap();
    progress.selectProfile(p.id);
    app.audio.setAccent(p.accent);
    app.nav('/');
  }

  function editor(id) {
    const isNew = id === 'new';
    const existing = isNew ? null : progress.profileById(id);
    let avatar = existing?.avatar || AVATARS[progress.profiles().length % AVATARS.length];
    let accent = existing?.accent || 'us';
    const nameIn = h('input', { class: 'text-in', type: 'text', maxlength: 12, value: existing?.name || '', placeholder: 'Nickname', 'aria-label': 'Nickname', autocomplete: 'off', autocapitalize: 'words' });
    const avBtns = AVATARS.map((a) => h('button', { class: 'avatar-opt', type: 'button', 'aria-label': 'Picture ' + a, 'aria-pressed': String(a === avatar), onclick: () => {
      avatar = a;
      avBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === a)));
      app.sfx.tap();
    } }, a));
    const flags = ['us', 'gb'].map((a) => h('button', { class: 'flag-btn', type: 'button', 'aria-pressed': String(a === accent), onclick: () => {
      accent = a;
      flags.forEach((b, i) => b.setAttribute('aria-pressed', String(['us', 'gb'][i] === a)));
      app.audio.prompt('pick_accent', { accent: a });
    } }, a === 'us' ? '🇺🇸 US' : '🇬🇧 UK'));
    const confirmBox = h('div', { class: 'row' });

    root.append(h('div', { class: 'stack narrow' },
      h('h2', { class: 'game-prompt' }, isNew ? 'New friend' : 'Edit'),
      nameIn,
      h('p', { class: 'hint' }, 'Use a nickname. Please do not use a real name.'),
      h('div', { class: 'avatar-pick' }, avBtns),
      h('div', { class: 'flag-toggle', role: 'group', 'aria-label': 'Accent' }, flags),
      h('div', { class: 'row' },
        h('button', { class: 'btn btn-primary', type: 'button', onclick: save }, '✔ ', t('save')),
        h('button', { class: 'btn', type: 'button', onclick: () => { mode = 'list'; if (!progress.profiles().length) return; draw(); } }, t('cancel')),
        !isNew && h('button', { class: 'btn btn-danger', type: 'button', onclick: askDelete }, '🗑 ', t('delete_profile'))),
      confirmBox));
    setTimeout(() => app.audio.prompt(isNew ? 'pick_picture' : 'tap_picture'), 250);

    function save() {
      const name = nameIn.value.trim() || 'Friend';
      if (isNew) {
        const p = progress.createProfile({ name, avatar, accent });
        app.audio.setAccent(p.accent);
        app.nav('/');
      } else {
        progress.updateProfile(id, { name, avatar, accent });
        if (progress.currentProfile()?.id === id) app.audio.setAccent(accent);
        mode = 'list';
        draw();
      }
    }
    function askDelete() {
      confirmBox.replaceChildren(h('p', { class: 'warn' }, `Delete ${existing.name} and all stars?`),
        h('button', { class: 'btn btn-danger', type: 'button', onclick: () => { progress.deleteProfile(id); mode = progress.profiles().length ? 'list' : { edit: 'new' }; draw(); } }, 'Yes, delete'),
        h('button', { class: 'btn', type: 'button', onclick: () => confirmBox.replaceChildren() }, 'No'));
    }
  }
}
