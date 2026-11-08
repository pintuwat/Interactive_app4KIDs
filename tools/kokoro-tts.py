#!/usr/bin/env python3
"""Generate site audio with Kokoro TTS (open-source, runs offline on this computer).

Setup (once):
    python3.12 -m venv ~/kokoro-tts/.venv
    ~/kokoro-tts/.venv/bin/pip install "kokoro>=0.9.4" soundfile
    brew install espeak-ng ffmpeg

Voice samples to choose from (writes audio-samples/<voice>/<word>.mp3 + one combined preview per voice):
    ~/kokoro-tts/.venv/bin/python tools/kokoro-tts.py samples cat mat hat bat sun

Every item of the site (same list as record-audio.html) -> audio/us/<id>.mp3 and audio/gb/<id>.mp3:
    ~/kokoro-tts/.venv/bin/python tools/kokoro-tts.py all            (skips files that already exist)
    ~/kokoro-tts/.venv/bin/python tools/kokoro-tts.py all --force word-cat sound-m   (redo some ids)
    node tools/build-audio-manifest.mjs
Letter sounds and letter names are given as phonemes (SOUND_PS / NAME_PS): as plain text the voice says
"Ay" as "eye" and cannot say a sound on its own.
Consonant sounds are CUT out of a short word (SOUND_CUT): said alone, Kokoro adds a vowel ("s-uh-s", "f-uh"),
and it cannot hold a sound for long, so held sounds (sss, mmm) are gently stretched afterwards.
Check the result: ~/kokoro-tts/.venv/bin/python tools/kokoro-tts.py check   (V = voice, n = breath/hiss, 25 ms each)

Kokoro voices: American female af_heart, af_bella ...; British female bf_emma, bf_isabella ...
Speed 0.85 = slow and warm for young children.
"""
import glob, json, os, re, subprocess, sys, tempfile
import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 24000
SPEED = 0.85
SAMPLE_VOICES = {'us': ['af_heart', 'af_bella'], 'gb': ['bf_emma', 'bf_isabella']}
VOICE = {'us': 'af_heart', 'gb': 'bf_isabella'}   # chosen by the teacher from the samples

# Kokoro phonemes (misaki): A = ay, I = eye, O = oh (US), Q = oh (UK), ᵊ = tiny schwa, ʰ = puff of air, ː = longer.
# Pure sounds: no "uh" after s, m, f ...; stops get only a puff (t, p, k) or a tiny schwa (b, d, g).
# A string is the same for both accents; (us, gb) when they differ.
SOUND_PS = {
    's': 'sː', 'a': ('ˈæ', 'ˈa'), 't': 'tʰ', 'p': 'pʰ', 'i': 'ˈɪ', 'n': 'nː', 'm': 'mː', 'd': 'dᵊ', 'g': 'ɡᵊ',
    'o': ('ˈɑ', 'ˈɒ'), 'c': 'kʰ', 'k': 'kʰ', 'ck': 'kʰ', 'e': 'ˈɛ', 'u': 'ˈʌ', 'r': 'ɹː', 'h': 'hᵊ', 'b': 'bᵊ',
    'f': 'fː', 'l': 'lː', 'j': 'ʤᵊ', 'v': 'vː', 'w': 'wᵊ', 'x': 'ks', 'y': 'jᵊ', 'z': 'zː', 'q': 'kwᵊ',
    'sh': 'ʃː', 'ch': 'ʧ', 'th': 'θː', 'bl': 'blᵊ', 'st': 'st', 'tr': 'tɹᵊ',
    'a_e': 'ˈA', 'i_e': 'ˈI', 'o_e': ('ˈO', 'ˈQ'), 'u_e': ('jˈu', 'jˈuː'),
    'ai': 'ˈA', 'ee': ('ˈi', 'ˈiː'), 'oa': ('ˈO', 'ˈQ'), 'oo': ('ˈu', 'ˈuː'),
}
NAME_PS = {
    'a': 'ˈA', 'b': ('bˈi', 'bˈiː'), 'c': ('sˈi', 'sˈiː'), 'd': ('dˈi', 'dˈiː'), 'e': ('ˈi', 'ˈiː'), 'f': 'ˈɛf',
    'g': ('ʤˈi', 'ʤˈiː'), 'h': 'ˈAʧ', 'i': 'ˈI', 'j': 'ʤˈA', 'k': 'kˈA', 'l': 'ˈɛl', 'm': 'ˈɛm', 'n': 'ˈɛn',
    'o': ('ˈO', 'ˈQ'), 'p': ('pˈi', 'pˈiː'), 'q': ('kjˈu', 'kjˈuː'), 'r': ('ˈɑɹ', 'ˈɑː'), 's': 'ˈɛs',
    't': ('tˈi', 'tˈiː'), 'u': ('jˈu', 'jˈuː'), 'v': ('vˈi', 'vˈiː'), 'w': ('dˈʌbᵊl jˌu', 'dˈʌbᵊl jˌuː'),
    'x': 'ˈɛks', 'y': 'wˈI', 'z': ('zˈi', 'zˈɛd'),
}
MAGIC_E = ('mˈæʤɪk ˈi', 'mˈaʤɪk ˈiː')

# sound: (word to cut it from, part, hold seconds or None, whisper)
#   'end'   = the hiss at the end of the word (s in "as")      'start' = the puff at the start, before the vowel (t in "top")
#   'head'  = the first 0.15 s: consonant + a tiny vowel (b, d, g ...)
# Sounds not listed here (vowels, m, n, l, r, v, z, long vowels) are said on their own from SOUND_PS.
SOUND_CUT = {
    's': ('ˈæs', 'end', 0.6, False), 'sh': ('fˈɪʃ', 'end', 0.6, False), 'f': ('ˈɔf', 'end', 0.55, False),
    'th': ('bˈæθ', 'end', 0.5, False), 'ch': ('mˈʌʧ', 'end', None, False), 'x': ('bˈɑks', 'end', None, False),
    't': ('tˈɑp', 'start', None, False), 'p': ('pˈɑt', 'start', None, False), 'k': ('kˈɑt', 'start', None, False),
    'b': ('bˈʌt', 'head', None, False), 'd': ('dˈʌk', 'head', None, False), 'g': ('ɡˈʌm', 'head', None, False),
    'j': ('ʤˈʌɡ', 'head', None, False), 'w': ('wˈɛt', 'head', None, False), 'y': ('jˈɛs', 'head', None, False),
    'q': ('kwˈɪk', 'head', None, False), 'bl': ('blˈʌk', 'head', None, False), 'tr': ('tɹˈʌk', 'head', None, False),
    'h': ('hˈʌt', 'head', None, True),
}
SOUND_CUT['c'] = SOUND_CUT['ck'] = SOUND_CUT['k']
SOUND_JOIN = {'st': (('s', 0.3), ('t', None))}   # said one after the other (a shorter sss, then the t puff)
HOLD = {'m': 0.6, 'n': 0.6, 'l': 0.55, 'r': 0.55, 'v': 0.55, 'z': 0.55}   # stretched, said on their own
SOFT = {'f': -4, 'th': -6}   # dB: f and th are quiet sounds; at full loudness th sounds like s
HISS = {'s', 'sh', 'f', 'th'}   # held with new noise of the same tone (hold_hiss)
HEAD = {'q': 0.2, 'bl': 0.22, 'tr': 0.22, 'w': 0.17, 'y': 0.17}            # longer 'head' cuts (seconds)
HOP = 600   # Kokoro makes audio in 25 ms frames
_pipes = {}


def pipeline(lang):
    """lang 'a' = American English, 'b' = British English."""
    from kokoro import KPipeline
    if lang not in _pipes:
        _pipes[lang] = KPipeline(lang_code=lang, repo_id='hexgrad/Kokoro-82M')
    return _pipes[lang]


def speak(text, voice, speed=SPEED):
    lang = 'b' if voice.startswith('b') else 'a'
    chunks = [np.asarray(audio) for _, _, audio in pipeline(lang)(text, voice=voice, speed=speed)]
    return np.concatenate(chunks) if chunks else np.zeros(1, dtype=np.float32)


def speak_ps(ps, voice, speed=SPEED):
    """Speak a phoneme string directly (no spelling rules)."""
    lang = 'b' if voice.startswith('b') else 'a'
    chunks = [np.asarray(r.audio) for r in pipeline(lang).generate_from_tokens(ps, voice=voice, speed=speed)]
    return np.concatenate(chunks)


def speak_whisper(ps, voice, speed=SPEED):
    """Like speak_ps, but with the voice (pitch) switched off: only breath, for /h/."""
    import torch
    pipe = pipeline('b' if voice.startswith('b') else 'a')
    m = pipe.model
    ids = [m.vocab[c] for c in ps if c in m.vocab]
    ref = pipe.load_voice(voice)[len(ids) - 1].to(m.device)
    x_ids = torch.LongTensor([[0, *ids, 0]])
    n = x_ids.shape[1]
    lens = torch.full((1,), n, dtype=torch.long)
    mask = torch.zeros(1, n, dtype=torch.bool)
    with torch.no_grad():   # same steps as KModel.forward_with_tokens, then F0 = 0
        d_en = m.bert_encoder(m.bert(x_ids, attention_mask=(~mask).int())).transpose(-1, -2)
        s = ref[:, 128:]
        d = m.predictor.text_encoder(d_en, s, lens, mask)
        x, _ = m.predictor.lstm(d)
        dur = torch.round(torch.sigmoid(m.predictor.duration_proj(x)).sum(-1) / speed).clamp(min=1).long().squeeze()
        idx = torch.repeat_interleave(torch.arange(n), dur)
        aln = torch.zeros(n, idx.shape[0])
        aln[idx, torch.arange(idx.shape[0])] = 1
        aln = aln.unsqueeze(0)
        f0, noise = m.predictor.F0Ntrain(d.transpose(-1, -2) @ aln, s)
        audio = m.decoder(m.text_encoder(x_ids, lens, mask) @ aln, f0 * 0, noise, ref[:, :128])
    return audio.squeeze().cpu().numpy()


def frame_map(audio):
    """One letter per 25 ms: V = voice, n = breath/hiss/puff, . = quiet."""
    peak = np.abs(audio).max() + 1e-9
    out = ''
    for i in range(0, len(audio) - HOP + 1, HOP):
        f = audio[i:i + HOP]
        if np.sqrt(np.mean(f ** 2)) / peak < 0.03:
            out += '.'
            continue
        f = f - f.mean()
        ac = np.correlate(f, f, 'full')[HOP - 1:]
        out += 'V' if ac[SR // 400:SR // 70].max() / (ac[0] + 1e-9) > 0.45 else 'n'
    return out


def cut(audio, part, seconds=0.15, voiceless=False):
    """The frames of one sound inside a carrier word (see SOUND_CUT)."""
    fm = frame_map(audio)
    if part == 'head':   # a word starting with t, k ... begins at its puff, not at Kokoro's little voiced blip
        a = fm.index('n') if voiceless and 'n' in fm else next((i for i, c in enumerate(fm) if c != '.'), 0)
        return audio[a * HOP: a * HOP + int(SR * seconds)]
    if part == 'end':   # the longest hiss after the vowel (not a stray breath at the very end)
        vowel = max(re.finditer('V+', fm), key=lambda r: len(r.group())).end()
        run = max(re.finditer('n+', fm[vowel:]), key=lambda r: len(r.group()))
        return audio[(vowel + run.start()) * HOP: (vowel + run.end()) * HOP]
    # 'start': skip the quiet and any voiced blip, keep puff(s) up to the vowel (s + t in "stop")
    a = fm.index('n')
    b = a
    while b < len(fm) and fm[b] != 'V' and b - a < 9:
        b += 1
    return audio[a * HOP: b * HOP]


def stretch(audio, seconds):
    """Make a held sound (sss, mmm) last about this long without changing its pitch."""
    factor = len(audio) / SR / seconds
    if factor >= 1:
        return audio
    tempos = []
    while factor < 0.5:
        tempos.append('atempo=0.5')
        factor /= 0.5
    tempos.append(f'atempo={factor:.4f}')
    out = subprocess.run(['ffmpeg', '-loglevel', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                          '-af', ','.join(tempos), '-f', 'f32le', '-'], input=audio.astype(np.float32).tobytes(),
                         capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()


def hold_hiss(seg, seconds):
    """A longer hiss with the same tone (spectrum) as this short cut: s, sh, f, th have no voice,
    so new noise sounds the same, while stretching by repeating pieces would add a buzz."""
    n = int(SR * seconds)
    spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), 2048)) ** 2
    spec = np.convolve(spec, np.ones(9) / 9, mode='same')   # smooth: keep the tone, not the details
    freqs = np.fft.rfftfreq(n, 1 / SR)
    shape = np.sqrt(np.interp(freqs, np.fft.rfftfreq(2048, 1 / SR), spec))
    noise = np.fft.irfft(np.fft.rfft(np.random.default_rng(7).standard_normal(n)) * shape, n)
    return (noise * np.sqrt(np.mean(seg ** 2)) / np.sqrt(np.mean(noise ** 2))).astype(np.float32)


def finish_sound(audio, fade_in, gain_db=0):
    """Soft start and end, a little silence around it, same loudness as the words."""
    a = audio.astype(np.float32).copy()
    fi, fo = min(int(SR * fade_in), len(a) // 3), min(int(SR * 0.05), len(a) // 3)
    a[:fi] *= np.linspace(0, 1, fi)
    a[len(a) - fo:] *= np.linspace(1, 0, fo)
    frames = a[:len(a) // HOP * HOP].reshape(-1, HOP)
    rms = np.sqrt((frames ** 2).mean(1))
    active = np.sqrt((rms[rms > rms.max() * 0.1] ** 2).mean())
    a *= min(10 ** ((-16 + gain_db) / 20) / active, 10 ** (-1.5 / 20) / np.abs(a).max())
    pad = np.zeros(int(SR * 0.06), dtype=np.float32)
    return np.concatenate([pad, a, pad])


def raw_sound(lid, accent, voice, hold=None):
    """(audio, held?) for one sound: cut from a word, or said on its own (and held)."""
    if lid in SOUND_JOIN:
        parts = [raw_sound(p, accent, voice, h)[0] for p, h in SOUND_JOIN[lid]]
        gap = np.zeros(int(SR * 0.03), dtype=np.float32)
        return np.concatenate([parts[0], gap, *parts[1:]]), True
    if lid in SOUND_CUT:
        word, part, held, whisper = SOUND_CUT[lid]
        audio = speak_whisper(word, voice) if whisper else speak_ps(word, voice)
        a = cut(audio, part, HEAD.get(lid, 0.15), voiceless=word[0] in 'ptkh')
        hold = hold or held
    else:
        a = speak_ps(by_accent(SOUND_PS[lid], accent), voice)
        fm = frame_map(a)   # from the first sound to 2 frames after the voice ends (no trailing breaths)
        a = a[(len(fm) - len(fm.lstrip('.'))) * HOP: (fm.rindex('V') + 3) * HOP]
        hold = hold or HOLD.get(lid)
    if hold and lid in HISS:
        a = hold_hiss(a, hold)
    elif hold:
        a = stretch(a, hold)
    return a, bool(hold or lid not in SOUND_CUT)


def sound_audio(lid, accent, voice):
    """Audio for sound-<lid>, ready to save."""
    a, soft = raw_sound(lid, accent, voice)
    return finish_sound(a, 0.03 if soft else 0.008, SOFT.get(lid, 0))


def check_sounds():
    for accent in VOICE:
        print(accent)
        for path in sorted(glob.glob(os.path.join(ROOT, 'audio', accent, 'sound-*.mp3'))):
            raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                                 capture_output=True, check=True).stdout
            a = np.frombuffer(raw, dtype=np.float32)
            print(f'  {os.path.basename(path)[6:-4]:5s} {len(a) / SR:4.2f}s  {frame_map(a)}')


def by_accent(v, accent):
    return v if isinstance(v, str) else v[0 if accent == 'us' else 1]


def letter_ps(item_id, accent):
    """Phonemes for sound-<id> / name-<id>, or None for ordinary text items."""
    kind, _, lid = item_id.partition('-')
    if kind == 'sound':
        return by_accent(SOUND_PS[lid], accent)
    if kind != 'name':
        return None
    if lid.endswith('_e'):  # a_e -> "A magic e"
        return by_accent(NAME_PS[lid[0]], accent) + ' ' + by_accent(MAGIC_E, accent)
    return ' '.join(by_accent(NAME_PS[ch], accent) for ch in lid)  # sh -> "ess aitch"


def trim(audio, threshold=0.01, pad=0.06):
    loud = np.where(np.abs(audio) > threshold)[0]
    if not len(loud):
        return audio
    p = int(SR * pad)
    return audio[max(0, loud[0] - p): min(len(audio), loud[-1] + p)]


def save_mp3(audio, path, loudnorm=True):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        sf.write(tmp.name, audio, SR)
    # mono 64 kbps mp3, loudness-normalised so every word plays at the same volume
    # (letter sounds are levelled in finish_sound: loudnorm pumps on clips this short)
    norm = ['-af', 'loudnorm=I=-16:TP=-1.5:LRA=11'] if loudnorm else []
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, *norm,
                    '-ar', '24000', '-ac', '1', '-b:a', '64k', path], check=True)
    os.unlink(tmp.name)


def samples(words):
    out_dir = os.path.join(ROOT, 'audio-samples')
    gap = np.zeros(int(SR * 0.7), dtype=np.float32)
    for accent, voices in SAMPLE_VOICES.items():
        for voice in voices:
            parts = []
            for w in words:
                a = trim(speak(w, voice))
                save_mp3(a, os.path.join(out_dir, voice, f'{w}.mp3'))
                parts += [a, gap]
            save_mp3(np.concatenate(parts), os.path.join(out_dir, f'{accent}-{voice}-preview.mp3'))
            print(f'{accent} {voice}: {len(words)} words')


def build_all(only=(), force=False):
    items = json.loads(subprocess.run(['node', os.path.join(ROOT, 'tools', 'list-audio-items.mjs')],
                                      check=True, capture_output=True, text=True).stdout)
    for accent, voice in VOICE.items():
        todo = [it for it in items[accent] if not only or it['id'] in only]
        made = 0
        for n, it in enumerate(todo, 1):
            path = os.path.join(ROOT, 'audio', accent, it['id'] + '.mp3')
            if os.path.exists(path) and not force:
                continue
            if it['id'].startswith('sound-'):
                save_mp3(sound_audio(it['id'][6:], accent, voice), path, loudnorm=False)
            else:
                ps = letter_ps(it['id'], accent)
                audio = speak_ps(ps, voice) if ps else speak(it['say'], voice)
                save_mp3(trim(audio), path)
            made += 1
            if made % 50 == 0:
                print(f'{accent}: {n}/{len(todo)}', flush=True)
        print(f'{accent} ({voice}): {made} new files, {len(todo)} items', flush=True)


if __name__ == '__main__':
    cmd, args = (sys.argv[1] if len(sys.argv) > 1 else ''), sys.argv[2:]
    if cmd == 'samples' and args:
        samples(args)
    elif cmd == 'all':
        force = '--force' in args
        build_all([a for a in args if a != '--force'], force)
    elif cmd == 'check':
        check_sounds()
    else:
        sys.exit(__doc__)
