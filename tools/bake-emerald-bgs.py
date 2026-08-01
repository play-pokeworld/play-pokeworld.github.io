#!/usr/bin/env python3
# ============================================================================
# OUTIL — Cuisson des fonds Émeraude authentiques (GBA tilesets, pret/pokeemerald)
# ----------------------------------------------------------------------------
# Rend les VRAIS tiles GBA : palettes JASC-PAL + tiles.png par type de base
# (brown_cave/tree/shrub) + metatiles.bin (général 512 + secret_base 324) +
# blocks de layout (u16 : low10 = metatile, bits10-11 collision, bits12-15 elev).
#
#   --render-canonical   fonds canon (SecretBase_BrownCave1/Tree1/Shrub1) pour
#                        référence visuelle + audit des métatiles
#   --render-grids       les 9 fonds du jeu (grilles ASCII de base-layouts-data.js
#                        habillées avec les métatiles canon choisis)
# Sortie : src/assets/images/secret-base/bg/emerald/<layout>.png
# ============================================================================
import json, os, re, struct, sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', 'emerald-ref')  # staging persisté DANS le
# projet (passe 37 : .cache n'est pas restauré entre sessions)
OUT = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'bg', 'emerald')

# Passe 47 — AUTOTILING des murs (retour utilisateur : « les assets bouclent
# mal par rapport aux blocs posés à côté, contrairement aux autres salles »).
# Les salles CANON n'utilisent pas une tuile de roche unique : elles emploient
# tout un jeu de bordures et de coins (0x201..0x213, 0x220…). La table
# ci-dessous a été APPRISE automatiquement sur les 24 maps canon du
# désassemblage : pour chaque voisinage 8-connexe de cellules solides
# (bits NW,N,NE,W,E,SW,S,SE) elle donne le métatile employé par Game Freak.
# Générée par l'analyse de data/layouts/*/map.bin ; voir emerald-ref/autotile-walls.json.
def load_wall_autotile():
    p = os.path.join(CACHE, 'autotile-walls.json')
    try:
        raw = json.load(open(p))
        return {int(k): v for k, v in raw.items()}
    except Exception:
        return {}

WALL_AUTOTILE = load_wall_autotile()

def wall_metatile(rows, x, y, solid_of, fallback):
    """Métatile de mur pour (x,y) selon le voisinage — règles canon RSE."""
    m = 0
    for i, (dx, dy) in enumerate([(-1, -1), (0, -1), (1, -1), (-1, 0),
                                  (1, 0), (-1, 1), (0, 1), (1, 1)]):
        if solid_of(rows, x + dx, y + dy):
            m |= (1 << i)
    return WALL_AUTOTILE.get(m, fallback)


NUM_META_PRIMARY = 512
NUM_TILES_PRIMARY = 512
SPLIT_PAL = 6  # slots 0-5 → primaire (gTileset_SecretBase), slot 6 → secondaire
               # (brown_cave/tree/shrub) — prouvé par les références réelles des
               # métatiles utilisés : tuiles P avec slots {0..5}, tuiles S avec {6}

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
    return (im, px, w // 8, h // 8)  # image + accès + tuiles par ligne

def parse_jasc_dir(d):
    return [load_pal(os.path.join(d, '%02d.pal' % i)) if os.path.exists(os.path.join(d, '%02d.pal' % i))
            else [(0, 0, 0)] * 16 for i in range(16)]

class Tilesets:
    def __init__(self, theme):
        sec = {'cave': 'brown_cave', 'red_cave': 'red_cave', 'blue_cave': 'blue_cave',
               'yellow_cave': 'yellow_cave', 'tree': 'tree', 'bush': 'shrub'}[theme]
        # PRIMAIRE = gTileset_SecretBase (PAS general !) : les layouts de bases
        # secrètes déclarent primary_tileset=gTileset_SecretBase — c'est là que
        # vivent les tuiles + palettes des DÉCORATIONS (posters rouges = rouge…)
        # et le split slot<6 → primaire / slot 6 → secondaire est prouvé par le
        # croisement des références réelles de metatiles.bin (slots 0-5 tuiles
        # primaires, slot 6 tuiles secondaires).
        self.pal_p = parse_jasc_dir(os.path.join(CACHE, 'data/tilesets/primary/secret_base/palettes'))
        self.pal_s = parse_jasc_dir(os.path.join(CACHE, f'data/tilesets/secondary/secret_base/{sec}/palettes'))
        self.tiles_p = load_tiles(os.path.join(CACHE, 'data/tilesets/primary/secret_base/tiles.png'))
        self.tiles_s = load_tiles(os.path.join(CACHE, f'data/tilesets/secondary/secret_base/{sec}/tiles.png'))
        self.meta_p = open(os.path.join(CACHE, 'data/tilesets/primary/general/metatiles.bin'), 'rb').read()
        self.meta_s = open(os.path.join(CACHE, 'data/tilesets/secondary/secret_base/metatiles.bin'), 'rb').read()
        # transparence : slot 0 de chaque palette = transparent si couche haute
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
        # couches RSE : entrées 0-3 = bas (BG bas), 4-7 = haut (BG haut)
        order = entries[4:8] if top else entries[0:4]
        for i, e in enumerate(order):
            tid = e & 0x3FF
            hf = bool(e & 0x400); vf = bool(e & 0x800); slot = (e >> 12) & 0xF
            self.draw_tile(im, tid, (i % 2) * 8, (i // 2) * 8, hf, vf, slot, transparent0=top)
        return im

    def metatile_full(self, mid):
        """couche bas (opaque) + couche haut (slot0 transparent) = vue finale in-game"""
        data = self.meta_p if mid < NUM_META_PRIMARY else self.meta_s
        idx = mid if mid < NUM_META_PRIMARY else mid - NUM_META_PRIMARY
        if idx * 16 + 16 > len(data): idx = 0
        entries = struct.unpack_from('<8H', data, idx * 16)
        im = Image.new('RGB', (16, 16))
        for i, e in enumerate(entries[0:4]):  # couche bas — opaque
            tid = e & 0x3FF
            hf = bool(e & 0x400); vf = bool(e & 0x800); slot = (e >> 12) & 0xF
            self.draw_tile(im, tid, (i % 2) * 8, (i // 2) * 8, hf, vf, slot)
        for i, e in enumerate(entries[4:8]):  # couche haut — index 0 transparent
            tid = e & 0x3FF
            hf = bool(e & 0x400); vf = bool(e & 0x800); slot = (e >> 12) & 0xF
            self.draw_tile(im, tid, (i % 2) * 8, (i // 2) * 8, hf, vf, slot, transparent0=True)
        return im

# ——— Rendu d'un layout canon ———————————————————————————————————————————————
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

# ——— Les 9 fonds du jeu (grilles custom + métatiles canon choisis) ——————————
def grids_parse():
    src = open(os.path.join(ROOT, 'src/data/base-layouts-data.js'), encoding='utf8').read()
    import re
    shapes = {}
    for m in re.finditer(r"(square_a|wide_b|twolevel_a): \{\s*rows: \[(.*?)\]", src, re.S):
        shapes[m.group(1)] = re.findall(r"'([^']*)'", m.group(2))
    return shapes

# ——— Composition des 9 fonds du jeu avec les métatiles canon ———————————————
# IDs extraits POSITIONNELLEMENT des layouts canon (BrownCave1/Tree1/Shrub1
# partagent le même plan de métatiles — vérifié par dump des map.bin) :
MT = {
    'floor': 522, 'void': 528, 'entr': 524,
    'nwall': 514, 'swall': 530, 'wwall': 521, 'ewall': 523,
    'nw': 513, 'ne': 515, 'sw': 529, 'se': 531,          # coins EXTÉRIEURS
    'inw': 527, 'ine': 525, 'isw': 519, 'ise': 517,      # coins INTÉRIEURS
    'cliff': 530,  # face de plateforme = métatile de mur sud (rocher/planche/
                   # sureau selon le thème — le rendu GBA canon des élévations)
}

FLOORISH = set('.E=_A')   # cellules visuellement praticables
SOLID = set('#o')         # # = mur, o = trou bouché

def cell_at(rows, x, y):
    if y < 0 or y >= len(rows) or x < 0 or x >= len(rows[y]): return 'x'
    return rows[y][x]

def metatile_for(rows, x, y):
    c = cell_at(rows, x, y)
    n = cell_at(rows, x, y - 1); s = cell_at(rows, x, y + 1)
    w = cell_at(rows, x - 1, y); e = cell_at(rows, x + 1, y)
    if c == '.':
        # coin intérieur : cellule de sol accolée à deux murs perpendiculaires
        if n in SOLID and w in SOLID: return MT['inw']
        if n in SOLID and e in SOLID: return MT['ine']
        if s in SOLID and w in SOLID: return MT['isw']
        if s in SOLID and e in SOLID: return MT['ise']
        return MT['floor']
    if c == '#':
        # cardinal d'abord (couloirs/épaisseurs), diagonal ensuite (coins)
        if s in FLOORISH: return MT['nwall']
        if n in FLOORISH: return MT['swall']
        if e in FLOORISH: return MT['wwall']
        if w in FLOORISH: return MT['ewall']
        if cell_at(rows, x + 1, y + 1) in FLOORISH: return MT['nw']
        if cell_at(rows, x - 1, y + 1) in FLOORISH: return MT['ne']
        if cell_at(rows, x + 1, y - 1) in FLOORISH: return MT['sw']
        if cell_at(rows, x - 1, y - 1) in FLOORISH: return MT['se']
        return MT['void']
    if c == 'o': return MT['void']       # trou = roche/feuillage plein (bouché)
    if c == 'E': return MT['entr']
    if c == '=': return MT['floor']      # sol haut = même sol (l'élévation est
    if c == '_': return MT['cliff']      #   portée par la falaise + l'escalier)
    if c == 'A': return MT['floor']      # rampe/escalier = sol (2D), le 3D
                                         #   affiche la vraie échelle procédurale
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
    im.save(p)  # natif 16 px/cellule : le canvas 2D agrandit en pixel-art net
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

# ——— Les 9 layouts CANON du jeu (passe 37 : formes GBA officielles) ————————
# id du jeu → dossier pokeemerald. Formes authentiques (plus de grilles
# inventées : les salles sont celles de RSE, tailles réelles 11×9 → 17×8).
CANON_LAYOUTS = [
    # Grottes CANON : 4 couleurs × 4 formes (map.bin du désassemblage) — passe
    # 40 : les 12 manquantes (rouge/bleue/jaune) sont stagées comme brown.
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
    """Fonds 2D DÉFINITIFS : rendu tel quel du map.bin canon (transitions
    exactes — autotiling natif des données officielles, plus de composition).
    544 (point d'arrivée/spawn) est un MARQUEUR invisible in-game : sol 522."""
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

# Textures de la coquille 3D : métatiles Émeraude réels, atlas 80×16 par thème
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

# Classification des cellules (bits de collision + nature du métatile)
def canon_grids():
    """Grille de JEU par layout — '.' sol, '#' mur/vide, 'o' trou/rocher
    (comblable par planche), 'E' tapis de sortie (524), 'S' point d'arrivée
    (544 : là où le joueur apparaît en entrant dans la base)."""
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
                if mid == 524: row.append('E')       # tapis de sortie
                elif mid == 544: row.append('S')     # point d'arrivée (spawn)
                elif mid == 526: row.append('o')     # rocher/trou comblable
                elif mid in (546, 547): row.append('o')  # creux jumeaux 1×2 (salles « 4 »), comblables par planche
                elif blocked:  row.append('#')
                else:          row.append('.')
            rows.append(''.join(row))
        out[lid] = rows
    return out

def dump_grids():
    grids = canon_grids()
    print(json.dumps(grids, indent=2, ensure_ascii=False))

# ——— Sprites de décorations CANON (passe 37) ——————————————————————————————
# Les meubles RSE posés dans la base sont des MÉTATILES du tileset secret_base
# (pret/pokeemerald : src/data/decoration/tiles.h + header.h). On rend la
# couche HAUTE seule (RGBA, transparente) : le sol de la salle reste visible
# autour, exactement comme in-game. Références persistées tools/emerald-ref/decor/.
DECOR_DIR = os.path.join(CACHE, 'decor')
DECOR_OUT = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'emerald')

def decor_refs():
    """→ (gfx, shapes) : gfx[NAME] = [ids métatile GBA] ; shapes[DECOR_NAME] =
    (w, h, gfxName) — parsage de tiles.h + header.h du désassemblage."""
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
    """Passe 40 : version SCRIPT du manifeste 2D. Le jeu tourne aussi ouvert
    en file:// (double-clic), où fetch() est bloque par CORS → le manifeste
    doit etre disponible en <script> classique comme toutes les autres
    donnees (localization/data.js…). window.PokeWorldBaseManifest2D est lu
    EN PRIORITE par base-view2d.js / base-window.js ; le fetch reste en
    repli pour un serveur http."""
    from datetime import datetime, timezone
    out = os.path.join(ROOT, 'src', 'data', 'base-manifest-2d-data.js')
    body = json.dumps(man, ensure_ascii=False, separators=(',', ':'))
    with open(out, 'w') as f:
        f.write('// GENERE par tools/bake-emerald-bgs.py — ne pas editer a la main.\n')
        f.write('// Manifeste sprites base secrete (version script : compatible file://).\n')
        f.write('window.PokeWorldBaseManifest2D = ')
        f.write(body)
        f.write(';\n')
    print('manifeste JS ecrit →', os.path.relpath(out, ROOT))

def bake_decor(pairs):
    """pairs = [(slug catalogue, NOM_DECOR)]. Cuisson RGBA (couche haute,
    index 0 transparent) de chaque métatile de la décoration, puis repliage
    ligne-major selon la forme DECORSHAPE_WxH (ex. BIG_PLANT 2x2)."""
    from PIL import Image as _I
    gfx, shapes = decor_refs()
    ts = Tilesets('cave')  # les tiles décoratifs hauts sont communs aux 3 thèmes
    man_path = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'manifest.render2d.json')
    man = json.load(open(man_path))
    os.makedirs(DECOR_OUT, exist_ok=True)
    for slug, dname in pairs:
        p = os.path.join(DECOR_OUT, f'{slug}.png')
        if os.path.exists(p) and os.path.getsize(p) > 50:
            man['items'].setdefault(slug, {})['emerald'] = os.path.relpath(p, ROOT)
            continue
        assert dname in shapes, f'DECOR_{dname} inconnu (ou sans gfx)'
        w, h, gname = shapes[dname]
        mids = gfx[gname]
        assert len(mids) == w * h, (dname, w, h, len(mids))
        im = _I.new('RGBA', (w * 16, h * 16), (0, 0, 0, 0))
        for i, mid in enumerate(mids):
            data = ts.meta_p if mid < NUM_META_PRIMARY else ts.meta_s
            idx = mid if mid < NUM_META_PRIMARY else mid - NUM_META_PRIMARY
            entries = struct.unpack_from('<8H', data, idx * 16)
            # couche haute SEULE, index 0 transparent (le sol de la salle reste)
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
    print('manifeste 2D mis à jour')

# Passe 39 : mapping CATALOGUE complet -> DECOR_* du desassemblage (canon RSE).
# Tout objet ayant un equivalent RSE est cuit depuis son DECOR_TILE ; les
# slugs sans equivalent RSE (coussins, tapis ORAS, masques, panneaux
# warp/spin/pitfall, proclamation, confettis…) gardent la pastille 2D.
# Approximations assumees (commentaire ~) : objet ORAS sans art RSE propre,
# on prend le decor RSE visuellement le plus proche.
# Passe 42 : CATALOGUE CANON — chaque entree = le DECOR_* officiel RSE
# (metatiles du tileset, mode 'metatile'). Poupées/coussins = objgfx natifs.
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

# Passe 39 : poupées et coussins = SPRITES D'OBJETS RSE (OBJ_EVENT_GFX_*),
# pas des métatiles — staging offline tools/emerald-ref/objgfx/ (sources.json).
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
        if src.mode == 'P':  # index 0 = fond transparent (sprites d'objets GBA)
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
    print('manifeste 2D mis à jour (objgfx)')


# ——— Fonds des gabarits PERSO deux-niveaux (passe 40) —————————————————————
# Source unique = src/data/base-layouts-data.js (blocs '^'/'='/'a'), pas de
# duplication. Composition : 523 rocher, 522 sol, 526 trou, 524 tapis ;
# mezzanine = sol éclairci, falaise = rocher assombri + liseré clair au contact.

def read_custom_shapes():
    """→ {lid: rows} pour TOUS les gabarits perso (canon: null) de
    base-layouts-data — passe 42 : 12 salles deux-niveaux (cave/tree/bush +
    grottes rouge/bleue/jaune 5 & 6)."""
    js = open(os.path.join(ROOT, 'src', 'data', 'base-layouts-data.js')).read()
    out = {}
    for m in re.finditer(r"^  (\w+):\s*\{\s*canon: null.*?rows:\s*\[(.*?)\]", js, re.S | re.M):
        out[m.group(1)] = re.findall(r"'([^']*)'", m.group(2))
    return out

def bake_custom_layouts():
    from PIL import ImageEnhance as _E
    shapes = read_custom_shapes()
    LOWISH = set('.aoSE')   # cellules « basses » (côté exposé d'une hauteur)
    def atc(rows, x, y):
        if y < 0 or y >= len(rows) or x < 0 or x >= len(rows[y]): return 'x'
        return rows[y][x]
    for lid, rows in sorted(shapes.items()):
        theme = THEME_OF(lid)
        ts = Tilesets(theme)
        w, h = len(rows[0]), len(rows)
        im = Image.new('RGB', (w * 16, h * 16))
        ROCK, FLOOR, HOLE, MAT = 523, 522, 526, 524
        # passe 43 : dénivelé BIEN VISIBLE façon ORAS (demande utilisateur) —
        #  mezzanine = sol lisé x1.30 avec DÉGRADÉ nord→sud (le haut « capte
        #              la lumière » : très clair au fond, atténué au bord) ;
        #  falaise   = TEXTURE rocheuse assombrie x0.42 avec 4 STRATES sombres
        #              enfoncées (paroi lue comme TALLLE) + trait d'encre sous
        #              la corniche + arête supérieure lumineuse (2 px x1.45) ;
        #  ombre portée LONGUE (13 px) en dégradé fort sur le sol inférieur.
        # passe 44 : formes ORGANIQUES (demande utilisateur « salles pas
        #  carrées ») — faces LATÉRALES ouest/est quand le plateau est exposé
        #  sur le côté (bande stratifiée sombre + arête claire côté plateau),
        #  NICHE assombrie sur la case falaise qui surplombe une ancre
        #  d'escalier, ombres latérales dans les alcôves.
        d_cliff = _E.Brightness(ts.metatile_full(ROCK)).enhance(0.42)
        cp = d_cliff.load()
        for yy in (4, 8, 11, 14):  # strates de la paroi
            for xx in range(16):
                if yy < 16:
                    r, g, b = cp[xx, yy]
                    cp[xx, yy] = (int(r * 0.62), int(g * 0.62), int(b * 0.62))
        rim = _E.Brightness(ts.metatile_full(ROCK)).enhance(1.45).crop((0, 0, 16, 2))
        ink_ln = _E.Brightness(ts.metatile_full(ROCK)).enhance(0.30).crop((0, 0, 16, 1))
        base_d = _E.Brightness(ts.metatile_full(ROCK)).enhance(0.30).crop((0, 14, 16, 16))
        # face latérale (retrait ouest/est d'une hauteur) : rock très sombre
        # stratifié + arête claire côté plateau (1 px)
        side = _E.Brightness(ts.metatile_full(ROCK)).enhance(0.34).crop((0, 0, 4, 16))
        sp = side.load()
        for yy in (4, 8, 12):
            for xx in range(4):
                r, g, b = sp[xx, yy]
                sp[xx, yy] = (int(r * 0.60), int(g * 0.60), int(b * 0.60))
        side_hi = _E.Brightness(ts.metatile_full(ROCK)).enhance(1.35).crop((0, 0, 1, 16))
        # rainures de la niche d'escalier ('=' dont le sud est une ancre 'a')
        notch = _E.Brightness(ts.metatile_full(ROCK)).enhance(0.24).crop((0, 2, 2, 16))
        # dégradé vertical de la mezzanine : 1.30 nord → 1.14 sud
        d_hi_rows = []
        for i in range(16):
            k = 1.30 - (1.30 - 1.14) * (i / 15.0)
            d_hi_rows.append(_E.Brightness(ts.metatile_full(FLOOR)).enhance(k).crop((0, i, 16, i + 1)))
        for y in range(h):
            for x in range(w):
                ch = rows[y][x]
                if ch == '#':
                    # passe 47 : bordure/coin choisis selon les voisins (canon)
                    # Passe 54 (retour utilisateur : « les cases autour des
                    # portes devraient être plates mais elles sont courbées
                    # vers le bas ») : l'ENTRÉE compte comme SOLIDE pour
                    # l'autotiling de ses voisins. Traitée comme un vide, elle
                    # faisait choisir aux deux murs qui l'encadrent un coin
                    # concave (0x207 / 0x205) : le mur du bas s'incurvait
                    # autour de la porte au lieu de rester droit.
                    # Vérifié sur les 24 maps canon : « E = solide » donne le
                    # mur plat 0x212 dans 38 cas sur 38 ; « E = vide », 0 fois.
                    # Au canon, la porte est un TROU percé dans un mur plat,
                    # pas une échancrure.
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
                    # flanc exposé ouest/est (alcôve / décroché de plateau)
                    if atc(rows, x - 1, y) in LOWISH:
                        im.paste(side, (x * 16, y * 16))
                    if atc(rows, x + 1, y) in LOWISH:
                        im.paste(side.transpose(Image.FLIP_LEFT_RIGHT), (x * 16 + 12, y * 16))
                    # niche d'escalier : rainures verticales internes du retrait
                    if atc(rows, x, y + 1) == 'a':
                        im.paste(notch, (x * 16, y * 16))
                        im.paste(notch.transpose(Image.FLIP_LEFT_RIGHT), (x * 16 + 14, y * 16))
                elif ch == '^':
                    for i in range(16):
                        im.paste(d_hi_rows[i], (x * 16, y * 16 + i))
                    # faces latérales (plateau exposé sur le côté — formes)
                    if atc(rows, x - 1, y) in LOWISH:
                        im.paste(side, (x * 16, y * 16))
                        im.paste(side_hi, (x * 16 + 4, y * 16))
                    if atc(rows, x + 1, y) in LOWISH:
                        im.paste(side.transpose(Image.FLIP_LEFT_RIGHT), (x * 16 + 12, y * 16))
                        im.paste(side_hi, (x * 16 + 11, y * 16))
                else: im.paste(ts.metatile_full(FLOOR), (x * 16, y * 16))
        # Passe 53 (retour utilisateur : « le mur (hauteur) doit faire pile une
        # tuile de haut ») : l'ombre portée au pied des falaises faisait 13 px
        # de dégradé sur la tuile SUIVANTE. Visuellement, la falaise semblait
        # donc haute de 16 + 13 = 29 px — presque deux tuiles — et le regard
        # plaçait le bord de l'étage 13 px trop bas, d'où l'impression de
        # « tuiles pas à la bonne taille » et de meubles mal alignés.
        # L'ombre est ramenée à 4 px : elle marque le contact au sol sans
        # jamais empiéter visuellement sur la case du dessous.
        # ombre portée au pied des falaises + passe 44 :
        # ombres latérales courtes dans les alcôves (cellule basse accotée à
        # une falaise à l'ouest/est — l'escalier se niche dans le renfoncement).
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
    """Sprite « stairs » v9 (passe 46, retours utilisateur).

    Deux reproches à la v8 : (1) « il doit faire la même taille tout le temps »
    — la v8 était un trapèze en perspective, donc les marches RÉTRÉCISSAIENT
    vers le haut et la volée ne se raccordait ni à sa case ni à elle-même quand
    on en posait deux ; (2) « plutôt en bois comme les planches pour rester
    dans la même DA ».

    v9 : escalier de bois à LARGEUR CONSTANTE (32 px de mur à mur sur toute la
    hauteur, aucune perspective), 6 marches dessinées comme autant de PLANCHES
    horizontales, à la palette EXACTE de `solid_board` (la planche du jeu) :
      nez éclairé #c6b777 · face #b4a462 · contremarche #948341 ·
      veine #7b6220 · encre #525252.
    Chaque marche = nez clair + face + veine basse + joint encré ; limons
    latéraux verticaux constants, comme les traverses de la planche.

    Empreinte gameplay inchangée : 2×2, les DEUX colonnes franchissables.
    """
    from PIL import ImageDraw as _D
    INK = (0x52, 0x52, 0x52, 255)
    W_L = (0xc6, 0xb7, 0x77, 255)   # nez de marche (lumière haut-gauche)
    W_M = (0xb4, 0xa4, 0x62, 255)   # bois de base — identique à solid_board
    W_S = (0x94, 0x83, 0x41, 255)   # contremarche dans l'ombre
    W_D = (0x7b, 0x62, 0x20, 255)   # veine / limon sombre

    im = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    d = _D.Draw(im)
    N = 6
    ys = [round(i * 32 / N) for i in range(N + 1)]
    for i in range(N):
        y0, y1 = ys[i], ys[i + 1]
        d.rectangle([2, y0, 29, y1 - 1], fill=W_S)      # contremarche
        d.rectangle([2, y0, 29, y0], fill=W_L)          # nez éclairé
        d.rectangle([2, y0 + 1, 29, y1 - 3], fill=W_M)  # face de la planche
        d.rectangle([2, y1 - 2, 29, y1 - 2], fill=W_D)  # veine basse
        d.rectangle([2, y1 - 1, 29, y1 - 1], fill=INK)  # joint entre marches
    d.rectangle([0, 0, 1, 31], fill=INK)                # limons constants
    d.rectangle([2, 0, 2, 31], fill=W_L)
    d.rectangle([29, 0, 29, 31], fill=W_D)
    d.rectangle([30, 0, 31, 31], fill=INK)
    d.rectangle([0, 0, 31, 0], fill=INK)                # arête haute

    p = os.path.join(DECOR_OUT, 'stairs.png')
    im.save(p)
    man_path = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'manifest.render2d.json')
    man = json.load(open(man_path))
    man['items'].setdefault('stairs', {})['emerald'] = os.path.relpath(p, ROOT)
    # passe 43 : le manifeste people ne doit plus référencer « hero »
    if 'people' in man:
        man['people'].pop('hero', None)
    json.dump(man, open(man_path, 'w'), indent=1, ensure_ascii=False)
    write_manifest_js(man)
    print('objgfx(perso) stairs 32x32 (v9 bois LARGEUR CONSTANTE, 6 marches, '
          '2 COLONNES, palette solid_board) →', os.path.relpath(p, ROOT))


def bake_canon():
    """Passe 42 : TOUS les sprites du catalogue canon RSE + le vrai PC.
    - 119 décos : DecorGfx métatiles (déjà pareil pour les meubles) — les
      poupées/coussins restent aux objgfx (vrais sprites GBA stagés) ;
    - pc.png : métatile METATILE_SecretBase_PC (0x220) du tileset, couche
      haute index 0 transparent (l'ordinateur gris-bleu authentique) ;
    - manifeste purgé des entrées hors canon (ORAS transformées retirées)."""
    from PIL import Image as _I
    gfx, shapes = decor_refs()
    canon = json.load(open(os.path.join(CACHE, 'canon-decor.json')))
    ts = Tilesets('cave')
    man_path = os.path.join(ROOT, 'src', 'assets', 'images', 'secret-base', 'manifest.render2d.json')
    os.makedirs(DECOR_OUT, exist_ok=True)
    done = 0
    skip = {'NONE'}
    # manifeste RECHARGÉ avant cuisson du PC
    man = json.load(open(man_path))
    # ——— PC authentique : métatile 0x220 (couche haute, fond transparent) ———
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
    keep = canon_slugs | {'pc', 'stairs'}  # passe 43 : welcome_mat supprimé du jeu
    removed = [s for s in list(man['items']) if s not in keep]
    for s in removed:
        del man['items'][s]
        fp = os.path.join(ROOT, 'src/assets/images/secret-base/emerald', s + '.png'.replace('/', os.sep))
        if os.path.exists(fp):
            os.remove(fp)
    man['comment'] = ('Renderer 2D — CANON RSE (passe 42) : chaque entrée est le '
                      'sprite Émeraude natif (métatiles DecorGfx ou objgfx officiels). '
                      'Généré par tools/bake-emerald-bgs.py --bake-canon.')
    man['people'] = {'player': 'src/assets/images/trainers/profil/trainer-54.png'}
    sprites = {e['emerald'].split('/')[-1] for e in man['items'].values() if e.get('emerald')}
    man['stats'] = {
        'sprites': len(sprites),
        'items': len(man['items']),
        'people': ['player'],
    }
    json.dump(man, open(man_path, 'w'), indent=1, ensure_ascii=False)
    write_manifest_js(man)
    print(f'bake_canon : décos Émeraude + objgfx + pc 16x16 authentique ; '
          f'{len(removed)} sprites hors canon purgés ({", ".join(sorted(removed))})')

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

