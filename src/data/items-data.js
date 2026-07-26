const ITEMS = {

  "prine_berry": {
    "icon": "\u{1F347}",
    "price": 45000,
    "type": "held",
    "category": "boost",
    "buff": { "def": 0.25 },
    "name_en": "Prine Berry",
    "name_fr": "Baie Prine",
  },

  "ancient_keystone": {
    "icon": "💎",
    "price": 45000,
    "type": "keystone",
    "name_en": "Ancient Keystone",
    "name_fr": "Clé de Voûte",
  },

  "armor_fossil": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "revive": 410,
    "name_en": "Armor Fossil",
    "name_fr": "Fossile Armure",
  },

  "assault_vest": {
    "icon": "",
    "price": 250000,
    "type": "held",
    "category": "defense",
    "powerFormula": "1+0.2*level",
    "name_en": "Assault Vest",
    "name_fr": "Veste de Combat",
  },

  "auspicious_armor": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Auspicious Armor",
    "name_fr": "Armure Bénie",
    "desc_en": "Auspicious Armor - Evolves certain Pokemon.",
    "desc_fr": "Armure Bénie - Fait évoluer certains Pokémon."
  },

  "babiri_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Steel",
    "resistPercent": 30,
    "name_en": "Steel Berry",
    "name_fr": "Baie Babiri",
  },

  "black_belt": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Fighting",
    "powerFormula": "1+0.1*level",
    "name_en": "Black Belt",
    "name_fr": "Ceinture Noire",
  },

  "black_glasses": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Dark",
    "powerFormula": "1+0.1*level",
    "name_en": "Black Glasses",
    "name_fr": "Lunettes Noires",
  },

  "bug_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Bug",
    "name_en": "Bug Gem",
    "name_fr": "Joyau Insecte",
  },

  "buginium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Buginium Z",
    "name_fr": "Insectozélite Z",
  },

  "charcoal": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Fire",
    "powerFormula": "1+0.1*level",
    "name_en": "Charcoal",
    "name_fr": "Charbon",
  },

  "charti_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Rock",
    "resistPercent": 30,
    "name_en": "Rock Berry",
    "name_fr": "Baie Charti",
  },

  "chipped_pot": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Chipped Pot",
    "name_fr": "Théière Ébréchée",
    "desc_en": "Chipped Pot - Evolves certain Pokemon.",
    "desc_fr": "Théière Ébréchée - Fait évoluer certains Pokémon."
  },

  "choice_band": {
    "icon": "",
    "price": 350000,
    "type": "held",
    "category": "choice",
    "powerFormula": "1+0.15*level",
    "stat": "atk",
    "mult": 1.5,
    "name_en": "Choice Band",
    "name_fr": "Bandeau Choix",
  },

  "choice_specs": {
    "icon": "",
    "price": 350000,
    "type": "held",
    "category": "choice",
    "powerFormula": "1+0.15*level",
    "stat": "spa",
    "mult": 1.5,
    "name_en": "Choice Specs",
    "name_fr": "Lunettes Choix",
  },

  "chople_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Fighting",
    "resistPercent": 30,
    "name_en": "Fighting Berry",
    "name_fr": "Baie Chople",
  },

  "claw_fossil": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "revive": 347,
    "name_en": "Claw Fossil",
    "name_fr": "Fossile Griffe",
  },

  "clear_amulet": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "protect",
    "powerFormula": "0.5+0.5*level",
    "name_en": "Clear Amulet",
    "name_fr": "Amulette Pure",
  },

  "coba_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Flying",
    "resistPercent": 30,
    "name_en": "Flying Berry",
    "name_fr": "Baie Coba",
  },

  "colbur_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Dark",
    "resistPercent": 30,
    "name_en": "Dark Berry",
    "name_fr": "Baie Colbur",
  },

  "cover_fossil": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "revive": 564,
    "name_en": "Cover Fossil",
    "name_fr": "Fossile Plaque",
  },

  "cracked_pot": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Cracked Pot",
    "name_fr": "Théière Fêlée",
    "desc_en": "Cracked Pot - Evolves certain Pokemon.",
    "desc_fr": "Théière Fêlée - Fait évoluer certains Pokémon."
  },

  "cs01_cut": {
    "icon": "💿",
    "price": 0,
    "type": "cs",
    "moveId": "cut",
        "name_en": "Cut",
    "name_fr": "Coupe",
    "desc_en": "Teaches Cut to a compatible Pokémon. Can cut down small trees in the overworld.",
    "desc_fr": "Enseigne Coupe à un Pokémon compatible. Permet de couper les petits arbres.",
  },

  "cs02_fly": {
    "icon": "💿",
    "price": 0,
    "type": "cs",
    "moveId": "fly",
        "name_en": "Fly",
    "name_fr": "Vol",
    "desc_en": "Teaches Fly to a compatible Pokémon. Allows fast travel to visited locations.",
    "desc_fr": "Enseigne Vol à un Pokémon compatible. Permet de se déplacer rapidement.",
  },

  "cs03_surf": {
    "icon": "💿",
    "price": 0,
    "type": "cs",
    "moveId": "surf",
        "name_en": "Surf",
    "name_fr": "Surf",
    "desc_en": "Teaches Surf to a compatible Pokémon. Allows crossing water.",
    "desc_fr": "Enseigne Surf à un Pokémon compatible. Permet de traverser les étendues d'eau.",
  },

  "ct06_toxic": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "toxic",
  },

  "ct08_bodyslam": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "bodyslam",
  },

  "ct10_doubleedge": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "doubleedge",
  },

  "ct13_icebeam": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "icebeam",
  },

  "ct15_hyperbeam": {
    "icon": "💿",
    "price": 75000,
    "type": "ct",
    "moveId": "hyperbeam",
  },

  "ct22_solarbeam": {
    "icon": "💿",
    "price": 75000,
    "type": "ct",
    "moveId": "solarbeam",
  },

  "ct24_thunderbolt": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "thunderbolt",
  },

  "ct26_earthquake": {
    "icon": "💿",
    "price": 75000,
    "type": "ct",
    "moveId": "earthquake",
  },

  "ct29_psychic": {
    "icon": "💿",
    "price": 75000,
    "type": "ct",
    "moveId": "psychic",
  },

  "ct30_shadowball": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "shadowball",
  },

  "ct35_flamethrower": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "flamethrower",
  },

  "ct_acid": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "acid",

    "name_en": "Acid",
    "name_fr": "Acide",
    "desc_en": "Teaches Acid to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Acide à un Pokémon compatible."
  },

  "ct_acidspray": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "acid_spray",

    "name_en": "Acidspray",
    "name_fr": "Bombe Acide",
    "desc_en": "Teaches Acidspray to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Bombe Acide à un Pokémon compatible."
  },

  "ct_acrobatics": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "acrobatics",

    "name_en": "Acrobatics",
    "name_fr": "Acrobatie",
    "desc_en": "Teaches Acrobatics to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Acrobatie à un Pokémon compatible."
  },

  "ct_airshlash":{
    "moveId": "air_shlash",

    "name_en": "Airshlash",
    "name_fr": "Lame d'Air",
    "desc_en": "Teaches Airshlash to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Lame d'Air à un Pokémon compatible."
  },

  "ct_aquatail": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "aqua_tail",

    "name_en": "Aquatail",
    "name_fr": "Hydro-Queue",
    "desc_en": "Teaches Aquatail to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Hydro-Queue à un Pokémon compatible."
  },

  "ct_aurasphere":{
    "moveId": "aura_sphere",

    "name_en": "Aurasphere",
    "name_fr": "Aurasphère",
    "desc_en": "Teaches Aurasphere to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Aurasphère à un Pokémon compatible."
  },

  "ct_avalanche": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "avalanche",

    "name_en": "Avalanche",
    "name_fr": "Avalanche",
    "desc_en": "Teaches Avalanche to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Avalanche à un Pokémon compatible."
  },

  "ct_bite": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "bite",

    "name_en": "Bite",
    "name_fr": "Morsure",
    "desc_en": "Teaches Bite to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Morsure à un Pokémon compatible."
  },

  "ct_bugbite": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "bug_bite",

    "name_en": "Bug Bite",
    "name_fr": "Mord-Croq",
    "desc_en": "Teaches Bug Bite to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Mord-Croq à un Pokémon compatible."
  },

  "ct_bugbuzz": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "bug_buzz",

    "name_en": "Bugbuzz",
    "name_fr": "Bourdon",
    "desc_en": "Teaches Bugbuzz to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Bourdon à un Pokémon compatible."
  },

  "ct_bulkup": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "bulk_up",

    "name_en": "Bulkup",
    "name_fr": "Gonflette",
    "desc_en": "Teaches Bulkup to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Gonflette à un Pokémon compatible."
  },

  "ct_bulldoze": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "bulldoze",

    "name_en": "Bulldoze",
    "name_fr": "Piétisol",
    "desc_en": "Teaches Bulldoze to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Piétisol à un Pokémon compatible."
  },

  "ct_bulletpunch": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "bullet_punch",

    "name_en": "Bulletpunch",
    "name_fr": "Poing Météore",
    "desc_en": "Teaches Bulletpunch to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Poing Météore à un Pokémon compatible."
  },

  "ct_calmmind": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "calm_mind",

    "name_en": "Calmmind",
    "name_fr": "Plénitude",
    "desc_en": "Teaches Calmmind to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Plénitude à un Pokémon compatible."
  },

  "ct_chargebeam":{
    "moveId": "charge_beam",

    "name_en": "Chargebeam",
    "name_fr": "Rayon Chargé",
    "desc_en": "Teaches Chargebeam to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Rayon Chargé à un Pokémon compatible."
  },

  "ct_chillingwater":{
    "moveId": "chilling_water",

    "name_en": "Chillingwater",
    "name_fr": "Eau Glacée",
    "desc_en": "Teaches Chillingwater to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité chillingwater à un Pokémon compatible."
  },

  "ct_confusion": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "confusion",

    "name_en": "Confusion",
    "name_fr": "Choc Mental",
    "desc_en": "Teaches Confusion to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Choc Mental à un Pokémon compatible."
  },

  "ct_crosspoison":{
    "moveId": "cross_poison",

    "name_en": "Crosspoison",
    "name_fr": "Poison-Croix",
    "desc_en": "Teaches Crosspoison to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Poison-Croix à un Pokémon compatible."
  },

  "ct_crossroom":{
    "moveId": "cross_room",

    "name_en": "Crossroom",
    "name_fr": "Force Croisée",
    "desc_en": "Teaches Crossroom to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Force Croisée à un Pokémon compatible."
  },

  "ct_crunch": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "crunch",

    "name_en": "Crunch",
    "name_fr": "Croquefer",
    "desc_en": "Teaches Crunch to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Croquefer à un Pokémon compatible."
  },

  "ct_darkpulse": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "dark_pulse",

    "name_en": "Darkpulse",
    "name_fr": "Vibrobscur",
    "desc_en": "Teaches Darkpulse to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Vibrobscur à un Pokémon compatible."
  },

  "ct_dazzlinggleam":{
    "moveId": "dazzling_gleam",

    "name_en": "Dazzling Gleam",
    "name_fr": "Éclat Magique",
    "desc_en": "Teaches Dazzling Gleam to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Éclat Magique à un Pokémon compatible."
  },

  "ct_disarmingvoice": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "disarming_voice",

    "name_en": "Disarmingvoice",
    "name_fr": "Voix Enjôleuse",
    "desc_en": "Teaches Disarmingvoice to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Voix Enjôleuse à un Pokémon compatible."
  },

  "ct_discharge": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "discharge",

    "name_en": "Discharge",
    "name_fr": "Coup d'Jus",
    "desc_en": "Teaches Discharge to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Coup d'Jus à un Pokémon compatible."
  },

  "ct_dracometeor":{
    "moveId": "draco_meteor",

    "name_en": "Dracometeor",
    "name_fr": "Draco Météor",
    "desc_en": "Teaches Dracometeor to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Draco Météor à un Pokémon compatible."
  },

  "ct_dragonpulse": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "dragon_pulse",

    "name_en": "Dragonpulse",
    "name_fr": "Draco-Choc",
    "desc_en": "Teaches Dragonpulse to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Draco-Choc à un Pokémon compatible."
  },

  "ct_dragonrush": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "dragon_rush",

    "name_en": "Dragonrush",
    "name_fr": "Draco-Charge",
    "desc_en": "Teaches Dragonrush to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Draco-Charge à un Pokémon compatible."
  },

  "ct_dragontail": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "dragon_tail",

    "name_en": "Dragontail",
    "name_fr": "Draco-Queue",
    "desc_en": "Teaches Dragontail to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Draco-Queue à un Pokémon compatible."
  },

  "ct_electricterrain":{
    "moveId": "electric_terrain",

    "name_en": "Electricterrain",
    "name_fr": "Champ Électrifié",
    "desc_en": "Teaches Electricterrain to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Champ Électrifié à un Pokémon compatible."
  },

  "ct_ember": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "ember",

    "name_en": "Ember",
    "name_fr": "Flammèche",
    "desc_en": "Teaches Ember to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Flammèche à un Pokémon compatible."
  },

  "ct_energyball":{
    "moveId": "energy_ball",

    "name_en": "Energyball",
    "name_fr": "Éco-Sphère",
    "desc_en": "Teaches Energyball to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Éco-Sphère à un Pokémon compatible."
  },

  "ct_feintattack":{
    "moveId": "feint_attack",

    "name_en": "Feintattack",
    "name_fr": "Feinte",
    "desc_en": "Teaches Feintattack to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Feinte à un Pokémon compatible."
  },

  "ct_fireblast": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "fire_blast",

    "name_en": "Fire Blast",
    "name_fr": "Déflagration",
    "desc_en": "Teaches Fire Blast to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Déflagration à un Pokémon compatible."
  },

  "ct_flamecharge": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "flame_charge",

    "name_en": "Flamecharge",
    "name_fr": "Nitrocharge",
    "desc_en": "Teaches Flamecharge to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Nitrocharge à un Pokémon compatible."
  },

  "ct_flashcannon": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "flash_cannon",

    "name_en": "Flashcannon",
    "name_fr": "Luminocanon",
    "desc_en": "Teaches Flashcannon to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Luminocanon à un Pokémon compatible."
  },

  "ct_fog": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "fog",

    "name_en": "Fog",
    "name_fr": "Brume",
    "desc_en": "Teaches Fog to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Brume à un Pokémon compatible."
  },

  "ct_forcepalm": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "force_palm",

    "name_en": "Forcepalm",
    "name_fr": "Pressure",
    "desc_en": "Teaches Forcepalm to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Pressure à un Pokémon compatible."
  },

  "ct_grassyterrain":{
    "moveId": "grassy_terrain",

    "name_en": "Grassyterrain",
    "name_fr": "Champ Herbu",
    "desc_en": "Teaches Grassyterrain to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Champ Herbu à un Pokémon compatible."
  },

  "ct_hail": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "hail",

    "name_en": "Hail",
    "name_fr": "Grêle",
    "desc_en": "Teaches Hail to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Grêle à un Pokémon compatible."
  },

  "ct_hex": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "hex",

    "name_en": "Hex",
    "name_fr": "Châtiment",
    "desc_en": "Teaches Hex to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Châtiment à un Pokémon compatible."
  },

  "ct_hydropump": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "hydro_pump",

    "name_en": "Hydro Pump",
    "name_fr": "Hydroblast",
    "desc_en": "Teaches Hydro Pump to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Hydroblast à un Pokémon compatible."
  },

  "ct_iceshard": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "ice_shard",

    "name_en": "Iceshard",
    "name_fr": "Éclats Glace",
    "desc_en": "Teaches Iceshard to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Éclats Glace à un Pokémon compatible."
  },

  "ct_incinerate": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "incinerate",

    "name_en": "Incinerate",
    "name_fr": "Calcination",
    "desc_en": "Teaches Incinerate to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Calcination à un Pokémon compatible."
  },

  "ct_irondefense":{
    "moveId": "iron_defense",

    "name_en": "Irondefense",
    "name_fr": "Mur de Fer",
    "desc_en": "Teaches Irondefense to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Mur de Fer à un Pokémon compatible."
  },

  "ct_knockoff": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "knock_off",

    "name_en": "Knockoff",
    "name_fr": "Sabotage",
    "desc_en": "Teaches Knockoff to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Sabotage à un Pokémon compatible."
  },

  "ct_leafage": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "leafage",

    "name_en": "Leafage",
    "name_fr": "Feuillage",
    "desc_en": "Teaches Leafage to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Feuillage à un Pokémon compatible."
  },

  "ct_leafblade":{
    "moveId": "leaf_blade",

    "name_en": "Leafblade",
    "name_fr": "Lame Feuille",
    "desc_en": "Teaches Leafblade to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Lame Feuille à un Pokémon compatible."
  },

  "ct_leer": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "leer",

    "name_en": "Leer",
    "name_fr": "Groz Yeux",
    "desc_en": "Teaches Leer to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Groz Yeux à un Pokémon compatible."
  },

  "ct_lick": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "lick",

    "name_en": "Lick",
    "name_fr": "Léchage",
    "desc_en": "Teaches Lick to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Léchage à un Pokémon compatible."
  },

  "ct_lightscreen":{
    "moveId": "light_screen",

    "name_en": "Lightscreen",
    "name_fr": "Mur Lumière",
    "desc_en": "Teaches Lightscreen to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Mur Lumière à un Pokémon compatible."
  },

  "ct_liquidation": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "liquidation",

    "name_en": "Liquidation",
    "name_fr": "Trempage",
    "desc_en": "Teaches Liquidation to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Trempage à un Pokémon compatible."
  },

  "ct_magicalleaf":{
    "moveId": "magical_leaf",

    "name_en": "Magicalleaf",
    "name_fr": "Feuille Magik",
    "desc_en": "Teaches Magicalleaf to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Feuille Magik à un Pokémon compatible."
  },

  "ct_metalclaw": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "metal_claw",

    "name_en": "Metal Claw",
    "name_fr": "Griffe Acier",
    "desc_en": "Teaches Metal Claw to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Griffe Acier à un Pokémon compatible."
  },

  "ct_mistyterrain":{
    "moveId": "misty_terrain",

    "name_en": "Mistyterrain",
    "name_fr": "Champ Brumeux",
    "desc_en": "Teaches Mistyterrain to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Champ Brumeux à un Pokémon compatible."
  },

  "ct_moonblast": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "moonblast",

    "name_en": "Moonblast",
    "name_fr": "Éblouissement",
    "desc_en": "Teaches Moonblast to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Éblouissement à un Pokémon compatible."
  },

  "ct_mudslap": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "mud_slap",

    "name_en": "Mudslap",
    "name_fr": "Boue-Bombe",
    "desc_en": "Teaches Mudslap to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Boue-Bombe à un Pokémon compatible."
  },

  "ct_nastyplot": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "nasty_plot",

    "name_en": "Nastyplot",
    "name_fr": "Machination",
    "desc_en": "Teaches Nastyplot to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Machination à un Pokémon compatible."
  },

  "ct_nuzzle": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "nuzzle",

    "name_en": "Nuzzle",
    "name_fr": "Frotte-Frimousse",
    "desc_en": "Teaches Nuzzle to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Frotte-Frimousse à un Pokémon compatible."
  },

  "ct_ominouswind":{
    "moveId": "ominous_wind",

    "name_en": "Ominouswind",
    "name_fr": "Vent Mauvais",
    "desc_en": "Teaches Ominouswind to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Vent Mauvais à un Pokémon compatible."
  },

  "ct_peck": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "peck",

    "name_en": "Peck",
    "name_fr": "Coup d'Bec",
    "desc_en": "Teaches Peck to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Coup d'Bec à un Pokémon compatible."
  },

  "ct_playrough": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "play_rough",

    "name_en": "Playrough",
    "name_fr": "Câlin",
    "desc_en": "Teaches Playrough to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Câlin à un Pokémon compatible."
  },

  "ct_poisonjab":{
    "moveId": "poison_jab",

    "name_en": "Poisonjab",
    "name_fr": "Direct Toxik",
    "desc_en": "Teaches Poisonjab to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Direct Toxik à un Pokémon compatible."
  },

  "ct_powergem": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "power_gem",

    "name_en": "Powergem",
    "name_fr": "Joyau Lumineux",
    "desc_en": "Teaches Powergem to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Joyau Lumineux à un Pokémon compatible."
  },

  "ct_psychocut":{
    "moveId": "psycho_cut",

    "name_en": "Psychocut",
    "name_fr": "Coupe Psycho",
    "desc_en": "Teaches Psychocut to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Coupe Psycho à un Pokémon compatible."
  },

  "ct_pursuit": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "pursuit",

    "name_en": "Pursuit",
    "name_fr": "Poursuite",
    "desc_en": "Teaches Pursuit to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Poursuite à un Pokémon compatible."
  },

  "ct_quickattack": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "quick_attack",

    "name_en": "Quick Attack",
    "name_fr": "Vive-Attaque",
    "desc_en": "Teaches Quick Attack to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Vive-Attaque à un Pokémon compatible."
  },

  "ct_raindance": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "rain_dance",

    "name_en": "Raindance",
    "name_fr": "Danse Pluie",
    "desc_en": "Teaches Raindance to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Danse Pluie à un Pokémon compatible."
  },

  "ct_rockslide": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "rock_slide",

    "name_en": "Rock Slide",
    "name_fr": "Éboulement",
    "desc_en": "Teaches Rock Slide to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Éboulement à un Pokémon compatible."
  },

  "ct_rocksmash":{
    "moveId": "rock_smash",

    "name_en": "Rocksmash",
    "name_fr": "Éclate-Roc",
    "desc_en": "Teaches Rocksmash to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Éclate-Roc à un Pokémon compatible."
  },

  "ct_rockthrow": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "rock_throw",

    "name_en": "Rock Throw",
    "name_fr": "Jet-Pierres",
    "desc_en": "Teaches Rock Throw to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Jet-Pierres à un Pokémon compatible."
  },

  "ct_safeguard": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "safeguard",

    "name_en": "Safeguard",
    "name_fr": "Rune Protect",
    "desc_en": "Teaches Safeguard to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Rune Protect à un Pokémon compatible."
  },

  "ct_sandstorm": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "sandstorm",

    "name_en": "Sandstorm",
    "name_fr": "Tempête de Sable",
    "desc_en": "Teaches Sandstorm to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Tempête de Sable à un Pokémon compatible."
  },

  "ct_scorchingsands":{
    "moveId": "scorching_sands",

    "name_en": "Scorchingsands",
    "name_fr": "Sable Brûlant",
    "desc_en": "Teaches Scorchingsands to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Sable Brûlant à un Pokémon compatible."
  },

  "ct_silverwind":{
    "moveId": "silver_wind",

    "name_en": "Silverwind",
    "name_fr": "Vent Argenté",
    "desc_en": "Teaches Silverwind to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Vent Argenté à un Pokémon compatible."
  },

  "ct_skyuppercut":{
    "moveId": "sky_uppercut",

    "name_en": "Skyuppercut",
    "name_fr": "Stratopercut",
    "desc_en": "Teaches Skyuppercut to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Stratopercut à un Pokémon compatible."
  },

  "ct_sludgebomb": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "sludge_bomb",

    "name_en": "Sludge Bomb",
    "name_fr": "Bombe Beurk",
    "desc_en": "Teaches Sludge Bomb to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Bombe Beurk à un Pokémon compatible."
  },

  "ct_spiritbreak":{
    "moveId": "spirit_break",

    "name_en": "Spiritbreak",
    "name_fr": "Choc Émotion",
    "desc_en": "Teaches Spiritbreak to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Choc Émotion à un Pokémon compatible."
  },

  "ct_strength": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "strength",

    "name_en": "Strength",
    "name_fr": "Force",
    "desc_en": "Teaches Strength to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Force à un Pokémon compatible."
  },

  "ct_sunnyday": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "sunny_day",

    "name_en": "Sunnyday",
    "name_fr": "Zénith",
    "desc_en": "Teaches Sunnyday to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Zénith à un Pokémon compatible."
  },

  "ct_swagger": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "swagger",

    "name_en": "Swagger",
    "name_fr": "Vantardise",
    "desc_en": "Teaches Swagger to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Vantardise à un Pokémon compatible."
  },

  "ct_swift": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "swift",

    "name_en": "Swift",
    "name_fr": "Météores",
    "desc_en": "Teaches Swift to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Météores à un Pokémon compatible."
  },

  "ct_swordsdance": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "swords_dance",

    "name_en": "Swordsdance",
    "name_fr": "Danse Lames",
    "desc_en": "Teaches Swordsdance to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Danse Lames à un Pokémon compatible."
  },

  "ct_tackle": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "tackle",

    "name_en": "Tackle",
    "name_fr": "Charge",
    "desc_en": "Teaches Tackle to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Charge à un Pokémon compatible."
  },

  "ct_thunder": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "thunder",

    "name_en": "Thunder",
    "name_fr": "Foudre",
    "desc_en": "Teaches Thunder to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Foudre à un Pokémon compatible."
  },

  "ct_thunderpunch": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "thunder_punch",

    "name_en": "Thunderpunch",
    "name_fr": "Poing Éclair",
    "desc_en": "Teaches Thunderpunch to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Poing Éclair à un Pokémon compatible."
  },

  "ct_thunderwave": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "thunder_wave",

    "name_en": "Thunder Wave",
    "name_fr": "Cage-Éclair",
    "desc_en": "Teaches Thunder Wave to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Cage-Éclair à un Pokémon compatible."
  },

  "ct_trickroom":{
    "moveId": "trick_room",

    "name_en": "Trickroom",
    "name_fr": "Tour de Magie",
    "desc_en": "Teaches Trickroom to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Tour de Magie à un Pokémon compatible."
  },

  "ct_twineedle": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "twineedle",

    "name_en": "Twineedle",
    "name_fr": "Double Dard",
    "desc_en": "Teaches Twineedle to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Double Dard à un Pokémon compatible."
  },

  "ct_twister": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "twister",

    "name_en": "Twister",
    "name_fr": "Ouragan",
    "desc_en": "Teaches Twister to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Ouragan à un Pokémon compatible."
  },

  "ct_uturn": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "u_turn",

    "name_en": "Uturn",
    "name_fr": "Demi-Tour",
    "desc_en": "Teaches Uturn to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Demi-Tour à un Pokémon compatible."
  },

  "ct_voltswitch":{
    "moveId": "volt_switch",

    "name_en": "Voltswitch",
    "name_fr": "Change-Éclair",
    "desc_en": "Teaches Voltswitch to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Change-Éclair à un Pokémon compatible."
  },

  "ct_watergun": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "water_gun",

    "name_en": "Water Gun",
    "name_fr": "Pistolet à O",
    "desc_en": "Teaches Water Gun to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Pistolet à O à un Pokémon compatible."
  },

  "ct_waterpulse": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "water_pulse",

    "name_en": "Waterpulse",
    "name_fr": "Vibraqua",
    "desc_en": "Teaches Waterpulse to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Vibraqua à un Pokémon compatible."
  },

  "ct_weirdroom":{
    "moveId": "weird_room",

    "name_en": "Weirdroom",
    "name_fr": "Distorsion",
    "desc_en": "Teaches Weirdroom to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Distorsion à un Pokémon compatible."
  },

  "ct_willowisp": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "will_owisp",

    "name_en": "Willowisp",
    "name_fr": "Feu Follet",
    "desc_en": "Teaches Willowisp to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Feu Follet à un Pokémon compatible."
  },

  "ct_xscissor": {
    "icon": "💿",
    "price": 50000,
    "type": "ct",
    "moveId": "x_scissor",

    "name_en": "Xscissor",
    "name_fr": "Plaie Croix",
    "desc_en": "Teaches Xscissor to a compatible Pokémon.",
    "desc_fr": "Enseigne la capacité Plaie Croix à un Pokémon compatible."
  },

  "damp_rock": {
    "icon": "🪨",
    "price": 80000,
    "type": "held",
    "category": "weather",
    "weather": "rainy",
    "name_en": "Damp Rock",
    "name_fr": "Roche Humide",
  },

  "dark_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Dark",
    "name_en": "Dark Gem",
    "name_fr": "Joyau Ténèbres",
  },

  "darkinium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Darkinium Z",
    "name_fr": "Ténébrozélite Z",
  },

  "dawn_stone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Dawn Stone",
    "name_fr": "Pierre Aube",
  },

  "deep_sea_scale": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Deep Sea Scale",
    "name_fr": "Écaille Océan",
    "desc_en": "Deep Sea Scale - Evolves certain Pokemon.",
    "desc_fr": "Écaille Océan - Fait évoluer certains Pokémon."
  },

  "deep_sea_tooth": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Deep Sea Tooth",
    "name_fr": "Dent Océan",
    "desc_en": "Deep Sea Tooth - Evolves certain Pokemon.",
    "desc_fr": "Dent Océan - Fait évoluer certains Pokémon."
  },

  "dome_fossil": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "revive": 140,
    "name_en": "Dome Fossil",
    "name_fr": "Fossile Dôme",
  },

  "dragon_fang": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Dragon",
    "powerFormula": "1+0.1*level",
    "name_en": "Dragon Fang",
    "name_fr": "Croc Dragon",
  },

  "dragon_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Dragon",
    "name_en": "Dragon Gem",
    "name_fr": "Joyau Dragon",
  },

  "dragon_scale": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Dragon Scale",
    "name_fr": "Écaille Draco",
    "desc_en": "Dragon Scale - Evolves certain Pokemon.",
    "desc_fr": "Écaille Draco - Fait évoluer certains Pokémon."
  },

  "dragonium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Dragonium Z",
    "name_fr": "Dracozélite Z",
  },

  "dubious_disc": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Dubious Disc",
    "name_fr": "CD Douteux",
    "desc_en": "Dubious Disc - Evolves certain Pokemon when traded.",
    "desc_fr": "CD Douteux - Fait évoluer certains Pokémon par échange."
  },

  "dusk_stone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Dusk Stone",
    "name_fr": "Pierre Nuit",
  },

  "eject_button": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "eject",
    "powerFormula": "1+0.15*level",
    "name_en": "Eject Button",
    "name_fr": "Bouton de Fuite",
  },

  "eject_pack": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "eject",
    "powerFormula": "1+0.15*level",
    "name_en": "Eject Pack",
    "name_fr": "Sac de Fuite",
  },

  "electirizer": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Electirizer",
    "name_fr": "Électriseur",
    "desc_en": "Electirizer - Evolves certain Pokemon when traded.",
    "desc_fr": "Électriseur - Fait évoluer certains Pokémon par échange."
  },

  "electric_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Electric",
    "name_en": "Electric Gem",
    "name_fr": "Joyau Électrik",
  },

  "electric_seed": {
    "icon": "🌱",
    "price": 45000,
    "type": "held",
    "category": "seed",
    "seedType": "Electric",
    "name_en": "Electric Seed",
    "name_fr": "Graine Électrik",
  },

  "electrium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Electrium Z",
    "name_fr": "Voltazélite Z",
  },

  "everstone": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Everstone",
    "name_fr": "Pierre Stase",
    "desc_en": "Everstone - Prevents evolution. Rerolls ability at the Hatchery.",
    "desc_fr": "Pierre Stase - Empêche l'évolution. Permet de changer le talent au pensionnat."
  },

  "eviolite": {
    "icon": "",
    "price": 200000,
    "type": "held",
    "category": "eviolite",
    "powerFormula": "1+level/5",
    "name_en": "Eviolite",
    "name_fr": "Évolition",
  },

  "fairium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Fairium Z",
    "name_fr": "Nymphézélite Z",
  },

  "fairy_feather": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Fairy",
    "powerFormula": "1+0.1*level",
    "name_en": "Fairy Feather",
    "name_fr": "Plume Féérique",
  },

  "fairy_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Fairy",
    "name_en": "Fairy Gem",
    "name_fr": "Joyau Fée",
  },

  "fighting_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Fighting",
    "name_en": "Fighting Gem",
    "name_fr": "Joyau Combat",
  },

  "fightinium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Fightinium Z",
    "name_fr": "Combazélite Z",
  },

  "fire_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Fire",
    "name_en": "Fire Gem",
    "name_fr": "Joyau Feu",
  },

  "fire_stone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Fire Stone",
    "name_fr": "Pierre Feu",
  },

  "firestone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Fire Stone",
    "name_fr": "Pierre Feu",
  },

  "firium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Firium Z",
    "name_fr": "Pyrozélite Z",
  },

  "flame_orb": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "status",
    "powerFormula": "1+0.15*level",
    "statusEffect": "burn",
    "name_en": "Flame Orb",
    "name_fr": "Orbe Flamme",
  },

  "flying_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Flying",
    "name_en": "Flying Gem",
    "name_fr": "Joyau Vol",
  },

  "flyinium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Flyinium Z",
    "name_fr": "Aérozélite Z",
  },

  "foggy_seed": {
    "icon": "🌱",
    "price": 45000,
    "type": "held",
    "category": "seed",
    "seedType": "Fog",
    "name_en": "Foggy Seed",
    "name_fr": "Graine Brouillard",
  },

  "fossilized_bird": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "futureOnly": true,
    "name_en": "Fossilized Bird",
    "name_fr": "Fossile Oiseau",
  },

  "fossilized_dino": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "futureOnly": true,
    "name_en": "Fossilized Dino",
    "name_fr": "Fossile Dino",
  },

  "fossilized_drake": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "futureOnly": true,
    "name_en": "Fossilized Drake",
    "name_fr": "Fossile Draco",
  },

  "fossilized_fish": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "futureOnly": true,
    "name_en": "Fossilized Fish",
    "name_fr": "Fossile Poisson",
  },

  "frozen_keystone": {
    "icon": "💎",
    "price": 45000,
    "type": "keystone",
    "name_en": "Frozen Keystone",
    "name_fr": "Clé de Voûte Gelée",
  },

  "galarica_cuff": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Galarica Cuff",
    "name_fr": "Bracelet Galarique",
    "desc_en": "Galarica Cuff - Evolves certain Pokemon.",
    "desc_fr": "Bracelet Galarique - Fait évoluer certains Pokémon."
  },

  "galarica_wreath": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Galarica Wreath",
    "name_fr": "Couronne Galarique",
    "desc_en": "Galarica Wreath - Evolves certain Pokemon.",
    "desc_fr": "Couronne Galarique - Fait évoluer certains Pokémon."
  },

  "ghost_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Ghost",
    "name_en": "Ghost Gem",
    "name_fr": "Joyau Spectre",
  },

  "ghostium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Ghostium Z",
    "name_fr": "Spectrozélite Z",
  },

  "grass_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Grass",
    "name_en": "Grass Gem",
    "name_fr": "Joyau Plante",
  },

  "grassium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Grassium Z",
    "name_fr": "Florazélite Z",
  },

  "grassy_seed": {
    "icon": "🌱",
    "price": 45000,
    "type": "held",
    "category": "seed",
    "seedType": "Grass",
    "name_en": "Grassy Seed",
    "name_fr": "Graine Herbe",
  },

  "ground_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Ground",
    "name_en": "Ground Gem",
    "name_fr": "Joyau Sol",
  },

  "groundium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Groundium Z",
    "name_fr": "Terrazélite Z",
  },

  "haban_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Dragon",
    "resistPercent": 30,
    "name_en": "Dragon Berry",
    "name_fr": "Baie Haban",
  },

  "hard_stone": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Rock",
    "powerFormula": "1+0.1*level",
    "name_en": "Hard Stone",
    "name_fr": "Pierre Dure",
  },

  "heat_rock": {
    "icon": "🪨",
    "price": 80000,
    "type": "held",
    "category": "weather",
    "weather": "sunny",
    "name_en": "Heat Rock",
    "name_fr": "Roche Chaude",
  },

  "heavy_duty_boots": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "hazards",
    "powerFormula": "1+0.15*level",
    "name_en": "Heavy-Duty Boots",
    "name_fr": "Bottes Lourdes",
  },

  "helix_fossil": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "revive": 138,
    "name_en": "Helix Fossil",
    "name_fr": "Fossile Nautile",
  },

  "fossil": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "revive": 138,
    "name_en": "Old Fossil",
    "name_fr": "Vieux Fossile",
  },

  "ice_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Ice",
    "name_en": "Ice Gem",
    "name_fr": "Joyau Glace",
  },

  "ice_stone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Ice Stone",
    "name_fr": "Pierre Glace",
  },

  "icium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Icium Z",
    "name_fr": "Cryozélite Z",
  },

  "icy_rock": {
    "icon": "🪨",
    "price": 80000,
    "type": "held",
    "category": "weather",
    "weather": "hail",
    "name_en": "Icy Rock",
    "name_fr": "Roche Glace",
  },

  "jaw_fossil": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "revive": 696,
    "name_en": "Jaw Fossil",
    "name_fr": "Fossile Mâchoire",
  },

  "kasib_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Ghost",
    "resistPercent": 30,
    "name_en": "Ghost Berry",
    "name_fr": "Baie Kasib",
  },

  "kebia_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Poison",
    "resistPercent": 30,
    "name_en": "Poison Berry",
    "name_fr": "Baie Kebia",
  },

  "kings_rock": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "King's Rock",
    "name_fr": "Roche Royale",
    "desc_en": "King's Rock - Evolves certain Pokemon.",
    "desc_fr": "Roche Royale - Fait évoluer certains Pokémon."
  },

  "lagging_tail": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "slow",
    "powerFormula": "1+0.15*level",
    "name_en": "Lagging Tail",
    "name_fr": "Queue Lente",
  },

  "leaf_stone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Leaf Stone",
    "name_fr": "Pierre Plante",
  },

  "leafstone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Leaf Stone",
    "name_fr": "Pierre Plante",
  },

  "leftovers": {
    "icon": "",
    "price": 120000,
    "type": "held",
    "category": "leftovers",
    "powerFormula": "1+0.15*level",
    "name_en": "Leftovers",
    "name_fr": "Restes",
  },

  "life_orb": {
    "icon": "",
    "price": 450000,
    "type": "held",
    "category": "life_orb",
    "powerFormula": "1+0.2*level",
    "name_en": "Life Orb",
    "name_fr": "Orbe Vie",
  },

  "light_clay": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "extend",
    "powerFormula": "1+0.06*level",
    "name_en": "Light Clay",
    "name_fr": "Lumargile",
  },

  "link_stone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Link Stone",
    "name_fr": "Pierre Lien",
  },

  "loaded_dice": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "multi_hit",
    "powerFormula": "1+0.1*level",
    "name_en": "Loaded Dice",
    "name_fr": "Dé à Jouer",
  },

  "luck_incense": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "loot",
    "powerFormula": "1+0.15*level",
    "name_en": "Luck Incense",
    "name_fr": "Encens Veine",
  },

  "lucky_egg": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "exp",
    "powerFormula": "1+0.15*level",
    "name_en": "Lucky Egg",
    "name_fr": "Œuf Chance",
  },

  "lucky_punch": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "punch",
    "powerFormula": "1+0.15*level",
    "name_en": "Lucky Punch",
    "name_fr": "Poing Chance",
  },

  "magmarizer": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Magmarizer",
    "name_fr": "Magmariseur",
    "desc_en": "Magmarizer - Evolves certain Pokemon when traded.",
    "desc_fr": "Magmariseur - Fait évoluer certains Pokémon par échange."
  },

  "magnet": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Electric",
    "powerFormula": "1+0.1*level",
    "name_en": "Magnet",
    "name_fr": "Aimant",
  },

  "malicious_armor": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Malicious Armor",
    "name_fr": "Armure de la Rancune",
    "desc_en": "Malicious Armor - Evolves certain Pokemon.",
    "desc_fr": "Armure de la Rancune - Fait évoluer certains Pokémon."
  },

  "masterpiece_teacup": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Masterpiece Teacup",
    "name_fr": "Théière d'Exception",
    "desc_en": "Masterpiece Teacup - Evolves certain Pokemon.",
    "desc_fr": "Théière d'Exception - Fait évoluer certains Pokémon."
  },

  "mental_herb": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "cure",
    "powerFormula": "1+0.06*level",
    "name_en": "Mental Herb",
    "name_fr": "Herbe Mentale",
  },

  "metal_coat": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Steel",
    "powerFormula": "1+0.1*level",
    "name_en": "Metal Coat",
    "name_fr": "Peau Métal",
  },

  "metronome": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "consecutive",
    "powerFormula": "1+0.1*level",
    "name_en": "Metronome",
    "name_fr": "Métronome",
  },

  "miracle_seed": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Grass",
    "powerFormula": "1+0.1*level",
    "name_en": "Miracle Seed",
    "name_fr": "Graine Miracle",
  },

  "misty_seed": {
    "icon": "🌱",
    "price": 45000,
    "type": "held",
    "category": "seed",
    "seedType": "Misty",
    "name_en": "Misty Seed",
    "name_fr": "Graine Brume",
  },

  "moon_stone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Moon Stone",
    "name_fr": "Pierre Lune",
  },

  "moonstone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Moon Stone",
    "name_fr": "Pierre Lune",
  },

  "muscle_band": {
    "icon": "🎒",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Fighting",
    "powerFormula": "1+0.1*level",
    "name_en": "Muscle Band",
    "name_fr": "Muscle Band",
  },

  "mystic_water": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Water",
    "powerFormula": "1+0.1*level",
    "name_en": "Mystic Water",
    "name_fr": "Eau Mystique",
  },

  "never_melt_ice": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Ice",
    "powerFormula": "1+0.1*level",
    "name_en": "Never Melt Ice",
    "name_fr": "Glace Éternelle",
  },

  "normal_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Normal",
    "name_en": "Normal Gem",
    "name_fr": "Joyau Normal",
  },

  "normalium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Normalium Z",
    "name_fr": "Normazélite Z",
  },

  "nugget": {
    "icon": "💰",
    "price": 5000,
    "type": "treasure",
    "value": 5000,
    "name_en": "Nugget",
    "name_fr": "Pépite",
  },

  "occa_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Fire",
    "resistPercent": 30,
    "name_en": "Fire Berry",
    "name_fr": "Baie Occa",
  },

  "old_amber": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "revive": 142,
    "name_en": "Aerodactyl Fossil",
    "name_fr": "Vieil Ambre",
  },

  "oval_stone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Oval Stone",
    "name_fr": "Pierre Ovale",
  },

  "passho_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Water",
    "resistPercent": 30,
    "name_en": "Water Berry",
    "name_fr": "Baie Passho",
  },

  "payapa_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Psychic",
    "resistPercent": 30,
    "name_en": "Psychic Berry",
    "name_fr": "Baie Payapa",
  },

  "peat_block": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Peat Block",
    "name_fr": "Bloc de Tourbe",
    "desc_en": "Peat Block - Evolves certain Pokemon.",
    "desc_fr": "Bloc de Tourbe - Fait évoluer certains Pokémon."
  },

  "plume_fossil": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "revive": 566,
    "name_en": "Plume Fossil",
    "name_fr": "Fossile Plume",
  },

  "poison_barb": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Poison",
    "powerFormula": "1+0.1*level",
    "name_en": "Poison Barb",
    "name_fr": "Pic Venin",
  },

  "poison_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Poison",
    "name_en": "Poison Gem",
    "name_fr": "Joyau Poison",
  },

  "poisonium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Poisonium Z",
    "name_fr": "Toxizélite Z",
  },

  "pokeflute": {
    "icon": "🎵",
    "price": 0,
    "type": "key",
    "name_en": "Pokéflute",
    "name_fr": "Poké Flûte",
  },

  "power_herb": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "charge",
    "powerFormula": "1+0.15*level",
    "name_en": "Power Herb",
    "name_fr": "Herbe Pouvoir",
  },

  "prism_scale": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Prism Scale",
    "name_fr": "Écaille Prismatique",
    "desc_en": "Prism Scale - Evolves certain Pokemon when traded.",
    "desc_fr": "Écaille Prismatique - Fait évoluer certains Pokémon par échange."
  },

  "protector": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Protector",
    "name_fr": "Protecteur",
    "desc_en": "Protector - Evolves certain Pokemon when traded.",
    "desc_fr": "Protecteur - Fait évoluer certains Pokémon par échange."
  },

  "psychic_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Psychic",
    "name_en": "Psychic Gem",
    "name_fr": "Joyau Psy",
  },

  "psychium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Psychium Z",
    "name_fr": "Psychézélite Z",
  },

  "pure_incense": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "encounter",
    "powerFormula": "1+0.15*level",
    "name_en": "Pure Incense",
    "name_fr": "Encens Pur",
  },

  "quick_claw": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "speed",
    "powerFormula": "1+0.15*level",
    "name_en": "Quick Claw",
    "name_fr": "Vive Griffe",
  },

  "rainbow_wing": {
    "icon": "🌈",
    "price": 0,
    "type": "key",
    "name_en": "Rainbow Wing",
    "name_fr": "Arc-en-Ciel Aile",
  },

  "rarecandy": {
    "icon": "",
    "price": 50000,
    "type": "candy",
    "name_en": "Rare Candy",
    "name_fr": "Super Bonbon",
  },

  "razor_claw": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Razor Claw",
    "name_fr": "Griffe Rasoir",
    "desc_en": "Razor Claw - Boosts crit rate. Evolves certain Pokemon.",
    "desc_fr": "Griffe Rasoir - Augmente le taux de critiques. Fait évoluer certains Pokémon."
  },

  "razor_fang": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Razor Fang",
    "name_fr": "Croc Rasoir",
    "desc_en": "Razor Fang - May cause flinching. Evolves certain Pokemon.",
    "desc_fr": "Croc Rasoir - Peut apeurer. Fait évoluer certains Pokémon."
  },

  "reaper_cloth": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Reaper Cloth",
    "name_fr": "Tissu Fauche",
    "desc_en": "Reaper Cloth - Evolves certain Pokemon when traded.",
    "desc_fr": "Tissu Fauche - Fait évoluer certains Pokémon par échange."
  },

  "rindo_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Grass",
    "resistPercent": 30,
    "name_en": "Grass Berry",
    "name_fr": "Baie Rindo",
  },

  "rock_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Rock",
    "name_en": "Rock Gem",
    "name_fr": "Joyau Roche",
  },

  "rockium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Rockium Z",
    "name_fr": "Petrozélite Z",
  },

  "root_fossil": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "revive": 345,
    "name_en": "Root Fossil",
    "name_fr": "Fossile Racine",
  },

  "roseli_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Fairy",
    "resistPercent": 30,
    "name_en": "Fairy Berry",
    "name_fr": "Baie Roseli",
  },

  "sachet": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Sachet",
    "name_fr": "Sachet",
    "desc_en": "Sachet - Evolves certain Pokemon when traded.",
    "desc_fr": "Sachet - Fait évoluer certains Pokémon par échange."
  },

  "sail_fossil": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "revive": 698,
    "name_en": "Sail Fossil",
    "name_fr": "Fossile Nageoire",
  },

  "sharp_beak": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Flying",
    "powerFormula": "1+0.1*level",
    "name_en": "Sharp Beak",
    "name_fr": "Bec Tranchant",
  },

  "shiny_charm": {
    "icon": "",
    "price": 0,
    "type": "key",
    "name_en": "Shiny Charm",
    "name_fr": "Charme Chroma",
  },

  "shiny_stone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Shiny Stone",
    "name_fr": "Pierre Éclat",
  },

  "shuca_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Ground",
    "resistPercent": 30,
    "name_en": "Ground Berry",
    "name_fr": "Baie Shuca",
  },

  "silk_scarf": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Normal",
    "powerFormula": "1+0.1*level",
    "name_en": "Silk Scarf",
    "name_fr": "Mouchoir Soie",
  },

  "silver_powder": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Bug",
    "powerFormula": "1+0.1*level",
    "name_en": "Silver Powder",
    "name_fr": "Poudre Argentée",
  },

  "silver_wing": {
    "icon": "🕊",
    "price": 0,
    "type": "key",
    "name_en": "Silver Wing",
    "name_fr": "Aile Argentée",
  },

  "skull_fossil": {
    "icon": "🦴",
    "price": 0,
    "type": "fossil",
    "revive": 408,
    "name_en": "Skull Fossil",
    "name_fr": "Fossile Crâne",
  },

  "smooth_rock": {
    "icon": "🪨",
    "price": 80000,
    "type": "held",
    "category": "weather",
    "weather": "sand",
    "name_en": "Smooth Rock",
    "name_fr": "Roche Lisse",
  },

  "soft_sand": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Ground",
    "powerFormula": "1+0.1*level",
    "name_en": "Soft Sand",
    "name_fr": "Sable Doux",
  },

  "spell_tag": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Ghost",
    "powerFormula": "1+0.1*level",
    "name_en": "Spell Tag",
    "name_fr": "Rune Sort",
  },

  "stardust": {
    "icon": "💰",
    "price": 750,
    "type": "treasure",
    "value": 2000,
    "name_en": "Stardust",
    "name_fr": "Poussière Étoile",
  },

  "steel_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Steel",
    "name_en": "Steel Gem",
    "name_fr": "Joyau Acier",
  },

  "steel_keystone": {
    "icon": "💎",
    "price": 45000,
    "type": "keystone",
    "name_en": "Steel Keystone",
    "name_fr": "Clé de Voûte Acier",
  },

  "steelium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Steelium Z",
    "name_fr": "Métallozélite Z",
  },

  "stoned_memory": {
    "icon": "🎒",
    "price": 45000,
    "type": "memory",
    "name_en": "Stoned Memory",
    "name_fr": "Mémoire Gravée",
  },

  "sun_stone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Sun Stone",
    "name_fr": "Pierre Soleil",
  },

  "sunstone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Sun Stone",
    "name_fr": "Pierre Soleil",
  },

  "sweet_apple": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Sweet Apple",
    "name_fr": "Pomme Sucrée",
    "desc_en": "Sweet Apple - Evolves certain Pokemon.",
    "desc_fr": "Pomme Sucrée - Fait évoluer certains Pokémon."
  },

  "syrupy_apple": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Syrupy Apple",
    "name_fr": "Pomme au Sirop",
    "desc_en": "Syrupy Apple - Evolves certain Pokemon.",
    "desc_fr": "Pomme au Sirop - Fait évoluer certains Pokémon."
  },

  "tanga_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Bug",
    "resistPercent": 30,
    "name_en": "Bug Berry",
    "name_fr": "Baie Tanga",
  },

  "tart_apple": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Tart Apple",
    "name_fr": "Pomme Acidulée",
    "desc_en": "Tart Apple - Evolves certain Pokemon.",
    "desc_fr": "Pomme Acidulée - Fait évoluer certains Pokémon."
  },

  "terrain_extender": {
    "icon": "🔌",
    "price": 100000,
    "type": "held",
    "category": "terrain",
    "name_en": "Terrain Extender",
    "name_fr": "Extension de Terrain",
  },

  "thunder_stone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Thunder Stone",
    "name_fr": "Pierre Foudre",
  },

  "thunderstone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Thunder Stone",
    "name_fr": "Pierre Foudre",
  },

  "toxic_orb": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "status",
    "powerFormula": "1+0.15*level",
    "statusEffect": "poison",
    "name_en": "Toxic Orb",
    "name_fr": "Orbe Toxique",
  },

  "twisted_spoon": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "type_boost",
    "typeBoost": "Psychic",
    "powerFormula": "1+0.1*level",
    "name_en": "Twisted Spoon",
    "name_fr": "Cuillère Tordue",
  },

  "unremarkable_teacup": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Unremarkable Teacup",
    "name_fr": "Théière Médiocre",
    "desc_en": "Unremarkable Teacup - Evolves certain Pokemon.",
    "desc_fr": "Théière Médiocre - Fait évoluer certains Pokémon."
  },

  "upgrade": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Upgrade",
    "name_fr": "Améliorator",
    "desc_en": "Upgrade - Evolves certain Pokemon when traded.",
    "desc_fr": "Améliorator - Fait évoluer certains Pokémon par échange."
  },

  "wacan_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Electric",
    "resistPercent": 30,
    "name_en": "Electric Berry",
    "name_fr": "Baie Wacan",
  },

  "water_gem": {
    "icon": "💎",
    "price": 45000,
    "type": "held",
    "category": "gem",
    "gemType": "Water",
    "name_en": "Water Gem",
    "name_fr": "Joyau Eau",
  },

  "water_stone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Water Stone",
    "name_fr": "Pierre Eau",
  },

  "waterium_z": {
    "icon": "💠",
    "price": 45000,
    "type": "z_crystal",
    "name_en": "Waterium Z",
    "name_fr": "Aquazélite Z",
  },

  "waterstone": {
    "icon": "💎",
    "price": 50000,
    "type": "stone",
    "name_en": "Water Stone",
    "name_fr": "Pierre Eau",
  },

  "weakness_policy": {
    "icon": "",
    "price": 45000,
    "type": "held",
    "category": "boost",
    "powerFormula": "1+0.15*level",
    "name_en": "Weakness Policy",
    "name_fr": "Vulné-Assurance",
  },

  "whipped_dream": {
    "icon": "📦",
    "price": 0,
    "type": "evolution",
    "name_en": "Whipped Dream",
    "name_fr": "Chantibonbon",
    "desc_en": "Whipped Dream - Evolves certain Pokemon when traded.",
    "desc_fr": "Chantibonbon - Fait évoluer certains Pokémon par échange."
  },

  "yache_berry": {
    "icon": "🍇",
    "price": 45000,
    "type": "held",
    "category": "resistance_berry",
    "resistType": "Ice",
    "resistPercent": 30,
    "name_en": "Ice Berry",
    "name_fr": "Baie Yache",
  },

};

// --- Migrated to ES module, globals exposed ---
if (typeof ITEMS !== "undefined" && typeof window !== "undefined") window.ITEMS = ITEMS;
