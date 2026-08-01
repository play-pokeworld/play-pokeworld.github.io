#!/usr/bin/env python3
"""Passe 49 — sprites d'objets MANQUANTS (baies de résistance, gemmes, orbes…).

Symptôme signalé par l'utilisateur (console, dizaines de lignes) :
    clear_amulet.png   Failed to load resource: net::ERR_FILE_NOT_FOUND
    babiri_berry.png   Failed to load resource: net::ERR_FILE_NOT_FOUND
    steel_gem.png      … etc.

Cause : `getItemSpriteUrl()` (src/data/items-helpers.js) FABRIQUE l'URL
`src/assets/images/items/<clé>.png` pour n'importe quel objet du catalogue,
sans vérifier que le fichier existe. Le catalogue compte 289 objets et seuls
48 avaient un PNG : tous les autres partaient en 404 dès l'ouverture du sac.
L'audit ne les voyait pas car ces chemins n'apparaissent nulle part en dur
dans le code — ils sont calculés à l'exécution.

Ce script télécharge les sprites officiels depuis PokeAPI (dépôt PokeAPI/
sprites, nommage à tirets) et, pour le reliquat introuvable en amont
(objets récents ou inventés par le jeu), CUIT une vignette lisible dans la
DA du jeu à partir d'une famille visuelle (baie, gemme, orbe, fossile…).

Idempotent : un PNG déjà présent n'est ni retéléchargé ni recuit.
Usage : python3 tools/fetch-item-sprites.py [--force] [--report]
"""
from __future__ import annotations

import json
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/assets/images/items'
UA = 'PokeWorldAssetDownloader/1.0 (+item sprites)'
POKEAPI = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/'

# Clés du jeu dont le nom PokeAPI diffère du simple underscore→tiret.
ALIAS = {
    'never_melt_ice': 'never-melt-ice',
    'deep_sea_scale': 'deep-sea-scale',
    'deep_sea_tooth': 'deep-sea-tooth',
    'rarcandy': 'rare-candy',
    # Passe 51 (retour utilisateur : « baie Prine, Améliorator et toutes les
    # pierres Z sont manquantes »). Ces trois familles portent un nom PokeAPI
    # différent de la simple transformation underscore→tiret :
    #  · la « Baie Prine » est le nom FR officiel de la Lum Berry ;
    #  · l'« Améliorator » est `up-grade` (et non `upgrade`) ;
    #  · les pierres Z sont suffixées `--held` (variante sac : `--bag`).
    'prine_berry': 'lum-berry',
    'upgrade': 'up-grade',
    'ct_normal': 'tm-normal',
}

# Pierres Z : le radical PokeAPI est identique à la clé du jeu, seul le
# suffixe change (`--held` = sprite tenu, `--bag` = icône de sac).
for _z in ('normalium', 'firium', 'waterium', 'grassium', 'electrium', 'icium',
           'fightinium', 'poisonium', 'groundium', 'flyinium', 'psychium',
           'buginium', 'rockium', 'ghostium', 'dragonium', 'darkinium',
           'steelium', 'fairium'):
    ALIAS[f'{_z}_z'] = f'{_z}-z--held'

# Familles visuelles pour la cuisson de repli (couleur, forme).
BERRY = (0xE0, 0x50, 0x40)
FAMILIES = [
    ('_berry', 'berry', BERRY),
    ('_gem', 'gem', (0x8A, 0x6F, 0xD0)),
    ('_seed', 'seed', (0x86, 0xC0, 0x5A)),
    ('_orb', 'orb', (0xD8, 0x7A, 0x3C)),
    ('_fossil', 'rock', (0xA8, 0x96, 0x74)),
    ('ium_z', 'gem', (0xE8, 0xC0, 0x50)),
    ('_rock', 'rock', (0x9A, 0x9A, 0xA2)),
    ('_herb', 'seed', (0x6C, 0xB8, 0x64)),
    ('_incense', 'orb', (0xE0, 0xA8, 0xC8)),
    ('_stone', 'rock', (0x88, 0x9A, 0xC0)),
]

TYPE_TINT = {
    'normal': (0xA0, 0xA2, 0x9F), 'fire': (0xFB, 0xA6, 0x4C), 'water': (0x53, 0x9D, 0xDF),
    'grass': (0x60, 0xBE, 0x58), 'electric': (0xF2, 0xD9, 0x4E), 'ice': (0x76, 0xD1, 0xC1),
    'fighting': (0xD3, 0x42, 0x5F), 'poison': (0xB7, 0x63, 0xCF), 'ground': (0xDA, 0x7C, 0x4D),
    'flying': (0xA1, 0xBB, 0xEC), 'psychic': (0xFA, 0x85, 0x82), 'bug': (0x92, 0xBD, 0x2D),
    'rock': (0xC9, 0xBC, 0x8A), 'ghost': (0x5F, 0x6D, 0xBC), 'dragon': (0x0C, 0x6A, 0xC8),
    'dark': (0x59, 0x57, 0x61), 'steel': (0x57, 0x95, 0xA3), 'fairy': (0xEF, 0x90, 0xE6),
}


def catalog_keys() -> list[str]:
    """Clés d'objets du jeu, lues depuis ITEMS (source de vérité)."""
    js = r"""
    const fs=require('fs'),vm=require('vm');
    const s={window:{},console,document:{createElement:()=>({}),getElementById:()=>null}};
    s.globalThis=s; vm.createContext(s);
    for(const f of ['src/data/items-data.js','src/data/items-helpers.js']){
      try{ vm.runInContext(fs.readFileSync(f,'utf8'),s,{filename:f}); }catch(e){}
    }
    process.stdout.write(JSON.stringify(Object.keys(s.window.ITEMS||s.ITEMS||{})));
    """
    out = subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True, timeout=60)
    try:
        return json.loads(out.stdout or '[]')
    except json.JSONDecodeError:
        return []


def fetch(url: str) -> bytes | None:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read()
            if r.status == 200 and len(data) > 100 and data[:8] == b'\x89PNG\r\n\x1a\n':
                return data
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return None
    return None


def bake(key: str, dest: Path) -> None:
    """Vignette de repli 32×32 : forme de famille + teinte, contour encré."""
    from PIL import Image, ImageDraw
    shape, col = 'orb', (0x9A, 0x9A, 0xA2)
    for suffix, sh, c in FAMILIES:
        if key.endswith(suffix) or suffix in key:
            shape, col = sh, c
            break
    for t, tint in TYPE_TINT.items():          # gemmes/CT : teinte par type
        if key.startswith(t + '_') or key.endswith('_' + t):
            col = tint
            break
    ink = (0x2C, 0x22, 0x1A, 255)
    lite = tuple(min(255, int(v + (255 - v) * 0.45)) for v in col) + (255,)
    dark = tuple(int(v * 0.62) for v in col) + (255,)
    base = col + (255,)

    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if shape == 'berry':
        d.ellipse((6, 10, 26, 28), fill=base, outline=ink, width=2)
        d.ellipse((10, 14, 17, 20), fill=lite)
        d.polygon([(16, 10), (12, 4), (20, 4)], fill=(0x4C, 0x8A, 0x3C, 255), outline=ink)
    elif shape == 'gem':
        d.polygon([(16, 3), (28, 13), (16, 29), (4, 13)], fill=base, outline=ink)
        d.polygon([(16, 3), (22, 13), (16, 18), (10, 13)], fill=lite)
        d.polygon([(16, 18), (22, 13), (28, 13)], fill=dark)
    elif shape == 'seed':
        d.ellipse((8, 6, 24, 26), fill=base, outline=ink, width=2)
        d.arc((10, 9, 22, 23), 200, 340, fill=lite, width=2)
    elif shape == 'rock':
        d.polygon([(5, 26), (9, 10), (20, 6), (27, 16), (24, 27)], fill=base, outline=ink)
        d.polygon([(9, 10), (20, 6), (18, 15)], fill=lite)
        d.polygon([(18, 15), (27, 16), (24, 27)], fill=dark)
    else:                                       # orbe / générique
        d.ellipse((5, 5, 27, 27), fill=base, outline=ink, width=2)
        d.ellipse((10, 9, 18, 16), fill=lite)
        d.arc((7, 7, 25, 25), 30, 150, fill=dark, width=2)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest)


def main() -> int:
    force = '--force' in sys.argv
    report = '--report' in sys.argv
    keys = catalog_keys()
    if not keys:
        print('✖ catalogue ITEMS illisible')
        return 1
    missing = [k for k in keys if force or not (OUT / f'{k}.png').exists()]
    # les CT/CS ont déjà un repli par TYPE (tm_<type>.png) géré en amont
    missing = [k for k in missing if not (k.startswith('ct') or k.startswith('cs'))]
    print(f'catalogue : {len(keys)} objets · {len(missing)} sans sprite')
    if report:
        print(' '.join(missing))
        return 0

    got = 0
    failed_fetch = []
    for k in missing:
        dest = OUT / f'{k}.png'
        name = ALIAS.get(k, k.replace('_', '-'))
        data = fetch(POKEAPI + name + '.png')
        if data:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            got += 1
            continue
        # Tentative Pokeclicker / PokeChill via ITEM_OVERRIDES étendus (voir download_assets.py)
        # Ici on NE CUIT PLUS de repli — on liste seulement
        failed_fetch.append(k)
    still = [k for k in keys
             if not (OUT / f'{k}.png').exists() and not (k.startswith('ct') or k.startswith('cs'))]
    print(f'objets : {got} téléchargés (PokeAPI) · {len(failed_fetch)} sans sprite réel (listés, non générés)')
    if failed_fetch:
        print('  Manquants:', ', '.join(failed_fetch[:100]))
    # still = failed_fetch (plus de bake)
    print(f'  Total sans sprite après tentative: {len(still)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
