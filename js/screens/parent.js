// Parent corner: protected by a simple maths question so small children cannot enter.
import { h, download, formatDate } from '../util.js';
import { data } from '../data.js';
import * as progress from '../progress.js';
import { t, lang } from '../i18n.js';
import * as sheets from '../worksheets.js';

const row = (a, b) => h('tr', {}, h('th', {}, a), h('td', {}, b));
let unlockedUntil = 0;
const GATE_MINUTES = 10;

export function render(root, _params, app) {
  app.header({ title: t('parent'), back: progress.currentProfile() ? '/' : false, hide: !progress.currentProfile() });
  if (Date.now() < unlockedUntil) return panels(root, app);
  gate(root, app);
}

function gate(root, app) {
  const a = 3 + Math.floor(Math.random() * 7);
  const b = 3 + Math.floor(Math.random() * 7);
  const input = h('input', { class: 'text-in', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: 3, 'aria-label': `${a} + ${b} =`, autocomplete: 'off' });
  const msg = h('p', { class: 'hint' }, t('gate_hint'));
  const go = () => {
    if (Number(input.value.trim()) === a + b) { unlockedUntil = Date.now() + GATE_MINUTES * 60000; root.replaceChildren(); panels(root, app); }
    else { msg.textContent = '✗'; input.value = ''; input.focus(); }
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  root.replaceChildren(h('div', { class: 'panel gate stack' },
    h('h2', {}, '🔒 ' + t('gate_title')),
    h('div', { class: 'q' }, `${a} + ${b} = ?`),
    input, msg,
    h('div', { class: 'row' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: go }, t('check')), h('a', { class: 'btn', href: '#/' }, t('cancel')))));
}

function panels(root, app) {
  root.replaceChildren();
  const wrap = h('div', { class: 'parent' });
  root.append(wrap);
  draw();

  function draw() {
    wrap.replaceChildren(
      childrenPanel(), worksheetPanel(), dataPanel(), settingsPanel(), cloudPanelSlot(),
      h('div', { class: 'row' }, h('a', { class: 'btn', href: 'privacy.html' }, '🛡 ' + t('privacy')), h('a', { class: 'btn', href: 'record-audio.html' }, '🎙 Record audio'), h('a', { class: 'btn', href: 'teacher.html' }, '👩‍🏫 ' + t('teacher'))));
  }

  // ---------- children ----------
  function childrenPanel() {
    const list = progress.profiles();
    return h('section', { class: 'panel' }, h('h2', {}, '👧 ' + t('children')),
      list.length === 0 && h('p', {}, '—'),
      list.map((p) => {
        const st = audio().voiceStatus(p.accent);
        const accent = h('select', { class: 'select', 'aria-label': t('accent'), onchange: (e) => { progress.updateProfile(p.id, { accent: e.target.value }); if (progress.currentProfile()?.id === p.id) audio().setAccent(e.target.value); draw(); } },
          h('option', { value: 'us', selected: p.accent === 'us' }, '🇺🇸 ' + t('american')), h('option', { value: 'gb', selected: p.accent === 'gb' }, '🇬🇧 ' + t('british')));
        const level = h('select', { class: 'select', 'aria-label': t('level'), onchange: (e) => progress.updateProfile(p.id, { level: e.target.value }) },
          ['all', '1', '2', '3'].map((k) => h('option', { value: k, selected: (p.level || 'all') === k }, k === 'all' ? t('level') + ': ' + data.levels.all.name : `${data.levels[k].name} (${data.levels[k].ages}) ${data.levels[k].focus}`)));
        return h('div', { class: 'panel', style: { background: 'rgba(0,0,0,.03)', boxShadow: 'none', marginTop: '10px' } },
          h('h2', {}, `${p.avatar} ${p.name}`),
          h('div', { class: 'form-row' }, h('label', {}, t('accent')), accent, h('label', {}, t('level')), level),
          !st.found && st.recorded === 0 && h('p', { class: 'warn' }, t('voice_missing')),
          st.found && h('p', { class: 'hint' }, `Voice: ${st.name}`),
          summary(p),
          h('div', { class: 'row', style: { justifyContent: 'flex-start' } },
            h('button', { class: 'btn btn-small', type: 'button', onclick: () => download(`phonics-${p.name}.json`, progress.exportData(p.id)) }, '⬇ ' + t('export')),
            h('button', { class: 'btn btn-small btn-danger', type: 'button', onclick: (e) => confirmBtn(e.currentTarget, t('reset') + '?', () => { progress.resetProfile(p.id); draw(); }) }, '↺ ' + t('reset'))));
      }));
  }

  function summary(p) {
    const dc = (type) => progress.doneCount(type, p);
    const missed = progress.items('letter', p).filter((i) => i.m > 0).sort((a, b) => b.m - a.m).slice(0, 5).map((i) => i.id).join(', ');
    return h('table', { class: 'sum' }, h('tbody', {},
      row(t('letters_done'), `${dc('letter')} / ${data.path.length}`),
      row(t('words_done'), `${dc('word')} / ${data.words.length}`),
      row(t('stories_done'), `${dc('story')} / ${data.stories.length}`),
      row(t('stars'), `⭐ ${progress.totalStars(p)}  ·  🌟 ${p.stickers}`),
      missed && row('Practise', missed)));
  }

  // ---------- worksheets ----------
  function worksheetPanel() {
    const groups = [];
    for (let i = 0; i < data.path.length; i += 6) groups.push(data.path.slice(i, i + 6));
    const gsel = h('select', { class: 'select', 'aria-label': 'Letters' }, groups.map((g, i) => h('option', { value: i }, g.join(' '))));
    const fsel = h('select', { class: 'select', 'aria-label': 'Word family' }, h('option', { value: 'mixed' }, 'mixed'), data.families.map((f) => h('option', { value: f.id }, f.label)));
    const who = () => progress.currentProfile()?.name || '';
    return h('section', { class: 'panel' }, h('h2', {}, '🖨 ' + t('worksheets')),
      h('div', { class: 'form-row' }, h('label', {}, 'Tracing'), gsel, h('button', { class: 'btn btn-small', type: 'button', onclick: () => sheets.tracingSheet(groups[gsel.value], who()) }, t('print'))),
      h('div', { class: 'form-row' }, h('label', {}, 'Matching'), fsel, h('button', { class: 'btn btn-small', type: 'button', onclick: () => sheets.matchingSheet(fsel.value, who()) }, t('print'))));
  }

  // ---------- export / import ----------
  function dataPanel() {
    const note = h('p', { class: 'hint' });
    const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const res = progress.importData(await f.text());
      note.className = res.ok ? 'ok' : 'warn';
      note.textContent = res.ok ? `OK: +${res.added}, merged ${res.merged}${res.skipped ? `, skipped ${res.skipped} (max 5)` : ''}` : 'This file cannot be used.';
      if (res.ok) draw();
    } });
    return h('section', { class: 'panel' }, h('h2', {}, '💾 ' + t('progress')),
      h('div', { class: 'row', style: { justifyContent: 'flex-start' } },
        h('button', { class: 'btn btn-small', type: 'button', onclick: () => download(`phonics-progress-${new Date().toISOString().slice(0, 10)}.json`, progress.exportData()) }, '⬇ ' + t('export')),
        h('button', { class: 'btn btn-small', type: 'button', onclick: () => file.click() }, '⬆ ' + t('import')), file), note);
  }

  // ---------- device settings ----------
  function settingsPanel() {
    const s = progress.settings();
    const motion = h('select', { class: 'select', 'aria-label': t('reduce_motion'), onchange: (e) => progress.setSetting('motion', e.target.value) },
      [['auto', 'Auto'], ['reduce', t('reduce_motion')], ['full', 'Full']].map(([v, l]) => h('option', { value: v, selected: s.motion === v }, l)));
    return h('section', { class: 'panel' }, h('h2', {}, '⚙ ' + t('sound_settings')),
      h('div', { class: 'form-row' },
        h('label', {}, t('mute')), h('button', { class: 'btn btn-small', type: 'button', 'aria-pressed': String(!s.mute), onclick: () => { progress.setSetting('mute', !s.mute); draw(); } }, s.mute ? 'Off' : 'On')),
      h('div', { class: 'form-row' }, h('label', {}, t('reduce_motion')), motion),
      h('div', { class: 'form-row' }, h('label', {}, t('language')),
        ['en', 'th'].map((l) => h('button', { class: 'btn btn-small' + (lang() === l ? ' btn-primary' : ''), type: 'button', 'aria-pressed': String(lang() === l), onclick: () => { progress.setSetting('lang', l); app.header({ title: t('parent'), back: '/' }); draw(); } }, l === 'en' ? 'English' : 'ไทย'))));
  }

  function cloudPanelSlot() {
    const slot = h('section', { class: 'panel', id: 'cloud-slot', hidden: true });
    import('./parent-cloud.js').then((m) => m.mountCloud?.(slot, app, draw)).catch(() => {});
    return slot;
  }
}

const audio = () => window.__app.audio;

function confirmBtn(btn, label, action) {
  if (btn.dataset.armed) { action(); return; }
  btn.dataset.armed = '1';
  const old = btn.textContent;
  btn.textContent = '⚠ ' + label;
  setTimeout(() => { btn.dataset.armed = ''; btn.textContent = old; }, 4000);
}
