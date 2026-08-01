#!/usr/bin/env python3
# ============================================================================
# OUTIL — Transparence des sprites Émeraude (src/assets/images/secret-base/emerald/*.png)
# ----------------------------------------------------------------------------
# Les PNG du désassemblage pret/pokeemerald sont en palette SANS chunk tRNS :
# le fond est un vert GBA opaque (~ (98,197,98) / (115,197,164)) qui s'affiche
# en carré derrière chaque sprite dans les renderers 2D et 3D (billboards).
# Correctif idempotent : couleur du pixel (0,0) → alpha 0 (les sprites GBA
# n'ont pas d'anti-aliasing, l'égalité exacte est sûre ; le coin (0,0) est du
# fond sur toutes les planches de décorations/poupées/coussins).
# Appelé par download_assets.py après fetch-base2d.mjs ; peut être relancé
# tel quel (déjà transparents → aucun effet).
# ============================================================================
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'emerald')

def main():
    try:
        from PIL import Image
    except ImportError:
        print('fix-emerald-alpha: PIL indisponible, étape ignorée (réseau/assets non bloquants)')
        return 0
    if not os.path.isdir(DIR):
        return 0
    fixed = skipped = 0
    for f in sorted(os.listdir(DIR)):
        if not f.endswith('.png'):
            continue
        p = os.path.join(DIR, f)
        im = Image.open(p)
        if 'transparency' in im.info:
            skipped += 1
            continue
        rgba = im.convert('RGBA')
        datas = rgba.getdata()
        if any(a < 255 for *_, a in datas):
            skipped += 1
            continue
        bg = rgba.getpixel((0, 0))[:3]
        out = [(r, g, b, 0 if (r, g, b) == bg else a) for r, g, b, a in datas]
        rgba.putdata(out)
        rgba.save(p)
        fixed += 1
    print(f'fix-emerald-alpha: {fixed} sprite(s) transparent-ifié(s), {skipped} déjà OK')
    return 0

if __name__ == '__main__':
    sys.exit(main())

