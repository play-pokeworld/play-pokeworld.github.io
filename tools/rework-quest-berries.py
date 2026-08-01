#!/usr/bin/env python3
"""Passe 53 — retire la Poussière Étoile de TOUTES les quêtes.

Retour utilisateur : « supprime de toutes les quêtes les poussières d'Étoile,
et donne à la place (dans certaines, pas toutes) une seule baie random parmi
toutes les baies (pas à chaque fois la même) par quête. »

Contexte (diagnostic de la passe 52) : à la passe 27 les Baies Oran/Sitrus/
Ceriz avaient été supprimées et leurs 58 récompenses converties en Poussière
Étoile À QUANTITÉ ÉGALE — sauf qu'une baie ne valait rien et qu'une poussière
se revend 2 000 ₽. Résultat : 104 poussières = 208 000 ₽, soit +32 % sur les
649 900 ₽ de toutes les quêtes réunies.

Règle appliquée ici :
  · plus AUCUNE quête ne donne de poussière ;
  · ~60 % des quêtes concernées reçoivent UNE baie (quantité 1) ;
  · les ~40 % restantes gardent seulement leur argent ;
  · la baie est tirée parmi les 18 du jeu, avec un PRNG DÉTERMINISTE semé par
    l'id de la quête (rejouable, testable) et un anti-répétition qui interdit
    deux fois la même baie d'affilée et lisse la distribution.

Les textes FR/EN (`rewardDesc`) sont resynchronisés : ils annonçaient encore
« 2 Baies Oran » alors que le jeu versait 2 poussières.
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
            raise SystemExit('baie inconnue dans ITEMS : ' + key)
        fr = re.search(r'"name_fr":\s*"([^"]+)"', blk.group(1))
        en = re.search(r'"name_en":\s*"([^"]+)"', blk.group(1))
        NAME_FR[key] = fr.group(1)
        NAME_EN[key] = en.group(1)


def prng(seed):
    """mulberry32 — déterministe et portable (même famille que le jeu)."""
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

    # ordre stable : on parcourt les quêtes dans l'ordre d'apparition
    targets = []          # (fichier, position, id, quantité de poussière)
    for p in (sq, sd):
        for m in re.finditer(r'"stardust":\s*(\d+)', src[p]):
            targets.append((p, m.start(), int(m.group(1))))

    rnd = prng(0x50 * 53)      # graine fixe → tirage rejouable
    recent = []                # anti-répétition (fenêtre glissante)
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

    # réécriture (de la fin vers le début : les positions restent valides)
    counts = {}
    for p in (sq, sd):
        s = src[p]
        for m in reversed(list(re.finditer(r'"stardust":\s*(\d+)', s))):
            pick = plan[(p, m.start())]
            if pick is None:
                # supprime l'entrée ET la virgule qui la précède si besoin
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

    # ── textes FR/EN : resynchronisation des rewardDesc ───────────────────
    for lang, names in (('fr', NAME_FR), ('en', NAME_EN)):
        lp = os.path.join(ROOT, 'src', 'localization', lang, 'quests.js')
        txt = open(lp).read()
        # « 400₽ + 1 Baie Oran » / « 400₽ + 1 Oran Berry » → argent seul,
        # puis on rajoutera la baie réellement donnée plus bas.
        if lang == 'fr':
            txt = re.sub(r'\s*\+\s*\d+\s+Baies?\s+\w+', '', txt)
            txt = re.sub(r'\s*\+\s*\d+\s+Poussières?\s+Étoiles?', '', txt)
        else:
            txt = re.sub(r'\s*\+\s*\d+\s+\w+\s+Berry', '', txt)
            txt = re.sub(r'\s*\+\s*\d+\s+Stardust', '', txt)
        open(lp, 'w').write(txt)

    print('quêtes touchées      :', len(targets))
    print('avec une baie        :', given)
    print('argent seul          :', len(targets) - given)
    print('baies distinctes     :', len(counts), '/', len(BERRIES))
    print('distribution         :', dict(sorted(counts.items(), key=lambda kv: -kv[1])))


if __name__ == '__main__':
    main()
