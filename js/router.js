// Minimal hash router. Each route lazily imports a screen module from ./screens/.
// A screen exports render(root, params, app) and may return a cleanup function (sync or async).

const routes = [
  ['/', 'home'],
  ['/profiles', 'profiles'],
  ['/letters', 'letters'],
  ['/letter/:id', 'lesson'],
  ['/trace/:id', 'trace'],
  ['/words', 'blending'],
  ['/blend/:family', 'blending'],
  ['/games', 'games-hub'],
  ['/game/:id', 'games-hub'],
  ['/stories', 'stories'],
  ['/story/:id', 'reader'],
  ['/map', 'map'],
  ['/stickers', 'stickers'],
  ['/parent', 'parent'],
  ['/join', 'join'],
  ['/sight', 'sight'],
];

const compiled = routes.map(([pattern, screen]) => {
  const names = [];
  const re = new RegExp('^' + pattern.replace(/:([a-z]+)/g, (_, n) => { names.push(n); return '([^/]+)'; }) + '/?$');
  return { re, names, screen, pattern };
});

let cleanup = null;
let runId = 0;

export function match(path) {
  for (const r of compiled) {
    const m = r.re.exec(path);
    if (m) {
      const params = {};
      r.names.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
      return { screen: r.screen, params, pattern: r.pattern };
    }
  }
  return null;
}

export function currentPath() { return location.hash.slice(1) || '/'; }
export function navigate(path) { if (currentPath() === path) go(window.__app); else location.hash = path; }

export function start(app) {
  window.__app = app;
  window.addEventListener('hashchange', () => go(app));
  return go(app);
}

async function go(app) {
  const id = ++runId;
  const path = currentPath();
  const m = match(path) || match('/');
  if (cleanup) { try { await cleanup(); } catch { /* ignore */ } cleanup = null; }
  app.audio.stop();
  const root = document.getElementById('screen');
  root.replaceChildren();
  root.scrollTop = 0;
  document.body.dataset.theme = 'day';
  document.body.dataset.screen = m.screen;
  app.header({ title: '', back: '/' });
  try {
    const mod = await import(`./screens/${m.screen}.js`);
    if (id !== runId) return;
    const result = await mod.render(root, { ...m.params, pattern: m.pattern }, app);
    if (id !== runId) { if (typeof result === 'function') result(); return; }
    cleanup = typeof result === 'function' ? result : null;
  } catch (err) {
    console.error(err);
    root.replaceChildren(Object.assign(document.createElement('p'), { className: 'oops', textContent: 'Oops! Tap Home to try again.' }));
  }
}
