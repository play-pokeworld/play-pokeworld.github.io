#!/usr/bin/env python3
# Finalise sprites.js + game-data.js + johto_sprites.txt a partir de gen_johto.py
# (moves.js deja fait). Recupere J et W en executant les blocs utiles de gen_johto.py.
import re

src = open('gen_johto.py', encoding='utf-8').read()

# Extraire le bloc J = [ ... ]
m = re.search(r'^J = \[(.*?)\n\]', src, re.S | re.M)
J_src = 'J = [' + m.group(1) + '\n]'
# Extraire le bloc W = { ... }
m2 = re.search(r'^W = \{(.*?)\n\}', src, re.S | re.M)
W_src = 'W = {' + m2.group(1) + '\n}'

ns = {}
exec(J_src, ns)
exec(W_src, ns)
J = ns['J']
W = ns['W']

# ---- 2) SPRITE_DATA (sprites.js) ----
sp_path = 'src/scripts/data/sprites.js'
sp = open(sp_path, encoding='utf-8').read()
buckets = {
 'front': 'front',
 'back': 'back',
 'frontShiny': 'frontShiny',
 'backShiny': 'backShiny',
}
for b, folder in buckets.items():
    block = []
    for (nid, fr, en, *rest) in J:
        fn = en.lower()
        block.append('    "%d": "src/assets/images/pokemon/%s/%s.png",' % (nid, folder, fn))
    txt = "\n".join(block)
    anchor = '    "151": "src/assets/images/pokemon/%s/mew.png"' % folder
    assert anchor in sp, "sprite anchor not found for %s" % b
    sp = sp.replace(anchor, anchor + "\n" + txt, 1)
open(sp_path, 'w', encoding='utf-8').write(sp)
print("sprites.js: SPRITE_DATA mis a jour")

# ---- 3) POKE_TALENTS (game-data.js) ----
gd_path = 'src/scripts/data/game-data.js'
gd = open(gd_path, encoding='utf-8').read()
tblock = []
for (nid, fr, en, t1, t2, hp, atk, df, spa, spd, spe, cr, xy, a1, a2, a3) in J:
    tblock.append("  %d:['%s','%s','%s']," % (nid, a1, a2, a3))
ttext = "\n".join(tblock)
anchor_t = "  151:['serenegrace','adaptability','regenerator'],\n};"
assert anchor_t in gd, "POKE_TALENTS anchor not found"
gd = gd.replace(anchor_t, "  151:['serenegrace','adaptability','regenerator'],\n" + ttext + "\n};", 1)

# ---- 4) Wild Johto populations (IIFE) ----
lines = []
lines.append("// ============================================================")
lines.append("// POPULATION SAUVAGE JOHTO (ajout regional - ordre officiel Or/Argent)")
lines.append("// Applique APRES linkSplitRoutes pour peupler les lieux Johto.")
lines.append("(function populateJohtoWild(){")
lines.append("  if(typeof LOCS_JOHTO === 'undefined') return;")
for key, arr in W.items():
    inner = str(arr)
    lines.append("  if(LOCS_JOHTO['%s']) LOCS_JOHTO['%s'].wild = %s;" % (key, key, inner))
lines.append("})();")
wild_text = "\n".join(lines)

anchor_part2 = "// ============================================================================\n// PART 2:"
assert anchor_part2 in gd, "PART 2 anchor not found"
gd = gd.replace(anchor_part2, wild_text + "\n\n" + anchor_part2, 1)
open(gd_path, 'w', encoding='utf-8').write(gd)
print("game-data.js: POKE_TALENTS + wild Johto mis a jour")

# ---- 5) Liste sprites ----
with open('johto_sprites.txt', 'w', encoding='utf-8') as f:
    for (nid, fr, en, *rest) in J:
        f.write("%d %s\n" % (nid, en.lower()))
print("johto_sprites.txt ecrit (%d entrees)" % len(J))
