#!/usr/bin/env python3
"""Passe 46 — REPAIR of the `src/assets/font/*.ttf` fonts.

Symptom reported by the user (browser console):
    Failed to decode downloaded font: .../WinkySans.ttf
    OTS parsing error: GDEF: table length exceeds 1GB

Cause: like all project binaries, the .ttf files went through the text
archive (code2prompt) and were re-encoded as UTF-8. The `00010000` magic
at the start survives — hence the illusion of a valid file — but the TABLE
DIRECTORY is destroyed: 13 tables broken out of 15 in Megrim, 15 out of 17
in WinkySans (absurd offsets/lengths, hence OTS's "exceeds 1GB").

This script downloads both fonts again from Google Fonts (their original
source) and VALIDATES the structure before writing: correct sfnt magic +
every table fully contained in the file.

Idempotent: an already valid font is not downloaded again (unless `--force`).
Usage: python3 tools/repair-fonts.py [--force]
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
# NB: DELIBERATELY non-browser User-Agent. The Google Fonts CSS2 API
# negotiates the format per client: woff2 for a modern browser, and an
# extension-less /l/font URL for a very old MSIE. A neutral curl-like UA
# is the only one returning a real `.ttf` URL — the format shipped here.
UA = 'curl/7.68.0'

# shipped file -> Google Fonts family
FAMILIES = {
    'Megrim-Regular.ttf': 'Megrim',
    'WinkySans.ttf': 'Winky Sans',
}


def font_is_valid(data: bytes) -> bool:
    """True if the sfnt is coherent: known magic + all tables fit
    in the file (exactly what OTS checks in the browser)."""
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
    """The Google Fonts CSS2 API returns the direct .ttf URL when the
    client presents itself without woff2 support (generic User-Agent)."""
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
    print(f'fonts: {len(fixed)} repaired, {len(ok)} already valid, {len(failed)} failure(s)')
    for f in fixed:
        print('  ✔', f)
    for f in failed:
        print('  ✖', f)
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())

