#!/usr/bin/env python3
from __future__ import annotations

import re
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEXT_EXT = {'.html', '.js', '.css'}
# Phase 45: `tests/` is excluded from the asset inventory. Tests cite
# paths to verify they NO LONGER EXIST (ORAS staging purged in phase 42):
# counting them as "references" produced false missing-asset reports.
IGNORE_DIRS = {'node_modules', 'dist', '.git', 'tests'}

hardcoded = []
inline_style = []
asset_refs = set()
missing_assets = []

for path in ROOT.rglob('*'):
    if not path.is_file() or path.suffix not in TEXT_EXT:
        continue
    if any(part in IGNORE_DIRS for part in path.parts):
        continue
    rel = path.relative_to(ROOT)
    text = path.read_text(encoding='utf-8', errors='ignore')
    for i, line in enumerate(text.splitlines(), 1):
        if 'style="' in line or "style='" in line or 'data-style=' in line or 'data-inline-css=' in line:
            inline_style.append((str(rel), i, line.strip()[:160]))
        if path.suffix in {'.js', '.html'}:
            if re.search(r'>[^<>{}\n]{3,}<', line) and 'data-i18n' not in line:
                hardcoded.append((str(rel), i, line.strip()[:160]))
    for m in re.findall(r"src/assets/images/[^'\"`) ;\n]+", text):
        if '${' not in m and not m.endswith('/') and not m.endswith('_'):
            asset_refs.add(m)

# Dynamic references invisible to static analysis: region maps
# (spriteUrl.map(region)) and the generic sprite of unknown items.
# Phase 6: Alola and Galar are saved as SEPARATE PARTS (Pokéclicker
# names), never merged — the audit checks each part.
for region in ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'paldea']:
    asset_refs.add(f'src/assets/images/maps/{region}.png')
for part in ['galar-north', 'galar-south',
             'alola-melemele', 'alola-akala', 'alola-ulaula', 'alola-poni']:
    asset_refs.add(f'src/assets/images/maps/{part}.png')
asset_refs.add('src/assets/images/items/unknown.png')

for ref in sorted(asset_refs):
    # Paths written in the code may be PERCENT-ENCODED (trainer names
    # with spaces/parentheses: "Ace%20Trainer%20%28male%29.png").
    # Test the raw path AND its decoded form before reporting missing.
    if (ROOT / ref).exists():
        continue
    if (ROOT / urllib.parse.unquote(ref)).exists():
        continue
    missing_assets.append(ref)

print('PokéWorld audit')
print('==============')
print(f'Image references: {len(asset_refs)}')
print(f'Missing image references: {len(missing_assets)}')
print(f'Inline/data styles still present: {len(inline_style)}')
print(f'Potential hardcoded static DOM strings: {len(hardcoded)}')
if missing_assets:
    print('\nMissing assets:')
    for ref in missing_assets[:50]:
        print(' -', ref)
print('\nNotes:')
print('- Remaining inline styles are mostly legacy runtime sizing/progress values; file-postboot sanitizes data-style/data-inline-css at runtime.')
print('- Remaining hardcoded strings are candidates for future full localization; static shell bindings now cover the main menu, settings, debug and summary UI.')


