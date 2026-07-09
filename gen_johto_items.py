# Ajoute les objets exclusifs Johto (Or/Argent) + boutiques Johto + repoint shopId.
import re

p = 'src/scripts/data/game-data.js'
s = open(p, encoding='utf-8').read()

# ---- 1) ITEMS : insère avant la fermeture de l'objet ITEMS ----
anchor_items = '''  chroma_charm: {name_fr:'Charme Chroma', name_en:'Shiny Charm',   icon:'✨', desc_fr:'Triple les chances de rencontrer des Pokémon Shiny (3x) !', desc_en:'Triples the chance of encountering Shiny Pokémon (3x)!', price:100000, type:'special'},
};'''
assert anchor_items in s, "anchor ITEMS non trouve"
new_items = '''  // ---- Objets EXCLUSIFS JOHTO (Or/Argent) : effets en combat ----
  sunstone:     {name_fr:'Pierre Soleil', name_en:'Sun Stone', icon:'☀️', desc_fr:'Fait évoluer certains Pokémon Plante (Grainipiot→Floraëlla, Tournegrin→Héliatronc).', desc_en:'Evolves certain Grass Pokémon.', price:3000, type:'stone'},
  kings_rock:   {name_fr:'Rocher Royal', name_en:"King's Rock", icon:'👑', desc_fr:"Objet tenu : +12% Atk & +12% Atk Spé. (évoque Koross / Chorene).", desc_en:'Held: +12% Atk & Sp.Atk (evolves Politoed/Slowking).', price:2000, buff:{atk:0.12, spa:0.12}},
  dragon_scale: {name_fr:'Écaille Dragon', name_en:'Dragon Scale', icon:'🐉', desc_fr:'Objet tenu : +20% Atk & +20% Atk Spé. (évoque Hyporoi).', desc_en:'Held: +20% Atk & Sp.Atk (evolves Kingdra).', price:2000, buff:{atk:0.20, spa:0.20}},
  up_grade:     {name_fr:'Upgrade', name_en:'Up-Grade', icon:'💾', desc_fr:'Objet tenu : +30% Atk Spé. (évoque Porygon2).', desc_en:'Held: +30% Sp.Atk (evolves Porygon2).', price:2000, buff:{spa:0.30}},
  deep_sea_scale:{name_fr:'Écaille Océan', name_en:'Deep Sea Scale', icon:'🔱', desc_fr:'Objet tenu : +30% Déf. Spé. (évoque Moorelot).', desc_en:'Held: +30% Sp.Def (evolves Gorebyss).', price:1800, buff:{spd:0.30}},
  deep_sea_tooth:{name_fr:'Dent Océan', name_en:'Deep Sea Tooth', icon:'🦷', desc_fr:'Objet tenu : +30% Attaque (évoque Hydreloc).', desc_en:'Held: +30% Atk (evolves Huntail).', price:1800, buff:{atk:0.30}},
  twisted_spoon:{name_fr:'Cuillère Tordue', name_en:'Twisted Spoon', icon:'🥄', desc_fr:'Objet tenu : +20% Atk Spé. (renforce les capacités Psy).', desc_en:'Held: +20% Sp.Atk.', price:1500, buff:{spa:0.20}},
  thick_club:   {name_fr:'Os Épais', name_en:'Thick Club', icon:'🦴', desc_fr:'Objet tenu (Osselet / Macrogato) : +40% Attaque !', desc_en:'Held (Cubone/Marowak): +40% Atk!', price:1500, buff:{atk:0.40}},
  black_belt:   {name_fr:'Ceinture Noire', name_en:'Black Belt', icon:'🥋', desc_fr:'Objet tenu : +20% Attaque, dégâts Combat renforcés.', desc_en:'Held: +20% Atk, Fighting dmg up.', price:1500, buff:{atk:0.20}},
  black_glasses:{name_fr:'Lunettes Noires', name_en:'Black Glasses', icon:'🕶️', desc_fr:'Objet tenu : +20% Attaque, dégâts Ténèbres renforcés.', desc_en:'Held: +20% Atk, Dark dmg up.', price:1500, buff:{atk:0.20}},
  charcoal:     {name_fr:'Charbon', name_en:'Charcoal', icon:'🔥', desc_fr:'Objet tenu : +20% Attaque, dégâts Feu renforcés.', desc_en:'Held: +20% Atk, Fire dmg up.', price:1500, buff:{atk:0.20}},
  dragon_fang:  {name_fr:'Crocdure', name_en:'Dragon Fang', icon:'🐲', desc_fr:'Objet tenu : +20% Attaque, dégâts Dragon renforcés.', desc_en:'Held: +20% Atk, Dragon dmg up.', price:1500, buff:{atk:0.20}},
  miracle_seed: {name_fr:'Graine Miracle', name_en:'Miracle Seed', icon:'🌱', desc_fr:'Objet tenu : +20% Attaque, dégâts Plante renforcés.', desc_en:'Held: +20% Atk, Grass dmg up.', price:1500, buff:{atk:0.20}},
  mystic_water: {name_fr:'Eau Mystique', name_en:'Mystic Water', icon:'💧', desc_fr:'Objet tenu : +20% Attaque, dégâts Eau renforcés.', desc_en:'Held: +20% Atk, Water dmg up.', price:1500, buff:{atk:0.20}},
  never_melt_ice:{name_fr:'Glace Éternelle', name_en:'Never-Melt Ice', icon:'🧊', desc_fr:'Objet tenu : +20% Attaque, dégâts Glace renforcés.', desc_en:'Held: +20% Atk, Ice dmg up.', price:1500, buff:{atk:0.20}},
  sharp_beak:   {name_fr:'Bec Aiguisé', name_en:'Sharp Beak', icon:'🪶', desc_fr:'Objet tenu : +20% Attaque, dégâts Vol renforcés.', desc_en:'Held: +20% Atk, Flying dmg up.', price:1500, buff:{atk:0.20}},
  poison_barb:  {name_fr:'Piquant Poison', name_en:'Poison Barb', icon:'🟣', desc_fr:'Objet tenu : +20% Attaque, dégâts Poison renforcés.', desc_en:'Held: +20% Atk, Poison dmg up.', price:1500, buff:{atk:0.20}},
  spell_tag:    {name_fr:'Etiquette Maléfique', name_en:'Spell Tag', icon:'🔮', desc_fr:'Objet tenu : +20% Attaque, dégâts Spectre renforcés.', desc_en:'Held: +20% Atk, Ghost dmg up.', price:1500, buff:{atk:0.20}},
  hard_stone:   {name_fr:'Pierre Dure', name_en:'Hard Stone', icon:'🪨', desc_fr:'Objet tenu : +20% Attaque, dégâts Roche renforcés.', desc_en:'Held: +20% Atk, Rock dmg up.', price:1500, buff:{atk:0.20}},
  magnet:       {name_fr:'Aimant', name_en:'Magnet', icon:'🧲', desc_fr:'Objet tenu : +20% Attaque, dégâts Électrik renforcés.', desc_en:'Held: +20% Atk, Electric dmg up.', price:1500, buff:{atk:0.20}},
  silk_scarf:   {name_fr:'Foulard Soie', name_en:'Silk Scarf', icon:'🧣', desc_fr:'Objet tenu : +20% Attaque, dégâts Normal renforcés.', desc_en:'Held: +20% Atk, Normal dmg up.', price:1500, buff:{atk:0.20}},
  silver_wing:  {name_fr:'Aile Argent', name_en:'Silver Wing', icon:'🕊️', desc_fr:'Objet clé : réveille Ho-Oh à la Tour Cendrée.', desc_en:'Key item: awakens Ho-Oh at Tin Tower.', price:1, type:'key'},
  rainbow_wing: {name_fr:'Aile Arc-en-Ciel', name_en:'Rainbow Wing', icon:'🌈', desc_fr:'Objet clé : réveille Lugia aux Îles Whirl.', desc_en:'Key item: awakens Lugia at Whirl Islands.', price:1, type:'key'},'''
s = s.replace(anchor_items, anchor_items + "\n" + new_items, 1)

# ---- 2) SHOPS : ajoute les boutiques Johto avant la fermeture ----
anchor_shops = '''  indigo:    {name_fr:'Boutique Plateau',  name_en:'Indigo Mart',     items:['chroma_charm','rarecandy','choice_band','choice_specs','choice_scarf','life_orb','assault_vest','eviolite','leftovers','power_gem','swift_charm','muscle_band','metal_coat','soft_sand','focus_lens']},
};'''
assert anchor_shops in s, "anchor SHOPS non trouve"
new_shops = '''  // ---- Boutiques EXCLUSIVES JOHTO (objets Or/Argent) ----
  jnewbark:   {name_fr:'Labo du Prof. Orme', name_en:"Prof. Elm's Lab", items:['berry_oran','berry_sitrus','berry_ceriz','berry_prine','rarecandy']},
  jcherrygrove:{name_fr:'Boutique Ville Griotte', name_en:'Cherrygrove Mart', items:['berry_oran','berry_ceriz','rarecandy']},
  jviolet:    {name_fr:'Boutique Argenta', name_en:'Violet Mart', items:['berry_sitrus','muscle_band','twisted_spoon','miracle_seed']},
  jazalea:    {name_fr:'Boutique Écorcia', name_en:'Azalea Mart', items:['berry_prine','soft_sand','spell_tag','poison_barb']},
  jgoldenrod: {name_fr:'Grand Magasin Doublonville', name_en:'Goldenrod Dept. Store', items:['rarecandy','sunstone','kings_rock','dragon_scale','up_grade','deep_sea_scale','deep_sea_tooth','twisted_spoon','thick_club','black_belt','black_glasses','charcoal','dragon_fang','miracle_seed','mystic_water','never_melt_ice','sharp_beak','poison_barb','spell_tag','hard_stone','magnet','silk_scarf','silver_wing','rainbow_wing','choice_band','choice_specs','life_orb','leftovers']},
  jecruteak:  {name_fr:'Boutique Rosalia', name_en:'Ecruteak Mart', items:['berry_prine','spell_tag','never_melt_ice','mystic_water']},
  jolivine:   {name_fr:'Boutique Oliville', name_en:'Olivine Mart', items:['berry_oran','leftovers','mystic_water','hard_stone']},
  jcianwood:  {name_fr:'Boutique Irisia', name_en:'Cianwood Mart', items:['berry_sitrus','black_belt','charcoal','magnet']},
  jmahogany:  {name_fr:'Boutique Acajou', name_en:'Mahogany Mart', items:['berry_prine','up_grade','deep_sea_scale','deep_sea_tooth','dragon_fang']},
  jblackthorn:{name_fr:'Boutique Ébénelle', name_en:'Blackthorn Mart', items:['rarecandy','dragon_scale','dragon_fang','twisted_spoon','kings_rock']},'''
s = s.replace(anchor_shops, anchor_shops + "\n" + new_shops, 1)

# ---- 3) Repoint shopId des villes Johto vers les boutiques Johto ----
repoints = [
  ('newbark','pallet','jnewbark'),
  ('cherrygrove','viridian','jcherrygrove'),
  ('violet','pewter','jviolet'),
  ('azalea','cerulean','jazalea'),
  ('goldenrod','celadon','jgoldenrod'),
  ('ecruteak','lavender','jecruteak'),
  ('olivine','vermilion','jolivine'),
  ('cianwood','fuchsia','jcianwood'),
  ('mahogany','cinnabar','jmahogany'),
  ('blackthorn','indigo','jblackthorn'),
]
for town, old, new in repoints:
    pat = re.compile(r"(\b%s:\s*\{[^}]*?)shopId:'%s'" % (town, old))
    m = pat.search(s)
    assert m, "repoint shopId introuvable pour %s" % town
    s = pat.sub(r"\1shopId:'%s'" % new, s, 1)

open(p, 'w', encoding='utf-8').write(s)
print("game-data.js: items Johto + boutiques + repoint shopId OK")
