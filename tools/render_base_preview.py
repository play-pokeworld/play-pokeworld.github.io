#!/usr/bin/env python3
# ============================================================================
# TOOL — Software preview of the 3D/2D secret-base renderer (outside the browser)
# ----------------------------------------------------------------------------
# FAITHFUL replica of the src/game/base/base-view3d.js pipeline (phase 37:
# CANON GBA layouts, shell TEXTURED with real Emerald metatiles
# (atlas tex3d_<theme>, 5 slots 16×16), ROSA camera pitch 0.95 yaw 0, walls
# high except low ledge at south-void, posters stuck on the north wall, ORAS
# models for furniture, serebii icons OK as 3D billboards) and of
# base-view2d.js (Emerald background baked from official map.bin + GBA
# sprites ONLY — no more 2.5D serebii fallback, 100% GBA 2D art direction).
#
#   python3 tools/render_base_preview.py --layout cave_1
#   python3 tools/render_base_preview.py --all          # the 9 3D+2D backgrounds
#   python3 tools/render_base_preview.py --examples     # 9×(3d+2d) + 3 furnished
#                                                       # + contact sheet
# Output: src/assets/images/secret-base/examples/
# ============================================================================
import argparse, json, math, os, re
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EX_OUT = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'examples')

LAYOUT_IDS = ['cave_1', 'cave_2', 'cave_3', 'cave_4',
              'tree_1', 'tree_2', 'tree_3', 'tree_4',
              'bush_1', 'bush_2', 'bush_3', 'bush_4']
# Passe 40: 12 colored caves (canon red/blue/yellow 1-4 extractions)
# + 6 custom leveled layouts (mezzanine + stairs). 2D only for those
# 24: the ORAS 3D remains the one of the 12 original brown rooms
# (3D rework planned later).
LAYOUT_IDS_COLOR = ['cave_red_1', 'cave_red_2', 'cave_red_3', 'cave_red_4',
                    'cave_blue_1', 'cave_blue_2', 'cave_blue_3', 'cave_blue_4',
                    'cave_yellow_1', 'cave_yellow_2', 'cave_yellow_3', 'cave_yellow_4']
LAYOUT_IDS_CUSTOM = ['cave_5', 'cave_6', 'tree_5', 'tree_6', 'bush_5', 'bush_6']
LAYOUT_IDS_ALL = LAYOUT_IDS + LAYOUT_IDS_COLOR + LAYOUT_IDS_CUSTOM

# Slots of the tex3d_<theme> atlas (replica of the JS TEX3D_* consts)
TEX3D_FLOOR, TEX3D_ROCK, TEX3D_FACE, TEX3D_ROCKO, TEX3D_ENTR = 0, 1, 2, 3, 4

# ——— Column-major matrices (exact replica of the JS) ———
def m4Ortho(l, r, b, t, n, f):
    return np.array([2/(r-l),0,0,0, 0,2/(t-b),0,0, 0,0,-2/(f-n),0,
                     -(r+l)/(r-l), -(t+b)/(t-b), -(f+n)/(f-n), 1], dtype=np.float64)
def m4Mul(a, b):
    o = np.zeros(16)
    for c in range(4):
        for rw in range(4):
            o[c*4+rw] = sum(a[k*4+rw]*b[c*4+k] for k in range(4))
    return o
def m4RotX(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1], dtype=np.float64)
def m4RotY(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1], dtype=np.float64)
def m4Translate(x, y, z):
    return np.array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1], dtype=np.float64)
def m4Scale(x, y, z):
    return np.array([x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1], dtype=np.float64)
def m4v(m, v):
    return np.array([sum(m[c*4+rw]*v[c] for c in range(4)) for rw in range(4)])

# ——— Constants re-read DIRECTLY from the JS sources (synchronized replica)
def js_consts():
    src = open(os.path.join(ROOT, 'src/game/base/base-view3d.js'), encoding='utf8').read()
    def f(name):
        m = re.search(r'const ' + name + r' = ([0-9.]+);', src)
        assert m, name
        return float(m.group(1))
    themes = {}
    for tm in re.finditer(r"(cave|tree|bush): \{(.*?)\},", src, re.S):
        d = {}
        for k in re.finditer(r"(\w+): base3dHex\('#([0-9a-fA-F]{6})'\)", tm.group(2)):
            h = k.group(2)
            d[k.group(1)] = tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
        themes[tm.group(1)] = d
    return {'elev': f('BASE3D_ELEV'), 'pitch': f('BASE3D_PITCH'),
            'wall_hi': f('BASE3D_WALL_HI'), 'wall_lo': f('BASE3D_WALL_LO'),
            'themes': themes}

def js_array(name):
    src = open(os.path.join(ROOT, 'src/game/base/base-view3d.js'), encoding='utf8').read()
    m = re.search(r'const ' + name + r' = \[([^\]]*)\]', src)
    assert m, name
    return [float(x) for x in m.group(1).replace('\n', ' ').split(',') if x.strip()]

# Canon layouts (keys = full ids: cave_1 … bush_3) — EXACT replica of
# baseLayoutGet(): '#' wall, '.' floor, 'S' spawn, 'E' entry, 'o' hole, rest void.
def layouts_parse():
    src = open(os.path.join(ROOT, 'src/data/base-layouts-data.js'), encoding='utf8').read()
    shapes = {}
    for m in re.finditer(r"(cave(?:_(?:red|blue|yellow))?_\d+|tree_\d+|bush_\d+): \{\s*canon: (?:'[^']+'|null)[\s\S]*?rows: \[(.*?)\]", src, re.S):
        rows = re.findall(r"'([^']*)'", m.group(2))
        w = max(len(r) for r in rows)
        grid = []
        for row in rows:
            line = []
            for ch in row:
                if ch == '#': cell = {'t': 'wall', 'elev': 0}
                elif ch == '.': cell = {'t': 'floor', 'elev': 0}
                elif ch == 'S': cell = {'t': 'floor', 'elev': 0, 'spawnPt': True}
                elif ch == 'E': cell = {'t': 'floor', 'elev': 0, 'entrance': True}
                elif ch == 'o': cell = {'t': 'hole', 'elev': 0}
                elif ch == '^': cell = {'t': 'floor', 'elev': 1}   # mezzanine
                elif ch == '=': cell = {'t': 'cliff', 'elev': 0}   # falaise
                elif ch == 'a': cell = {'t': 'floor', 'elev': 0, 'stairAnchor': True}
                else: cell = {'t': 'void', 'elev': 0}
                line.append(cell)
            while len(line) < w: line.append({'t': 'void', 'elev': 0})
            grid.append(line)
        shapes[m.group(1)] = grid
    return shapes

def items_parse():
    src = open(os.path.join(ROOT, 'src/data/base-items-data.js'), encoding='utf8').read()
    out = {}
    for m in re.finditer(r"\{ s:'([a-z0-9_]+)', cat:'([a-z]+)', w:(\d+), d:(\d+), layer:'([a-z]+)'([^}]*)\}", src):
        extra = m.group(6)
        rot = re.search(r'rot:(\d+)', extra)
        fxm = re.search(r"fx:'([a-z_0-9:]+)'", extra)
        out[m.group(1)] = {'w': int(m.group(3)), 'd': int(m.group(4)), 'cat': m.group(2),
                           'layer': m.group(5), 'rot': int(rot.group(1)) if rot else 0,
                           'fx': fxm.group(1) if fxm else None}
    return out

# ——— OBJ/MTL loading (same rules as base-view3d.js) ———
def parse_obj(path, flip_v=True):
    v, vt = [], []
    groups, cur = [], {'mat': '', 'tris': []}
    def corner(tok):
        p = tok.split('/')
        vi, ti = (int(p[0]) if p[0] else 0), (int(p[1]) if len(p) > 1 and p[1] else 0)
        pos = v[vi-1] if 0 < vi <= len(v) else (0, 0, 0)
        uv = vt[ti-1] if 0 < ti <= len(vt) else (0, 0)
        if flip_v: uv = (uv[0], 1.0 - uv[1])
        return (pos, uv)
    for raw in open(path, encoding='utf8', errors='ignore'):
        line = raw.strip()
        if line.startswith('v '):
            v.append(tuple(float(x) for x in line[2:].split()[:3]))
        elif line.startswith('vt '):
            vt.append(tuple(float(x) for x in line[3:].split()[:2]))
        elif line.startswith('usemtl '):
            if cur['tris']: groups.append(cur)
            cur = {'mat': line[7:].strip(), 'tris': []}
        elif line.startswith('f '):
            toks = [corner(t) for t in line[2:].split()]
            for i in range(1, len(toks)-1):
                cur['tris'].append((toks[0], toks[i], toks[i+1]))
    if cur['tris']: groups.append(cur)
    return groups

def parse_mtl(path):
    out, cur = {}, None
    if not os.path.exists(path): return out
    for raw in open(path, encoding='utf8', errors='ignore'):
        line = raw.strip()
        if line.startswith('newmtl '):
            cur = line[7:].strip(); out[cur] = {}
        elif cur and line.startswith('map_Kd '):
            out[cur]['map'] = line[7:].strip().replace('\\', '/')
    return out

# ——— Rasteriseur z-buffer (numpy) ——————————————————————————————————————————
class Raster:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.c = np.zeros((h, w, 4))
        self.z = np.full((h, w), 1e9)
        self.lamp = np.array([0.45, 1.0, 0.35]); self.lamp /= np.linalg.norm(self.lamp)

    def tri(self, pts, uvs, nrm, color=None, tex=None, alpha_test=False, cull=True):
        (x0, y0, z0), (x1, y1, z1), (x2, y2, z2) = pts
        area = (x1-x0)*(y2-y0) - (x2-x0)*(y1-y0)
        if abs(area) < 1e-12: return
        if cull and area <= 0: return
        l = 0.62 + 0.38 * max(float(np.dot(nrm, self.lamp)), 0.0)
        sx = (np.array([x0, x1, x2]) + 1) * 0.5 * (self.w - 1)
        sy = (1 - np.array([y0, y1, y2])) * 0.5 * (self.h - 1)
        mnx, mxx = max(int(sx.min()), 0), min(int(sx.max()) + 1, self.w)
        mny, mxy = max(int(sy.min()), 0), min(int(sy.max()) + 1, self.h)
        if mnx >= mxx or mny >= mxy: return
        ys, xs = np.mgrid[mny:mxy, mnx:mxx]
        d = (sy[1]-sy[2])*(sx[0]-sx[2]) + (sx[2]-sx[1])*(sy[0]-sy[2])
        if abs(d) < 1e-12: return
        w0 = ((sy[1]-sy[2])*(xs-sx[2]) + (sx[2]-sx[1])*(ys-sy[2])) / d
        w1 = ((sy[2]-sy[0])*(xs-sx[2]) + (sx[0]-sx[2])*(ys-sy[2])) / d
        w2 = 1 - w0 - w1
        mask = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
        if not mask.any(): return
        zz = w0*z0 + w1*z1 + w2*z2
        zbuf = self.z[mny:mxy, mnx:mxx]
        mask &= zz < zbuf
        if not mask.any(): return
        if tex is not None:
            th, tw = tex.shape[0], tex.shape[1]
            u = w0*uvs[0][0] + w1*uvs[1][0] + w2*uvs[2][0]
            vv = w0*uvs[0][1] + w1*uvs[1][1] + w2*uvs[2][1]
            tu = np.clip((u*tw).astype(int), 0, tw-1)
            tv = np.clip((vv*th).astype(int), 0, th-1)
            col = tex[tv, tu].astype(float) / 255.0
            if alpha_test: mask &= col[..., 3] >= 0.35
            col[..., :3] *= l
        else:
            col = np.empty((*w0.shape, 4)); col[...] = color
            col[..., :3] *= l
        if not mask.any(): return
        cbuf = self.c[mny:mxy, mnx:mxx]
        cbuf[mask] = col[mask]
        zbuf[mask] = zz[mask]

    def png(self, path, bg=(20, 21, 27), scale=2):
        img = np.empty((self.h, self.w, 3), dtype=np.uint8)
        a = self.c[..., 3:4]
        img[...] = (self.c[..., :3]*a + (np.array(bg)/255)*(1-a)) * 255
        im = Image.fromarray(img, 'RGB')
        if scale != 1: im = im.resize((self.w*scale, self.h*scale), Image.NEAREST)
        im.save(path)

# ——— Furnished sample scenes (100% authentic Emerald sprites — objects
# placed legally: walkable floor, posters on north wall, board over hole,
# dolls on carriers, NPC on floor). Verified by the phase 37 tests.
SCENES = {
 # phase 42: 100% canon placements (real DECORSHAPE sizes; hole plugged by
 # the board; 4×2 stand on the wide room; wall poster on the north face)
 'cave_1': {
   'items': [('red_poster', 4, 0, 0), ('stand', 1, 3, 0), ('torchic_doll', 1, 3, 0), 
             ('small_desk', 7, 3, 0), ('azurill_doll', 7, 3, 0), ('tire', 7, 5, 0), 
             ('big_plant', 2, 6, 0), ('solid_board', 5, 2, 0)],
   'npcs': [(4, 6)],
 },
 'cave_3': {
   'items': [('cute_poster', 6, 0, 0), ('pokemon_desk', 2, 1, 0), ('pichu_doll', 2, 1, 0), 
             ('tv', 11, 1, 0), ('big_plant', 11, 7, 0), ('solid_board', 1, 7, 0), 
             ('tire', 2, 8, 0)],
   'npcs': [(12, 5)],
 },
 'tree_2': {
   'items': [('blue_poster', 2, 0, 0), ('solid_board', 3, 1, 0), ('small_desk', 1, 3, 0), 
             ('mudkip_doll', 1, 3, 0), ('tire', 4, 9, 0), ('skitty_doll', 4, 9, 0), 
             ('surf_mat', 1, 5, 0)],
   'npcs': [(4, 8)],
 },
 # ——— Passe 40/41 ———
 # Phase 44: LEVELED scenes re-wired to the ORAS organic architecture
 # (non-rectangular drawn plateau, 2-column stair EMBEDDED in its niche =
 # unique position, alcove framed by heights).
 # Phase 45: leveled layouts REDESIGNED (terraces, bays, atriums) — scenes
 # re-wired to the new stair niches.
 'cave_5': {  # stepped terraces: stair niche x2-3 (anchors y4)
   'items': [('stairs', 4, 3, 0), ('red_poster', 6, 4, 0), ('stand', 3, 1, 0), 
             ('azurill_doll', 4, 1, 0), ('small_desk', 9, 1, 0), ('torchic_doll', 6, 1, 0), 
             ('big_plant', 6, 3, 0), ('tire', 5, 5, 0), ('tropical_plant', 8, 5, 0), 
             ('pc', 8, 8, 0), ('tv', 3, 9, 0)],
   'npcs': [(6, 2), (4, 5), (3, 1), (3, 2)],
 },
 'tree_5': {  # L-shaped plateau: stair niche x6-7 (anchors y3)
   'items': [('stairs', 6, 3, 0), ('blue_poster', 5, 0, 0), ('stand', 4, 1, 0), 
             ('skitty_doll', 3, 3, 0), ('tropical_plant', 8, 2, 0), 
             ('pretty_flowers', 8, 1, 0), ('pc', 7, 8, 0), ('small_chair', 4, 7, 0)],
   'npcs': [(5, 1), (4, 1), (4, 2)],
 },
 'cave_red_1': {
   'items': [('red_poster', 3, 0, 0), ('small_desk', 5, 2, 0), ('mudkip_doll', 5, 2, 0), 
             ('tire', 7, 5, 0), ('red_brick', 2, 4, 0), ('big_plant', 2, 6, 0), 
             ('pc', 8, 7, 0)],
   'npcs': [(4, 6)],
 },
 'bush_6': {  # U-shaped gallery: TWO stair niches (west x2-3, east x10-11)
   'items': [('stairs', 8, 3, 0), ('small_desk', 3, 1, 0), ('pichu_doll', 3, 1, 0), 
             ('pretty_flowers', 10, 1, 0), ('tropical_plant', 3, 2, 0), 
             ('solid_board', 4, 2, 0), ('mud_ball', 5, 3, 0), ('pc', 9, 5, 0), 
             ('small_chair', 4, 8, 0)],
   'npcs': [(5, 3), (10, 2)],
 },
}
# 2D-only scenes (no software 3D render for levels/colors)
SCENES_NO3D = {'cave_5', 'tree_5', 'cave_red_1', 'bush_6'}

# ——— Renderer 3D (réplique passe 37) ———————————————————————————————————————
def render3d(layout_id, out_path, scene=None):
    C = js_consts()
    ELEV, PITCH, WHI, WLO = C['elev'], C['pitch'], C['wall_hi'], C['wall_lo']
    theme = layout_id.split('_')[0]
    pal = C['themes'][theme]
    grid = layouts_parse()[layout_id]
    defs = items_parse()
    H, W = len(grid), len(grid[0])
    man3 = json.load(open(os.path.join(ROOT, 'src/assets/models/secret-base/manifest.json')))
    man2 = json.load(open(os.path.join(ROOT, 'src/assets/images/secret-base/manifest.render2d.json')))['items']

    cw, ch = W*46 + 40, H*40 + 110
    R = Raster(cw, ch)
    cx, cz = W/2, H/2
    view = m4Mul(m4RotX(PITCH), m4Translate(-cx, -0.5, -cz))
    # framing: the 8 volume corners, Y ∈ [0, 1.9] (literal constant of the JS)
    corners = [(x, y, z) for x in (0.0, float(W)) for y in (0.0, 1.9) for z in (0.0, float(H))]
    pv = [m4v(view, (x, y, z, 1)) for x, y, z in corners]
    needx = max(abs(p[0]) for p in pv) * 1.05
    needy = max(abs(p[1]) for p in pv) * 1.05
    k = max(needx / (cw/2), needy / (ch/2))
    proj = m4Ortho(-k*cw/2, k*cw/2, -k*ch/2, k*ch/2, -30, 30)

    def ndc_of(m, pt3):
        p = m4v(m, (*pt3, 1)); p = m4v(view, p); p = m4v(proj, p)
        return (p[0]/p[3], p[1]/p[3], p[2]/p[3])

    def flat_n(a, b, c):
        u = np.subtract(b, a); w = np.subtract(c, a)
        n = np.cross(u, w); ln = np.linalg.norm(n)
        return n / ln if ln else n

    def rgb(h, a=255): return np.array([h[0]/255, h[1]/255, h[2]/255, a/255])

    # quad A,B,C,D ordre périphérique → triangles (A,C,B),(A,D,C), winding RH
    def push_quad(tris, A, B, Cc, D, n, uvs=None):
        uv = uvs or [(0, 0), (1, 0), (1, 1), (0, 1)]
        tris.append(((A, Cc, B), (uv[0], uv[2], uv[1]), n))
        tris.append(((A, D, Cc), (uv[0], uv[3], uv[2]), n))

    # ——— tex3d_<theme> atlas (phase-37 textured shell) + slot UVs ———
    UVD = 1.0 / 5.0
    def uv_slab(i):
        u = i * UVD
        return [(u, 0), (u + UVD, 0), (u + UVD, 1), (u, 1)]
    def uv_side(i):   # A low-left, B high-left, C high-right, D low-right
        u = i * UVD
        return [(u, 1), (u, 0), (u + UVD, 0), (u + UVD, 1)]
    def uv_sidex(i):  # A low-north, B low-south, C high-south, D high-north
        u = i * UVD
        return [(u, 1), (u + UVD, 1), (u + UVD, 0), (u, 0)]
    atlas_path = os.path.join(ROOT, f'src/assets/images/secret-base/bg/emerald/tex3d_{theme}.png')
    atlas = np.array(Image.open(atlas_path).convert('RGBA')) if os.path.exists(atlas_path) else None

    def slab(x, y, z, w, d, color=None, slot=None):
        t = []
        push_quad(t, (x, y, z), (x + w, y, z), (x + w, y, z + d), (x, y, z + d), (0, 1, 0),
                  uv_slab(slot) if slot is not None else None)
        draw_tris(t, color=color, tex=atlas if slot is not None else None)

    # boîte 1×1 texturée (réplique base3dPushBoxTex) ou colorée (repli)
    def box(x, z, y0, y1, color=None, slots=None):
        t = []
        if slots is not None:
            top, side, south = slots
            push_quad(t, (x, y1, z), (x+1, y1, z), (x+1, y1, z+1), (x, y1, z+1), (0, 1, 0), uv_slab(top))
            push_quad(t, (x, y0, z), (x, y1, z), (x, y1, z+1), (x, y0, z+1), (-1, 0, 0), uv_side(side))
            push_quad(t, (x+1, y0, z), (x+1, y0, z+1), (x+1, y1, z+1), (x+1, y1, z), (1, 0, 0), uv_sidex(side))
            push_quad(t, (x, y0, z), (x+1, y0, z), (x+1, y1, z), (x, y1, z), (0, 0, -1), uv_sidex(side))
            push_quad(t, (x, y0, z+1), (x, y1, z+1), (x+1, y1, z+1), (x+1, y0, z+1), (0, 0, 1), uv_side(south))
        else:
            push_quad(t, (x, y1, z), (x+1, y1, z), (x+1, y1, z+1), (x, y1, z+1), (0, 1, 0))
            push_quad(t, (x, y0, z), (x, y1, z), (x, y1, z+1), (x, y0, z+1), (-1, 0, 0))
            push_quad(t, (x+1, y0, z), (x+1, y0, z+1), (x+1, y1, z+1), (x+1, y1, z), (1, 0, 0))
            push_quad(t, (x, y0, z), (x+1, y0, z), (x+1, y1, z), (x, y1, z), (0, 0, -1))
            push_quad(t, (x, y0, z+1), (x, y1, z+1), (x+1, y1, z+1), (x+1, y0, z+1), (0, 0, 1))
        draw_tris(t, color=color, tex=atlas if slots is not None else None)

    def draw_tris(tris, color=None, tex=None, alpha_test=False):
        for pts, uvs, n in tris:
            nd = [ndc_of(m4Translate(0, 0, 0), p) for p in pts]
            R.tri(tuple(nd), tuple(uvs), np.array(n, dtype=float),
                  color=color, tex=tex, alpha_test=alpha_test)

    # ——— Layout cells: TEXTURED shell (real Emerald metatiles) ———
    for y in range(H):
        for x in range(W):
            c = grid[y][x]
            t = c['t']
            if t == 'floor':
                if c.get('entrance'):
                    # entry = exit-mat slab (slot 4), or yellow as fallback
                    if atlas is not None: slab(x, 0.002, y, 1, 1, slot=TEX3D_ENTR)
                    else:
                        slab(x, 0, y, 1, 1, color=rgb(pal['floor']))
                        slab(x + 0.25, 0.015, y + 0.72, 0.5, 0.22, color=rgb(pal['entrance']))
                else:
                    if atlas is not None: slab(x, 0, y, 1, 1, slot=TEX3D_FLOOR)
                    else: slab(x, 0, y, 1, 1, color=rgb(pal['floor']))
            elif t == 'wall':
                # phase 37 rule: HIGH wall, except LOW ledge if the cell to
                # the south is outside the room (else the room would be hidden)
                south = grid[y + 1][x] if y + 1 < H else None
                tall = WLO if (south is None or south['t'] == 'void') else WHI
                if atlas is not None: box(x, y, 0, tall, slots=(TEX3D_ROCK, TEX3D_ROCK, TEX3D_FACE))
                else: box(x, y, 0, tall, color=rgb(pal['wall']))
            elif t == 'hole':
                # hole = fillable rock (slot 3) or dark slab as fallback
                if atlas is not None: slab(x, 0.001, y, 1, 1, slot=TEX3D_ROCKO)
                else: slab(x, -0.02, y, 1, 1, color=rgb(pal['hole']))

    # ——— OBJ models / 2D sprites ———
    model_cache = {}
    def load_model(slug):
        if slug in model_cache: return model_cache[slug]
        entry = man3.get(slug)
        if not entry: model_cache[slug] = None; return None
        base = os.path.join(ROOT, 'src/assets/models/secret-base', slug)
        groups = parse_obj(os.path.join(base, entry['obj']))
        mtl = parse_mtl(os.path.join(base, entry.get('mtl', '')))
        objdir = os.path.dirname(os.path.join(base, entry['obj']))
        out = []
        for g in groups:
            tex = None
            e = mtl.get(g['mat'])
            if e and e.get('map'):
                p = os.path.normpath(os.path.join(objdir, e['map']))
                if 'shadow' in os.path.basename(p).lower():
                    out.append({'tris': None, 'tex': None})
                    continue
                if os.path.exists(p):
                    tex = np.array(Image.open(p).convert('RGBA'))
            out.append({'tris': g['tris'], 'tex': tex})
        pts = [tr[i][0] for gr in out if gr['tris'] for tr in gr['tris'] for i in range(3)]
        if not pts: model_cache[slug] = None; return None
        xs, ys, zs = zip(*pts)
        model_cache[slug] = {'groups': out, 'bbox': (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs))}
        return model_cache[slug]

    img2d_cache = {}
    def icon2d(slug):
        if slug in img2d_cache: return img2d_cache[slug]
        e = man2.get(slug)
        img = None
        if e:
            for kk in ('emerald', 'icon2d'):  # 3D : serebii toléré (billboards)
                p = os.path.join(ROOT, e.get(kk) or '')
                if e.get(kk) and os.path.exists(p):
                    img = Image.open(p).convert('RGBA'); break
        img2d_cache[slug] = img
        return img

    texcache = {}
    def np_tex(img):
        key = id(img)
        if key not in texcache: texcache[key] = np.array(img)
        return texcache[key]

    def billboard(pt, img, scale=None):
        q = js_array('qd')
        vv = [(q[i], q[i+1], q[i+6], q[i+7]) for i in range(0, len(q), 8)]
        asp = img.width / img.height
        sx, sy = (scale if scale else (asp, 1.0))
        c0 = m4v(view, (*pt, 1))
        tris = [(vv[0], vv[1], vv[2]), (vv[3], vv[4], vv[5])]
        ct = np_tex(img)
        for a, b, d in tris:
            nd = []
            for vx, vy, u, v_ in (a, b, d):
                p = m4v(proj, (c0[0] + vx*sx, c0[1] + vy*sy, c0[2], 1))
                nd.append((p[0]/p[3], p[1]/p[3], p[2]/p[3]))
            uv = [(vtx[2], vtx[3]) for vtx in (a, b, d)]  # qd: v DÉJÀ inversé côté JS
            R.tri(tuple(nd), tuple(uv), np.array([0, 0, 1.0]), tex=ct, alpha_test=True, cull=True)

    def floor_quad(img, x, y, w, d, elev, rot_deg=0):
        fx, fz = x + w/2, y + d/2
        th = math.radians(-rot_deg)
        ct_, st_ = math.cos(th), math.sin(th)
        def rot(px, pz):
            dx, dz = px - fx, pz - fz
            return (fx + dx*ct_ + dz*st_, elev + 0.02, fz - dx*st_ + dz*ct_)
        corners = [rot(x, y), rot(x + w, y), rot(x + w, y + d), rot(x, y + d)]
        uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]
        t = []
        push_quad(t, corners[0], corners[1], corners[2], corners[3], (0, 1, 0), uvs)
        for pts, uv, n in t:
            nd = [ndc_of(m4Translate(0, 0, 0), p) for p in pts]
            R.tri(tuple(nd), tuple(uv), np.array(n, dtype=float),
                  tex=np_tex(img), alpha_test=True, cull=False)

    sc = scene if scene is not None else {'items': [], 'npcs': []}
    for slug, x, y, rot in sc['items']:
        d = defs.get(slug)
        if not d: continue
        fw, fd = (d['w'], d['d']) if rot % 2 == 0 else (d['d'], d['w'])
        cell = grid[y][x]
        elev = ELEV if (cell['t'] == 'floor' and cell['elev']) else 0
        # ——— posters/wall items: VERTICAL quad on the south face of the north wall ———
        if d['layer'] == 'wall':
            img = icon2d(slug)
            z = y + fd + 0.02
            if img:
                wq = max(0.3, min(fw * 0.9, (img.width / img.height) * 0.8))
                xq = x + (fw - wq) / 2
                t = []
                push_quad(t, (xq, 0.5, z), (xq, 1.3, z), (xq + wq, 1.3, z), (xq + wq, 0.5, z),
                          (0, 0, 1), [(0, 1), (0, 0), (1, 0), (1, 1)])
                for pts, uv, n in t:
                    nd = [ndc_of(m4Translate(0, 0, 0), p) for p in pts]
                    R.tri(tuple(nd), tuple(uv), np.array(n, dtype=float),
                          tex=np_tex(img), alpha_test=True, cull=True)
            else:
                draw_tris([(((x + 0.1, 0.5, z), (x + fw - 0.1, 0.5, z), (x + fw - 0.1, 1.3, z)), ((0, 1), (1, 1), (1, 0)), (0, 0, 1)),
                           (((x + 0.1, 0.5, z), (x + fw - 0.1, 1.3, z), (x + 0.1, 1.3, z)), ((0, 1), (1, 0), (0, 0)), (0, 0, 1))],
                          color=rgb((0x7a, 0x52, 0x30)))
            continue
        m = load_model(slug)
        if m:
            mnx, mxx, mny, mxy, mnz, mxz = m['bbox']
            ex, ey, ez = max(1e-6, mxx-mnx), max(1e-6, mxy-mny), max(1e-6, mxz-mnz)
            s = min(fw*0.92/ex, fd*0.92/ez, 2.0/ey)
            ang = math.radians((d['rot'] or 0) * rot)
            fx, fz = x + fw/2, y + fd/2
            mm = m4Mul(m4Translate(fx, elev, fz),
                       m4Mul(m4RotY(-ang),
                             m4Mul(m4Scale(s, s, s),
                                   m4Translate(-(mnx+mxx)/2, -mny, -(mnz+mxz)/2))))
            for g in m['groups']:
                if not g['tris']: continue
                for a, b, cc in g['tris']:
                    pa, pb, pc = ndc_of(mm, a[0]), ndc_of(mm, b[0]), ndc_of(mm, cc[0])
                    n = flat_n(a[0], b[0], cc[0])
                    if ang:
                        th = math.radians(-(d['rot'] or 0) * rot)
                        n = np.array([n[0]*math.cos(th)+n[2]*math.sin(th), n[1],
                                      -n[0]*math.sin(th)+n[2]*math.cos(th)])
                    R.tri((pa, pb, pc), (a[1], b[1], cc[1]), n, tex=g['tex'], alpha_test=True)
        else:
            img = icon2d(slug)
            if img and (d['cat'] == 'mats' or d['fx'] == 'board'):
                floor_quad(img, x, y, fw, fd, elev, (d['rot'] or 0) * rot)
            elif img:
                billboard((x + fw/2, elev, y + fd/2), img,
                          scale=(min(fw, img.width/img.height), min(fd, 1.0)))
            else:
                t = []
                push_quad(t, (x + fw/2 - 0.25, elev + 0.5, y + fd/2 - 0.25), (x + fw/2 + 0.25, elev + 0.5, y + fd/2 - 0.25),
                          (x + fw/2 + 0.25, elev + 0.5, y + fd/2 + 0.25), (x + fw/2 - 0.25, elev + 0.5, y + fd/2 + 0.25), (0, 1, 0))
                draw_tris(t, color=rgb((138, 95, 191)))

    # ——— PNJ (billboard procédural, réplique base3dNpcDataUrl) ———
    npc_img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    dr = ImageDraw.Draw(npc_img)
    dr.ellipse([16, 6, 48, 38], fill=(48, 71, 94, 255))
    dr.ellipse([21, 11, 43, 33], fill=(217, 179, 140, 255))
    dr.rectangle([16, 34, 48, 60], fill=(48, 71, 94, 255))
    for nx, ny in sc['npcs']:
        cell = grid[ny][nx]
        elev = ELEV if cell.get('elev') else 0
        billboard((nx + 0.5, elev, ny + 0.5), npc_img)

    R.png(out_path)
    print('3D', layout_id, '→', os.path.relpath(out_path, ROOT))

# ——— Renderer 2D (réplique base-view2d.js passe 37) ————————————————————————
def render2d(layout_id, out_path, scene=None):
    CELL = 32
    theme = layout_id.split('_')[0]
    grid = layouts_parse()[layout_id]
    defs = items_parse()
    H, W = len(grid), len(grid[0])
    man2 = json.load(open(os.path.join(ROOT, 'src/assets/images/secret-base/manifest.render2d.json')))['items']
    img = Image.new('RGBA', (W*CELL + 8, H*CELL + 8), (0, 0, 0, 0))
    ox, oy = 4, 4
    bg = Image.open(os.path.join(ROOT, f'src/assets/images/secret-base/bg/emerald/{layout_id}.png')).convert('RGBA')
    img.alpha_composite(bg.resize((W*CELL, H*CELL), Image.NEAREST), (ox, oy))

    def load_icon(slug):
        # phase 37 (art direction): Emerald sprite ONLY — no serebii fallback.
        e = man2.get(slug)
        if not e or not e.get('emerald'): return None
        p = os.path.join(ROOT, e['emerald'])
        return Image.open(p).convert('RGBA') if os.path.exists(p) else None

    sc = scene if scene is not None else {'items': [], 'npcs': []}
    items = sorted(sc['items'], key=lambda it: (it[2], 1 if defs[it[0]]['layer'] == 'surface' else 0))
    dr = ImageDraw.Draw(img)
    ELEV_PX = round(CELL * 0.45)  # passe 40/43 : mezzanine décalée (réplique view2d, ORAS)
    def elevoff(x, y):
        c = grid[y][x] if 0 <= y < len(grid) and 0 <= x < len(grid[0]) else None
        return ELEV_PX if c and c.get('elev') else 0

    # phase 41: REAL bitmap rotation + raised visual (1-tile overhang
    # above, collision unchanged) — replica of base2dDrawSprite (view2d).
    def draw_sprite(icon, d, rot, px, py, w, h):
        import math as _m
        angle = ((rot * (d.get('rot') or 0)) % 360 + 360) % 360
        maxH = h + (CELL if d['layer'] != 'wall' and (h // CELL) <= 2 else 0)
        rad = _m.radians(angle)
        cos, sin = abs(_m.cos(rad)), abs(_m.sin(rad))
        rotW = icon.width*cos + icon.height*sin
        rotH = icon.width*sin + icon.height*cos
        sc_ = min(w/rotW, maxH/rotH)
        dw, dh = max(6, int(icon.width*sc_)), max(6, int(icon.height*sc_))
        if not angle:
            icon2 = icon.resize((dw, dh), Image.NEAREST)
            img.alpha_composite(icon2, (int(px + (w - dw)/2), int(py + h - dh)))
            return
        stepped = icon.resize((dw, dh), Image.NEAREST).rotate(-angle, expand=True, resample=Image.NEAREST)
        bw, bh = stepped.size
        if angle % 90 == 0:  # 90/270: bottom anchored to the ground
            img.alpha_composite(stepped, (int(px + (w - bw)/2), int(py + h - bh)))
        else:                # 45° (mat): centered
            img.alpha_composite(stepped, (int(px + (w - bw)/2), int(py + h - min(maxH, bh) - (max(0, bh-min(maxH,bh)))/2)))

    for slug, x, y, rot in items:
        d = defs[slug]
        fw, fd = (d['w'], d['d']) if rot % 2 == 0 else (d['d'], d['w'])
        px, py = ox + x*CELL, oy + y*CELL - elevoff(x, y)
        w, h = fw*CELL, fd*CELL
        icon = load_icon(slug)
        # phase 43: contact shadow at the foot of FLOOR furniture (replica
        # view2d: objects/desks/chairs/plants, except board & stairs)
        if d['layer'] != 'wall' and d['cat'] in ('objects', 'desks', 'chairs', 'plants') and slug not in ('solid_board', 'stairs'):
            sh = Image.new('RGBA', img.size, (0, 0, 0, 0))
            ImageDraw.Draw(sh).ellipse([px + w*0.08, py + h - CELL*0.22, px + w*0.92, py + h + CELL*0.02], fill=(20, 12, 6, 76))
            img.alpha_composite(sh)
        if d['layer'] == 'wall':
            if icon:
                iw = min(CELL, int(icon.width * (CELL / icon.height)))
                icon2 = icon.resize((iw, min(CELL, icon.height)), Image.NEAREST)
                img.alpha_composite(icon2, (int(px + (CELL - iw)/2), int(py - 4)))
            else:
                dr.rectangle([px + 6, py - 2, px + CELL - 6, py + CELL - 6], fill=(0x7a, 0x52, 0x30, 255), outline=(0x3f, 0x2a, 0x14, 255))
            continue
        if icon:
            draw_sprite(icon, d, rot, px, py, w, h)
        else:
            dr.rectangle([px + 4, py + h - CELL + 4, px + CELL - 5, py + h - 5],
                         fill=(138, 95, 191, 255), outline=(82, 53, 125, 255))
    # phase 44: object heights (canon) — a pal on top of a display /
    # slide landing is drawn perched (view2d replica).
    zone_top = set()
    for slug, x, y, rot in sc['items']:
        dw = defs[slug]['w']
        if slug == 'stand' and rot % 2 == 0:
            for dx in range(dw): zone_top.add((x + dx, y))
        if slug == 'slide' and rot % 2 == 0:
            zone_top.add((x, y + 1)); zone_top.add((x + 1, y + 1))
    for nx, ny in sc['npcs']:
        px, py = ox + nx*CELL, oy + ny*CELL - elevoff(nx, ny)
        if (nx, ny) in zone_top: py -= ELEV_PX
        u = CELL / 16  # small cut-out chibi trainer (view2d phase 41 replica)
        def rr(x0, y0, x1, y1, c):
            dr.rounded_rectangle([x0, y0, x1, y1], radius=2 * u, fill=c)
        ink, shirt, shi_hi, skin, hair = (28, 39, 51, 255), (62, 102, 140, 255), (93, 135, 173, 255), (232, 195, 158, 255), (51, 38, 28, 255)
        cx = px + CELL / 2
        rr(cx - 5*u, py + CELL - 6*u, cx - 1*u, py + CELL - 1*u, ink)
        rr(cx + 1*u, py + CELL - 6*u, cx + 5*u, py + CELL - 1*u, ink)
        rr(cx - 6.5*u, py + CELL - 13*u, cx + 6.5*u, py + CELL - 4.5*u, ink)
        rr(cx - 5.5*u, py + CELL - 12*u, cx + 5.5*u, py + CELL - 5*u, shirt)
        rr(cx - 5.5*u, py + CELL - 12*u, cx + 5.5*u, py + CELL - 10*u, shi_hi)
        dr.ellipse([cx - 6*u, py + CELL - 21.5*u, cx + 6*u, py + CELL - 9.5*u], fill=ink)
        dr.ellipse([cx - 5*u, py + CELL - 20*u, cx + 5*u, py + CELL - 10*u], fill=skin)
        dr.pieslice([cx - 4.6*u, py + CELL - 21.6*u, cx + 4.6*u, py + CELL - 12.4*u], 180, 360, fill=hair)
        dr.rectangle([cx - 2.6*u, py + CELL - 15.5*u, cx - 1.2*u, py + CELL - 13.5*u], fill=ink)
        dr.rectangle([cx + 1.2*u, py + CELL - 15.5*u, cx + 2.6*u, py + CELL - 13.5*u], fill=ink)
    img = img.resize((img.width*2, img.height*2), Image.NEAREST)
    img.save(out_path)
    print('2D', layout_id, '→', os.path.relpath(out_path, ROOT))

# ——— Generation of the shipped examples ———
def gen_examples():
    os.makedirs(EX_OUT, exist_ok=True)
    # the old examples (legacy square_a/wide_b/twolevel_a ids) are obsolete
    for f in os.listdir(EX_OUT):
        if f.startswith('example_') and f.endswith('.png') or f == 'examples_sheet.png':
            os.remove(os.path.join(EX_OUT, f))
    for lid in LAYOUT_IDS:
        render3d(lid, os.path.join(EX_OUT, f'example_{lid}_3d.png'), {'items': [], 'npcs': []})
    for lid in LAYOUT_IDS_ALL:
        render2d(lid, os.path.join(EX_OUT, f'example_{lid}_2d.png'), {'items': [], 'npcs': []})
    for lid, sc in SCENES.items():
        if lid not in SCENES_NO3D:
            render3d(lid, os.path.join(EX_OUT, f'example_furnished_{lid}_3d.png'), sc)
        render2d(lid, os.path.join(EX_OUT, f'example_furnished_{lid}_2d.png'), sc)
    # overall board (the 30 rooms in 2D, layouts at their real sizes)
    imgs = [Image.open(os.path.join(EX_OUT, f'example_{lid}_2d.png')) for lid in LAYOUT_IDS_ALL]
    cellw = max(i.width for i in imgs) + 8
    cellh = max(i.height for i in imgs) + 24
    cols = 5
    rows = (len(imgs) + cols - 1) // cols
    sheet = Image.new('RGB', (cellw*cols + 8, cellh*rows + 8), (18, 18, 24))
    d = ImageDraw.Draw(sheet)
    for i, (lid, im) in enumerate(zip(LAYOUT_IDS_ALL, imgs)):
        x, y = 4 + (i % cols)*cellw, 4 + 16 + (i // cols)*cellh
        d.text((x + 2, y - 13), f'{lid} →', fill=(255, 255, 0))
        sheet.paste(im, (x, y))
    sheet.save(os.path.join(EX_OUT, 'examples_sheet.png'))
    print('sheet →', os.path.relpath(os.path.join(EX_OUT, 'examples_sheet.png'), ROOT))

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--layout', default=None)
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--examples', action='store_true')
    args = ap.parse_args()
    if args.examples:
        gen_examples()
    elif args.all:
        for lid in LAYOUT_IDS:
            render3d(lid, os.path.join(EX_OUT, f'example_{lid}_3d.png'), {'items': [], 'npcs': []})
            render2d(lid, os.path.join(EX_OUT, f'example_{lid}_2d.png'), {'items': [], 'npcs': []})
    else:
        lid = args.layout or 'cave_1'
        render3d(lid, os.path.join(EX_OUT, f'example_{lid}_3d.png'), {'items': [], 'npcs': []})
        render2d(lid, os.path.join(EX_OUT, f'example_{lid}_2d.png'), {'items': [], 'npcs': []})

