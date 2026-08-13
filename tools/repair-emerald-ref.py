#!/usr/bin/env python3
"""Passe 45 — REPAIR of the binary references `tools/emerald-ref/data/`.

Why: the project's text archive (code2prompt) only carries text.
The BINARY files (`*.bin`, `tiles.png`) were re-encoded as UTF-8 there and
came back CORRUPTED (e.g. `primary/general/metatiles.bin` = 8001 bytes
instead of 8192) or simply ABSENT (no `tiles.png` in the tree).
Without them, all the bakers (`bake-emerald-bgs.py`) crash.

This script downloads those files again from pret/pokeemerald (the original
source declared by the project) and CHECKS the expected sizes:
  - primary/secondary metatiles.bin (16 bytes per metatile),
  - metatile_attributes.bin,
  - JASC palettes (text: repaired only if missing/empty),
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

# Canon rooms used by the layouts (4 per base family).
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
    """A binary that survived the text archive has an incoherent size."""
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

    # 1) Tilesets: tiles.png (missing from the archive) + metatiles/attributes
    repair('data/tilesets/primary/secret_base/tiles.png', 'png', force, report)
    repair('data/tilesets/primary/secret_base/metatiles.bin', 'meta', force, report)
    repair('data/tilesets/primary/secret_base/metatile_attributes.bin', 'attr', force, report)
    repair('data/tilesets/primary/general/metatiles.bin', 'meta', force, report)
    repair('data/tilesets/primary/general/tiles.png', 'png', force, report)
    repair('data/tilesets/secondary/secret_base/metatiles.bin', 'meta', force, report)
    repair('data/tilesets/secondary/secret_base/metatile_attributes.bin', 'attr', force, report)
    for th in THEMES:
        repair(f'data/tilesets/secondary/secret_base/{th}/tiles.png', 'png', force, report)

    # 2) Canon layouts: map.bin (+ border.bin when available upstream)
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
    print(f'emerald-ref: {n_rep} file(s) repaired, {n_ok} already valid, {len(fails)} failure(s)')
    for f in fails:
        print('  ✖', f)
    return 1 if fails else 0


if __name__ == '__main__':
    raise SystemExit(main())

