#!/usr/bin/env python3
"""Passe 46 — RÉPARATION des polices `src/assets/font/*.ttf`.

Symptôme signalé par l'utilisateur (console du navigateur) :
    Failed to decode downloaded font: .../WinkySans.ttf
    OTS parsing error: GDEF: table length exceeds 1GB

Cause : comme tous les binaires du projet, les .ttf ont traversé l'archive
texte (code2prompt) et ont été ré-encodés en UTF-8. Le magic `00010000` en
tête survit — d'où l'illusion d'un fichier valide — mais le RÉPERTOIRE DE
TABLES est détruit : 13 tables cassées sur 15 dans Megrim, 15 sur 17 dans
WinkySans (offsets/longueurs aberrants, d'où le « exceeds 1GB » d'OTS).

Ce script re-télécharge les deux polices depuis Google Fonts (leur source
d'origine) et VALIDE la structure avant d'écrire : magic sfnt correct + chaque
table entièrement contenue dans le fichier.

Idempotent : une police déjà valide n'est pas retéléchargée (sauf `--force`).
Usage : python3 tools/repair-fonts.py [--force]
"""
from __future__ import annotations

import re
import struct
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONTS = ROOT / 'src' / 'assets' / 'font'
# NB : User-Agent VOLONTAIREMENT non-navigateur. L'API CSS2 de Google Fonts
# négocie le format selon le client : woff2 pour un navigateur moderne, et une
# URL /l/font sans extension pour un très vieux MSIE. Un UA neutre type curl
# est le seul qui renvoie une vraie URL `.ttf` — le format livré ici.
UA = 'curl/7.68.0'

# fichier livré -> famille Google Fonts
FAMILIES = {
    'Megrim-Regular.ttf': 'Megrim',
    'WinkySans.ttf': 'Winky Sans',
}


def font_is_valid(data: bytes) -> bool:
    """Vrai si le sfnt est cohérent : magic connu + toutes les tables tiennent
    dans le fichier (c'est exactement ce que vérifie OTS côté navigateur)."""
    if len(data) < 12:
        return False
    if data[:4] not in (b'\x00\x01\x00\x00', b'OTTO', b'true', b'ttcf'):
        return False
    try:
        num = struct.unpack('>H', data[4:6])[0]
    except struct.error:
        return False
    if not 1 <= num <= 512 or 12 + num * 16 > len(data):
        return False
    for i in range(num):
        off = 12 + i * 16
        tag = data[off:off + 4]
        t_off, t_len = struct.unpack('>II', data[off + 8:off + 16])
        if not re.fullmatch(rb'[ -~]{4}', tag):
            return False
        if t_off + t_len > len(data):
            return False
    return True


def get(url: str) -> bytes | None:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read() if r.status == 200 else None
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return None


def ttf_url(family: str) -> str | None:
    """L'API CSS2 de Google Fonts renvoie l'URL directe du .ttf quand on se
    présente sans support woff2 (User-Agent générique)."""
    css = get('https://fonts.googleapis.com/css2?family='
              + urllib.parse.quote(family) + '&display=swap')
    if not css:
        return None
    m = re.search(r'src:\s*url\((https://[^)]+\.ttf)\)', css.decode('utf-8', 'ignore'))
    return m.group(1) if m else None


def main() -> int:
    force = '--force' in sys.argv
    fixed, ok, failed = [], [], []
    for name, family in FAMILIES.items():
        dest = FONTS / name
        if not force and dest.exists() and font_is_valid(dest.read_bytes()):
            ok.append(name)
            continue
        url = ttf_url(family)
        data = get(url) if url else None
        if not data or not font_is_valid(data):
            failed.append(name)
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        fixed.append(f'{name} ({len(data)} o.)')
    print(f'polices : {len(fixed)} réparée(s), {len(ok)} déjà valide(s), {len(failed)} échec(s)')
    for f in fixed:
        print('  ✔', f)
    for f in failed:
        print('  ✖', f)
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
