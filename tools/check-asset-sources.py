#!/usr/bin/env python3
"""Passe 50 — CHECK of the asset sources declared by the tools.

User request: "if some asset links are missing or broken
in the tool, add/fix them".

This script queries every source declared by the download chain and
reports those that no longer answer (404, dead domain, renamed path). It
acts as a safeguard: when an upstream source changes, we learn it here
instead of discovering it through 404s in the game console.

Sources checked:
  · PokeChill      — TM/HM disks by type, backgrounds, required items;
  · PokeAPI        — Pokémon sprites (front/back/shiny) and items;
  · Pokéclicker    — region maps, trainers, profile icons;
  · Poképédia      — Paldea map;
  · pret/pokeemerald — tilesets, layouts and secret base objgfx.

Usage: python3 tools/check-asset-sources.py
Exit: 0 if every source answers, 1 otherwise.
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
    # (family, description, witness URL)
    ('PokeChill', 'TM disk (Normal type)', f'{POKECHILL}/img/items/tmNormal.png'),
    ('PokeChill', 'TM disk (Fairy type)', f'{POKECHILL}/img/items/tmFairy.png'),
    ('PokeChill', 'main background', f'{POKECHILL}/img/bg/main-bg.png'),
    ('PokeChill', 'generic berry (Oran)', f'{POKECHILL}/img/items/berryOran.png'),
    ('PokeChill', 'fossil (Helix)', f'{POKECHILL}/img/items/fossilHelix.png'),
    ('PokeAPI', 'Pokémon front #1', f'{POKEAPI}/pokemon/1.png'),
    ('PokeAPI', 'Pokémon back #1', f'{POKEAPI}/pokemon/back/1.png'),
    ('PokeAPI', 'shiny Pokémon #1', f'{POKEAPI}/pokemon/shiny/1.png'),
    ('PokeAPI', 'item (Leftovers)', f'{POKEAPI}/items/leftovers.png'),
    ('Pokéclicker', 'Kanto map', f'{POKECLICKER}/kanto-kanto.png'),
    ('Pokéclicker', 'profile icon', f'{POKECLICKER}/profile/trainer-0.png'),
    ('Pokéclicker', 'evolution item', f'{POKECLICKER}/items/evolution/Kings_rock.png'),
    ('Poképédia', 'Paldea map', PALDEA),
    ('pret/pokeemerald', 'primary tileset (secret base)',
     f'{PRET}/data/tilesets/primary/secret_base/tiles.png'),
    ('pret/pokeemerald', 'general metatiles',
     f'{PRET}/data/tilesets/primary/general/metatiles.bin'),
    ('pret/pokeemerald', 'canon layout BrownCave1',
     f'{PRET}/data/layouts/SecretBase_BrownCave1/map.bin'),
    ('pret/pokeemerald', 'objgfx (Azurill doll)',
     f'{PRET}/graphics/object_events/pics/dolls/azurill_doll.png'),
    ('pret/pokeemerald', '2D decoration (red tent)',
     f'{PRET}/graphics/decorations/red_tent.png'),
]


def head(url: str) -> tuple[bool, str]:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            n = len(r.read())
            return (r.status == 200 and n > 80), f'{r.status} · {n} B'
    except urllib.error.HTTPError as e:
        return False, f'HTTP {e.code}'
    except (urllib.error.URLError, TimeoutError) as e:
        return False, f'network: {e}'


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
        print(f'{len(bad)} FAILING source(s) — fix in the tools:')
        for family, label, url in bad:
            print(f'  · [{family}] {label}\n    {url}')
        return 1
    print(f'All sources answer ({len(CHECKS)} checks).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

