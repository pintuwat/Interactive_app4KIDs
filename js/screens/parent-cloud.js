// Parent corner panel (Phase 2): class link status per child, leave class, erase cloud data.
import { h } from '../util.js';
import * as progress from '../progress.js';
import { cloudConfigured } from '../config.js';
import { t } from '../i18n.js';

export async function mountCloud(slot, app, redraw) {
  if (!cloudConfigured()) return;
  const sync = await import('../storage/api.js');
  slot.hidden = false;
  const draw = () => {
    slot.replaceChildren(h('h2', {}, '🏫 ' + t('classroom')),
      h('p', { class: 'hint' }, 'The teacher sees nicknames, stars and which sounds are hard. No real names are saved.'),
      progress.profiles().map((p) => {
        const linked = p.cloud && !p.cloud.invalid;
        return h('div', { class: 'form-row' },
          h('b', {}, `${p.avatar} ${p.name}`),
          linked
            ? [h('span', {}, `${p.cloud.className} · ${sync.pendingCount(p.id)} waiting`),
               h('button', { class: 'btn btn-small', type: 'button', onclick: async () => { await sync.flushAll(); draw(); } }, '⟳ Sync'),
               h('button', { class: 'btn btn-small', type: 'button', onclick: () => { sync.unlinkProfile(p.id); redraw(); } }, 'Leave class'),
               h('button', { class: 'btn btn-small btn-danger', type: 'button', onclick: (e) => arm(e.currentTarget, 'Erase online data?', async () => { const r = await sync.eraseCloud(p.id); if (!r.ok) alert('No internet. Try again later.'); redraw(); }) }, '🗑 Erase online data')]
            : [p.cloud?.invalid && h('span', { class: 'warn' }, 'Class link expired'),
               h('a', { class: 'btn btn-small', href: '#/join', onclick: () => progress.selectProfile(p.id) }, 'Join class')]);
      }));
  };
  const off = sync.onSyncChange(() => { if (slot.isConnected) draw(); else off(); });
  draw();
}

function arm(btn, label, action) {
  if (btn.dataset.armed) { action(); return; }
  btn.dataset.armed = '1';
  const old = btn.textContent;
  btn.textContent = '⚠ ' + label;
  setTimeout(() => { btn.dataset.armed = ''; btn.textContent = old; }, 4000);
}
