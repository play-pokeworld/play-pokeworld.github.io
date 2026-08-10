#!/usr/bin/env python3
"""Passe 45 — (re)staging of the GBA object sprites `tools/emerald-ref/objgfx/`.

`sources.json` describes 45 official sprites (dolls, cushions…) from the
pret/pokeemerald repo; the PNGs themselves are BINARIES, hence absent from
the project's text archive. Without them, `bake-emerald-bgs.py --bake-objgfx`
produces nothing and the 2D manifest loses 45 slugs.

Idempotent: an already valid PNG is not downloaded again (unless `--force`).
Usage: python3 tools/fetch-objgfx.py [--force]
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
    print(f'objgfx: {got} downloaded, {skip} already present, {err} failure(s)')
    for m in missing:
        print('  ✖', m)
    return 1 if err else 0


if __name__ == '__main__':
    raise SystemExit(main())
