#!/usr/bin/env python3
"""PASSE 38c — Régénère les tuiles de donjon en monochrome NOIR (glyphes).

Retour joueur :
  - « les combats doivent afficher le logo de pokéball VIDE » ;
  - « le logo boss, la pokéball et le coffre doivent avoir la même couleur
     (régénérer le sprite du coffre et de l'échelle en noir et blanc pour
     leur appliquer une couleur CSS) ».

Les 4 tuiles deviennent des GLYPHES NOIRS sur fond transparent (alpha
conservé) : la couleur est appliquée en CSS par masque (`mask-image` +
`background-color: currentColor`), une teinte partagée pour boss/pokéball/
coffre, une teinte propre pour l'échelle.

  · encounter.png → POKÉBALL VIDE (contour) dessinée à la main : le logo des
    cases de combat.
  · boss.png / chest.png / ladder.png → conversion des silhouettes d'origine
    Pokéclicker en noir pur (RGB → 0), alpha inchangé.
"""
from __future__ import annotations

import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DUNGEON_DIR = ROOT / 'src/assets/images/dungeon'


def _black_glyph(src: Path, out: Path) -> None:
    """Convertis une image en glyphe noir : RGB → 0, alpha conservé."""
    from PIL import Image
    im = Image.open(src).convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (0, 0, 0, a)
    im.save(out)
    print(f'  glyphe noir : {out.name}')


def _draw_empty_pokeball(out: Path) -> None:
    """Dessine le LOGO « pokéball vide » (contour) en noir sur transparent."""
    from PIL import Image, ImageDraw

    W, H = 70, 71
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy, r = 35, 35, 30
    lw = 5
    # anneau extérieur
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(0, 0, 0, 255), width=lw)
    # bande médiane (ligne de fermeture)
    d.line((cx - r, cy, cx + r, cy), fill=(0, 0, 0, 255), width=lw)
    # bouton supérieur
    d.ellipse((cx - 8, cy - r - 8, cx + 8, cy - r + 8), outline=(0, 0, 0, 255), width=4)
    im.save(out)
    print(f'  pokéball vide : {out.name}')


def regenerate_dungeon_tiles() -> None:
    """Régénère les 4 tuiles dans l'état final attendu par le jeu."""
    DUNGEON_DIR.mkdir(parents=True, exist_ok=True)
    _draw_empty_pokeball(DUNGEON_DIR / 'encounter.png')
    for name in ('boss.png', 'chest.png', 'ladder.png'):
        src = DUNGEON_DIR / name
        if src.exists() and src.stat().st_size > 0:
            _black_glyph(src, src)
        else:
            print(f'  [ATTENTION] {name} absent — aucune conversion appliquée')


if __name__ == '__main__':
    regenerate_dungeon_tiles()
