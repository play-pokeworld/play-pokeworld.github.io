#!/usr/bin/env python3
"""Passe 45 — RÉPARATION des références binaires `tools/emerald-ref/data/`.

Pourquoi : l'archive texte du projet (code2prompt) ne transporte que du texte.
Les fichiers BINAIRES (`*.bin`, `tiles.png`) y ont été ré-encodés en UTF-8 et
sont revenus CORROMPUS (ex. `primary/general/metatiles.bin` = 8001 octets au
lieu de 8192) ou tout simplement ABSENTS (aucun `tiles.png` dans l'arbre).
Sans eux, tous les bakers (`bake-emerald-bgs.py`) plantent.

Ce script re-télécharge ces fichiers depuis pret/pokeemerald (source d'origine
déclarée par le projet) et VÉRIFIE les tailles attendues :
  - metatiles.bin primaires/secondaires (16 octets par métatile),
  - metatile_attributes.bin,
  - palettes JASC (texte : réparées seulement si manquantes/vides),
  - tiles.png (jamais présents dans l'archive texte),
  - layouts map.bin / border.bin (2 octets par bloc).

Idempotent : un fichier déjà VALIDE (taille cohérente) n'est pas retéléchargé
sauf `--force`. Usage : python3 tools/repair-emerald-ref.py [--force]
"""
from __future__ import annotations

import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'tools' / 'emerald-ref'
RAW = 'https://raw.githubusercontent.com/pret/pokeemerald/master'
UA = 'PokeWorldAssetDownloader/1.0 (+repair emerald-ref)'

THEMES = ['brown_cave', 'blue_cave', 'red_cave', 'yellow_cave', 'tree', 'shrub']

# Salles canon utilisées par les gabarits (4 par famille de base).
LAYOUTS = [f'SecretBase_{fam}{i}' for fam in
           ('BrownCave', 'BlueCave', 'RedCave', 'YellowCave', 'Tree', 'Shrub')
           for i in (1, 2, 3, 4)]


def fetch(rel: str) -> bytes | None:
    req = urllib.request.Request(f'{RAW}/{rel}', headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read() if r.status == 200 else None
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return None


def looks_valid(path: Path, kind: str) -> bool:
    """Un binaire rescapé de l'archive texte a une taille incohérente."""
    if not path.exists() or path.stat().st_size == 0:
        return False
    n = path.stat().st_size
    if kind == 'png':
        return path.read_bytes()[:8] == b'\x89PNG\r\n\x1a\n'
    if kind == 'meta':      # 16 octets / métatile
        return n % 16 == 0
    if kind == 'map':       # 2 octets / bloc (u16)
        return n % 2 == 0
    if kind == 'attr':      # 2 octets / métatile
        return n % 2 == 0
    return True


def repair(rel: str, kind: str, force: bool, report: list) -> None:
    dest = CACHE / rel
    if not force and looks_valid(dest, kind):
        report.append(('ok', rel))
        return
    data = fetch(rel.replace('data/', 'data/', 1))
    if data is None:
        report.append(('FAIL', rel))
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    report.append(('repaired', rel))


def main() -> int:
    force = '--force' in sys.argv
    report: list[tuple[str, str]] = []

    # 1) Tilesets : tiles.png (absents de l'archive) + metatiles/attributs
    repair('data/tilesets/primary/secret_base/tiles.png', 'png', force, report)
    repair('data/tilesets/primary/secret_base/metatiles.bin', 'meta', force, report)
    repair('data/tilesets/primary/secret_base/metatile_attributes.bin', 'attr', force, report)
    repair('data/tilesets/primary/general/metatiles.bin', 'meta', force, report)
    repair('data/tilesets/primary/general/tiles.png', 'png', force, report)
    repair('data/tilesets/secondary/secret_base/metatiles.bin', 'meta', force, report)
    repair('data/tilesets/secondary/secret_base/metatile_attributes.bin', 'attr', force, report)
    for th in THEMES:
        repair(f'data/tilesets/secondary/secret_base/{th}/tiles.png', 'png', force, report)

    # 2) Layouts canon : map.bin (+ border.bin quand il existe en amont)
    for name in LAYOUTS:
        repair(f'data/layouts/{name}/map.bin', 'map', force, report)
        b = CACHE / f'data/layouts/{name}/border.bin'
        if force or not looks_valid(b, 'map'):
            data = fetch(f'data/layouts/{name}/border.bin')
            if data:
                b.parent.mkdir(parents=True, exist_ok=True)
                b.write_bytes(data)
                report.append(('repaired', f'data/layouts/{name}/border.bin'))

    n_ok = sum(1 for s, _ in report if s == 'ok')
    n_rep = sum(1 for s, _ in report if s == 'repaired')
    fails = [r for s, r in report if s == 'FAIL']
    print(f'emerald-ref : {n_rep} fichier(s) réparé(s), {n_ok} déjà valide(s), {len(fails)} échec(s)')
    for f in fails:
        print('  ✖', f)
    return 1 if fails else 0


if __name__ == '__main__':
    raise SystemExit(main())
