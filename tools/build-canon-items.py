#!/usr/bin/env python3
# ============================================================================
# Passe 42 : GÉNÈRE src/data/base-items-data.js depuis la table canon RSE
# (tools/emerald-ref/canon-decor.json = pokeemerald gDecorations, extrait de
# decor/header.h). 119 décorations officielles + 3 objets du jeu
# (stairs / pc) = 122 objets au catalogue.
#
# Modèle de collision (demandes utilisateur répétées + canon) :
#  - surface (poupées/coussins, DECORPERM_SPRITE) : collision = case de base ;
#  - behind  (plantes/boucliers, DECORPERM_BEHIND_FLOOR) : collision = rangée
#    de base (on peut coller au mur, le visuel déborde derrière le joueur) ;
#  - le reste : empreinte = forme canon (bureaux 3×2/3×3, tapis 3×3 …).
#  - ROTATION SUPPRIMÉE (rot:0 partout) : la 2D Émeraude ne pivote pas.
# ============================================================================
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANON = json.load(open(os.path.join(ROOT, 'tools/emerald-ref/canon-decor.json')))

CAT = {'DESK': 'desks', 'CHAIR': 'chairs', 'PLANT': 'plants', 'ORNAMENT': 'objects',
       'MAT': 'mats', 'POSTER': 'wall', 'DOLL': 'dolls', 'CUSHION': 'cushions'}

# fx de visite conservés (gameplay existant — pas de visuel ORAS ici)
FX = {
    'red_balloon': 'burst', 'blue_balloon': 'burst', 'yellow_balloon': 'burst',
    'mud_ball': 'burst', 'breakable_door': 'door',
    'glitter_mat': 'glitter', 'jump_mat': 'jump', 'spin_mat': 'spin',
    'c_low_note_mat': 'note:0', 'd_note_mat': 'note:1', 'e_note_mat': 'note:2',
    'f_note_mat': 'note:3', 'g_note_mat': 'note:4', 'a_note_mat': 'note:5',
    'b_note_mat': 'note:6', 'c_high_note_mat': 'note:7',
    'solid_board': 'board', 'stairs': 'stairs', 'pc': 'pc',
}

# Acquisition (répartition boutique) — canon = Lilycove D5 / marché de Slateport /
# déstockage Lilycove / atelier de verre, mappé sur nos sources existantes.
ACQ = {
    'guild_shop': ['small_desk', 'pokemon_desk', 'heavy_desk', 'solid_board',
                   'small_chair', 'pokemon_chair', 'heavy_chair'],
    'guild_shop_bronze': ['ragged_desk', 'comfort_desk', 'ragged_chair', 'comfort_chair', 'spin_mat'],
    'guild_shop_silver': ['brick_desk', 'camp_desk', 'hard_desk', 'brick_chair', 'camp_chair', 'hard_chair'],
    'glass_workshop': ['pretty_desk', 'pretty_chair', 'sand_ornament', 'glass_ornament'],
    'pretty_petal': ['red_plant', 'tropical_plant', 'pretty_flowers', 'colorful_plant', 'big_plant', 'gorgeous_plant'],
    'slateport_market': ['red_brick', 'yellow_brick', 'blue_brick', 'fence_length', 'fence_width',
                         'red_balloon', 'blue_balloon', 'yellow_balloon',
                         'c_low_note_mat', 'd_note_mat', 'e_note_mat', 'f_note_mat',
                         'g_note_mat', 'a_note_mat', 'b_note_mat', 'c_high_note_mat'],
    'lilycove_d5': ['tv', 'glitter_mat', 'jump_mat', 'surf_mat', 'thunder_mat', 'fire_blast_mat',
                    'powder_snow_mat', 'attract_mat', 'fissure_mat', 'spikes_mat',
                    'ball_poster', 'green_poster', 'red_poster', 'blue_poster', 'cute_poster',
                    'pika_poster', 'long_poster', 'sea_poster', 'sky_poster', 'kiss_poster',
                    'azurill_doll', 'baltoy_doll', 'clefairy_doll', 'jigglypuff_doll', 'pichu_doll',
                    'pikachu_doll', 'torchic_doll', 'treecko_doll', 'mudkip_doll',
                    'ball_cushion', 'pika_cushion', 'round_cushion', 'kiss_cushion', 'zigzag_cushion', 'spin_cushion'],
    'lilycove_clearance': ['slide', 'tire', 'stand', 'mud_ball', 'breakable_door', 'red_tent', 'blue_tent',
                           'round_tv', 'cute_tv',
                           'swablu_doll', 'chikorita_doll', 'cyndaquil_doll', 'totodile_doll', 'togepi_doll',
                           'marill_doll', 'skitty_doll', 'meowth_doll', 'ditto_doll', 'smoochum_doll',
                           'duskull_doll', 'gulpin_doll', 'kecleon_doll', 'lotad_doll', 'seedot_doll',
                           'lapras_doll', 'venusaur_doll', 'charizard_doll', 'blastoise_doll',
                           'wailmer_doll', 'snorlax_doll', 'rhydon_doll',
                           'diamond_cushion', 'grass_cushion', 'fire_cushion', 'water_cushion'],
    'quest_hoenn': ['wynaut_doll', 'silver_shield', 'gold_shield',
                    'regirock_doll', 'regice_doll', 'registeel_doll'],
    'fortree': ['stairs'],
    'auto': ['pc'],
}
ACQ_OF = {slug: src for src, slugs in ACQ.items() for slug in slugs}

# Poupées sur tapis / bureau / pneu / présentoir (demande utilisateur).
SURF = {'tire', 'stand'}

# Noms affichés (i18n) — charte RSE française.
NAMES = {
    'small_desk': ('Petit Bureau', 'Small Desk'), 'pokemon_desk': ('Bureau Pokémon', 'Pokémon Desk'),
    'heavy_desk': ('Grand Bureau', 'Heavy Desk'), 'ragged_desk': ('Bureau Abîmé', 'Ragged Desk'),
    'comfort_desk': ('Bureau Confort', 'Comfort Desk'), 'pretty_desk': ('Joli Bureau', 'Pretty Desk'),
    'brick_desk': ('Bureau Brique', 'Brick Desk'), 'camp_desk': ('Bureau Rondin', 'Camp Desk'),
    'hard_desk': ('Bureau Massif', 'Hard Desk'),
    'small_chair': ('Petite Chaise', 'Small Chair'), 'pokemon_chair': ('Chaise Pokémon', 'Pokémon Chair'),
    'heavy_chair': ('Grande Chaise', 'Heavy Chair'), 'pretty_chair': ('Jolie Chaise', 'Pretty Chair'),
    'comfort_chair': ('Chaise Confort', 'Comfort Chair'), 'ragged_chair': ('Chaise Abîmée', 'Ragged Chair'),
    'brick_chair': ('Chaise Brique', 'Brick Chair'), 'camp_chair': ('Chaise Rondin', 'Camp Chair'),
    'hard_chair': ('Chaise Massive', 'Hard Chair'),
    'red_plant': ('Plante Rouge', 'Red Plant'), 'tropical_plant': ('Plante Tropicale', 'Tropical Plant'),
    'pretty_flowers': ('Jolies Fleurs', 'Pretty Flowers'), 'colorful_plant': ('Plante Colore', 'Colorful Plant'),
    'big_plant': ('Grosse Plante', 'Big Plant'), 'gorgeous_plant': ('Plante Superbe', 'Gorgeous Plant'),
    'red_brick': ('Brique Rouge', 'Red Brick'), 'yellow_brick': ('Brique Jaune', 'Yellow Brick'),
    'blue_brick': ('Brique Bleue', 'Blue Brick'),
    'red_balloon': ('Ballon Rouge', 'Red Balloon'), 'blue_balloon': ('Ballon Bleu', 'Blue Balloon'),
    'yellow_balloon': ('Ballon Jaune', 'Yellow Balloon'),
    'red_tent': ('Tente Rouge', 'Red Tent'), 'blue_tent': ('Tente Bleue', 'Blue Tent'),
    'solid_board': ('Planche Solide', 'Solid Board'), 'slide': ('Toboggan', 'Slide'),
    'fence_length': ('Barrière Long.', 'Fence Length'), 'fence_width': ('Barrière Larg.', 'Fence Width'),
    'tire': ('Pneu', 'Tire'), 'stand': ('Présentoir', 'Stand'), 'mud_ball': ('Boule de Boue', 'Mud Ball'),
    'breakable_door': ('Porte Fragile', 'Breakable Door'), 'sand_ornement': None,
    'sand_ornament': ('Statue Sable', 'Sand Ornament'),
    'silver_shield': ('Bouclier Arg.', 'Silver Shield'), 'gold_shield': ('Bouclier Or', 'Gold Shield'),
    'glass_ornament': ('Objet Verre', 'Glass Ornament'),
    'tv': ('Télé', 'TV'), 'round_tv': ('Télé Ronde', 'Round TV'), 'cute_tv': ('Télé Mignonne', 'Cute TV'),
    'glitter_mat': ('Tapis Paillete', 'Glitter Mat'), 'jump_mat': ('Tapis Saut', 'Jump Mat'),
    'spin_mat': ('Tapis Tournant', 'Spin Mat'),
    'c_low_note_mat': ('Tapis Do Grave', 'Low C Note Mat'), 'd_note_mat': ('Tapis Ré', 'D Note Mat'),
    'e_note_mat': ('Tapis Mi', 'E Note Mat'), 'f_note_mat': ('Tapis Fa', 'F Note Mat'),
    'g_note_mat': ('Tapis Sol', 'G Note Mat'), 'a_note_mat': ('Tapis La', 'A Note Mat'),
    'b_note_mat': ('Tapis Si', 'B Note Mat'), 'c_high_note_mat': ('Tapis Do Aigu', 'High C Note Mat'),
    'surf_mat': ('Tapis Surf', 'Surf Mat'), 'thunder_mat': ('Tapis Éclair', 'Thunder Mat'),
    'fire_blast_mat': ('Tapis Déflagra', 'Fire Blast Mat'), 'powder_snow_mat': ('Tapis Neige', 'Powder Snow Mat'),
    'attract_mat': ('Tapis Attraction', 'Attract Mat'), 'fissure_mat': ('Tapis Fissure', 'Fissure Mat'),
    'spikes_mat': ('Tapis Pics', 'Spikes Mat'),
    'ball_poster': ('Poster Ball', 'Ball Poster'), 'green_poster': ('Poster Vert', 'Green Poster'),
    'red_poster': ('Poster Rouge', 'Red Poster'), 'blue_poster': ('Poster Bleu', 'Blue Poster'),
    'cute_poster': ('Poster Mignon', 'Cute Poster'), 'pika_poster': ('Poster Pika', 'Pika Poster'),
    'long_poster': ('Poster Long', 'Long Poster'), 'sea_poster': ('Poster Mer', 'Sea Poster'),
    'sky_poster': ('Poster Ciel', 'Sky Poster'), 'kiss_poster': ('Poster Baiser', 'Kiss Poster'),
    'stairs': ('Escalier', 'Stairs'),
    'pc': ('PC', 'PC'),
}
for d in ['pichu', 'pikachu', 'marill', 'togepi', 'cyndaquil', 'chikorita', 'totodile', 'jigglypuff',
          'meowth', 'clefairy', 'ditto', 'smoochum', 'treecko', 'torchic', 'mudkip', 'duskull',
          'wynaut', 'baltoy', 'kecleon', 'azurill', 'skitty', 'swablu', 'gulpin', 'lotad', 'seedot',
          'lapras', 'venusaur', 'charizard', 'blastoise', 'wailmer', 'snorlax', 'rhydon',
          'regirock', 'regice', 'registeel']:
    fr = {'pichu': 'Pichu', 'pikachu': 'Pikachu', 'marill': 'Marill', 'togepi': 'Togepi',
          'cyndaquil': 'Héricendre', 'chikorita': 'Germignon', 'totodile': 'Kaiminus',
          'jigglypuff': 'Rondoudou', 'meowth': 'Miaouss', 'clefairy': 'Mélofée', 'ditto': 'Métamorph',
          'smoochum': 'Lippouti', 'treecko': 'Arcko', 'torchic': 'Poussifeu', 'mudkip': 'Gobou',
          'duskull': 'Skelénox', 'wynaut': 'Okéoké', 'baltoy': 'Balbuto', 'kecleon': 'Kecleon',
          'azurill': 'Azurill', 'skitty': 'Skitty', 'swablu': 'Tylton', 'gulpin': 'Gloupti',
          'lotad': 'Nénupiot', 'seedot': 'Grainipiot', 'lapras': 'Lokhlass', 'venusaur': 'Florizarre',
          'charizard': 'Dracaufeu', 'blastoise': 'Tortank', 'wailmer': 'Wailmer', 'snorlax': 'Ronflex',
          'rhydon': 'Rhinoféros', 'regirock': 'Regirock', 'regice': 'Regice', 'registeel': 'Registeel'}[d]
    en = {'cyndaquil': 'Cyndaquil', 'chikorita': 'Chikorita', 'totodile': 'Totodile',
          'jigglypuff': 'Jigglypuff', 'smoochum': 'Smoochum', 'duskull': 'Duskull',
          'wynaut': 'Wynaut', 'baltoy': 'Baltoy', 'azurill': 'Azurill', 'skitty': 'Skitty',
          'swablu': 'Swablu', 'gulpin': 'Gulpin', 'lotad': 'Lotad', 'seedot': 'Seedot',
          'venusaur': 'Venusaur', 'blastoise': 'Blastoise', 'wailmer': 'Wailmer',
          'snorlax': 'Snorlax', 'rhydon': 'Rhydon', 'lapras': 'Lapras',
          'regirock': 'Regirock', 'regice': 'Regice', 'registeel': 'Registeel',
          'pichu': 'Pichu', 'pikachu': 'Pikachu', 'marill': 'Marill', 'togepi': 'Togepi',
          'treecko': 'Treecko', 'torchic': 'Torchic', 'mudkip': 'Mudkip',
          'kecleon': 'Kecleon', 'ditto': 'Ditto', 'clefairy': 'Clefairy', 'meowth': 'Meowth',
          'charizard': 'Charizard'}[d]
    NAMES[d + '_doll'] = ('Poupée ' + fr, fr + ' Doll' if en != fr else en + ' Doll')
    NAMES[d + '_doll'] = ('Poupée ' + fr, en + ' Doll')
for c, fr, en in [('ball', 'Ball', 'Ball'), ('pika', 'Pika', 'Pika'), ('round', 'Rond', 'Round'),
                  ('kiss', 'Baiser', 'Kiss'), ('zigzag', 'Zigzag', 'Zigzag'), ('spin', 'Mimigal', 'Spinarak'),
                  ('diamond', 'Diamant', 'Diamond'), ('grass', 'Plante', 'Grass'), ('fire', 'Feu', 'Fire'),
                  ('water', 'Eau', 'Water')]:
    NAMES[c + '_cushion'] = ('Coussin ' + fr, en + ' Cushion')

items = []
for key, v in CANON.items():
    if key == 'DECOR_NONE':
        continue
    slug = key.replace('DECOR_', '').lower()
    w, d = v['shape'].split('x')
    cat = CAT[v['cat']]
    it = {'s': slug, 'cat': cat, 'w': int(w), 'd': int(d)}
    perm = v['perm']
    if cat in ('dolls', 'cushions'):
        it['layer'] = 'surface'
    elif cat == 'wall':
        it['layer'] = 'wall'
    else:
        it['layer'] = 'floor'
        if perm == 'DECORPERM_BEHIND_FLOOR':
            it['behind'] = True   # collision = rangée de base, dessin derrière
        if perm == 'DECORPERM_PASS_FLOOR':
            it['walk'] = True
    if cat == 'desks' or cat == 'mats' or slug in SURF:
        it['surf'] = True
    if cat == 'chairs':
        it['fx'] = 'sit'
    if slug in FX:
        it['fx'] = FX[slug]
    it['rot'] = 0  # passe 42 : rotation supprimée (canon RSE = sans rotation)
    it['price'] = v['price'] if v['price'] else None
    it['acq'] = ACQ_OF.get(slug, 'lilycove_clearance')
    items.append(it)

# objets du jeu (hors gDecorations canon)
# passe 43 : plus de « tapis d'accueil » visible (demande utilisateur — RSE
# n'en montre pas ; le spawn = case devant la porte, marqueur 'S' des gabarits)
items.append({'s': 'stairs', 'cat': 'objects', 'w': 2, 'd': 2, 'layer': 'floor',
              'walk': True, 'rot': 0, 'fx': 'stairs', 'price': None, 'acq': 'fortree'})
items.append({'s': 'pc', 'cat': 'objects', 'w': 1, 'd': 1, 'layer': 'floor',
              'rot': 0, 'fx': 'pc', 'price': None, 'acq': 'auto'})

missing_names = [it['s'] for it in items if it['s'] not in NAMES]
assert not missing_names, missing_names
missing_acq = [it['s'] for it in items if it['s'] not in ACQ_OF]
assert not missing_acq, missing_acq

HDR = '''// ============================================================================
// DONNÉES — Catalogue des décorations de base secrète — CANON RSE ÉMERAUDE
// ----------------------------------------------------------------------------
// GÉNÉRÉ par tools/build-canon-items.py depuis tools/emerald-ref/canon-decor.json
// (= gDecorations du désassemblage pokeemerald : 119 décorations officielles)
// + 2 objets du jeu (stairs / pc). NE PAS ÉDITER À LA MAIN.
//
// Champs :
//   s      slug (clé i18n base.i.<s>)
//   cat    desks|chairs|plants|objects|mats|wall|dolls|cushions
//   w,d    forme canon DECORSHAPE (rendu ; collision selon layer/behind)
//   layer  floor | surface (poupée/coussin) | wall (poster mural)
//   behind canon BEHIND_FLOOR : collision = rangée de base, dessin DERRIÈRE
//          le joueur (on colle au mur sans blocage, visuel 2 cases de haut)
//   surf   reçoit les objets « surface » (bureaux, tapis, pneu, présentoir)
//   rot    0 partout — PASSE 42 : ROTATION SUPPRIMÉE (canon RSE + demande)
//   walk   le visiteur marche dessus (DECORPERM_PASS_FLOOR)
//   fx     effet de visite : burst|door|glitter|jump|spin|note:N|board|
//          stairs|pc|sit
//   price  prix canon ₽ (null = jamais vendu), acq = verrou d'acquisition
// ============================================================================
'''

def js_it(it):
    parts = ["s:'%s'" % it['s'], "cat:'%s'" % it['cat'], 'w:%d' % it['w'], 'd:%d' % it['d'],
             "layer:'%s'" % it['layer']]
    if it.get('behind'): parts.append('behind:true')
    if it.get('walk'): parts.append('walk:true')
    if it.get('surf'): parts.append('surf:true')
    if it.get('fx'): parts.append("fx:'%s'" % it['fx'])
    parts.append('rot:0')
    parts.append('price:%s' % ('null' if it['price'] is None else it['price']))
    parts.append("acq:'%s'" % it['acq'])
    return ' { ' + ', '.join(parts) + ' },'

lines = [HDR,
         "const BASE_ITEM_CATEGORIES = ['desks', 'chairs', 'plants', 'objects', 'mats', 'wall', 'dolls', 'cushions'];",
         '',
         'const BASE_ITEMS = [']
groups = [('desks', 'bureaux (porteurs, 3×2/3×3 canon)'), ('chairs', 'chaises (franchissables, fx sit)'),
          ('plants', 'plantes (collision rangée de base, 2 cases de haut visuel)'),
          ('objects', 'gros objets & ornements (formes canon 1×2…4×2)'),
          ('mats', 'tapis (franchissables, porteurs)'),
          ('wall', 'posters (mur nord / face de falaise, 1×1 et 2×1)'),
          ('dolls', 'poupées (couche surface : tapis/bureau/sol, 1 par case)'),
          ('cushions', 'coussins (couche surface)')]
for cat, label in groups:
    lines.append(' // ─── %s ─────────────────────────────────────────' % label)
    for it in items:
        if it['cat'] == cat:
            lines.append(js_it(it))
lines += [
    '];',
    '',
    'const BASE_ITEM_MAX_PLACED = 26; // plafond maison conservé (ROSA); RSE = 16',
    '',
    "const BASE_ITEMS_BY_SLUG = (() => { const m = {}; for (const it of BASE_ITEMS) m[it.s] = it; return Object.freeze(m); })();",
    '',
    '''function baseItemGet(slug) { return BASE_ITEMS_BY_SLUG[slug] || null; }
function baseItemNameKey(slug) { return 'base.i.' + slug; }
function baseItemList(cat) { return cat ? BASE_ITEMS.filter((i) => i.cat === cat) : BASE_ITEMS.slice(); }

// Passe 42 : rotation SUPPRIMÉE (canon RSE + demande utilisateur) — compteurs
// figés à 1, normalisation → 0. Les signatures restent (appelants inchangés).
function baseItemRotCount(item) { return 1; }
function baseItemRotNormalize(item, rotIndex) { return 0; }

// Empreinte de COLLISION/pose :
//  - surface (poupées/coussins) : 1×1 sur la case de base ;
//  - behind (plantes/boucliers, forme 1×2 ou 2×2) : rangée de base w×1 ;
//  - sinon : forme canon complète (bureaux 3×2, tapis 3×3, toboggan 2×4…).
function baseItemFootprint(item, rotIndex) {
  if (!item) return { w: 1, d: 1 };
  if (item.layer === 'surface') return { w: 1, d: 1 };
  if (item.behind) return { w: item.w, d: 1 };
  return { w: item.w, d: item.d };
}

// Migration des anciens slugs (avant le catalogue canon de la passe 42) :
// renommages → slug canon ; le reste est abandonné (objets hors DA Émeraude).
const BASE_ITEM_MIGRATE = Object.freeze({
  pokeball_desk: 'pokemon_desk', rough_desk: 'ragged_desk', soft_desk: 'comfort_desk',
  elegant_desk: 'pretty_desk', log_desk: 'camp_desk',
  pokeball_chair: 'pokemon_chair', elegant_chair: 'pretty_chair', soft_chair: 'comfort_chair',
  rough_chair: 'ragged_chair', log_chair: 'camp_chair',
  red_flower: 'red_plant', flowering_plant: 'pretty_flowers', elegant_bonsai: 'gorgeous_plant',
  spinarak_cushion: 'spin_cushion',
  blue_scroll: 'long_poster', red_scroll: 'sea_poster', dads_scroll: 'sky_poster',
  note_do_mat: 'c_low_note_mat', note_re_mat: 'd_note_mat', note_mi_mat: 'e_note_mat',
  note_fa_mat: 'f_note_mat', note_sol_mat: 'g_note_mat', note_la_mat: 'a_note_mat',
  note_si_mat: 'b_note_mat', note_do2_mat: 'c_high_note_mat',
  substitute_doll: 'wynaut_doll', big_snorlax_doll: 'snorlax_doll', big_rhydon_doll: 'rhydon_doll',
  // hors-canon/ORAS retirés passe 42 → équivalent canon le plus proche
  bench: 'small_chair', poke_flute: 'mud_ball', tall_grass: 'pretty_flowers',
  berry_tree: 'gorgeous_plant', globe: 'gold_shield', comfortable_bed: 'blue_tent',
  star_light: 'glass_ornament', cardboard_boxes: 'red_brick', trash_can: 'yellow_brick',
  makiwara: 'breakable_door', boppoyama: 'sand_ornament', candlestick: 'breakable_door',
  standing_stone: 'red_brick', proclamation: 'ball_poster', blackboard: 'kiss_poster',
  confetti_ball: 'yellow_balloon', vending_machine: 'tv', berry_blender: 'pretty_desk',
  green_mat: 'glitter_mat', red_mat: 'jump_mat', blue_mat: 'spin_mat', flat_mat: 'surf_mat',
  orange_mat: 'thunder_mat',
  blue_warp_panel: 'glitter_mat', red_warp_panel: 'jump_mat', square_one_mat: 'spikes_mat',
  pitfall_mat: 'fissure_mat',
});
function baseItemMigrate(slug) {
  if (BASE_ITEMS_BY_SLUG[slug]) return slug;
  const m = BASE_ITEM_MIGRATE[slug];
  return (m && BASE_ITEMS_BY_SLUG[m]) ? m : null;
}

window.BASE_ITEMS = Object.freeze(BASE_ITEMS);
window.BASE_ITEM_CATEGORIES = Object.freeze(BASE_ITEM_CATEGORIES);
window.BASE_ITEM_MAX_PLACED = BASE_ITEM_MAX_PLACED;
window.baseItemGet = baseItemGet;
window.baseItemNameKey = baseItemNameKey;
window.baseItemList = baseItemList;
window.baseItemRotCount = baseItemRotCount;
window.baseItemRotNormalize = baseItemRotNormalize;
window.baseItemFootprint = baseItemFootprint;
window.BASE_ITEM_MIGRATE = BASE_ITEM_MIGRATE;
window.baseItemMigrate = baseItemMigrate;
''']

out = os.path.join(ROOT, 'src/data/base-items-data.js'.replace('/', os.sep))
open(out, 'w').write('\n'.join(lines) + '\n')
print('→', os.path.relpath(out, ROOT), '|', len(items), 'objets (120 canon + 2 jeu)')

# table i18n pour patch séparé
names_path = os.path.join(ROOT, 'tools/emerald-ref/canon-names.json'.replace('/', os.sep))
json.dump({s: NAMES[s] for s in [it['s'] for it in items]}, open(names_path, 'w'),
          ensure_ascii=False, indent=1, sort_keys=True)
print('→', os.path.relpath(names_path, ROOT), '| paires fr/en')

