// Offline smoke test with a real headless Chrome (Chrome DevTools Protocol, no extra packages).
//   python3 -m http.server 8080 &      node tools/offline-test.mjs [url]
// Registers the service worker, then goes OFFLINE and checks that home, a story and the data still load.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.argv[2] || 'http://127.0.0.1:8080/index.html';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const profile = mkdtempSync(join(tmpdir(), 'kp-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const n = ++id;
  pending.set(n, { res, rej });
  ws.send(JSON.stringify({ id: n, method, params }));
});
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
};

let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✔' : '✗'} ${name} ${extra}`); if (!ok) failed++; };

try {
  let list;
  for (let i = 0; i < 40; i++) { try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); break; } catch { await sleep(250); } }
  const page = list.find((t) => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)[d.error ? 'rej' : 'res'](d.error || d.result); pending.delete(d.id); } };
  await send('Page.enable');
  await send('Network.enable');

  await send('Page.navigate', { url: URL_ });
  await sleep(1500);
  await evaluate("localStorage.setItem('kp.sw','1'); localStorage.setItem('kidsphonics.v1', JSON.stringify({v:1,profiles:[{id:'p_test',name:'Test',avatar:'🐶',accent:'us',level:'all',items:{},stickers:0}],currentId:'p_test',settings:{lang:'en',mute:true,motion:'auto'}})); true");
  await send('Page.reload', { ignoreCache: true });
  await sleep(1500);
  const sw = await evaluate(`(async () => { const r = await Promise.race([navigator.serviceWorker.ready, new Promise(x => setTimeout(() => x(null), 20000))]);
    for (let i = 0; i < 40; i++) { const k = (await caches.keys()).find(k => k.startsWith('kp-app-')); if (k) { const n = (await (await caches.open(k)).keys()).length; const pre = await (await fetch('precache.json')).json(); if (n >= pre.files.length) return { active: !!(r && r.active), n, want: pre.files.length, k }; } await new Promise(x => setTimeout(x, 500)); }
    return { active: !!(r && r.active), n: 0 }; })()`);
  check('service worker active', sw.active);
  check('all app files precached', sw.n >= sw.want, `(${sw.n}/${sw.want}, ${sw.k})`);

  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await send('Page.navigate', { url: URL_ + '#/' });
  await sleep(2500);
  check('home works offline', await evaluate("document.querySelectorAll('.tile').length >= 3"));
  await evaluate("location.hash = '#/stories'; true");
  await sleep(1200);
  const stories = await evaluate("document.querySelectorAll('.story-card').length");
  check('story list works offline', stories >= 10, `(${stories} stories)`);
  await evaluate("location.hash = '#/story/rain-train'; true");
  await sleep(1200);
  await evaluate("document.querySelector('.big-play').click(); true");
  await sleep(800);
  check('story reader works offline', await evaluate("document.querySelectorAll('.story-text .w').length > 5"));
  await evaluate("location.hash = '#/game/bubble-pop'; true");
  await sleep(6000);
  check('game works offline', await evaluate("document.querySelectorAll('.bubble').length > 0"));
  await evaluate("location.hash = '#/letter/s'; true");
  await sleep(1000);
  check('lesson works offline', await evaluate("!!document.querySelector('.big-letter')"));
} catch (e) {
  console.error('error:', e.message);
  failed++;
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  chrome.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
}
console.log(failed ? `${failed} check(s) failed` : 'Offline test passed');
process.exit(failed ? 1 : 0);
