#!/usr/bin/env python3
"""Passe 49 — MISSING item sprites (resistance berries, gems, orbs…).

Symptom reported by the user (console, dozens of lines):
    clear_amulet.png   Failed to load resource: net::ERR_FILE_NOT_FOUND
    babiri_berry.png   Failed to load resource: net::ERR_FILE_NOT_FOUND
    steel_gem.png      … etc.

Cause: `getItemSpriteUrl()` (src/data/items-helpers.js) BUILDS the URL
`src/assets/images/items/<key>.png` for any item of the catalog,
without checking that the file exists. The catalog has 289 items and only
48 had a PNG: all the others went 404 as soon as the bag opened.
The audit could not see them because those paths never appear hardcoded
in the code — they are computed at runtime.

This script downloads the official sprites from PokeAPI (PokeAPI/sprites
repo, dash naming) and, for the remainder not found upstream
(recent items or game-invented ones), BAKES a readable vignette in the
game's art style from a visual family (berry, gem, orb, fossil…).

Idempotent: an existing PNG is neither downloaded again nor re-baked.
Usage: python3 tools/fetch-item-sprites.py [--force] [--report]
"""
from __future__ import annotations

import json
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/assets/images/items'
UA = 'PokeWorldAssetDownloader/1.0 (+item sprites)'
POKEAPI = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/'

# Game keys whose PokeAPI name differs from the simple underscore->dash.
ALIAS = {
    'never_melt_ice': 'never-melt-ice',
    'deep_sea_scale': 'deep-sea-scale',
    'deep_sea_tooth': 'deep-sea-tooth',
    'rarcandy': 'rare-candy',
    # Phase 51 (user feedback: "Prine Berry, Upgrade and all the
    # Z stones are missing"). These three families carry a PokeAPI name
    # different from the plain underscore->dash transform:
    #  · "Baie Prine" is the official FR name of the Lum Berry;
    #  · "Améliorator" is `up-grade` (not `upgrade`);
    #  · Z stones are suffixed `--held` (bag variant: `--bag`).
    'prine_berry': 'lum-berry',
    'upgrade': 'up-grade',
    'ct_normal': 'tm-normal',
}

# Z stones: the PokeAPI stem matches the game key; only the
# suffix changes (`--held` = held sprite, `--bag` = bag icon).
for _z in ('normalium', 'firium', 'waterium', 'grassium', 'electrium', 'icium',
           'fightinium', 'poisonium', 'groundium', 'flyinium', 'psychium',
           'buginium', 'rockium', 'ghostium', 'dragonium', 'darkinium',
           'steelium', 'fairium'):
    ALIAS[f'{_z}_z'] = f'{_z}-z--held'

# Visual families for fallback baking (color, shape).
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
    """Game item keys, read from ITEMS (source of truth)."""
    js = r"""
    const fs=require('fs'),vm=require('vm');
    const s={window:{},console,document:{createElement:()=>({}),getElementById:()=>null}};
    s.globalThis=s; vm.createContext(s);
    for(const f of ['src/data/items-data.js','src/data/items-helpers.js']){
      try{ let c=fs.readFileSync(f,'utf8').replace(/export\s+(const|let|var|function|class|default)\s+/g, '\$1 ').replace(/export\s+\{[^}]*\};?/g, ''); vm.runInContext(c,s,{filename:f}); }catch(e){console.error(e);}
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
    """32×32 fallback vignette: family shape + tint, inked outline."""
    from PIL import Image, ImageDraw
    shape, col = 'orb', (0x9A, 0x9A, 0xA2)
    for suffix, sh, c in FAMILIES:
        if key.endswith(suffix) or suffix in key:
            shape, col = sh, c
            break
    for t, tint in TYPE_TINT.items():          # gems/TMs: tint by type
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
    else:                                       # orb / generic
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
    # TMs/HMs already have a per-TYPE fallback (tm_<type>.png) handled upstream
    missing = [k for k in missing if not (k.startswith('ct') or k.startswith('cs'))]
    print(f'catalog: {len(keys)} items · {len(missing)} without sprite')
    if report:
        print(' '.join(missing))
        return 0

    got = 0
    failed_fetch = []
    pc_map, pc_base = {}, 'https://raw.githubusercontent.com/pokeclicker/pokeclicker/develop/src/assets/images/'
    try:
        cfg = json.loads((ROOT / 'tools' / 'pokeclicker-items.json').read_text(encoding='utf-8'))
        pc_map = cfg.get('items') or {}
        pc_base = (cfg.get('base') or pc_base).rstrip('/') + '/'
    except Exception:
        pass
    for k in missing:
        dest = OUT / f'{k}.png'
        data = None
        if k in pc_map:
            data = fetch(pc_base + urllib.parse.quote(pc_map[k]))
        if not data:
            name = ALIAS.get(k, k.replace('_', '-'))
            data = fetch(POKEAPI + name + '.png')
        if data:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            got += 1
            continue
        # Pokéclicker / PokeChill attempt via extended ITEM_OVERRIDES (see download_assets.py)
        # Here we NO LONGER bake a fallback — only list
        failed_fetch.append(k)
    still = [k for k in keys
             if not (OUT / f'{k}.png').exists() and not (k.startswith('ct') or k.startswith('cs'))]
    print(f'items: {got} downloaded (PokeAPI) · {len(failed_fetch)} without a real sprite (listed, not generated)')
    if failed_fetch:
        print('  Missing:', ', '.join(failed_fetch[:100]))
    # still = failed_fetch (no more bake)
    print(f'  Total without sprite after attempt: {len(still)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

