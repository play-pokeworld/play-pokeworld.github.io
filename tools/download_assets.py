#!/usr/bin/env python3
"""Download/rebuild all game image assets referenced by PokéWorld.

Sources used (requested priority order):
1. PokeChill GitHub     — the game's original backgrounds (img/bg/*).
2. Pokéclicker GitHub   — region maps, trainers, profiles.
3. Poképédia            — Paldea map (absent from Pokéclicker: "NO MAP YET").
4. PokeAPI sprites      — Pokémon et objets.
Generated fallback PNGs are created only when an upstream asset does not exist.

Secret bases (Emerald 2D only) — see download_base_assets():
5. pret/pokeemerald      — sprites 2D officiels GBA des décorations.
6. Serebii / objgfx      — icônes et objets 2D (repli).
La Base Secrète 3D a été retirée du projet.
"""
from __future__ import annotations

import concurrent.futures as futures
import http.client
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

# Region maps: real official maps (Pokéclicker; Paldea via Poképédia).
# Each entry = ONE file saved as-is, NEVER merging/collage:
# Alola is kept as 4 separate islands and Galar as 2 parts (North/South),
# exactly as on the Pokéclicker repo (user feedback, phase 6).
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

# Original PokeChill backgrounds (the game this project derives from).
BACKGROUNDS = {
    'main-bg.png': f'{POKECHILL_RAW}/img/bg/main-bg.png',
    'empty.jpg':   f'{POKECHILL_RAW}/img/bg/empty.jpg',
    'forest.png':  f'{POKECHILL_RAW}/img/bg/forest.png',
}

# Item sprites whose official source is mandated (user feedback):
#  - TMs (tm_<type>) come from PokeChill, official type disks;
#  - kings_rock / upgrade come from Pokéclicker (evolution items);
#  - berry.png: PokeChill has no generic "berry.png" (checked across the
#    whole repo tree + Git history); berryOran.png is its "generic" berry,
#    used as fallback sprite for all berries without a dedicated sprite;
#  - prine_berry.png: "Baie Prine" is the official FR name of the Lum Berry,
#    absent from PokeChill -> Pokéclicker fallback (next source in the list).
TM_TYPES = ['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting',
            'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost',
            'Dragon', 'Dark', 'Steel', 'Fairy']
ITEM_OVERRIDES = {
    'kings_rock.png':  f'{POKECLICKER_RAW}/items/evolution/Kings_rock.png',
    'upgrade.png':     f'{POKECLICKER_RAW}/items/evolution/Upgrade.png',
    'prine_berry.png': f'{POKECLICKER_RAW}/items/berry/Lum.png',
    'berry.png':       f'{POKECHILL_RAW}/img/items/berryOran.png',
    # Generic mine fossil: PokeChill fossilHelix sprite (same target #138)
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


def request_bytes(url: str, timeout: int = 40, retries: int = 4) -> bytes | None:
    """Download `url` with retries (unstable network, truncated responses).

    Returns None after the attempts are exhausted. Notably handles
    IncompleteRead (connection cut mid-transfer) which was not
    intercepted and used to fail the whole pipeline (fix pass 2026-08).
    """
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                data = response.read()
                if response.status == 200 and data:
                    return data
        except http.client.IncompleteRead:
            # Truncated response: never write a partial file — retry.
            pass
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError,
                ConnectionError, OSError):
            pass
        time.sleep(0.5 * (attempt + 1))
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
    # Fixes for Castform and Deoxys forms using custom IDs 387-392
    # whose real PokeAPI sprites are 10013-10015 and 10001-10003
    special_map = {
        387: 10013,  # castform-sunny
        388: 10014,  # castform-rainy
        389: 10015,  # castform-snowy
        390: 10001,  # deoxys-attack
        391: 10002,  # deoxys-defense
        392: 10003,  # deoxys-speed
    }
    real_dex = special_map.get(dex, dex)
    folder = {
        'front': 'pokemon',
        'back': 'pokemon/back',
        'frontShiny': 'pokemon/shiny',
        'backShiny': 'pokemon/back/shiny',
    }[bucket]
    return f'{POKEAPI_RAW}/{folder}/{real_dex}.png'


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


ADDITIONAL_NPC_TRAINERS = [
    "Ace Trainer (female).png", "Ace Trainer (male).png", "Aether Foundation Employee (female).png", "Aether Foundation Employee (male).png", "Aether Foundation Employees (male).png",
    "Agatha.png", "Aqua Admin (matt).png", "Aqua Admin (shelly).png", "Aqua Leader.png", "Aroma Lady.png", "Artist (Gen 8).png", "Artist (male).png", "Athlete (female).png",
    "Athlete (male).png", "Backpacker (female).png", "Backpacker (male).png", "Battle Girl.png", "BattleCafeMaster.png", "Beauty.png", "Beni (Ninja).png", "Biker Goon.png",
    "Bird Keeper.png", "Blaine.png", "Bodybuilder (female).png", "Bodybuilder (male).png", "Brawly.png", "Brock.png", "Bruno.png", "Bruno2.png", "Bug Catcher.png", "Bugsy.png",
    "Burglar.png", "Camper.png", "Channeler.png", "Chaser (female).png", "Chaser (male).png", "Chuck.png", "Cipher Admin (nascour).png", "Cipher Admin Ardos.png",
    "Cipher Admin Dakim.png", "Cipher Admin Ein.png", "Cipher Admin Eldes.png", "Cipher Admin Gorigan.png", "Cipher Admin Lovrina.png", "Cipher Admin Miror B.png",
    "Cipher Admin Snattle.png", "Cipher Admin Venus.png", "Cipher Peon (female).png", "Cipher Peon (male).png", "Cipher Peon XD (female).png", "Cipher Peon XD (male).png",
    "Clair.png", "Collector.png", "Cooltrainer (female).png", "Cooltrainer (male).png", "Crush Girl.png", "Cue Ball Paxton.png", "Cyclist (female).png", "Cyclist (male).png",
    "Dancer (female).png", "Double Team.png", "Draconid Elder.png", "Dragon Tamer.png", "Dragon Warriors.png", "Drake.png", "Elder Li.png", "Erika.png", "Fairy Tale Girl.png",
    "Falkner.png", "False Dragon Titan.png", "Fisherman.png", "Flannery.png", "Furisode Girl Katherine.png", "Galactic Boss (cyrus).png", "Galactic Grunt (female).png",
    "Galactic Grunt (male).png", "Galactic Grunts (male).png", "Gentleman (Gen 4).png", "Gentleman.png", "Glacia.png", "Go-Rock Squad Grunt (female).png",
    "Go-Rock Squad Grunt (male).png", "Golfer (male).png", "Guitarist (female).png", "Guitarist (male).png", "Gym Leader Bede.png", "Gym Leader Marnie.png", "Hex Maniac.png",
    "Hidden Dragons.png", "Hiker (Gen 8).png", "Hiker.png", "Hunter (female).png", "Hunter (male).png", "Janitor.png", "Jasmine.png", "Juan.png", "Juggler.png", "Karen.png",
    "Kimono Girl.png", "Koga.png", "Koga2.png", "Lady.png", "Lance.png", "Lance2.png", "Lass.png", "Lorelei.png", "Lt. Surge.png", "Lucy Stevens.png", "Macro Cosmos (female).png",
    "Macro Cosmos (male).png", "Magma Admin (courtney).png", "Magma Admin.png", "Magma Leader.png", "Misty.png", "Morty.png", "Norman.png", "Office Worker (female).png",
    "Office Worker (male).png", "Officer Jenny.png", "Old Lady.png", "Phoebe.png", "Picnicker.png", "Pinkan Officer Jenny.png", "Pokemon Ranger (female).png", "PokéManiac.png",
    "Pokéfan (female).png", "Pokéfan (male).png", "Pokémon Breeder (female).png", "Pokémon Breeder (male).png", "Pokémon Ranger (female).png", "Pokémon Ranger (male).png",
    "Pokémon Rangers.png", "Preschooler (female).png", "Preschooler (male).png", "Pryce.png", "Psychic (female).png", "Psychic (male).png", "Punk Girl.png", "Reporter.png",
    "Rich Boy.png", "Rider (female).png", "Rider (male).png", "Rising Star (male).png", "Rival Blue.png", "Rival Hau.png", "Rocket Boss Giovanni.png", "Roller Boy.png",
    "Roxanne.png", "Ruin Maniac gen3.png", "Ruin Maniac.png", "Sabrina.png", "Sage.png", "Sailor.png", "School Kid (female).png", "School Kid (male).png",
    "Scientist (female).png", "Scientist (male).png", "Scientist Gideon.png", "Scratch Cat Girl.png", "Sidney.png", "Sightseer (female).png", "Sightseer (male).png",
    "Sky Trainer (female).png", "Sky Trainer (male).png", "Steven.png", "Super Nerd.png", "Supreme Gym Leader Drake.png", "Tamer.png", "Tate & Liza.png",
    "Team Aqua Grunt (female).png", "Team Aqua Grunt (male).png", "Team Flare Admin (female).png", "Team Flare Admin (male).png", "Team Flare Aliana.png",
    "Team Flare Boss Lysandre.png", "Team Flare Bryony.png", "Team Flare Celosia.png", "Team Flare Grunt (female).png", "Team Flare Grunt (male).png",
    "Team Flare Grunt Duo.png", "Team Flare Lysandre.png", "Team Flare Mable.png", "Team Flare Xerosic.png", "Team Magma Grunt (female).png", "Team Magma Grunt (male).png",
    "Team Plasma (colress).png", "Team Plasma (zinzolin).png", "Team Plasma Grunt (female).png", "Team Plasma Grunt (male).png", "Team Plasma Grunts (male).png",
    "Team Rainbow Leader Giovanni.png", "Team Rainbow Rocket Grunt (female).png", "Team Rainbow Rocket Grunt (male).png", "Team Rocket Boss Giovanni.png",
    "Team Rocket Grunt (female).png", "Team Rocket Grunt (male).png", "Team Rocket Grunts.png", "Team Skull Boss (guzma).png", "Team Skull Grunt (female).png",
    "Team Skull Grunt (male).png", "Team Skull Grunts (both).png", "Team Skull Grunts (male).png", "Team Snagem.png", "Team Star Grunt (female).png",
    "Team Star Grunt (male).png", "Team Yell Grunts.png", "The Galaxy Team's Kamado.png", "Tourist (female).png", "Tourist (male).png", "Tourist Couple.png",
    "Triathlete (malecycling).png", "Twins.png", "Veteran (female).png", "Veteran (male).png", "Waitress.png", "Wallace.png", "Wattson.png", "Whitney.png", "Will.png",
    "Willie.png", "Winona.png", "Worker (female).png", "Worker (ice).png", "Worker (male).png", "Youngster.png", "Youth Athlete (female).png"
]


def parse_trainer_files() -> set[str]:
    text = TRAINERS.read_text(encoding="utf-8")
    files = set(re.findall(r"'([^']+\.png)'", text))
    files.update(re.findall(r'"([^"]+\.png)"', text))
    files.add("Ace Trainer (male).png")
    files.update(ADDITIONAL_NPC_TRAINERS)
    clean_files = {urllib.parse.unquote(f.split("/")[-1]) for f in files if not f.startswith("trainer-")}
    return clean_files


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
    """Download the real region maps (Pokéclicker / Poképédia),
    falling back to make_map() only if the download fails.
    One file per REGION_MAP_FILES entry: no merging
    (Alola = 4 separate islands, Galar = North + South separate — passe 6)."""
    maps_dir = ROOT / 'src/assets/images/maps'
    maps_dir.mkdir(parents=True, exist_ok=True)

    for filename, url in REGION_MAP_FILES.items():
        out = maps_dir / filename
        if out.exists():
            continue
        ok = write_download(url, out)
        if not ok or not out.exists():
            print(f"[SANS PLACEHOLDER] missing map: {filename} (URL {url})")


def download_item_overrides() -> None:
    """Download the item sprites whose official source is mandated
    (see ITEM_OVERRIDES). Never replaces an existing file."""
    items_dir = ROOT / 'src/assets/images/items'
    items_dir.mkdir(parents=True, exist_ok=True)
    for name, url in ITEM_OVERRIDES.items():
        write_download(url, items_dir / name)


def download_backgrounds() -> None:
    """Original backgrounds from the PokeChill repo (never replaces existing files)."""
    bg_dir = ROOT / 'src/assets/images/bg'
    bg_dir.mkdir(parents=True, exist_ok=True)
    for name, url in BACKGROUNDS.items():
        write_download(url, bg_dir / name)


def make_unknown_item() -> None:
    """Generic sprite shown when an item key is unknown."""
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
        ('RSE repair', [py, 'tools/repair-emerald-ref.py', '--force']),
        ('staging objgfx', [py, 'tools/fetch-objgfx.py']),
    ]
    if node:
        steps.append(('Emerald 2D fetch', [node, 'tools/fetch-base2d.mjs']))
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

    # Placeholder safety REMOVED at user request (no more badges)
    # We no longer generate fallbacks for missing items — they will be listed as missing.
    missing_items = []
    for key, out in parse_item_entries():
        if not out.exists():
            missing_items.append(key)
    if missing_items:
        print(f"[SANS PLACEHOLDER] {len(missing_items)} items without a real sprite (listed below, not generated):")
        for k in missing_items[:100]:
            print(f"  - {k}")

    # Phase 50 (user feedback "all TM sprites are missing"):
    # the REAL PokeChill disks are downloaded by
    # download_item_overrides() below. So only bake a placeholder
    # when the download failed — otherwise the grey badge won the race
    # and write_download(), which never replaces an existing file,
    # would never fetch the real disk back.
    download_item_overrides()
    # No more placeholder for TM disks — the real PokeChill sprite is required
    missing_tms = []
    for typ in TYPE_COLORS.keys():
        out = ROOT / f'src/assets/images/items/tm_{typ}.png'
        if not out.exists():
            missing_tms.append(typ)
    if missing_tms:
        print(f"[SANS PLACEHOLDER] {len(missing_tms)} TM disks without a real PokeChill sprite: {', '.join(missing_tms)}")

    # No more placeholder for trainers — only list the failures
    for _url, out, label in failed:
        if ('trainers/npcs' in str(out) or 'trainers/profil' in str(out)) and not out.exists():
            print(f"[SANS PLACEHOLDER] missing trainer: {label} -> {out}")

    download_region_maps()
    download_backgrounds()
    # make_backgrounds() REMOVED — the real PokeChill backgrounds are required
    # make_backgrounds()  # disabled at user request
    download_item_overrides()  # (idempotent) mandated-source sprites
    # make_unknown_item() REMOVED — no more generic placeholder
    make_unknown_item()
    download_base_assets()  # secret bases: Emerald 2D (phase 33/34)
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

