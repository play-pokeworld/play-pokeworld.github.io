#!/usr/bin/env python3
"""Passe 53 — resynchronise les rewardDesc FR/EN sur les récompenses RÉELLES.

Les textes annonçaient « 2 Baies Oran » là où le jeu versait 2 Poussières
Étoile (dette de la passe 27, cf. diagnostic passe 52). Après le passage de
`rework-quest-berries.py`, ils n'annoncent plus que l'argent : on y remet la
baie effectivement donnée, lue dans les données — plus jamais de texte écrit
à la main qui puisse diverger.
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
        # découpe par quête : chaque bloc va d'un "id" au suivant
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
            # bloc "<id>": { ... } dans la section "main"/"side"
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
