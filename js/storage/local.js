// Storage adapter #1: localStorage (always on). Falls back to memory if storage is blocked (private mode).
const KEY = 'kidsphonics.v1';
let memory = null;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupt or blocked */ }
  return memory;
}

export function save(state) {
  memory = state;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearAll() {
  memory = null;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
