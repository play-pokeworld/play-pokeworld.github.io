#!/usr/bin/env python3
# ============================================================================
# TOOL — Transparency of Emerald sprites (src/assets/images/secret-base/emerald/*.png)
# ----------------------------------------------------------------------------
# PNGs from the pret/pokeemerald decompilation use a palette WITHOUT a tRNS chunk:
# the background is an opaque GBA green (~ (98,197,98) / (115,197,164)) shown
# as a square behind each sprite in the 2D and 3D renderers (billboards).
# Idempotent fix: color of pixel (0,0) -> alpha 0 (GBA sprites have no
# anti-aliasing; exact equality is safe; the (0,0) corner is background on
# all decoration/doll/cushion sheets).
# Called by download_assets.py after fetch-base2d.mjs; can be re-run
# as-is (already transparent -> no effect).
# ============================================================================
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'emerald')

def main():
    try:
        from PIL import Image
    except ImportError:
        print('fix-emerald-alpha: PIL unavailable, step skipped (network/assets non-blocking)')
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
    print(f'fix-emerald-alpha: {fixed} sprite(s) transparent-ified, {skipped} already OK')
    return 0

if __name__ == '__main__':
    sys.exit(main())

