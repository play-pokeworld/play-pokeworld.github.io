#!/usr/bin/env python3
"""Passe 41 — bakes the missing sprites in the Emerald art style (dark outline,
2 tones + top-left light, 16 px/tile), for the objects that used to fall back
to the "purple dot + initial" placeholder:
  pc, bench, green/red/blue/flat_mat, proclamation, blackboard, confetti_ball,
  poke_flute, berry_blender, comfortable_bed, substitute_doll, vending_machine,
  tall_grass, pitfall_mat, square_one_mat, blue_warp_panel, red_warp_panel.
The PC reuses the visual identity of the ROSA terminal (red with yellow bars).
Writes src/assets/images/secret-base/emerald/<slug>.png + manifest (JSON+JS).
Usage: python3 tools/bake-missing-sprites.py [--sheet]"""
import os, sys, json
from PIL import Image, ImageDraw
import importlib.util

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'emerald')
INK = (44, 34, 26, 255)


def cv(w, h):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)

def R(d, x0, y0, x1, y1, c): d.rectangle([x0, y0, x1, y1], fill=c)

def sl(c, k):  # assombrit
    return (int(c[0] * k), int(c[1] * k), int(c[2] * k), c[3])

def sh(c, k):  # éclaircit
    return (min(255, int(c[0] + (255 - c[0]) * k)), min(255, int(c[1] + (255 - c[1]) * k)), min(255, int(c[2] + (255 - c[2]) * k)), c[3])


# ——— PC (red terminal with yellow bars, like the ORAS reference) ———
def spr_pc():
    im, d = cv(16, 32)
    red, red_d = (202, 70, 48, 255), (148, 44, 30, 255)
    yel = (232, 190, 64, 255)
    scr, scr_l = (38, 76, 86, 255), (88, 158, 168, 255)
    # base (attached to the body)
    d.polygon([(4, 24), (11, 24), (11, 28), (4, 28)], fill=INK)
    d.polygon([(4, 23), (12, 22), (12, 24), (4, 25)], fill=red_d)
    R(d, 5, 25, 10, 27, red_d)
    # body (casing slightly tilted backwards)
    d.polygon([(3, 6), (12, 4), (12, 21), (3, 24)], fill=red)
    d.polygon([(12, 4), (13, 5), (13, 22), (12, 21)], fill=red_d)
    d.line([(3, 6), (12, 4)], fill=INK); d.line([(3, 24), (12, 21)], fill=INK)
    d.line([(3, 6), (3, 24)], fill=INK); d.line([(13, 5), (13, 22)], fill=INK)
    # écran
    d.polygon([(4, 8), (11, 7), (11, 13), (4, 15)], fill=scr)
    d.line([(5, 10), (10, 9)], fill=scr_l); d.line([(5, 11), (10, 10)], fill=scr_l)
    # yellow bars (keyboard / slots — the "yellow bars" signature)
    d.polygon([(4, 17), (12, 16), (12, 20), (4, 22)], fill=yel)
    d.line([(6, 17), (6, 21)], fill=sl(yel, .55)); d.line([(9, 16), (9, 20)], fill=sl(yel, .55))
    # lumière
    d.line([(4, 6), (11, 5)], fill=sh(red, .35))
    return im

# ——— Wooden bench (2x1, high backrest) ———
def spr_bench():
    im, d = cv(32, 24)
    wood, wood_d = (152, 112, 66, 255), (112, 78, 44, 255)
    for (px0, px1) in ((6, 9), (22, 25)):           # pieds
        R(d, px0, 15, px1, 23, INK); R(d, px0, 15, px1 - 1, 22, wood_d)
    for yy in (2, 7, 12):                            # backrest slats
        R(d, 3, yy, 28, yy + 4, wood)
        R(d, 3, yy, 28, yy, sh(wood, .3))
        R(d, 3, yy + 4, 28, yy + 4, wood_d)
    R(d, 3, 1, 28, 1, INK); R(d, 3, 16, 28, 16, INK)
    R(d, 2, 12, 3, 20, INK); R(d, 28, 12, 29, 20, INK)
    R(d, 4, 14, 27, 17, sl(wood, .9))               # assise
    R(d, 4, 14, 27, 14, sh(wood, .2))
    return im

# ——— Plain 3x3 mats (green/red/blue/grey) —————————————————————————————————
def spr_mat(color, fringe=True):
    im, d = cv(48, 48)
    col, dk = color, sl(color, .62)
    R(d, 2, 2, 45, 45, INK)
    R(d, 3, 3, 44, 44, dk)
    R(d, 6, 6, 41, 41, col)
    d.line([(6, 6), (41, 6)], fill=sh(col, .25)); d.line([(6, 6), (6, 41)], fill=sh(col, .25))
    med = sl(col, .85)
    R(d, 10, 10, 37, 37, med)
    for yy in range(12, 37, 6):                            # trame tissée
        d.line([(10, yy), (37, yy)], fill=col)
        d.line([(10, yy + 2), (37, yy + 2)], fill=sh(col, .18))
    for xx in range(13, 37, 6):                            # chaîne verticale
        d.line([(xx, 10), (xx, 37)], fill=sl(med, .9))
    if fringe:
        for xx in range(4, 44, 4):
            d.line([(xx, 1), (xx, 1)], fill=sh(col, .5))
            d.line([(xx, 46), (xx, 46)], fill=sh(col, .5))
    return im

# ——— Proclamation (parchment on a lectern) 1x1 tall ————————————————————————
def spr_proclamation():
    im, d = cv(16, 32)
    wood, gold = (120, 84, 46, 255), (222, 190, 78, 255)
    parch, parch_d = (238, 226, 188, 255), (204, 184, 138, 255)
    R(d, 6, 20, 9, 30, INK); R(d, 7, 20, 8, 29, wood)
    R(d, 3, 30, 12, 31, INK)
    R(d, 3, 2, 12, 22, INK)
    R(d, 4, 3, 11, 21, parch)
    R(d, 4, 3, 11, 4, gold); R(d, 4, 20, 11, 21, gold)
    for yy in (8, 11, 14, 17): d.line([(6, yy), (10, yy)], fill=parch_d)
    d.line([(5, 4), (5, 19)], fill=sh(parch, .5))
    return im

# ——— Blackboard (2x1, big board on legs) ———————————————————————————————————
def spr_blackboard():
    im, d = cv(32, 32)
    board = (56, 88, 66, 255)
    wood, wood_d = (142, 106, 62, 255), (104, 74, 42, 255)
    R(d, 4, 24, 7, 31, INK); R(d, 5, 24, 6, 30, wood_d)
    R(d, 24, 24, 27, 31, INK); R(d, 25, 24, 26, 30, wood_d)
    R(d, 2, 3, 29, 26, INK)
    R(d, 3, 4, 28, 25, wood)
    R(d, 5, 6, 26, 22, board)
    d.line([(7, 9), (24, 9)], fill=sh(board, .35))
    d.line([(7, 12), (18, 12)], fill=sh(board, .2))
    d.line([(7, 15), (22, 15)], fill=sh(board, .2))
    d.line([(7, 18), (14, 18)], fill=sh(board, .2))
    R(d, 19, 23, 24, 24, (240, 240, 238, 255))  # craies
    return im

# ——— Boule à confettis (1x1) ———————————————————————————————————————————————
def spr_confetti_ball():
    im, d = cv(16, 16)
    cols = [(232, 84, 60, 255), (76, 146, 214, 255), (240, 204, 92, 255)]
    d.ellipse([2, 4, 13, 15], fill=INK)
    d.ellipse([3, 5, 12, 14], fill=cols[0])
    d.line([(4, 8), (11, 8)], fill=cols[1], width=2)
    d.line([(5, 12), (10, 12)], fill=cols[2], width=2)
    R(d, 6, 0, 9, 4, INK); R(d, 7, 1, 8, 3, sh(cols[0], .4))
    d.point([(5, 7)], fill=sh(cols[0], .45)); d.point([(6, 7)], fill=sh(cols[0], .45))
    return im

# ——— Pokéflute standing on its base (1x1 tall) ———
def spr_poke_flute():
    im, d = cv(16, 32)
    blue, blue_d = (84, 128, 200, 255), (56, 92, 156, 255)
    R(d, 5, 28, 10, 31, INK); R(d, 6, 28, 9, 30, (96, 78, 54, 255))
    d.polygon([(7, 4), (9, 4), (10, 27), (6, 27)], fill=blue)
    d.polygon([(7, 4), (8, 4), (7, 27), (6, 27)], fill=sh(blue, .3))
    d.polygon([(9, 4), (9, 27), (10, 27)], fill=blue_d)
    R(d, 5, 2, 10, 5, INK); R(d, 6, 2, 9, 4, (210, 226, 244, 255))
    for yy in (10, 14, 18): R(d, 7, yy, 8, yy + 1, INK)
    return im

# ——— Berry Blender (blender machine) 1x1 tall ———————————————————————————————
def spr_berry_blender():
    im, d = cv(16, 32)
    grey, grey_d = (158, 158, 168, 255), (112, 112, 124, 255)
    jar = (176, 214, 226, 255)
    R(d, 3, 18, 12, 29, INK); R(d, 4, 19, 11, 28, grey)
    R(d, 4, 19, 5, 28, sh(grey, .2)); R(d, 10, 19, 11, 28, grey_d)
    R(d, 5, 22, 6, 23, (208, 70, 48, 255))   # button
    d.polygon([(5, 5), (10, 5), (11, 17), (4, 17)], fill=INK)
    d.polygon([(6, 6), (10, 6), (10, 16), (5, 16)], fill=jar)
    d.polygon([(6, 6), (7, 6), (6, 16), (5, 16)], fill=sh(jar, .4))
    R(d, 5, 3, 10, 5, grey_d); R(d, 6, 2, 9, 3, grey)
    d.point([(7, 11)], fill=(208, 120, 160, 255)); d.point([(8, 13)], fill=(208, 120, 160, 255))
    return im

# ——— Lit confortable (2x3) —————————————————————————————————————————————————
def spr_comfortable_bed():
    im, d = cv(32, 48)
    wood, wood_d = (128, 92, 52, 255), (96, 66, 36, 255)
    blank, blank_d = (206, 84, 66, 255), (166, 60, 46, 255)
    pill = (246, 244, 236, 255)
    R(d, 2, 2, 29, 45, INK)
    R(d, 3, 3, 28, 44, wood)
    R(d, 3, 3, 28, 10, wood_d); R(d, 3, 3, 28, 4, sh(wood, .25))
    R(d, 5, 12, 26, 42, blank)
    R(d, 5, 12, 26, 13, sh(blank, .25)); R(d, 5, 41, 26, 42, blank_d)
    R(d, 7, 6, 24, 12, pill); R(d, 7, 6, 24, 7, sh(pill, .5))
    for xx in (10, 16, 22): d.line([(xx, 16), (xx, 38)], fill=blank_d)
    d.line([(5, 16), (26, 16)], fill=sh(blank, .3))
    return im

# ——— Poupée Substitut (1x1 surface) ————————————————————————————————————————
def spr_substitute_doll():
    im, d = cv(16, 16)
    grN = (148, 188, 100, 255)
    d.ellipse([3, 3, 12, 13], fill=INK)
    d.ellipse([4, 4, 11, 12], fill=grN)
    d.polygon([(4, 4), (5, 1), (6, 4)], fill=INK)   # oreilles
    d.polygon([(9, 4), (10, 1), (11, 4)], fill=INK)
    d.point([(6, 8)], fill=INK); d.point([(9, 8)], fill=INK)
    d.arc([5, 7, 10, 11], 20, 160, fill=INK)
    d.point([(5, 5)], fill=sh(grN, .4))
    d.polygon([(5, 12), (6, 14), (7, 12)], fill=INK)
    return im

# ——— Vending machine (1x1 tall) ————————————————————————————————————————————
def spr_vending_machine():
    im, d = cv(16, 32)
    teal, teal_d = (64, 132, 140, 255), (44, 96, 102, 255)
    R(d, 3, 2, 12, 29, INK)
    R(d, 4, 3, 11, 28, teal)
    R(d, 4, 3, 5, 28, sh(teal, .22)); R(d, 10, 3, 11, 28, teal_d)
    R(d, 5, 5, 10, 13, (28, 48, 54, 255))                     # vitrine
    d.line([(6, 7), (9, 7)], fill=(198, 216, 220, 255))
    d.line([(6, 9), (9, 9)], fill=(150, 190, 200, 255))
    d.line([(6, 11), (9, 11)], fill=(100, 160, 170, 255))
    R(d, 5, 16, 10, 17, (238, 220, 140, 255))                 # bandeau
    R(d, 6, 20, 9, 26, INK); R(d, 6, 20, 8, 21, (60, 60, 66, 255))  # touch-up
    return im

# ——— Tall grass (1x1, walkable) ————————————————————————————————————————————
def spr_tall_grass():
    im, d = cv(16, 16)
    g1, g2 = (88, 158, 76, 255), (58, 116, 52, 255)
    for (x0, y0) in ((2, 8), (7, 9), (11, 8), (4, 12), (9, 13)):
        d.polygon([(x0, y0 + 5), (x0 + 1, y0), (x0 + 2, y0 + 5)], fill=g2)
        d.polygon([(x0 + 2, y0 + 5), (x0 + 3, y0 + 2), (x0 + 4, y0 + 5)], fill=g1)
    d.line([(3, 14), (14, 14)], fill=g2)
    return im

# ——— Trap mats 1x1: cracked / "1" / warp pads ———————————————————————————————
def spr_pitfall_mat():
    im, d = cv(16, 16)
    base, dk = (152, 142, 124, 255), (110, 100, 84, 255)
    R(d, 1, 1, 14, 14, INK); R(d, 2, 2, 13, 13, base)
    d.line([(4, 4), (8, 8), (6, 12)], fill=dk)
    d.line([(10, 3), (9, 8), (12, 11)], fill=dk)
    d.line([(3, 9), (6, 10)], fill=dk)
    d.line([(2, 2), (13, 2)], fill=sh(base, .3))
    return im

def spr_square_one_mat():
    im, d = cv(16, 16)
    base, bd = (206, 200, 176, 255), (168, 160, 132, 255)
    R(d, 1, 1, 14, 14, INK); R(d, 2, 2, 13, 13, base)
    R(d, 3, 3, 12, 12, bd); R(d, 4, 4, 11, 11, base)
    R(d, 7, 5, 8, 10, (52, 96, 168, 255)); R(d, 6, 6, 7, 7, (52, 96, 168, 255))
    R(d, 5, 10, 10, 11, (52, 96, 168, 255))
    return im

def spr_warp_panel(color):
    im, d = cv(16, 16)
    col = color
    R(d, 1, 1, 14, 14, INK); R(d, 2, 2, 13, 13, (66, 66, 76, 255))
    d.ellipse([3, 3, 12, 12], fill=sl(col, .7))
    d.ellipse([4, 4, 11, 11], fill=col)
    d.ellipse([6, 6, 9, 9], fill=sh(col, .5))
    d.line([(7, 4), (7, 2)], fill=sh(col, .6)); d.line([(12, 7), (14, 7)], fill=sh(col, .6))
    d.line([(7, 11), (7, 13)], fill=sh(col, .6)); d.line([(3, 7), (1, 7)], fill=sh(col, .6))
    return im


BAKES = {
    'pc': spr_pc,
    'bench': spr_bench,
    'green_mat': lambda: spr_mat((96, 150, 74, 255)),
    'red_mat': lambda: spr_mat((186, 84, 60, 255)),
    'blue_mat': lambda: spr_mat((84, 116, 182, 255)),
    'flat_mat': lambda: spr_mat((146, 140, 126, 255), fringe=False),
    'proclamation': spr_proclamation,
    'blackboard': spr_blackboard,
    'confetti_ball': spr_confetti_ball,
    'poke_flute': spr_poke_flute,
    'berry_blender': spr_berry_blender,
    'comfortable_bed': spr_comfortable_bed,
    'substitute_doll': spr_substitute_doll,
    'vending_machine': spr_vending_machine,
    'tall_grass': spr_tall_grass,
    'pitfall_mat': spr_pitfall_mat,
    'square_one_mat': spr_square_one_mat,
    'blue_warp_panel': lambda: spr_warp_panel((70, 120, 214, 255)),
    'red_warp_panel': lambda: spr_warp_panel((208, 74, 56, 255)),
}


def main(sheet_only=False):
    imgs = {}
    for slug, fn in BAKES.items():
        imgs[slug] = fn()
    # control board x4
    cols = 6
    cell = 48 * 4 + 24
    rows = (len(imgs) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell, rows * (cell + 22)), (24, 24, 30))
    from PIL import ImageDraw as _D
    dd = _D.Draw(sheet)
    for i, (slug, im) in enumerate(imgs.items()):
        x, y = (i % cols) * cell, (i // cols) * (cell + 22)
        big = im.resize((im.width * 4, im.height * 4), Image.NEAREST)
        sheet.paste(big, (x + 12, y + 12), big)
        dd.text((x + 12, y + cell - 4), slug, fill=(255, 255, 160))
    sheet.save('/tmp/missing_sprites_sheet.png')
    print('sheet → /tmp/missing_sprites_sheet.png')
    if sheet_only:
        return
    os.makedirs(OUT, exist_ok=True)
    man_path = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'manifest.render2d.json')
    man = json.load(open(man_path))
    for slug, im in imgs.items():
        p = os.path.join(OUT, slug + '.png')
        im.save(p)
        man['items'].setdefault(slug, {})['emerald'] = os.path.relpath(p, ROOT)
    json.dump(man, open(man_path, 'w'), indent=1, ensure_ascii=False)
    spec = importlib.util.spec_from_file_location('bk', os.path.join(ROOT, 'tools', 'bake-emerald-bgs.py'))
    bk = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bk)
    bk.write_manifest_js(man)
    print(len(imgs), 'sprites baked + manifest updated')


if __name__ == '__main__':
    main('--sheet' in sys.argv)

