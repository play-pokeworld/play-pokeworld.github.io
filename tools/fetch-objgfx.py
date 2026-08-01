#!/usr/bin/env python3
"""Passe 45 — (re)staging des sprites d'objets GBA `tools/emerald-ref/objgfx/`.

`sources.json` décrit 45 sprites officiels (poupées, coussins…) du dépôt
pret/pokeemerald ; les PNG eux-mêmes sont des BINAIRES, donc absents de
l'archive texte du projet. Sans eux, `bake-emerald-bgs.py --bake-objgfx` ne
produit rien et le manifeste 2D perd 45 slugs.

Idempotent : un PNG déjà valide n'est pas retéléchargé (sauf `--force`).
Usage : python3 tools/fetch-objgfx.py [--force]
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / 'tools' / 'emerald-ref' / 'objgfx'
UA = 'PokeWorldAssetDownloader/1.0 (+objgfx staging)'


def fetch(url: str) -> bytes | None:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read() if r.status == 200 else None
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return None


def main() -> int:
    force = '--force' in sys.argv
    cfg = json.loads((STAGE / 'sources.json').read_text(encoding='utf-8'))
    base, files = cfg['base'], cfg['files']
    got = skip = err = 0
    missing: list[str] = []
    for slug, rel in files.items():
        dest = STAGE / f'{slug}.png'
        if not force and dest.exists() and dest.read_bytes()[:8] == b'\x89PNG\r\n\x1a\n':
            skip += 1
            continue
        data = fetch(base + rel)
        if not data or data[:8] != b'\x89PNG\r\n\x1a\n':
            err += 1
            missing.append(slug)
            continue
        dest.write_bytes(data)
        got += 1
    print(f'objgfx : {got} téléchargé(s), {skip} déjà présent(s), {err} échec(s)')
    for m in missing:
        print('  ✖', m)
    return 1 if err else 0


if __name__ == '__main__':
    raise SystemExit(main())
