// Tiny synthesized sound effects (no files needed). Muted when the Parent corner turns effects off.
let ctx = null;
let muted = false;

export const sfx = {
  setMuted(m) { muted = !!m; },
  correct() { tone([660, 880, 1100], 0.11, 'triangle', 0.18); },
  star() { tone([784, 988, 1175, 1568], 0.12, 'sine', 0.2); },
  nudge() { tone([330, 294], 0.14, 'sine', 0.12); },
  pop() { tone([520, 780], 0.05, 'square', 0.08); },
  tap() { tone([600], 0.04, 'sine', 0.08); },
};

function tone(freqs, step, type, vol) {
  if (muted) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const t0 = ctx.currentTime;
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + i * step);
      g.gain.exponentialRampToValueAtTime(vol, t0 + i * step + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * step + step + 0.12);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + i * step);
      o.stop(t0 + i * step + step + 0.15);
    });
  } catch { /* audio not available: stay silent */ }
}
