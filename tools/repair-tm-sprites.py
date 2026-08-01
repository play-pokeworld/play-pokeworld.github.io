#!/usr/bin/env python3
"""Passe 50 — RÉPARATION des disquettes de CT/CS (`tm_<type>.png`).

Symptôme signalé : « il manque toujours tous les sprites des CT, ils sont
trouvables sur le GitHub de PokeChill ».

Cause : `download_assets.py` connaît bien les bonnes URL PokeChill
(`img/items/tm<Type>.png`) mais `write_download()` NE REMPLACE JAMAIS un
fichier existant. Or `main()` cuit d'abord des pastilles « TM » grises en
repli (`make_placeholder`) : au premier passage, les placeholders gagnaient la
course et les vraies disquettes n'étaient plus jamais téléchargées.

Ce script force le rapatriement des 18 disquettes officielles PokeChill et
REMPLACE tout placeholder détecté (pastille grise 40×40 sans transparence
utile). Il vérifie aussi que chaque URL source répond, et signale celles qui
seraient devenues invalides.

Idempotent : une vraie disquette déjà en place n'est pas retéléchargée.
Usage : python3 tools/repair-tm-sprites.py [--force] [--check-only]
"""
from __future__ import annotations

import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/assets/images/items'
UA = 'PokeWorldAssetDownloader/1.0 (+tm sprites)'
POKECHILL = 'https://raw.githubusercontent.com/play-pokechill/play-pokechill.github.io/main'

TM_TYPES = ['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting',
            'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost',
            'Dragon', 'Dark', 'Steel', 'Fairy']


def fetch(url: str) -> bytes | None:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            data = r.read()
            if r.status == 200 and len(data) > 80 and data[:8] == b'\x89PNG\r\n\x1a\n':
                return data
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return None
    return None


def is_placeholder(path: Path) -> bool:
    """Pastille générée par make_placeholder() : 40×40, très peu de couleurs
    (fond uni + texte), aucune rondeur de disque. Les vraies disquettes
    PokeChill font 32×32 et sont bien plus riches."""
    if not path.exists():
        return True
    try:
        from PIL import Image
        im = Image.open(path).convert('RGBA')
    except Exception:
        return True
    if im.size == (40, 40):
        return True
    colors = {px for px in im.getdata() if px[3] > 0}
    return len(colors) <= 6


def main() -> int:
    force = '--force' in sys.argv
    check = '--check-only' in sys.argv
    got = kept = failed = 0
    bad_urls = []
    for ty in TM_TYPES:
        dest = OUT / f'tm_{ty.lower()}.png'
        url = f'{POKECHILL}/img/items/tm{ty}.png'
        if not force and not is_placeholder(dest):
            kept += 1
            continue
        data = fetch(url)
        if not data:
            failed += 1
            bad_urls.append(url)
            continue
        if check:
            got += 1
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        got += 1
    verb = 'disponibles' if check else 'téléchargées'
    print(f'disquettes CT/CS : {got} {verb} · {kept} déjà correctes · {failed} échec(s)')
    for u in bad_urls:
        print('  ✖ URL invalide :', u)
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
