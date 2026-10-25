// Turn a recording into a clean, small WAV: mono, 22.05 kHz, 16-bit, silence trimmed, peak normalised.
export const RATE = 22050;

export async function toWav(blob) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    let mono = mixDown(buf);
    mono = resample(mono, buf.sampleRate, RATE);
    mono = trim(mono, RATE);
    normalise(mono);
    return encode(mono, RATE);
  } finally { ctx.close?.(); }
}

function mixDown(buf) {
  const out = new Float32Array(buf.length);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) out[i] += d[i] / buf.numberOfChannels;
  }
  return out;
}

function resample(data, from, to) {
  if (from === to) return data;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(data.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio, i0 = Math.floor(pos), f = pos - i0;
    // simple average over the source span (anti-aliasing for downsampling) + linear interpolation
    let sum = 0, n = 0;
    for (let k = i0; k < Math.min(data.length, Math.floor(pos + ratio)); k++) { sum += data[k]; n++; }
    out[i] = n ? sum / n : data[i0] * (1 - f) + (data[i0 + 1] || 0) * f;
  }
  return out;
}

/** Remove silence at both ends, keeping 80 ms of padding. */
export function trim(data, rate, threshold = 0.02) {
  const pad = Math.floor(rate * 0.08);
  let a = 0, b = data.length - 1;
  while (a < data.length && Math.abs(data[a]) < threshold) a++;
  while (b > a && Math.abs(data[b]) < threshold) b--;
  if (a >= b) return data;
  return data.slice(Math.max(0, a - pad), Math.min(data.length, b + pad));
}

function normalise(data) {
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  if (peak < 0.01) return;
  const g = Math.min(4, 0.9 / peak);
  for (let i = 0; i < data.length; i++) data[i] *= g;
}

export function encode(data, rate) {
  const view = new DataView(new ArrayBuffer(44 + data.length * 2));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); view.setUint32(4, 36 + data.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  str(36, 'data'); view.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(view.buffer);
}
