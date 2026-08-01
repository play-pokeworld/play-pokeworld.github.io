#!/usr/bin/env python3
"""Download/rebuild all game image assets referenced by PokéWorld.

Sources used (ordre de priorité demandé) :
1. PokeChill GitHub     — backgrounds originaux du jeu (img/bg/*).
2. Pokéclicker GitHub   — cartes de régions, dresseurs, profils.
3. Poképédia            — carte de Paldea (absente de Pokéclicker : « NO MAP YET »).
4. PokeAPI sprites      — Pokémon et objets.
Generated fallback PNGs are created only when an upstream asset does not exist.

Bases secrètes (2D Émeraude uniquement) — voir download_base_assets() :
5. pret/pokeemerald      — sprites 2D officiels GBA des décorations.
6. Serebii / objgfx      — icônes et objets 2D (repli).
La Base Secrète 3D a été retirée du projet.
"""
from __future__ import annotations

import concurrent.futures as futures
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / 'src/data/sprites.js'
TRAINERS = ROOT / 'src/data/trainer-sprites-data.js'
UA = 'PokeWorldAssetDownloader/1.0'

POKEAPI_RAW = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites'
POKECLICKER_RAW = 'https://raw.githubusercontent.com/pokeclicker/pokeclicker/develop/src/assets/images'
POKECHILL_RAW = 'https://raw.githubusercontent.com/play-pokechill/play-pokechill.github.io/main'
POKEPEDIA_PALDEA = 'https://www.pokepedia.fr/images/thumb/8/88/Paldea_-_EV.png/1600px-Paldea_-_EV.png'

# Cartes de régions : vraies cartes officielles (Pokéclicker ; Paldea via Poképédia).
# Chaque entrée = UN fichier enregistré tel quel, JAMAIS de fusion/collage :
# Alola est conservée en 4 îles séparées et Galar en 2 parties (Nord/Sud),
# exactement comme sur le dépôt Pokéclicker (retour utilisateur, passe 6).
REGION_MAP_FILES = {
    'kanto.png':          f'{POKECLICKER_RAW}/kanto-kanto.png',
    'johto.png':          f'{POKECLICKER_RAW}/johto.png',
    'hoenn.png':          f'{POKECLICKER_RAW}/hoenn.png',
    'sinnoh.png':         f'{POKECLICKER_RAW}/sinnoh.png',
    'unova.png':          f'{POKECLICKER_RAW}/unova.png',
    'kalos.png':          f'{POKECLICKER_RAW}/kalos.png',
    'galar-north.png':    f'{POKECLICKER_RAW}/galar-north.png',
    'galar-south.png':    f'{POKECLICKER_RAW}/galar-south.png',
    'alola-melemele.png': f'{POKECLICKER_RAW}/alola-melemele.png',
    'alola-akala.png':    f'{POKECLICKER_RAW}/alola-akala.png',
    'alola-ulaula.png':   f'{POKECLICKER_RAW}/alola-ulaula.png',
    'alola-poni.png':     f'{POKECLICKER_RAW}/alola-poni.png',
    'paldea.png':         POKEPEDIA_PALDEA,
}
REGION_ACCENTS = {
    'kanto': '#F2D94E', 'johto': '#B8C7D9', 'hoenn': '#D3425F', 'sinnoh': '#76D1C1',
    'unova': '#5795A3', 'kalos': '#EF90E6', 'alola': '#F2A541', 'galar': '#0C6AC8', 'paldea': '#DA7C4D',
}

# Backgrounds originaux de PokeChill (le jeu dont ce projet est issu).
BACKGROUNDS = {
    'main-bg.png': f'{POKECHILL_RAW}/img/bg/main-bg.png',
    'empty.jpg':   f'{POKECHILL_RAW}/img/bg/empty.jpg',
    'forest.png':  f'{POKECHILL_RAW}/img/bg/forest.png',
}

# Sprites d'objets dont la source officielle est imposée (retours utilisateur) :
#  - les CT (tm_<type>) viennent de PokeChill, disquettes officielles par type ;
#  - kings_rock / upgrade viennent de Pokéclicker (items d'évolution) ;
#  - berry.png : PokeChill n'a pas de « berry.png » générique (vérifié dans tout
#    l'arbre du dépôt + historique Git) ; berryOran.png est sa baie « générique »,
#    utilisée comme sprite de repli pour toutes les baies sans sprite dédié ;
#  - prine_berry.png : la « Baie Prine » est le nom FR officiel de la Lum Berry,
#    absente de PokeChill -> repli Pokéclicker (source suivante de la liste).
TM_TYPES = ['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting',
            'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost',
            'Dragon', 'Dark', 'Steel', 'Fairy']
ITEM_OVERRIDES = {
    'kings_rock.png':  f'{POKECLICKER_RAW}/items/evolution/Kings_rock.png',
    'upgrade.png':     f'{POKECLICKER_RAW}/items/evolution/Upgrade.png',
    'prine_berry.png': f'{POKECLICKER_RAW}/items/berry/Lum.png',
    'berry.png':       f'{POKECHILL_RAW}/img/items/berryOran.png',
    # Fossile générique de la mine : sprite du fossilHelix PokeChill (même cible #138)
    'fossil.png':      f'{POKECHILL_RAW}/img/items/fossilHelix.png',
}
for _t in TM_TYPES:
    ITEM_OVERRIDES[f'tm_{_t.lower()}.png'] = f'{POKECHILL_RAW}/img/items/tm{_t}.png'

TYPE_COLORS = {
    'normal': '#A0A29F', 'fire': '#FBA64C', 'water': '#539DDF', 'grass': '#60BE58',
    'electric': '#F2D94E', 'ice': '#76D1C1', 'fighting': '#D3425F', 'poison': '#B763CF',
    'ground': '#DA7C4D', 'flying': '#A1BBEC', 'psychic': '#FA8582', 'bug': '#92BD2D',
    'rock': '#C9BC8A', 'ghost': '#5F6DBC', 'dragon': '#0C6AC8', 'dark': '#595761',
    'steel': '#5795A3', 'fairy': '#EF90E6'
}

ITEM_ALIASES = {
    'pokeball': 'poke-ball', 'greatball': 'great-ball', 'ultraball': 'ultra-ball',
    'superpotion': 'super-potion', 'fullrestore': 'full-restore', 'burnheal': 'burn-heal',
    'iceheal': 'ice-heal', 'paralyzeheal': 'paralyze-heal', 'superrepel': 'super-repel',
    'pokeflute': 'poke-flute', 'rarecandy': 'rare-candy', 'rarcandy': 'rare-candy',
    'firestone': 'fire-stone', 'waterstone': 'water-stone', 'thunderstone': 'thunder-stone',
    'leafstone': 'leaf-stone', 'moonstone': 'moon-stone', 'sunstone': 'sun-stone',
}


def request_bytes(url: str, timeout: int = 25) -> bytes | None:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            data = response.read()
            if response.status == 200 and data:
                return data
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return None
    return None


def write_download(url: str, out: Path) -> bool:
    if out.exists() and out.stat().st_size > 0:
        return True
    data = request_bytes(url)
    if not data:
        return False
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(data)
    return True


def parse_sprite_entries() -> list[tuple[str, int, Path]]:
    text = SPRITES.read_text(encoding='utf-8')
    entries: list[tuple[str, int, Path]] = []
    for bucket in ['front', 'frontShiny']:
        m = re.search(rf'\s{bucket}: \{{([\s\S]*?)\n \}}', text)
        if not m:
            continue
        for dex, rel in re.findall(r'"(\d+)":"([^"]+)"', m.group(1)):
            entries.append((bucket, int(dex), ROOT / rel))
    return entries


def pokemon_url(bucket: str, dex: int) -> str:
    folder = {
        'front': 'pokemon',
        'back': 'pokemon/back',
        'frontShiny': 'pokemon/shiny',
        'backShiny': 'pokemon/back/shiny',
    }[bucket]
    return f'{POKEAPI_RAW}/{folder}/{dex}.png'


def parse_item_entries() -> list[tuple[str, Path]]:
    text = SPRITES.read_text(encoding='utf-8')
    m = re.search(r'const ITEM_SPRITE_DATA = \{([\s\S]*?)\};', text)
    if not m:
        return []
    return [(key, ROOT / rel) for key, rel in re.findall(r'"([^"]+)":"([^"]+)"', m.group(1))]


def item_urls(key: str) -> list[str]:
    if key.startswith('tm_'):
        return []
    api_key = ITEM_ALIASES.get(key, key.replace('_', '-'))
    return [f'{POKEAPI_RAW}/items/{urllib.parse.quote(api_key)}.png']


def parse_trainer_files() -> set[str]:
    text = TRAINERS.read_text(encoding='utf-8')
    files = set(re.findall(r"'([^']+\.png)'", text))
    files.update(re.findall(r'"([^"]+\.png)"', text))
    files.add('Ace Trainer (male).png')
    return {f for f in files if not f.startswith('trainer-')}


def make_placeholder(out: Path, label: str = '?', size: tuple[int, int] = (64, 64), bg: str = '#36342F', fg: str = '#ECDEB7') -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    im = Image.new('RGBA', size, (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((2, 2, size[0]-2, size[1]-2), radius=max(6, size[0]//8), fill=bg, outline=fg, width=2)
    try:
        font = ImageFont.truetype(str(ROOT / 'src/assets/font/WinkySans.ttf'), max(12, size[0] // 4))
    except Exception:
        font = ImageFont.load_default()
    label = str(label)[:8]
    bbox = d.textbbox((0, 0), label, font=font)
    d.text(((size[0] - (bbox[2]-bbox[0]))/2, (size[1] - (bbox[3]-bbox[1]))/2), label, fill=fg, font=font)
    im.save(out)


def make_map(out: Path, title: str, accent: str) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    w, h = 1600, 960
    im = Image.new('RGB', (w, h), '#2f4f3a')
    d = ImageDraw.Draw(im)
    # Stylized land/water map backdrop; gameplay nodes are SVG overlays.
    d.rectangle((0, 0, w, h), fill='#315f75')
    d.ellipse((120, 80, 1180, 820), fill='#4b7d42', outline='#9fcb7a', width=8)
    d.ellipse((550, 150, 1480, 900), fill='#426f3c', outline='#9fcb7a', width=8)
    d.polygon([(170, 720), (360, 600), (520, 735), (430, 890), (210, 860)], fill='#3e6938')
    for x in range(120, 1500, 160):
        d.line((x, 140, x + 100, 820), fill='#6b8f5d', width=3)
    try:
        font = ImageFont.truetype(str(ROOT / 'src/assets/font/Megrim-Regular.ttf'), 82)
    except Exception:
        font = ImageFont.load_default()
    d.rounded_rectangle((40, 40, 520, 150), radius=24, fill='#252522', outline=accent, width=4)
    d.text((70, 60), title, fill='#ECDEB7', font=font)
    im.save(out)


def make_backgrounds() -> None:
    bg_dir = ROOT / 'src/assets/images/bg'
    bg_dir.mkdir(parents=True, exist_ok=True)
    for name, colors in {
        'main-bg.png': ('#252522', '#53617A'),
        'forest.png': ('#18351f', '#60BE58'),
    }.items():
        out = bg_dir / name
        if out.exists():
            continue
        im = Image.new('RGB', (960, 540), colors[0])
        d = ImageDraw.Draw(im)
        for i in range(0, 960, 80):
            d.polygon([(i, 540), (i+40, 260), (i+80, 540)], fill=colors[1])
        im.save(out)
    empty = bg_dir / 'empty.jpg'
    if not empty.exists():
        im = Image.new('RGB', (960, 540), '#111827')
        d = ImageDraw.Draw(im)
        for r in range(20, 700, 60):
            d.ellipse((480-r, 270-r, 480+r, 270+r), outline='#53617A', width=3)
        im.save(empty, quality=90)


def download_region_maps() -> None:
    """Télécharge les vraies cartes de régions (Pokéclicker / Poképédia),
    repli sur make_map() uniquement si le téléchargement échoue.
    Un fichier par entrée de REGION_MAP_FILES : aucune fusion
    (Alola = 4 îles séparées, Galar = Nord + Sud séparés — passe 6)."""
    maps_dir = ROOT / 'src/assets/images/maps'
    maps_dir.mkdir(parents=True, exist_ok=True)

    for filename, url in REGION_MAP_FILES.items():
        out = maps_dir / filename
        if out.exists():
            continue
        write_download(url, out)
        if not out.exists():
            region = out.stem.split('-')[0]
            make_map(out, region.upper(), REGION_ACCENTS.get(region, '#9CB071'))


def download_item_overrides() -> None:
    """Télécharge les sprites d'objets dont la source officielle est imposée
    (voir ITEM_OVERRIDES). Ne remplace jamais un fichier existant."""
    items_dir = ROOT / 'src/assets/images/items'
    items_dir.mkdir(parents=True, exist_ok=True)
    for name, url in ITEM_OVERRIDES.items():
        write_download(url, items_dir / name)


def download_backgrounds() -> None:
    """Backgrounds originaux depuis le dépôt PokeChill (ne remplace pas l'existant)."""
    bg_dir = ROOT / 'src/assets/images/bg'
    bg_dir.mkdir(parents=True, exist_ok=True)
    for name, url in BACKGROUNDS.items():
        write_download(url, bg_dir / name)


def make_unknown_item() -> None:
    """Sprite générique affiché quand une clé d'objet est inconnue."""
    out = ROOT / 'src/assets/images/items/unknown.png'
    if not out.exists():
        make_placeholder(out, '?', (64, 64))



def download_base_assets() -> None:
    """Bases secrètes — assets 2D Émeraude (pret/pokeemerald)."""
    import shutil
    import subprocess
    import sys

    py = sys.executable or 'python3'
    node = shutil.which('node')
    steps = [
        ('réparation RSE', [py, 'tools/repair-emerald-ref.py', '--force']),
        ('staging objgfx', [py, 'tools/fetch-objgfx.py']),
    ]
    if node:
        steps.append(('2D Émeraude fetch', [node, 'tools/fetch-base2d.mjs']))
    steps.extend([
        ('2D Émeraude décor fullsize', [py, 'tools/bake-emerald-bgs.py', '--bake-decor-all']),
        ('2D Émeraude canon', [py, 'tools/bake-emerald-bgs.py', '--bake-canon']),
        ('2D Émeraude layouts', [py, 'tools/bake-emerald-bgs.py', '--bake-layouts']),
        ('2D Émeraude custom', [py, 'tools/bake-emerald-bgs.py', '--bake-custom']),
        ('2D transparence', [py, 'tools/fix-emerald-alpha.py']),
    ])
    for label, cmd in steps:
        try:
            res = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=120)
            tail = (res.stdout.strip().splitlines() or [''])[-3:]
            print(f'base assets [{label}]: ' + ' | '.join(tail[-2:]))
        except Exception as exc:
            print(f'base assets [{label}]: ignoré ({exc})')


def main() -> None:
    started = time.time()
    jobs: list[tuple[str, Path, str]] = []

    for bucket, dex, out in parse_sprite_entries():
        jobs.append((pokemon_url(bucket, dex), out, f'pokemon {bucket} #{dex}'))

    for key, out in parse_item_entries():
        urls = item_urls(key)
        if urls:
            jobs.append((urls[0], out, f'item {key}'))

    for file in parse_trainer_files():
        encoded = urllib.parse.quote(file)
        jobs.append((f'{POKECLICKER_RAW}/npcs/{encoded}', ROOT / 'src/assets/images/trainers/npcs' / file, f'trainer {file}'))

    # Trainer profile icons used by save/staff UI.
    for i in range(0, 101):
        jobs.append((f'{POKECLICKER_RAW}/profile/trainer-{i}.png', ROOT / f'src/assets/images/trainers/profil/trainer-{i}.png', f'profile {i}'))

    ok = 0
    failed: list[tuple[str, Path, str]] = []
    with futures.ThreadPoolExecutor(max_workers=32) as pool:
        future_map = {pool.submit(write_download, url, out): (url, out, label) for url, out, label in jobs}
        for fut in futures.as_completed(future_map):
            url, out, label = future_map[fut]
            if fut.result():
                ok += 1
            else:
                failed.append((url, out, label))

    # Generated assets/fallbacks.
    for key, out in parse_item_entries():
        if not out.exists():
            if key.startswith('tm_'):
                typ = key[3:]
                make_placeholder(out, 'TM', (40, 40), TYPE_COLORS.get(typ, '#53617A'), '#ffffff')
            else:
                make_placeholder(out, key[:2].upper(), (40, 40), '#524f48')

    # Passe 50 (retour utilisateur « il manque tous les sprites des CT ») :
    # les VRAIES disquettes PokeChill sont téléchargées par
    # download_item_overrides() ci-dessous. On ne cuit donc un placeholder que
    # si le téléchargement a échoué — sinon la pastille grise gagnait la course
    # et write_download(), qui ne remplace jamais un fichier existant, ne
    # rapatriait plus jamais la vraie disquette.
    download_item_overrides()
    for typ, color in TYPE_COLORS.items():
        out = ROOT / f'src/assets/images/items/tm_{typ}.png'
        if not out.exists():
            make_placeholder(out, 'TM', (40, 40), color, '#ffffff')

    for _url, out, label in failed:
        if 'trainers/npcs' in str(out) and not out.exists():
            make_placeholder(out, label.split(' ', 1)[-1][:2].upper(), (72, 72), '#36342F')
        elif 'trainers/profil' in str(out) and not out.exists():
            make_placeholder(out, out.stem.split('-')[-1], (72, 72), '#53617A')

    download_region_maps()
    download_backgrounds()
    make_backgrounds()  # repli généré uniquement si un téléchargement a échoué
    download_item_overrides()  # (idempotent) sprites à source imposée
    make_unknown_item()
    download_base_assets()  # bases secrètes : 2D Émeraude (passe 33/34)
    for helper_script in ['tools/repair-fonts.py', 'tools/repair-tm-sprites.py', 'tools/fetch-item-sprites.py', 'tools/fix_missing_assets.py']:
        try:
            import subprocess, sys
            subprocess.run([sys.executable or 'python3', helper_script], cwd=ROOT, timeout=120)
        except Exception as e:
            print(f'{helper_script}: ignoré ({e})')

    existing = sum(1 for p in (ROOT / 'src/assets/images').rglob('*') if p.is_file())
    print(f'Downloaded/existing assets: {ok}/{len(jobs)} upstream jobs')
    print(f'Generated fallbacks/missing upstream: {len(failed)}')
    print(f'Total image assets present: {existing}')
    print(f'Done in {time.time() - started:.1f}s')


if __name__ == '__main__':
    main()

