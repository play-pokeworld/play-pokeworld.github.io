#!/usr/bin/env python3
"""Passe 53 — resynchronizes the FR/EN rewardDesc on the REAL rewards.

The texts announced "2 Oran Berries" where the game actually granted 2
Star Dusts (debt from passe 27, cf. passe 52 diagnostic). After running
`rework-quest-berries.py`, they only announce money: this puts the actually
given berry back, read from the data — never again a hand-written text
that could drift.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def berry_names():
    js = open(os.path.join(ROOT, 'src', 'data', 'items-data.js')).read()
    fr, en = {}, {}
    for m in re.finditer(r'"(\w+_berry)":\s*\{(.*?)\n  \}', js, re.S):
        key, blk = m.group(1), m.group(2)
        f = re.search(r'"name_fr":\s*"([^"]+)"', blk)
        e = re.search(r'"name_en":\s*"([^"]+)"', blk)
        if f: fr[key] = f.group(1)
        if e: en[key] = e.group(1)
    return fr, en


def quest_berries():
    """→ {('main'|'side', id): clé de baie}"""
    out = {}
    for fname, cat, pat in (
        ('story-quests.js', 'main', r'"id":\s*(\d+)'),
        ('side-quests-data.js', 'side', r'"id"\s*:\s*"(s\d+)"'),
    ):
        js = open(os.path.join(ROOT, 'src', 'data', fname)).read()
        # split by quest: each block runs from one "id" to the next
        marks = [(m.start(), m.group(1)) for m in re.finditer(pat, js)]
        for i, (pos, qid) in enumerate(marks):
            end = marks[i + 1][0] if i + 1 < len(marks) else len(js)
            blk = js[pos:end]
            b = re.search(r'"(\w+_berry)":\s*(\d+)', blk)
            if b:
                out[(cat, qid)] = b.group(1)
    return out


def main():
    fr_names, en_names = berry_names()
    berries = quest_berries()
    total = 0
    for lang, names in (('fr', fr_names), ('en', en_names)):
        p = os.path.join(ROOT, 'src', 'localization', lang, 'quests.js')
        txt = open(p).read()
        n = 0
        for (cat, qid), key in berries.items():
            # "<id>": { ... } block in the "main"/"side" section
            sec = re.search(r'"%s":\s*\{' % cat, txt)
            if not sec:
                continue
            blk = re.search(r'("%s":\s*\{.*?"rewardDesc":")([^"]*)(")' % re.escape(qid),
                            txt[sec.end():], re.S)
            if not blk:
                continue
            desc = blk.group(2)
            label = names.get(key, key)
            suffix = ' + 1 %s' % label
            if suffix in desc:
                continue
            new = desc.rstrip() + suffix
            a = sec.end() + blk.start(2)
            b = sec.end() + blk.end(2)
            txt = txt[:a] + new + txt[b:]
            n += 1
        open(p, 'w').write(txt)
        print(lang, ':', n, 'textes resynchronisés')
        total += n
    print('total', total)


if __name__ == '__main__':
    main()
