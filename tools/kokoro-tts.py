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

Kokoro voices: American female af_heart, af_bella ...; British female bf_emma, bf_isabella ...
Speed 0.85 = slow and warm for young children.
"""
import json, os, subprocess, sys, tempfile
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


def save_mp3(audio, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        sf.write(tmp.name, audio, SR)
    # mono 64 kbps mp3, loudness-normalised so every word plays at the same volume
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
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
    else:
        sys.exit(__doc__)
