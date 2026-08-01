#!/usr/bin/env python3
"""Passe 53 — complète la table d'autotiling par SYMÉTRIE HORIZONTALE.

Retour utilisateur : « les cases à côté de la porte ne sont toujours pas les
bonnes ». Cause racine : la table `autotile-walls.json` a été APPRISE sur les
24 maps canon du désassemblage ; elle ne couvre donc que les voisinages que
Game Freak a effectivement employés. Nos salles à étage, plus hautes et plus
découpées, produisent des voisinages légitimes mais ABSENTS de la table — le
baker tombe alors sur sa tuile de repli (roche pleine) et le mur « ne boucle
pas ».

Plutôt que d'inventer des tuiles, on EXPLOITE une propriété vérifiée de la
table : elle est symétrique. Pour toute paire (masque, masque miroir) déjà
présente, les métatiles se répondent exactement —

    0x201<->0x203   0x205<->0x207   0x209<->0x20b   0x20d<->0x20f
    0x211<->0x213   0x202, 0x20c, 0x210, 0x212 : symétriques d'eux-mêmes

(14 correspondances observées, 0 contre-exemple). On peut donc DÉRIVER sans
risque le métatile d'un masque manquant depuis son miroir connu : c'est la
même règle canon, lue dans l'autre sens.

Sortie : autotile-walls.json enrichi (les entrées apprises ne bougent pas).
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, 'emerald-ref', 'autotile-walls.json')

# bits : 0=NW 1=N 2=NE 3=W 4=E 5=SW 6=S 7=SE
def mirror_mask(m):
    b = [(m >> i) & 1 for i in range(8)]
    nb = [b[2], b[1], b[0], b[4], b[3], b[7], b[6], b[5]]
    return sum(v << i for i, v in enumerate(nb))


def main():
    raw = json.load(open(P))
    at = {int(k): int(v) for k, v in raw.items()}
    learned = dict(at)

    # 1) table de correspondance des métatiles, DÉDUITE des paires connues
    pair = {}
    for m, v in learned.items():
        mm = mirror_mask(m)
        if mm in learned:
            other = learned[mm]
            if v in pair and pair[v] != other:
                raise SystemExit(f'symétrie incohérente : {hex(v)} -> {hex(pair[v])} et {hex(other)}')
            pair[v] = other
    print(f'{len(pair)} correspondances de métatiles déduites des paires apprises')

    # 2) complétion : tout masque dont le miroir est connu devient dérivable
    added = 0
    for m in range(256):
        if m in at:
            continue
        mm = mirror_mask(m)
        if mm in learned and learned[mm] in pair:
            at[m] = pair[learned[mm]]
            added += 1

    json.dump({str(k): at[k] for k in sorted(at)}, open(P, 'w'), indent=1)
    print(f'{len(learned)} entrées apprises + {added} dérivées par miroir = {len(at)}')


if __name__ == '__main__':
    main()
