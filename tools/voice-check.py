#!/usr/bin/env python3
"""Check that device voices SAY each letter sound instead of spelling it (macOS only, uses `say`).

Problem it catches: speech voices read a spelling like "mmm" as the letter names "em em em",
"ks" as "kay ess" and "ih" as "eye". For every item in data/letters.json this script makes the
voice say the `tts` spelling, then also the letter NAMES (once, twice, three times, and spelled
out letter by letter). If the sound is identical to one of those, the voice is spelling it.

    python3 tools/voice-check.py               # Samantha (US) + Daniel (UK)
    python3 tools/voice-check.py Samantha       # one voice

Apple devices (iPad, iPhone, Mac) use these same voices in the browser. Android voices differ;
recorded audio (record-audio.html) is the only way to be sure everywhere.
"""
import json, math, os, struct, subprocess, sys, tempfile, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES = {'Samantha': 'us', 'Daniel': 'gb'}
TMP = tempfile.mkdtemp(prefix='voice-check-')


def by_accent(v, accent):
    return v if isinstance(v, str) else v.get(accent, v.get('us', ''))


def envelope(voice, text):
    path = os.path.join(TMP, f"{voice}_{abs(hash(text))}.wav")
    if not os.path.exists(path):
        subprocess.run(['say', '-v', voice, '-o', path, '--data-format=LEI16@22050', text], check=True)
    w = wave.open(path)
    n = w.getnframes()
    d = struct.unpack('<%dh' % n, w.readframes(n))
    win = 220  # 10 ms
    e = [math.sqrt(sum(x * x for x in d[i:i + win]) / win) for i in range(0, max(1, n - win), win)]
    th = max(e) * 0.05 if e else 0
    idx = [i for i, v in enumerate(e) if v > th]
    return e[idx[0]:idx[-1] + 1] if idx else e


def same(a, b):
    """Speech synthesis is deterministic: the same words give (almost) the same envelope."""
    if not a or not b or abs(len(a) - len(b)) > 2:
        return False
    n = min(len(a), len(b))
    a, b = a[:n], b[:n]
    ma, mb = sum(a) / n, sum(b) / n
    den = math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
    return den > 0 and sum((x - ma) * (y - mb) for x, y in zip(a, b)) / den > 0.97


def main():
    voices = sys.argv[1:] or list(VOICES)
    data = json.load(open(os.path.join(ROOT, 'data', 'letters.json'), encoding='utf8'))
    items = data['items']
    names = {i['id']: i['name'] for i in items if i['kind'] == 'letter'}
    problems = 0
    for voice in voices:
        accent = VOICES.get(voice, 'us')
        print(f'== {voice} ({accent})')
        for it in items:
            if it['kind'] == 'long':
                continue  # long vowels (a_e, ai, ee, oa ...) are SUPPOSED to sound like the letter name
            tts = by_accent(it['tts'], accent)
            letters = [c for c in tts.lower() if c in names]
            nm = lambda c: by_accent(names[c], accent)
            suspects = set()
            if letters:
                suspects.add(' '.join(nm(c) for c in letters))              # mmm -> "em em em", ks -> "kay ess"
                for k in (1, 2, 3):
                    suspects.add(' '.join([nm(letters[0])] * k))            # ih -> "eye"
            item_name = by_accent(it['name'], accent)
            for k in (1, 2, 3):
                suspects.add(' '.join([item_name] * k))
            env = envelope(voice, tts)
            hit = next((s for s in sorted(suspects) if same(env, envelope(voice, s))), None)
            if hit:
                problems += 1
                print(f'  ✗ {it["id"]:4} "{tts}" is read as the letter name(s) "{hit}"')
    print(f'\n{problems} spelling problem(s).' if problems else '\nAll sounds are spoken, not spelled.')
    return 1 if problems else 0


if __name__ == '__main__':
    if sys.platform != 'darwin':
        sys.exit('voice-check needs macOS (it uses the `say` command).')
    sys.exit(main())
