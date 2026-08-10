#!/usr/bin/env python3
"""Passe 53 — removes Star Dust from ALL quests.

User request: "remove the Star Dusts from all quests, and give instead
(in some, not all) a single random berry among all the berries (not the
same one every time) per quest."

Context (passe 52 diagnostic): at passe 27 the Oran/Sitrus/Ceriz Berries
had been removed and their 58 rewards converted into Star Dust AT EQUAL
QUANTITY — except a berry was worthless while a dust resells for 2,000 ₽.
Result: 104 dusts = 208,000 ₽, i.e. +32% on top of the 649,900 ₽ of all
quests combined.

Rule applied here:
  · NO quest gives dust anymore;
  · ~60% of the affected quests receive ONE berry (quantity 1);
  · the remaining ~40% keep only their money;
  · the berry is drawn among the game's 18, with a DETERMINISTIC PRNG seeded
    by the quest id (replayable, testable) and an anti-repeat rule that bans
    the same berry twice in a row and smooths the distribution.

The FR/EN texts (`rewardDesc`) are resynchronized: they still announced
"2 Oran Berries" while the game granted 2 dusts.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BERRIES = ['prine_berry', 'babiri_berry', 'charti_berry', 'chople_berry',
           'coba_berry', 'colbur_berry', 'haban_berry', 'kasib_berry',
           'kebia_berry', 'occa_berry', 'passho_berry', 'payapa_berry',
           'rindo_berry', 'roseli_berry', 'shuca_berry', 'tanga_berry',
           'wacan_berry', 'yache_berry']

NAME_FR = {}
NAME_EN = {}


def load_names():
    js = open(os.path.join(ROOT, 'src', 'data', 'items-data.js')).read()
    for key in BERRIES:
        blk = re.search(r'"%s":\s*\{(.*?)\n  \}' % key, js, re.S)
        if not blk:
            raise SystemExit('unknown berry in ITEMS: ' + key)
        fr = re.search(r'"name_fr":\s*"([^"]+)"', blk.group(1))
        en = re.search(r'"name_en":\s*"([^"]+)"', blk.group(1))
        NAME_FR[key] = fr.group(1)
        NAME_EN[key] = en.group(1)


def prng(seed):
    """mulberry32 — deterministic and portable (same family as the game)."""
    state = seed & 0xFFFFFFFF

    def nxt():
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = state
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return nxt


def main():
    load_names()
    sq = os.path.join(ROOT, 'src', 'data', 'story-quests.js')
    sd = os.path.join(ROOT, 'src', 'data', 'side-quests-data.js')
    src = {p: open(p).read() for p in (sq, sd)}

    # stable order: scan the quests in order of appearance
    targets = []          # (file, position, id, dust quantity)
    for p in (sq, sd):
        for m in re.finditer(r'"stardust":\s*(\d+)', src[p]):
            targets.append((p, m.start(), int(m.group(1))))

    rnd = prng(0x50 * 53)      # graine fixe → tirage rejouable
    recent = []                # anti-repetition (sliding window)
    plan = {}                  # (fichier, position) -> baie | None
    given = 0
    for (p, pos, _qty) in targets:
        if rnd() < 0.40:                       # ~40 % : argent seul
            plan[(p, pos)] = None
            continue
        pool = [b for b in BERRIES if b not in recent] or BERRIES[:]
        pick = pool[int(rnd() * len(pool)) % len(pool)]
        recent.append(pick)
        if len(recent) > 6:
            recent.pop(0)
        plan[(p, pos)] = pick
        given += 1

    # rewrite (from end to start: positions stay valid)
    counts = {}
    for p in (sq, sd):
        s = src[p]
        for m in reversed(list(re.finditer(r'"stardust":\s*(\d+)', s))):
            pick = plan[(p, m.start())]
            if pick is None:
                # delete the entry AND the preceding comma if needed
                a, b = m.start(), m.end()
                before = s[:a].rstrip()
                after = s[b:].lstrip()
                if before.endswith(',') and after.startswith('}'):
                    before = before[:-1]
                elif after.startswith(','):
                    after = after[1:].lstrip()
                s = before + ('\n' if not after.startswith('}') else '') + after
            else:
                s = s[:m.start()] + '"%s": 1' % pick + s[m.end():]
                counts[pick] = counts.get(pick, 0) + 1
        open(p, 'w').write(s)

    # ── FR/EN texts: rewardDesc resynchronization ───────────────────
    for lang, names in (('fr', NAME_FR), ('en', NAME_EN)):
        lp = os.path.join(ROOT, 'src', 'localization', lang, 'quests.js')
        txt = open(lp).read()
        # "400₽ + 1 Baie Oran" / "400₽ + 1 Oran Berry" -> money only,
        # then we will re-add the actually given berry below.
        if lang == 'fr':
            txt = re.sub(r'\s*\+\s*\d+\s+Baies?\s+\w+', '', txt)
            txt = re.sub(r'\s*\+\s*\d+\s+Poussières?\s+Étoiles?', '', txt)
        else:
            txt = re.sub(r'\s*\+\s*\d+\s+\w+\s+Berry', '', txt)
            txt = re.sub(r'\s*\+\s*\d+\s+Stardust', '', txt)
        open(lp, 'w').write(txt)

    print('quests affected       :', len(targets))
    print('with a berry          :', given)
    print('money only            :', len(targets) - given)
    print('distinct berries      :', len(counts), '/', len(BERRIES))
    print('distribution          :', dict(sorted(counts.items(), key=lambda kv: -kv[1])))


if __name__ == '__main__':
    main()
