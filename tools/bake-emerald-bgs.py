#!/usr/bin/env python3
# ============================================================================
# TOOL — Baking authentic Emerald backgrounds (GBA tilesets, pret/pokeemerald)
# ----------------------------------------------------------------------------
# Renders the TRUE GBA tiles: JASC-PAL palettes + tiles.png per base type
# (brown_cave/tree/shrub) + metatiles.bin (general 512 + secret_base 324) +
# blocks de layout (u16 : low10 = metatile, bits10-11 collision, bits12-15 elev).
#
#   --render-canonical   canon backgrounds (SecretBase_BrownCave1/Tree1/Shrub1) for
#                        visual reference + metatile audit
#   --render-grids       the 9 game backgrounds (ASCII grids of base-layouts-data.js
#                        dressed with the chosen canon metatiles)
# Output: src/assets/images/secret-base/bg/emerald/<layout>.png
# ============================================================================
import json, os, re, struct, sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', 'emerald-ref')  # staging persisted INSIDE the
# project (phase 37: .cache is not restored between sessions)
OUT = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'bg', 'emerald')

# Phase 47 — WALL AUTOTILING (user feedback: "the assets tile poorly
# against blocks placed next to them, unlike the other rooms").
# CANON rooms do not use a single rock tile: they use a full set of edges
# and corners (0x201..0x213, 0x220…). The table below was LEARNT
# automatically from the 24 canon maps of the decompilation: for each
# 8-connected neighborhood of solid cells (bits NW,N,NE,W,E,SW,S,SE) it
# gives the metatile used by Game Freak.
# Generated from the analysis of data/layouts/*/map.bin; see emerald-ref/autotile-walls.json.
def load_wall_autotile():
    p = os.path.join(CACHE, 'autotile-walls.json')
    try:
        raw = json.load(open(p))
        return {int(k): v for k, v in raw.items()}
    except Exception:
        return {}

WALL_AUTOTILE = load_wall_autotile()

def wall_metatile(rows, x, y, solid_of, fallback):
    """Wall metatile for (x,y) from the neighborhood — RSE canon rules."""
    m = 0
    for i, (dx, dy) in enumerate([(-1, -1), (0, -1), (1, -1), (-1, 0),
                                  (1, 0), (-1, 1), (0, 1), (1, 1)]):
        if solid_of(rows, x + dx, y + dy):
            m |= (1 << i)
    return WALL_AUTOTILE.get(m, fallback)


NUM_META_PRIMARY = 512
NUM_TILES_PRIMARY = 512
SPLIT_PAL = 6  # slots 0-5 → primaire (gTileset_SecretBase), slot 6 → secondaire
               # (brown_cave/tree/shrub) — proven by the real references of
               # the metatiles used: P tiles with slots {0..5}, S tiles with {6}

# ——— Chargement GBA ———————————————————————————————————————————————————————
def load_pal(path):
    lines = [l.strip() for l in open(path) if l.strip()]
    assert lines[0] == 'JASC-PAL' and int(lines[2]) >= 1
    cols = []
    for l in lines[3:]:
        r, g, b = (int(x) for x in l.split()[:3])
        cols.append((r, g, b))
    return cols + [(0, 0, 0)] * (16 - len(cols))

def load_tiles(path):
    im = Image.open(path).convert('P')
    w, h = im.size
    px = im.load()
    return (im, px, w // 8, h // 8)  # image + access + tiles per row

def parse_jasc_dir(d):
    return [load_pal(os.path.join(d, '%02d.pal' % i)) if os.path.exists(os.path.join(d, '%02d.pal' % i))
            else [(0, 0, 0)] * 16 for i in range(16)]

class Tilesets:
    def __init__(self, theme):
        sec = {'cave': 'brown_cave', 'red_cave': 'red_cave', 'blue_cave': 'blue_cave',
               'yellow_cave': 'yellow_cave', 'tree': 'tree', 'bush': 'shrub'}[theme]
        # PRIMARY = gTileset_SecretBase (NOT general!): secret-base layouts
        # declare primary_tileset=gTileset_SecretBase — this is where
        # the DECORATION tiles + palettes live (red posters = red…)
        # and the slot<6 -> primary / slot 6 -> secondary split is proven by
        # cross-referencing real metatiles.bin references (slots 0-5 tiles
        # primary tiles, slot 6 secondary tiles).
        self.pal_p = parse_jasc_dir(os.path.join(CACHE, 'data/tilesets/primary/secret_base/palettes'))
        self.pal_s = parse_jasc_dir(os.path.join(CACHE, f'data/tilesets/secondary/secret_base/{sec}/palettes'))
        self.tiles_p = load_tiles(os.path.join(CACHE, 'data/tilesets/primary/secret_base/tiles.png'))
        self.tiles_s = load_tiles(os.path.join(CACHE, f'data/tilesets/secondary/secret_base/{sec}/tiles.png'))
        self.meta_p = open(os.path.join(CACHE, 'data/tilesets/primary/general/metatiles.bin'), 'rb').read()
        self.meta_s = open(os.path.join(CACHE, 'data/tilesets/secondary/secret_base/metatiles.bin'), 'rb').read()
        # transparency: slot 0 of each palette = transparent when upper layer
        self.out_p = Image.new('RGB', (8, 8))

    def palette(self, slot):
        return self.pal_p[slot] if slot < SPLIT_PAL else self.pal_s[slot]

    def draw_tile(self, target, tid, px, py, hflip, vflip, slot, transparent0=False):
        tiles = self.tiles_p if tid < NUM_TILES_PRIMARY else self.tiles_s
        idx = tid if tid < NUM_TILES_PRIMARY else tid - NUM_TILES_PRIMARY
        im, lp, tw, th = tiles
        if tw == 0 or idx >= tw * th: return
        sx, sy = (idx % tw) * 8, (idx // tw) * 8
        pal = self.palette(slot)
        for y in range(8):
            for x in range(8):
                ci = lp[sx + (7 - x if hflip else x), sy + (7 - y if vflip else y)] & 0xF
                if transparent0 and ci == 0: continue
                r, g, b = pal[ci]
                target.putpixel((px + x, py + y), (r, g, b))

    def metatile(self, mid, top=False):
        data = self.meta_p if mid < NUM_META_PRIMARY else self.meta_s
        idx = mid if mid < NUM_META_PRIMARY else mid - NUM_META_PRIMARY
        if idx * 16 + 16 > len(data): idx = 0
        entries = struct.unpack_from('<8H', data, idx * 16)
        im = Image.new('RGB', (16, 16))
        # RSE layers: entries 0-3 = low (low BG), 4-7 = high (high BG)
        order = entries[4:8] if top else entries[0:4]
        for i, e in enumerate(order):
            tid = e & 0x3FF
            hf = bool(e & 0x400); vf = bool(e & 0x800); slot = (e >> 12) & 0xF
            self.draw_tile(im, tid, (i % 2) * 8, (i // 2) * 8, hf, vf, slot, transparent0=top)
        return im

    def metatile_full(self, mid):
        """low layer (opaque) + high layer (slot0 transparent) = final in-game view"""
        data = self.meta_p if mid < NUM_META_PRIMARY else self.meta_s
        idx = mid if mid < NUM_META_PRIMARY else mid - NUM_META_PRIMARY
        if idx * 16 + 16 > len(data): idx = 0
        entries = struct.unpack_from('<8H', data, idx * 16)
        im = Image.new('RGB', (16, 16))
        for i, e in enumerate(entries[0:4]):  # low layer — opaque
            tid = e & 0x3FF
            hf = bool(e & 0x400); vf = bool(e & 0x800); slot = (e >> 12) & 0xF
            self.draw_tile(im, tid, (i % 2) * 8, (i // 2) * 8, hf, vf, slot)
        for i, e in enumerate(entries[4:8]):  # high layer — index 0 transparent
            tid = e & 0x3FF
            hf = bool(e & 0x400); vf = bool(e & 0x800); slot = (e >> 12) & 0xF
            self.draw_tile(im, tid, (i % 2) * 8, (i // 2) * 8, hf, vf, slot, transparent0=True)
        return im

# ——— Canon layout rendering ———
def render_canonical(name, theme):
    ts = Tilesets(theme)
    blocks = open(os.path.join(CACHE, f'data/layouts/{name}/map.bin'), 'rb').read()
    n = len(blocks) // 2
    data = json.load(open(os.path.join(CACHE, 'data/layouts/layouts.json')))
    import re as _re
    sub = _re.sub(r'([a-z])([A-Z])', r'\1_\2', name.replace('SecretBase_', '')).upper()
    lay = next(l for l in data['layouts'] if l['id'] == 'LAYOUT_SECRET_BASE_' + sub)
    w, h = lay['width'], lay['height']
    assert n == w * h, (name, n, w, h)
    im = Image.new('RGB', (w * 16, h * 16))
    for b in range(n):
        mid = struct.unpack_from('<H', blocks, b * 2)[0] & 0x3FF
        im.paste(ts.metatile_full(mid), ((b % w) * 16, (b // w) * 16))
    os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
    p = os.path.join(ROOT, 'out', f'canonical_{name}.png')
    im.resize((w * 32, h * 32), Image.NEAREST).save(p)
    print('canon', name, '→', p)
    return ts

# ——— The 9 game backgrounds (custom grids + chosen canon metatiles) ———
def grids_parse():
    src = open(os.path.join(ROOT, 'src/data/base-layouts-data.js'), encoding='utf8').read()
    import re
    shapes = {}
    for m in re.finditer(r"(square_a|wide_b|twolevel_a): \{\s*rows: \[(.*?)\]", src, re.S):
        shapes[m.group(1)] = re.findall(r"'([^']*)'", m.group(2))
    return shapes

# ——— Composition of the 9 game backgrounds with canon metatiles ———
# IDs POSITIONALLY extracted from the canon layouts (BrownCave1/Tree1/Shrub1
# share the same metatile plan — verified by map.bin dump):
MT = {
    'floor': 522, 'void': 528, 'entr': 524,
    'nwall': 514, 'swall': 530, 'wwall': 521, 'ewall': 523,
    'nw': 513, 'ne': 515, 'sw': 529, 'se': 531,          # coins EXTÉRIEURS
    'inw': 527, 'ine': 525, 'isw': 519, 'ise': 517,      # coins INTÉRIEURS
    'cliff': 530,  # platform face = south wall metatile (rock/board/
                   # elder depending on theme — the canon GBA render of elevations)
}

FLOORISH = set('.E=_A')   # visually walkable cells
SOLID = set('#o')         # # = wall, o = filled hole

def cell_at(rows, x, y):
    if y < 0 or y >= len(rows) or x < 0 or x >= len(rows[y]): return 'x'
    return rows[y][x]

def metatile_for(rows, x, y):
    c = cell_at(rows, x, y)
    n = cell_at(rows, x, y - 1); s = cell_at(rows, x, y + 1)
    w = cell_at(rows, x - 1, y); e = cell_at(rows, x + 1, y)
    if c == '.':
        # inner corner: floor cell adjoining two perpendicular walls
        if n in SOLID and w in SOLID: return MT['inw']
        if n in SOLID and e in SOLID: return MT['ine']
        if s in SOLID and w in SOLID: return MT['isw']
        if s in SOLID and e in SOLID: return MT['ise']
        return MT['floor']
    if c == '#':
        # cardinal first (corridors/thicknesses), diagonal next (corners)
        if s in FLOORISH: return MT['nwall']
        if n in FLOORISH: return MT['swall']
        if e in FLOORISH: return MT['wwall']
        if w in FLOORISH: return MT['ewall']
        if cell_at(rows, x + 1, y + 1) in FLOORISH: return MT['nw']
        if cell_at(rows, x - 1, y + 1) in FLOORISH: return MT['ne']
        if cell_at(rows, x + 1, y - 1) in FLOORISH: return MT['sw']
        if cell_at(rows, x - 1, y - 1) in FLOORISH: return MT['se']
        return MT['void']
    if c == 'o': return MT['void']       # hole = solid rock/foliage (filled)
    if c == 'E': return MT['entr']
    if c == '=': return MT['floor']      # top floor = same floor (elevation is
    if c == '_': return MT['cliff']      #   carried by the cliff + the stair)
    if c == 'A': return MT['floor']      # ramp/stairs = floor (2D), the 3D
                                         #   shows the true procedural scale
    return MT['void']

def render_shape(theme, shape, rows):
    ts = Tilesets(theme)
    w = max(len(r) for r in rows); h = len(rows)
    im = Image.new('RGB', (w * 16, h * 16))
    for y in range(h):
        for x in range(len(rows[y])):
            im.paste(ts.metatile_full(metatile_for(rows, x, y)), (x * 16, y * 16))
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, f'{theme}_{shape}.png')
    im.save(p)  # native 16 px/cell: the 2D canvas upscales in crisp pixel-art
    print('fond', f'{theme}_{shape}', f'{w}x{h}', '→', os.path.relpath(p, ROOT))

def render_grids():
    shapes = grids_parse()
    assert sorted(shapes.keys()) == ['square_a', 'twolevel_a', 'wide_b'], shapes.keys()
    for theme in ('cave', 'tree', 'bush'):
        for shape, rows in shapes.items():
            render_shape(theme, shape, rows)

def render_atlas(theme, mids, path):
    ts = Tilesets(theme)
    cols = 12
    rows = (len(mids) + cols - 1) // cols
    im = Image.new('RGB', (cols * 32, rows * 40), (24, 24, 30))
    d = ImageDraw.Draw(im)
    for i, mid in enumerate(mids):
        x, y = (i % cols) * 32, (i // cols) * 40
        im.paste(ts.metatile_full(mid + NUM_META_PRIMARY).resize((32, 32), Image.NEAREST), (x, y))
        d.text((x + 1, y + 33), f'{mid + NUM_META_PRIMARY}', fill=(255, 255, 0))
    im.save(path)
    print('atlas →', path)

# ——— The 9 CANON layouts of the game (phase 37: official GBA shapes) ———
# game id -> pokeemerald folder. Authentic shapes (no more invented
# grids: the rooms are RSE's, real sizes 11×9 -> 17×8).
CANON_LAYOUTS = [
    # CANON caves: 4 colors × 4 shapes (decompilation map.bin) — phase
    # 40: the 12 missing ones (red/blue/yellow) are staged like brown.
    ('cave_1', 'SecretBase_BrownCave1'), ('cave_2', 'SecretBase_BrownCave2'), ('cave_3', 'SecretBase_BrownCave3'),
    ('cave_4', 'SecretBase_BrownCave4'),
    ('cave_red_1', 'SecretBase_RedCave1'), ('cave_red_2', 'SecretBase_RedCave2'),
    ('cave_red_3', 'SecretBase_RedCave3'), ('cave_red_4', 'SecretBase_RedCave4'),
    ('cave_blue_1', 'SecretBase_BlueCave1'), ('cave_blue_2', 'SecretBase_BlueCave2'),
    ('cave_blue_3', 'SecretBase_BlueCave3'), ('cave_blue_4', 'SecretBase_BlueCave4'),
    ('cave_yellow_1', 'SecretBase_YellowCave1'), ('cave_yellow_2', 'SecretBase_YellowCave2'),
    ('cave_yellow_3', 'SecretBase_YellowCave3'), ('cave_yellow_4', 'SecretBase_YellowCave4'),
    ('tree_1', 'SecretBase_Tree1'), ('tree_2', 'SecretBase_Tree2'), ('tree_3', 'SecretBase_Tree3'),
    ('tree_4', 'SecretBase_Tree4'),
    ('bush_1', 'SecretBase_Shrub1'), ('bush_2', 'SecretBase_Shrub2'), ('bush_3', 'SecretBase_Shrub3'),
    ('bush_4', 'SecretBase_Shrub4'),
]

def THEME_OF(lid):
    """lid → clé Tilesets : cave_red_2 → 'red_cave' ; tree_4 → 'tree' ;
    bush_3 → 'bush' ; cave_1 → 'cave' (brune, historique)."""
    if lid.startswith('cave_red'): return 'red_cave'
    if lid.startswith('cave_blue'): return 'blue_cave'
    if lid.startswith('cave_yellow'): return 'yellow_cave'
    if lid.startswith('tree'): return 'tree'
    if lid.startswith('bush'): return 'bush'
    return 'cave'

def canon_blocks(name):
    sub = re.sub(r'([a-z])([A-Z])', r'\1_\2', name.replace('SecretBase_', '')).upper()
    data = json.load(open(os.path.join(CACHE, 'data/layouts/layouts.json')))
    lay = next(l for l in data['layouts'] if l['id'] == 'LAYOUT_SECRET_BASE_' + sub)
    w, h = lay['width'], lay['height']
    raw = open(os.path.join(CACHE, f'data/layouts/{name}/map.bin'), 'rb').read()
    assert len(raw) == w * h * 2, (name, len(raw), w * h * 2)
    return w, h, [struct.unpack_from('<H', raw, i * 2)[0] & 0x3FF for i in range(w * h)]

def bake_layouts():
    """DEFINITIVE 2D backgrounds: straight rendering of the canon map.bin
    (exact transitions — native autotiling of the official data, no composition).
    544 (arrival/spawn point) is an in-game invisible MARKER: floor 522."""
    for lid, name in CANON_LAYOUTS:
        theme = THEME_OF(lid)
        ts = Tilesets(theme)
        w, h, mids = canon_blocks(name)
        im = Image.new('RGB', (w * 16, h * 16))
        for b, mid in enumerate(mids):
            im.paste(ts.metatile_full(522 if mid == 544 else mid), ((b % w) * 16, (b // w) * 16))
        os.makedirs(OUT, exist_ok=True)
        p = os.path.join(OUT, f'{lid}.png')
        im.save(p)
        print('fond', lid, f'{w}x{h}', '→', os.path.relpath(p, ROOT))

# 3D shell textures: real Emerald metatiles, 80×16 atlas per theme
# [floor(522), wallTop(528), wallFace(530), rock(526), entrance(524)]
def bake_tex3d():
    atlas_out = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'bg', 'emerald')
    for theme in ('cave', 'tree', 'bush'):
        ts = Tilesets(theme)
        im = Image.new('RGB', (16 * 5, 16))
        for i, mid in enumerate((522, 528, 530, 526, 524)):
            im.paste(ts.metatile_full(mid), (i * 16, 0))
        os.makedirs(atlas_out, exist_ok=True)
        p = os.path.join(atlas_out, f'tex3d_{theme}.png')
        im.save(p)
        print('tex3d', theme, '→', os.path.relpath(p, ROOT))

# Cell classification (collision bits + metatile nature)
def canon_grids():
    """GAME grid per layout — '.' floor, '#' wall/void, 'o' hole/rock
    (board-fillable), 'E' exit mat (524), 'S' arrival point
    (544: where the player appears when entering the base)."""
    out = {}
    for lid, name in CANON_LAYOUTS:
        theme = THEME_OF(lid)
        w, h, mids_raw = canon_blocks(name)
        raw = open(os.path.join(CACHE, f'data/layouts/{name}/map.bin'), 'rb').read()
        rows = []
        for y in range(h):
            row = []
            for x in range(w):
                i = y * w + x
                b = struct.unpack_from('<H', raw, i * 2)[0]
                mid = b & 0x3FF
                blocked = bool((b >> 10) & 3)
                if mid == 524: row.append('E')       # exit mat
                elif mid == 544: row.append('S')     # arrival point (spawn)
                elif mid == 526: row.append('o')     # fillable rock/hole
                elif mid in (546, 547): row.append('o')  # twin 1×2 hollows (‘4’-shaped rooms), board-fillable
                elif blocked:  row.append('#')
                else:          row.append('.')
            rows.append(''.join(row))
        out[lid] = rows
    return out

def dump_grids():
    grids = canon_grids()
    print(json.dumps(grids, indent=2, ensure_ascii=False))

# ——— CANON decoration sprites (phase 37) ———
# RSE furniture placed in the base are METATILES of the secret_base tileset
# (pret/pokeemerald: src/data/decoration/tiles.h + header.h). We render the
# TOP layer only (RGBA, transparent): the room floor stays visible around,
# exactly like in-game. References persisted in tools/emerald-ref/decor/.
DECOR_DIR = os.path.join(CACHE, 'decor')
DECOR_OUT = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'emerald')

def decor_refs():
    """→ (gfx, shapes): gfx[NAME] = [GBA metatile ids]; shapes[DECOR_NAME] =
    (w, h, gfxName) — parsing tiles.h + header.h from the decompilation."""
    labels = {}
    for m in re.finditer(r'#define\s+(METATILE_\w+)\s+(0x[0-9A-Fa-f]+|\d+)',
                         open(os.path.join(DECOR_DIR, 'metatile_labels.h')).read()):
        labels[m.group(1)] = int(m.group(2), 0)
    gfx = {}
    for m in re.finditer(r'DecorGfx_(\w+)\[\] = \{(.*?)\}',
                         open(os.path.join(DECOR_DIR, 'tiles.h')).read(), re.S):
        gfx[m.group(1)] = [labels['METATILE_SecretBase_' + x]
                           for x in re.findall(r'DECOR_TILE\((\w+)\)', m.group(2))]
    shapes = {}
    for m in re.finditer(r'\[DECOR_(\w+)\] =\s*\{(.*?)\}',
                         open(os.path.join(DECOR_DIR, 'header.h')).read(), re.S):
        sh = re.search(r'DECORSHAPE_(\d)x(\d)', m.group(2))
        tl = re.search(r'DecorGfx_(\w+)', m.group(2))
        if sh and tl and tl.group(1) in gfx:
            shapes[m.group(1)] = (int(sh.group(1)), int(sh.group(2)), tl.group(1))
    return gfx, shapes


def write_manifest_js(man):
    """Passe 40: SCRIPT version of the 2D manifest. The game also runs when
    opened from file:// (double-click), where fetch() is blocked by CORS → the
    manifest must be available as a classic <script> like all other data
    (localization/data.js…). window.PokeWorldBaseManifest2D is read FIRST by
    base-view2d.js / base-window.js; the fetch stays as a fallback for an
    http server."""
    from datetime import datetime, timezone
    out = os.path.join(ROOT, 'src', 'data', 'base-manifest-2d-data.js')
    body = json.dumps(man, ensure_ascii=False, separators=(',', ':'))
    with open(out, 'w') as f:
        f.write('// GENERATED by tools/bake-emerald-bgs.py — do not edit by hand.\n')
        f.write('// Secret base sprite manifest (script version: file:// compatible).\n')
        f.write('window.PokeWorldBaseManifest2D = ')
        f.write(body)
        f.write(';\n')
    print('JS manifest written →', os.path.relpath(out, ROOT))

def bake_decor(pairs):
    """pairs = [(catalog slug, DECOR_NAME)]. RGBA baking (high layer,
    index 0 transparent) of each decoration metatile, then row-major
    folding per the DECORSHAPE_WxH shape (e.g. BIG_PLANT 2x2)."""
    from PIL import Image as _I
    gfx, shapes = decor_refs()
    ts = Tilesets('cave')  # the top decorative tiles are shared by the 3 themes
    man_path = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'manifest.render2d.json')
    man = json.load(open(man_path))
    os.makedirs(DECOR_OUT, exist_ok=True)
    for slug, dname in pairs:
        p = os.path.join(DECOR_OUT, f'{slug}.png')
        assert dname in shapes, f'unknown DECOR_{dname} (or without gfx)'
        w, h, gname = shapes[dname]
        mids = gfx[gname]
        assert len(mids) == w * h, (dname, w, h, len(mids))
        im = _I.new('RGBA', (w * 16, h * 16), (0, 0, 0, 0))
        for i, mid in enumerate(mids):
            data = ts.meta_p if mid < NUM_META_PRIMARY else ts.meta_s
            idx = mid if mid < NUM_META_PRIMARY else mid - NUM_META_PRIMARY
            entries = struct.unpack_from('<8H', data, idx * 16)
            # TOP layer ONLY, index 0 transparent (the room floor stays)
            for j, e in enumerate(entries[4:8]):
                tid = e & 0x3FF
                if tid == 0: continue
                hf = bool(e & 0x400); vf = bool(e & 0x800); slot = (e >> 12) & 0xF
                tiles = ts.tiles_p if tid < NUM_TILES_PRIMARY else ts.tiles_s
                tix = tid if tid < NUM_TILES_PRIMARY else tid - NUM_TILES_PRIMARY
                tim, lp, tw, th = tiles
                if tw == 0 or tix >= tw * th: continue
                sx, sy = (tix % tw) * 8, (tix // tw) * 8
                pal = ts.palette(slot)
                for y in range(8):
                    for x in range(8):
                        ci = lp[sx + (7 - x if hf else x), sy + (7 - y if vf else y)] & 0xF
                        if ci == 0: continue
                        im.putpixel(((i % w) * 16 + (j % 2) * 8 + x,
                                     (i // w) * 16 + (j // 2) * 8 + y), pal[ci] + (255,))
        p = os.path.join(DECOR_OUT, f'{slug}.png')
        im.save(p)
        man['items'].setdefault(slug, {})['emerald'] = os.path.relpath(p, ROOT)
        print('décor', slug, f'{w}x{h} ({dname})', '→', os.path.relpath(p, ROOT))
    json.dump(man, open(man_path, 'w'), indent=1, ensure_ascii=False)
    write_manifest_js(man)
    print('2D manifest updated')

# Passe 39 : mapping CATALOGUE complet -> DECOR_* du desassemblage (canon RSE).
# Every object with an RSE equivalent is baked from its DECOR_TILE; the
# slugs without an RSE equivalent (cushions, ORAS mats, masks, warp/spin/pitfall
# boards, proclamation, confetti…) keep the 2D dot.
# Assumed approximations (~ comment): ORAS object without its own RSE art,
# take the visually closest RSE decor.
# Phase 42: CANON CATALOG — each entry = the official RSE DECOR_*
# (tileset metatiles, 'metatile' mode). Dolls/cushions = native objgfx.
DECOR_MAP = [
    ('small_desk', 'SMALL_DESK'),
    ('pokemon_desk', 'POKEMON_DESK'),
    ('heavy_desk', 'HEAVY_DESK'),
    ('ragged_desk', 'RAGGED_DESK'),
    ('comfort_desk', 'COMFORT_DESK'),
    ('pretty_desk', 'PRETTY_DESK'),
    ('brick_desk', 'BRICK_DESK'),
    ('camp_desk', 'CAMP_DESK'),
    ('hard_desk', 'HARD_DESK'),
    ('small_chair', 'SMALL_CHAIR'),
    ('pokemon_chair', 'POKEMON_CHAIR'),
    ('heavy_chair', 'HEAVY_CHAIR'),
    ('pretty_chair', 'PRETTY_CHAIR'),
    ('comfort_chair', 'COMFORT_CHAIR'),
    ('ragged_chair', 'RAGGED_CHAIR'),
    ('brick_chair', 'BRICK_CHAIR'),
    ('camp_chair', 'CAMP_CHAIR'),
    ('hard_chair', 'HARD_CHAIR'),
    ('red_plant', 'RED_PLANT'),
    ('tropical_plant', 'TROPICAL_PLANT'),
    ('pretty_flowers', 'PRETTY_FLOWERS'),
    ('colorful_plant', 'COLORFUL_PLANT'),
    ('big_plant', 'BIG_PLANT'),
    ('gorgeous_plant', 'GORGEOUS_PLANT'),
    ('red_brick', 'RED_BRICK'),
    ('yellow_brick', 'YELLOW_BRICK'),
    ('blue_brick', 'BLUE_BRICK'),
    ('red_balloon', 'RED_BALLOON'),
    ('blue_balloon', 'BLUE_BALLOON'),
    ('yellow_balloon', 'YELLOW_BALLOON'),
    ('red_tent', 'RED_TENT'),
    ('blue_tent', 'BLUE_TENT'),
    ('solid_board', 'SOLID_BOARD'),
    ('slide', 'SLIDE'),
    ('fence_length', 'FENCE_LENGTH'),
    ('fence_width', 'FENCE_WIDTH'),
    ('tire', 'TIRE'),
    ('stand', 'STAND'),
    ('mud_ball', 'MUD_BALL'),
    ('breakable_door', 'BREAKABLE_DOOR'),
    ('sand_ornament', 'SAND_ORNAMENT'),
    ('silver_shield', 'SILVER_SHIELD'),
    ('gold_shield', 'GOLD_SHIELD'),
    ('glass_ornament', 'GLASS_ORNAMENT'),
    ('tv', 'TV'),
    ('round_tv', 'ROUND_TV'),
    ('cute_tv', 'CUTE_TV'),
    ('glitter_mat', 'GLITTER_MAT'),
    ('jump_mat', 'JUMP_MAT'),
    ('spin_mat', 'SPIN_MAT'),
    ('c_low_note_mat', 'C_LOW_NOTE_MAT'),
    ('d_note_mat', 'D_NOTE_MAT'),
    ('e_note_mat', 'E_NOTE_MAT'),
    ('f_note_mat', 'F_NOTE_MAT'),
    ('g_note_mat', 'G_NOTE_MAT'),
    ('a_note_mat', 'A_NOTE_MAT'),
    ('b_note_mat', 'B_NOTE_MAT'),
    ('c_high_note_mat', 'C_HIGH_NOTE_MAT'),
    ('surf_mat', 'SURF_MAT'),
    ('thunder_mat', 'THUNDER_MAT'),
    ('fire_blast_mat', 'FIRE_BLAST_MAT'),
    ('powder_snow_mat', 'POWDER_SNOW_MAT'),
    ('attract_mat', 'ATTRACT_MAT'),
    ('fissure_mat', 'FISSURE_MAT'),
    ('spikes_mat', 'SPIKES_MAT'),
    ('ball_poster', 'BALL_POSTER'),
    ('green_poster', 'GREEN_POSTER'),
    ('red_poster', 'RED_POSTER'),
    ('blue_poster', 'BLUE_POSTER'),
    ('cute_poster', 'CUTE_POSTER'),
    ('pika_poster', 'PIKA_POSTER'),
    ('long_poster', 'LONG_POSTER'),
    ('sea_poster', 'SEA_POSTER'),
    ('sky_poster', 'SKY_POSTER'),
    ('kiss_poster', 'KISS_POSTER'),
]

# Phase 39: dolls and cushions = RSE OBJECT SPRITES (OBJ_EVENT_GFX_*),
# not metatiles — offline staging tools/emerald-ref/objgfx/ (sources.json).
def bake_objgfx():
    from PIL import Image as _I
    stage = os.path.join(DECOR_DIR, '..', 'objgfx')
    man_path = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'manifest.render2d.json')
    man = json.load(open(man_path))
    os.makedirs(DECOR_OUT, exist_ok=True)
    for fn in sorted(os.listdir(stage)):
        slug, ext = os.path.splitext(fn)
        if ext != '.png':
            continue
        src = _I.open(os.path.join(stage, fn))
        im = src.convert('RGBA')
        if src.mode == 'P':  # index 0 = transparent background (GBA object sprites)
            px = src.load()
            argb = im.load()
            for yy in range(im.height):
                for xx in range(im.width):
                    if px[xx, yy] == 0:
                        argb[xx, yy] = (0, 0, 0, 0)
        p = os.path.join(DECOR_OUT, f'{slug}.png')
        im.save(p)
        man['items'].setdefault(slug, {})['emerald'] = os.path.relpath(p, ROOT)
        print('objgfx', slug, f'{im.width}x{im.height}', '→', os.path.relpath(p, ROOT))
    json.dump(man, open(man_path, 'w'), indent=1, ensure_ascii=False)
    write_manifest_js(man)
    print('2D manifest updated (objgfx)')


# ——— Backgrounds for the two-level CUSTOM templates (passe 40) —————————————
# Single source = src/data/base-layouts-data.js ('^'/'='/'a' blocks), no
# duplication. Composition: 523 rock, 522 floor, 526 hole, 524 mat;
# mezzanine = lightened floor, cliff = darkened rock + light rim at contact.

def read_custom_shapes():
    """→ {lid: rows} for ALL the custom templates (canon: null) of
    base-layouts-data — passe 42: 12 two-level rooms (cave/tree/bush +
    red/blue/yellow caves 5 & 6)."""
    js = open(os.path.join(ROOT, 'src', 'data', 'base-layouts-data.js')).read()
    out = {}
    for m in re.finditer(r"^  (\w+):\s*\{\s*canon: null.*?rows:\s*\[(.*?)\]", js, re.S | re.M):
        out[m.group(1)] = re.findall(r"'([^']*)'", m.group(2))
    return out

def bake_custom_layouts():
    from PIL import ImageEnhance as _E
    shapes = read_custom_shapes()
    LOWISH = set('.aoSE')   # "low" cells (exposed side of a height)
    def atc(rows, x, y):
        if y < 0 or y >= len(rows) or x < 0 or x >= len(rows[y]): return 'x'
        return rows[y][x]
    for lid, rows in sorted(shapes.items()):
        theme = THEME_OF(lid)
        ts = Tilesets(theme)
        w, h = len(rows[0]), len(rows)
        im = Image.new('RGB', (w * 16, h * 16))
        ROCK, FLOOR, HOLE, MAT = 523, 522, 526, 524
        # phase 43: CLEARLY VISIBLE height difference, ORAS style (user
        #  mezzanine = floor x1.30 with a north->south GRADIENT (the top
        #              "catches the light": very light at the back, dimmed
        #              at the edge);
        #  cliff     = rocky TEXTURE darkened x0.42 with 4 dark STRATA
        #              sunken (wall read as HEIGHT) + ink stroke under
        #              the ledge + bright top edge (2 px x1.45);
        #  LONG cast shadow (13 px) with a strong gradient on the lower floor.
        # passe 44: ORGANIC shapes (user request “rooms not
        #  square”) — west/east SIDE faces when the plateau is exposed
        #  on the side (dark stratified band + bright edge on the plateau
        #  side), darkened NICHE on the cliff cell overhanging a stair
        #  anchor, side shadows in the alcoves.
        d_cliff = _E.Brightness(ts.metatile_full(ROCK)).enhance(0.42)
        cp = d_cliff.load()
        for yy in (4, 8, 11, 14):  # wall strata
            for xx in range(16):
                if yy < 16:
                    r, g, b = cp[xx, yy]
                    cp[xx, yy] = (int(r * 0.62), int(g * 0.62), int(b * 0.62))
        rim = _E.Brightness(ts.metatile_full(ROCK)).enhance(1.45).crop((0, 0, 16, 2))
        ink_ln = _E.Brightness(ts.metatile_full(ROCK)).enhance(0.30).crop((0, 0, 16, 1))
        base_d = _E.Brightness(ts.metatile_full(ROCK)).enhance(0.30).crop((0, 14, 16, 16))
        # side face (west/east recess of a height): very dark rock
        # stratifié + arête claire côté plateau (1 px)
        side = _E.Brightness(ts.metatile_full(ROCK)).enhance(0.34).crop((0, 0, 4, 16))
        sp = side.load()
        for yy in (4, 8, 12):
            for xx in range(4):
                r, g, b = sp[xx, yy]
                sp[xx, yy] = (int(r * 0.60), int(g * 0.60), int(b * 0.60))
        side_hi = _E.Brightness(ts.metatile_full(ROCK)).enhance(1.35).crop((0, 0, 1, 16))
        # grooves of the stair niche ('=' whose south is an 'a' anchor)
        notch = _E.Brightness(ts.metatile_full(ROCK)).enhance(0.24).crop((0, 2, 2, 16))
        # vertical gradient of the mezzanine: 1.30 north -> 1.14 south
        d_hi_rows = []
        for i in range(16):
            k = 1.30 - (1.30 - 1.14) * (i / 15.0)
            d_hi_rows.append(_E.Brightness(ts.metatile_full(FLOOR)).enhance(k).crop((0, i, 16, i + 1)))
        for y in range(h):
            for x in range(w):
                ch = rows[y][x]
                if ch == '#':
                    # phase 47: border/corner chosen by neighbors (canon)
                    # Phase 54 (user feedback: "the tiles around doors
                    # should be flat but they curve downward"): the ENTRY
                    # counts as SOLID for its neighbors' autotiling. Treated
                    # as void, it made the two walls framing it pick a concave
                    # corner (0x207 / 0x205): the lower wall curved around
                    # the door instead of staying straight.
                    # Verified on the 24 canon maps: "E = solid" yields the
                    # flat wall 0x212 in 38 cases out of 38; "E = void", 0 times.
                    # In canon, the door is a HOLE drilled in a flat wall,
                    # not a notch.
                    mid = wall_metatile(rows, x, y,
                                        lambda R, xx, yy: atc(R, xx, yy) in ('#', 'x', 'E'),
                                        ROCK)
                    im.paste(ts.metatile_full(mid), (x * 16, y * 16))
                elif ch == 'o': im.paste(ts.metatile_full(HOLE), (x * 16, y * 16))
                elif ch == 'E': im.paste(ts.metatile_full(MAT), (x * 16, y * 16))
                elif ch == '=':
                    im.paste(d_cliff, (x * 16, y * 16))
                    if y > 0 and rows[y - 1][x] == '^':
                        im.paste(rim, (x * 16, y * 16))
                        im.paste(ink_ln, (x * 16, y * 16 + 2))
                    im.paste(base_d, (x * 16, y * 16 + 14))
                    # exposed west/east flank (alcove / plateau setback)
                    if atc(rows, x - 1, y) in LOWISH:
                        im.paste(side, (x * 16, y * 16))
                    if atc(rows, x + 1, y) in LOWISH:
                        im.paste(side.transpose(Image.FLIP_LEFT_RIGHT), (x * 16 + 12, y * 16))
                    # stair niche: inner vertical grooves of the recess
                    if atc(rows, x, y + 1) == 'a':
                        im.paste(notch, (x * 16, y * 16))
                        im.paste(notch.transpose(Image.FLIP_LEFT_RIGHT), (x * 16 + 14, y * 16))
                elif ch == '^':
                    for i in range(16):
                        im.paste(d_hi_rows[i], (x * 16, y * 16 + i))
                    # side faces (plateau exposed on the side — shapes)
                    if atc(rows, x - 1, y) in LOWISH:
                        im.paste(side, (x * 16, y * 16))
                        im.paste(side_hi, (x * 16 + 4, y * 16))
                    if atc(rows, x + 1, y) in LOWISH:
                        im.paste(side.transpose(Image.FLIP_LEFT_RIGHT), (x * 16 + 12, y * 16))
                        im.paste(side_hi, (x * 16 + 11, y * 16))
                else: im.paste(ts.metatile_full(FLOOR), (x * 16, y * 16))
        # Phase 53 (user feedback: "the wall (height) must be exactly one
        # tile high"): the cast shadow at the cliffs' foot ran a 13 px
        # gradient onto the NEXT tile. Visually, the cliff looked
        # 16 + 13 = 29 px high — nearly two tiles — and the eye
        # placed the floor edge 13 px too low, hence the feeling of
        # "tiles not the right size" and misaligned furniture.
        # The shadow is cut to 4 px: it marks ground contact without ever
        # visually encroaching on the tile below.
        px = im.load()
        for y in range(h):
            for x in range(w):
                if rows[y][x] in ('.', 'a', 'S') and y > 0 and rows[y - 1][x] == '=':
                    for yy in range(4):
                        k = 0.55 + 0.45 * (yy / 3.0)
                        for xx in range(16):
                            r, g, b = px[x * 16 + xx, y * 16 + yy]
                            px[x * 16 + xx, y * 16 + yy] = (int(r * k), int(g * k), int(b * k))
        for y in range(h):
            for x in range(w):
                if rows[y][x] not in ('.', 'a', 'S', 'E'): continue
                for dx in (-1, 1):
                    if atc(rows, x + dx, y) != '=': continue
                    for xx in range(4):
                        k = 0.62 + 0.38 * (xx / 3.0)
                        col = x * 16 + (xx if dx < 0 else 15 - xx)
                        for yy in range(16):
                            r, g, b = px[col, y * 16 + yy]
                            px[col, y * 16 + yy] = (int(r * k), int(g * k), int(b * k))
        os.makedirs(OUT, exist_ok=True)
        p = os.path.join(OUT, f'{lid}.png')
        im.save(p)
        print('fond(perso)', lid, f'{w}x{h}', '→', os.path.relpath(p, ROOT))

def bake_stairs_sprite():
    """‘stairs’ sprite v9 (passe 46, user feedback).

    Two complaints about v8: (1) “it must be the same size all the time”
    — v8 was a perspective trapezoid, so the steps SHRANK upward and the
    flight connected neither to its own cell nor to itself when two were
    placed; (2) “rather in wood like the boards to stay
    in the same art direction”.

    v9: wooden staircase with CONSTANT WIDTH (32 px wall to wall over its
    full height, no perspective), 6 steps drawn as so many horizontal
    PLANKS, with the EXACT palette of `solid_board` (the game's board):
      lit nosing #c6b777 · tread #b4a462 · riser #948341 ·
      grain #7b6220 · ink #525252.
    Each step = light nosing + tread + low grain + inked joint; constant
    vertical side stringers, like the board's crosspieces.

    Gameplay footprint unchanged: 2×2, BOTH columns walkable.
    """
    from PIL import ImageDraw as _D
    INK = (0x52, 0x52, 0x52, 255)
    W_L = (0xc6, 0xb7, 0x77, 255)   # step nosing (light top-left)
    W_M = (0xb4, 0xa4, 0x62, 255)   # base wood — identical to solid_board
    W_S = (0x94, 0x83, 0x41, 255)   # riser in shadow
    W_D = (0x7b, 0x62, 0x20, 255)   # grain / dark stringer

    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    d = _D.Draw(im)
    N = 6
    ys = [round(i * 32 / N) for i in range(N + 1)]
    for i in range(N):
        y0, y1 = ys[i], ys[i + 1]
        d.rectangle([2, y0, 29, y1 - 1], fill=W_S)      # riser
        d.rectangle([2, y0, 29, y0], fill=W_L)          # nez éclairé
        d.rectangle([2, y0 + 1, 29, y1 - 3], fill=W_M)  # board face
        d.rectangle([2, y1 - 2, 29, y1 - 2], fill=W_D)  # low grain
        d.rectangle([2, y1 - 1, 29, y1 - 1], fill=INK)  # joint between steps
    d.rectangle([0, 0, 1, 31], fill=INK)                # limons constants
    d.rectangle([2, 0, 2, 31], fill=W_L)
    d.rectangle([29, 0, 29, 31], fill=W_D)
    d.rectangle([30, 0, 31, 31], fill=INK)
    d.rectangle([0, 0, 31, 0], fill=INK)                # top edge

    p = os.path.join(DECOR_OUT, 'stairs.png')
    im.save(p)
    man_path = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'manifest.render2d.json')
    man = json.load(open(man_path))
    man['items'].setdefault('stairs', {})['emerald'] = os.path.relpath(p, ROOT)
    # phase 43: the people manifest must no longer reference "hero"
    if 'people' in man:
        man['people'].pop('hero', None)
    json.dump(man, open(man_path, 'w'), indent=1, ensure_ascii=False)
    write_manifest_js(man)
    print('objgfx(custom) stairs 32x32 (v9 wood CONSTANT WIDTH, 6 steps, '
          '2 COLUMNS, solid_board palette) →', os.path.relpath(p, ROOT))


def bake_canon():
    """Passe 42: ALL sprites of the RSE canon catalog + the real PC.
    - 119 decors: DecorGfx metatiles (already the same for furniture) — the
      dolls/cushions stay on objgfx (real staged GBA sprites);
    - pc.png: metatile METATILE_SecretBase_PC (0x220) from the tileset, high
      layer index 0 transparent (the authentic grey-blue computer);
    - manifest purged of off-canon entries (transformed ORAS removed)."""
    from PIL import Image as _I
    gfx, shapes = decor_refs()
    canon = json.load(open(os.path.join(CACHE, 'canon-decor.json')))
    ts = Tilesets('cave')
    man_path = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'manifest.render2d.json')
    os.makedirs(DECOR_OUT, exist_ok=True)
    done = 0
    skip = {'NONE'}
    # manifest RELOADED before baking the PC
    man = json.load(open(man_path))
    # ——— Authentic PC: metatile 0x220 (high layer, transparent background) ———
    MID_PC = 0x220
    data = ts.meta_p if MID_PC < NUM_META_PRIMARY else ts.meta_s
    idx = MID_PC if MID_PC < NUM_META_PRIMARY else MID_PC - NUM_META_PRIMARY
    entries = struct.unpack_from('<8H', data, idx * 16)
    im = _I.new('RGBA', (16, 16), (0, 0, 0, 0))
    for j, e in enumerate(entries[4:8]):
        tid = e & 0x3FF
        if tid == 0:
            continue
        hf = bool(e & 0x400); vf = bool(e & 0x800); slot = (e >> 12) & 0xF
        tiles = ts.tiles_p if tid < NUM_TILES_PRIMARY else ts.tiles_s
        tix = tid if tid < NUM_TILES_PRIMARY else tid - NUM_TILES_PRIMARY
        tim, lp, tw, th = tiles
        if tw == 0 or tix >= tw * th:
            continue
        sx, sy = (tix % tw) * 8, (tix // tw) * 8
        pal = ts.palette(slot)
        for y in range(8):
            for x in range(8):
                ci = lp[sx + (7 - x if hf else x), sy + (7 - y if vf else y)] & 0xF
                if ci == 0:
                    continue
                im.putpixel(((j % 2) * 8 + x, (j // 2) * 8 + y), pal[ci] + (255,))
    p = os.path.join(DECOR_OUT, 'pc.png')
    im.save(p)
    man['items'].setdefault('pc', {})['emerald'] = os.path.relpath(p, ROOT)
    json.dump(man, open(man_path, 'w'), indent=1, ensure_ascii=False)
    bake_objgfx()
    bake_stairs_sprite()
    man = json.load(open(man_path))
    canon_slugs = {k.replace('DECOR_', '').lower() for k in canon if k != 'DECOR_NONE'}
    keep = canon_slugs | {'pc', 'stairs'}  # phase 43: welcome_mat removed from the game
    removed = [s for s in list(man['items']) if s not in keep]
    for s in removed:
        del man['items'][s]
        fp = os.path.join(ROOT, 'src/assets/images/secret-base/emerald', s + '.png'.replace('/', os.sep))
        if os.path.exists(fp):
            os.remove(fp)
    man['comment'] = ('2D renderer — RSE CANON (passe 42): each entry is the '
                      'native Emerald sprite (DecorGfx metatiles or official objgfx). '
                      'Generated by tools/bake-emerald-bgs.py --bake-canon.')
    man['people'] = {'player': 'src/assets/images/trainers/profil/trainer-54.png'}
    sprites = {e['emerald'].split('/')[-1] for e in man['items'].values() if e.get('emerald')}
    man['stats'] = {
        'sprites': len(sprites),
        'items': len(man['items']),
        'people': ['player'],
    }
    json.dump(man, open(man_path, 'w'), indent=1, ensure_ascii=False)
    write_manifest_js(man)
    print(f'bake_canon: Emerald decors + objgfx + authentic 16x16 pc; '
          f'{len(removed)} off-canon sprites purged ({", ".join(sorted(removed))})')

if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else '--bake-layouts'
    if mode == '--bake-decor':  # python3 ... --bake-decor slug DECOR_NAME [...]
        args = sys.argv[2:]
        assert len(args) % 2 == 0 and args, 'usage: --bake-decor slug DECOR_NAME ...'
        bake_decor([(args[i], args[i + 1]) for i in range(0, len(args), 2)])
    elif mode == '--bake-decor-all':
        bake_decor(DECOR_MAP)
    elif mode == '--bake-canon':
        bake_canon()
    elif mode == '--bake-objgfx':
        bake_objgfx()
    elif False: pass
    if mode == '--render-canonical':
        for _, name in CANON_LAYOUTS:
            theme = 'cave' if 'BrownCave' in name else ('tree' if 'Tree' in name else 'bush')
            render_canonical(name, theme)
    elif mode == '--bake-layouts':
        bake_layouts()
    elif mode == '--bake-custom':
        bake_custom_layouts()
        bake_stairs_sprite()
    elif mode == '--bake-tex3d':
        bake_tex3d()
    elif mode == '--dump-grids':
        dump_grids()
    elif mode == '--atlas':
        theme = sys.argv[2] if len(sys.argv) > 2 else 'cave'
        n = int(sys.argv[3]) if len(sys.argv) > 3 else 324
        render_atlas(theme, list(range(n)), os.path.join(ROOT, 'out', f'atlas_{theme}.png'))


