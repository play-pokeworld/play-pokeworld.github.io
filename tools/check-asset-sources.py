#!/usr/bin/env python3
"""Passe 50 — VÉRIFICATION des sources d'assets déclarées par les outils.

Demande utilisateur : « si des liens des assets sont manquants ou pas bons
dans le tool, rajoute-les ».

Ce script interroge chaque source déclarée par la chaîne de téléchargement et
signale celles qui ne répondent plus (404, domaine mort, chemin renommé). Il
sert de garde-fou : quand une source change en amont, on le sait ici au lieu
de le découvrir par des 404 dans la console du jeu.

Sources contrôlées :
  · PokeChill      — disquettes CT/CS par type, fonds, objets imposés ;
  · PokeAPI        — sprites Pokémon (face/dos/chromatiques) et objets ;
  · Pokéclicker    — cartes de régions, dresseurs, icônes de profil ;
  · Poképédia      — carte de Paldea ;
  · pret/pokeemerald — tilesets, layouts et objgfx des bases secrètes.

Usage : python3 tools/check-asset-sources.py
Sortie : 0 si toutes les sources répondent, 1 sinon.
"""
from __future__ import annotations

import urllib.error
import urllib.request

UA = 'PokeWorldAssetDownloader/1.0 (+source check)'

POKEAPI = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites'
POKECLICKER = 'https://raw.githubusercontent.com/pokeclicker/pokeclicker/develop/src/assets/images'
POKECHILL = 'https://raw.githubusercontent.com/play-pokechill/play-pokechill.github.io/main'
PRET = 'https://raw.githubusercontent.com/pret/pokeemerald/master'
PALDEA = 'https://www.pokepedia.fr/images/thumb/8/88/Paldea_-_EV.png/1600px-Paldea_-_EV.png'

CHECKS = [
    # (famille, description, URL témoin)
    ('PokeChill', 'disquette CT (type Normal)', f'{POKECHILL}/img/items/tmNormal.png'),
    ('PokeChill', 'disquette CT (type Fée)', f'{POKECHILL}/img/items/tmFairy.png'),
    ('PokeChill', 'fond principal', f'{POKECHILL}/img/bg/main-bg.png'),
    ('PokeChill', 'baie générique (Oran)', f'{POKECHILL}/img/items/berryOran.png'),
    ('PokeChill', 'fossile (Hélix)', f'{POKECHILL}/img/items/fossilHelix.png'),
    ('PokeAPI', 'Pokémon face #1', f'{POKEAPI}/pokemon/1.png'),
    ('PokeAPI', 'Pokémon dos #1', f'{POKEAPI}/pokemon/back/1.png'),
    ('PokeAPI', 'Pokémon chromatique #1', f'{POKEAPI}/pokemon/shiny/1.png'),
    ('PokeAPI', 'objet (Restes)', f'{POKEAPI}/items/leftovers.png'),
    ('Pokéclicker', 'carte de Kanto', f'{POKECLICKER}/kanto-kanto.png'),
    ('Pokéclicker', 'icône de profil', f'{POKECLICKER}/profile/trainer-0.png'),
    ('Pokéclicker', 'objet d’évolution', f'{POKECLICKER}/items/evolution/Kings_rock.png'),
    ('Poképédia', 'carte de Paldea', PALDEA),
    ('pret/pokeemerald', 'tileset primaire (base secrète)',
     f'{PRET}/data/tilesets/primary/secret_base/tiles.png'),
    ('pret/pokeemerald', 'métatiles généraux',
     f'{PRET}/data/tilesets/primary/general/metatiles.bin'),
    ('pret/pokeemerald', 'layout canon BrownCave1',
     f'{PRET}/data/layouts/SecretBase_BrownCave1/map.bin'),
    ('pret/pokeemerald', 'objgfx (poupée Azurill)',
     f'{PRET}/graphics/object_events/pics/dolls/azurill_doll.png'),
    ('pret/pokeemerald', 'décoration 2D (tente rouge)',
     f'{PRET}/graphics/decorations/red_tent.png'),
]


def head(url: str) -> tuple[bool, str]:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            n = len(r.read())
            return (r.status == 200 and n > 80), f'{r.status} · {n} o.'
    except urllib.error.HTTPError as e:
        return False, f'HTTP {e.code}'
    except (urllib.error.URLError, TimeoutError) as e:
        return False, f'réseau : {e}'


def main() -> int:
    bad = []
    fam = None
    for family, label, url in CHECKS:
        if family != fam:
            print(f'\n── {family}')
            fam = family
        ok, info = head(url)
        print(f'   {"✔" if ok else "✖"} {label:38s} {info}')
        if not ok:
            bad.append((family, label, url))
    print()
    if bad:
        print(f'{len(bad)} source(s) EN ÉCHEC — à corriger dans les outils :')
        for family, label, url in bad:
            print(f'  · [{family}] {label}\n    {url}')
        return 1
    print(f'Toutes les sources répondent ({len(CHECKS)} contrôles).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
