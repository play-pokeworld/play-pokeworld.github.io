// ═══ Quêtes secondaires — passe 18 : regroupées par région et renumérotées ═══
// Avant : Kanto s1-s8 + s11-s15 entremêlés avec Johto s9-s10 + s30-s40, dans
// un ordre sans rapport avec la progression. Désormais : Kanto s1-s13 puis
// Johto s14-s26, dans l'ordre de l'aventure (ville par ville).
// Récompenses légèrement réduites (~-10 %) pour coller à la règle validée
// d'économie (pas d'enrichissement excessif). Migration : QUEST_V2_SIDE_REMAP.
var SIDE_QUESTS = {
 "s1": {
"id":"s1",
"region":"kanto",
"type":"defeat_wild",
"loc":"route1",
"target": 10,
"rewardMoney": 700,
"rewardItems": {
"chople_berry": 1
 }
 },
 "s2": {
"id":"s2",
"region":"kanto",
"type":"defeat_wild",
"loc":"route2",
"target": 15,
"rewardMoney": 1100,
"rewardItems": {
"prine_berry": 1
 }
 },
 "s3": {
"id":"s3",
"region":"kanto",
"type":"defeat_wild",
"loc":"route22",
"target": 12,
"rewardMoney": 1600,
"rewardItems": {}
 },
 "s4": {
"id":"s4",
"region":"kanto",
"type":"defeat_wild",
"loc":"mtmoon",
"target": 12,
"rewardMoney": 1400,
"rewardItems": {
"moonstone": 1
 }
 },
 "s5": {
"id":"s5",
"region":"kanto",
"type":"mine_sell",
"target": 5,
"rewardMoney": 1300,
"rewardItems": {
"nugget": 1
 }
 },
 "s6": {
"id":"s6",
"region":"kanto",
"type":"defeat_wild",
"loc":"route9",
"target": 12,
"rewardMoney": 1900,
"rewardItems": {
"passho_berry": 1
 }
 },
 "s7": {
"id":"s7",
"region":"kanto",
"type":"defeat_wild",
"loc":"route11",
"target": 12,
"rewardMoney": 2100,
"rewardItems": {
"thunderstone": 1
 }
 },
 "s8": {
"id":"s8",
"region":"kanto",
"type":"defeat_wild",
"loc":"pokemontower",
"target": 12,
"rewardMoney": 1800,
"rewardItems": {
"rarecandy": 1
 }
 },
 "s9": {
"id":"s9",
"region":"kanto",
"type":"defeat_wild",
"loc":"route12",
"target": 12,
"rewardMoney": 2100,
"rewardItems": {
"rarecandy": 1
 }
 },
 "s10": {
"id":"s10",
"region":"kanto",
"type":"catch",
"target": 8,
"rewardMoney": 2200,
"rewardItems": {
"leafstone": 1
 }
 },
 "s11": {
"id":"s11",
"region":"kanto",
"type":"catch",
"target": 10,
"rewardMoney": 2300,
"rewardItems": {
"leafstone": 1,
"life_orb": 1
 }
 },
 "s12": {
"id":"s12",
"region":"kanto",
"type":"defeat_wild",
"loc":"route19",
"target": 12,
"rewardMoney": 1800,
"rewardItems": {
"leftovers": 1
 }
 },
 "s13": {
"id":"s13",
"region":"kanto",
"type":"defeat_wild",
"loc":"pokemonmansion",
"target": 12,
"rewardMoney": 2200,
"rewardItems": {
"firestone": 1
 }
 },
 "s14": { "id":"s14", "region":"kanto", "type":"defeat_wild", "loc":"route24", "target": 12, "rewardMoney": 1000, "rewardItems": { "haban_berry": 1 } },
 "s15": { "id":"s15", "region":"kanto", "type":"defeat_wild", "loc":"route25", "target": 12, "rewardMoney": 1100, "rewardItems": { "shuca_berry": 1 } },
 "s16": { "id":"s16", "region":"kanto", "type":"defeat_wild", "loc":"route5", "target": 12, "rewardMoney": 1200, "rewardItems": { "prine_berry": 1 } },
 "s17": { "id":"s17", "region":"kanto", "type":"defeat_wild", "loc":"route6", "target": 14, "rewardMoney": 1300, "rewardItems": {} },
 "s18": { "id":"s18", "region":"kanto", "type":"defeat_wild", "loc":"diglettscave", "target": 12, "rewardMoney": 1500, "rewardItems": { "soft_sand": 1 } },
 "s19": { "id":"s19", "region":"kanto", "type":"defeat_wild", "loc":"route8", "target": 15, "rewardMoney": 1700, "rewardItems": { "charti_berry": 1 } },
 "s20": { "id":"s20", "region":"kanto", "type":"defeat_wild", "loc":"rocktunnel", "target": 15, "rewardMoney": 1900, "rewardItems": { "babiri_berry": 1 } },
 "s21": { "id":"s21", "region":"kanto", "type":"defeat_wild", "loc":"route13", "target": 15, "rewardMoney": 2000, "rewardItems": { "colbur_berry": 1 } },
 "s22": { "id":"s22", "region":"kanto", "type":"defeat_wild", "loc":"route7", "target": 15, "rewardMoney": 2100, "rewardItems": { "occa_berry": 1 } },
 "s23": { "id":"s23", "region":"kanto", "type":"defeat_wild", "loc":"route16", "target": 12, "rewardMoney": 2200, "rewardItems": {} },
 "s24": { "id":"s24", "region":"kanto", "type":"defeat_wild", "loc":"route14", "target": 16, "rewardMoney": 2400, "rewardItems": {} },
 "s25": { "id":"s25", "region":"kanto", "type":"defeat_wild", "loc":"route15", "target": 16, "rewardMoney": 2500, "rewardItems": { "kasib_berry": 1 } },
 "s26": { "id":"s26", "region":"kanto", "type":"catch", "target": 14, "rewardMoney": 2600, "rewardItems": { "black_belt": 1 } },
 "s27": { "id":"s27", "region":"kanto", "type":"defeat_wild", "loc":"route20", "target": 15, "rewardMoney": 2800, "rewardItems": { "payapa_berry": 1 } },
 "s28": { "id":"s28", "region":"kanto", "type":"defeat_wild", "loc":"route21", "target": 18, "rewardMoney": 3000, "rewardItems": { "wacan_berry": 1 } },
 "s29": { "id":"s29", "region":"kanto", "type":"mine_sell", "target": 8, "rewardMoney": 2700, "rewardItems": { "shuca_berry": 1 } },
 "s30": { "id":"s30", "region":"kanto", "type":"defeat_wild", "loc":"victoryroad", "target": 18, "rewardMoney": 3500, "rewardItems": { "prine_berry": 1 } },
 "s31": {
"id":"s31",
"region":"johto",
"type":"defeat_wild",
"loc":"jroute30",
"target": 12,
"rewardMoney": 1600,
"rewardItems": {
"yache_berry": 1
 }
 },
 "s32": {
"id":"s32",
"region":"johto",
"type":"defeat_wild",
"loc":"sprouttower",
"target": 8,
"rewardMoney": 1400,
"rewardItems": {
"twisted_spoon": 1
 }
 },
 "s33": {
"id":"s33",
"region":"johto",
"type":"defeat_wild",
"loc":"azalea",
"target": 10,
"rewardMoney": 1800,
"rewardItems": {
"spell_tag": 1
 }
 },
 "s34": {
"id":"s34",
"region":"johto",
"type":"defeat_wild",
"loc":"unioncave",
"target": 10,
"rewardMoney": 1800,
"rewardItems": {
"kings_rock": 1
 }
 },
 "s35": {
"id":"s35",
"region":"johto",
"type":"defeat_wild",
"loc":"jroute35",
"target": 12,
"rewardMoney": 2000,
"rewardItems": {
"miracle_seed": 1
 }
 },
 "s36": {
"id":"s36",
"region":"johto",
"type":"defeat_wild",
"loc":"goldenrod",
"target": 10,
"rewardMoney": 2000,
"rewardItems": {
"rarecandy": 1
 }
 },
 "s37": {
"id":"s37",
"region":"johto",
"type":"catch",
"target": 8,
"rewardMoney": 2300,
"rewardItems": {
"life_orb": 1
 }
 },
 "s38": {
"id":"s38",
"region":"johto",
"type":"defeat_wild",
"loc":"jroute38",
"target": 10,
"rewardMoney": 1800,
"rewardItems": {
"colbur_berry": 1
 }
 },
 "s39": {
"id":"s39",
"region":"johto",
"type":"defeat_wild",
"loc":"olivine",
"target": 10,
"rewardMoney": 1800,
"rewardItems": {
"mystic_water": 1
 }
 },
 "s40": {
"id":"s40",
"region":"johto",
"type":"defeat_wild",
"loc":"ruinsofalph",
"target": 8,
"rewardMoney": 1600,
"rewardItems": {
"rarecandy": 1
 }
 },
 "s41": {
"id":"s41",
"region":"johto",
"type":"defeat_wild",
"loc":"mahogany",
"target": 10,
"rewardMoney": 2200,
"rewardItems": {
"upgrade": 1
 }
 },
 "s42": {
"id":"s42",
"region":"johto",
"type":"defeat_wild",
"loc":"lakerage",
"target": 8,
"rewardMoney": 1800,
"rewardItems": {
"dragon_fang": 1
 }
 },
 "s43": {
"id":"s43",
"region":"johto",
"type":"defeat_wild",
"loc":"jroute45",
"target": 10,
"rewardMoney": 2300,
"rewardItems": {
"rarecandy": 1
 }
 },
 "s44": {
"id":"s44",
"region":"johto",
"type":"defeat_wild",
"loc":"jroute29",
"target": 15,
"rewardMoney": 1500,
"rewardItems": {
"tanga_berry": 1
 }
 },
 "s45": {
"id":"s45",
"region":"johto",
"type":"defeat_wild",
"loc":"jroute31",
"target": 15,
"rewardMoney": 1800,
"rewardItems": {
"roseli_berry": 1
 }
 },
 "s46": {
"id":"s46",
"region":"johto",
"type":"defeat_wild",
"loc":"ilexforest",
"target": 20,
"rewardMoney": 2400,
"rewardItems": {
"rindo_berry": 1
 }
 },
 "s47": {
"id":"s47",
"region":"johto",
"type":"defeat_wild",
"loc":"jroute34",
"target": 15,
"rewardMoney": 2200,
"rewardItems": {}
 },
 "s48": {
"id":"s48",
"region":"johto",
"type":"defeat_wild",
"loc":"jroute39",
"target": 15,
"rewardMoney": 2600,
"rewardItems": {}
 },
 "s49": {
"id":"s49",
"region":"johto",
"type":"defeat_wild",
"loc":"jroute40",
"target": 15,
"rewardMoney": 2800,
"rewardItems": {
"chople_berry": 1
 }
 },
 "s50": {
"id":"s50",
"region":"johto",
"type":"defeat_wild",
"loc":"whirlislands",
"target": 18,
"rewardMoney": 3200,
"rewardItems": {
"passho_berry": 1
 }
 },
 "s51": {
"id":"s51",
"region":"johto",
"type":"defeat_wild",
"loc":"darkcave",
"target": 15,
"rewardMoney": 3400,
"rewardItems": {
"hard_stone": 1
 }
 },
 "s52": {
"id":"s52",
"region":"johto",
"type":"defeat_wild",
"loc":"mtmortar",
"target": 15,
"rewardMoney": 3800,
"rewardItems": {
"payapa_berry": 1
 }
 },
 "s53": {
"id":"s53",
"region":"johto",
"type":"defeat_wild",
"loc":"jroute42",
"target": 18,
"rewardMoney": 3600,
"rewardItems": {
"kebia_berry": 1
 }
 },
 "s54": {
"id":"s54",
"region":"johto",
"type":"defeat_wild",
"loc":"jroute43",
"target": 18,
"rewardMoney": 4200,
"rewardItems": {
"babiri_berry": 1
 }
 },
 "s55": {
"id":"s55",
"region":"johto",
"type":"defeat_wild",
"loc":"icepath",
"target": 20,
"rewardMoney": 4800,
"rewardItems": {
"haban_berry": 1
 }
 },
  "s56": { id: "s56", region: "hoenn", type: "defeat_wild", loc: "route101", target: 10, rewardMoney: 1000, rewardItems: { pokeball: 5 } },
  "s57": { id: "s57", region: "hoenn", type: "defeat_wild", loc: "route102", target: 12, rewardMoney: 1200, rewardItems: { pecha_berry: 1 } },
  "s58": { id: "s58", region: "hoenn", type: "defeat_wild", loc: "route104", target: 15, rewardMoney: 1500, rewardItems: { greatball: 3 } },
  "s59": { id: "s59", region: "hoenn", type: "defeat_wild", loc: "rusturf_tunnel", target: 15, rewardMoney: 1800, rewardItems: { superpotion: 2 } },
  "s60": { id: "s60", region: "hoenn", type: "defeat_wild", loc: "granite_cave", target: 18, rewardMoney: 2000, rewardItems: { hard_stone: 1 } },
  "s61": { id: "s61", region: "hoenn", type: "defeat_wild", loc: "route109", target: 20, rewardMoney: 2200, rewardItems: { mystic_water: 1 } },
  "s62": { id: "s62", region: "hoenn", type: "defeat_wild", loc: "route110", target: 20, rewardMoney: 2400, rewardItems: { magnet: 1 } },
  "s63": { id: "s63", region: "hoenn", type: "defeat_wild", loc: "route117", target: 20, rewardMoney: 2500, rewardItems: { miracle_seed: 1 } },
  "s64": { id: "s64", region: "hoenn", type: "defeat_wild", loc: "route113", target: 20, rewardMoney: 2600, rewardItems: { charcoal: 1 } },
  "s65": { id: "s65", region: "hoenn", type: "defeat_wild", loc: "fiery_path", target: 20, rewardMoney: 2800, rewardItems: { firestone: 1 } },
  "s66": { id: "s66", region: "hoenn", type: "defeat_wild", loc: "route119", target: 20, rewardMoney: 3000, rewardItems: { sharp_beak: 1 } },
  "s67": { id: "s67", region: "hoenn", type: "defeat_wild", loc: "mt_pyre", target: 20, rewardMoney: 3200, rewardItems: { spell_tag: 1 } },
  "s68": { id: "s68", region: "hoenn", type: "defeat_wild", loc: "shoal_cave", target: 20, rewardMoney: 3400, rewardItems: { twisted_spoon: 1 } },
  "s69": { id: "s69", region: "hoenn", type: "defeat_wild", loc: "cave_of_origin", target: 20, rewardMoney: 3600, rewardItems: { waterstone: 1 } },
  "s70": { id: "s70", region: "hoenn", type: "defeat_wild", loc: "route131", target: 20, rewardMoney: 3800, rewardItems: { heart_scale: 1 } },
  "s71": { id: "s71", region: "hoenn", type: "defeat_wild", loc: "victoryroad_ho", target: 25, rewardMoney: 4000, rewardItems: { ultraball: 3 } },
  "s72": { id: "s72", region: "hoenn", type: "defeat_wild", loc: "weather_institute", target: 15, rewardMoney: 3500, rewardItems: { damp_rock: 1 } },
  "s73": { id: "s73", region: "hoenn", type: "defeat_wild", loc: "aqua_hideout", target: 20, rewardMoney: 4000, rewardItems: { heat_rock: 1 } },
  "s74": { id: "s74", region: "hoenn", type: "defeat_wild", loc: "mossdeep_space_center", target: 20, rewardMoney: 4500, rewardItems: { smooth_rock: 1 } },
  "s75": { id: "s75", region: "hoenn", type: "defeat_wild", loc: "victoryroad_ho", target: 25, rewardMoney: 5000, rewardItems: { max_repel: 3 } },
  "s76": { id: "s76", region: "hoenn", type: "defeat_wild", loc: "battle_frontier", target: 20, rewardMoney: 5000, rewardItems: { choice_band: 1 } },
  "s77": { id: "s77", region: "hoenn", type: "defeat_wild", loc: "southern_island", target: 20, rewardMoney: 5500, rewardItems: { lum_berry: 1 } },
  "s78": { id: "s78", region: "hoenn", type: "defeat_wild", loc: "mirage_island", target: 20, rewardMoney: 5500, rewardItems: { prine_berry: 1 } },
  "s79": { id: "s79", region: "hoenn", type: "defeat_wild", loc: "seafloor_cavern", target: 25, rewardMoney: 6000, rewardItems: { waterstone: 1 } },
  "s80": { id: "s80", region: "hoenn", type: "defeat_wild", loc: "sky_pillar", target: 25, rewardMoney: 6500, rewardItems: { dragon_fang: 1 } },
  "s81": { id: "s81", region: "hoenn", type: "defeat_wild", loc: "meteor_falls", target: 20, rewardMoney: 4500, rewardItems: { nugget: 1 } },
  "s82": { id: "s82", region: "hoenn", type: "defeat_wild", loc: "route108", target: 20, rewardMoney: 4000, rewardItems: { deep_sea_scale: 1 } },
  "s83": { id: "s83", region: "hoenn", type: "defeat_wild", loc: "route111", target: 20, rewardMoney: 3500, rewardItems: { soft_sand: 1 } },
  "s84": { id: "s84", region: "hoenn", type: "defeat_wild", loc: "route120", target: 20, rewardMoney: 3500, rewardItems: { leppa_berry: 1 } },
  "s85": { id: "s85", region: "hoenn", type: "defeat_wild", loc: "route101", target: 25, rewardMoney: 10000, rewardItems: { ultraball: 5 } },

  // Explorations secrètes rejouables
  "s86": { id: "s86", region: "kanto", type: "puzzle", loc: "ceruleancave", targetPuzzleId: "cerulean_sigil_a", target: 1, rewardMoney: 4200, rewardItems: { twisted_spoon: 1 } },
  "s87": { id: "s87", region: "kanto", type: "puzzle", loc: "ceruleancave", targetPuzzleId: "cerulean_sigil_b", target: 1, rewardMoney: 7000, rewardItems: { leftovers: 1 } },
  "s88": { id: "s88", region: "kanto", type: "puzzle", loc: "seafoamislands", targetPuzzleId: "seafoam_valves_a", target: 1, rewardMoney: 3500, rewardItems: { mystic_water: 1 } },
  "s89": { id: "s89", region: "kanto", type: "puzzle", loc: "seafoamislands", targetPuzzleId: "seafoam_freeze_code", target: 1, rewardMoney: 4900, rewardItems: { never_melt_ice: 1 } },
  "s90": { id: "s90", region: "kanto", type: "puzzle", loc: "mtmoon", targetPuzzleId: "mtmoon_fossils_a", target: 1, rewardMoney: 3000, rewardItems: { hard_stone: 1 } },
  "s91": { id: "s91", region: "kanto", type: "puzzle", loc: "mtmoon", targetPuzzleId: "mtmoon_lunar_code", target: 1, rewardMoney: 3500, rewardItems: { moonstone: 1 } },
  "s92": { id: "s92", region: "johto", type: "puzzle", loc: "ruinsofalph", targetPuzzleId: "alph_unown_circle", target: 1, rewardMoney: 3500, rewardItems: { twisted_spoon: 1 } },
  "s93": { id: "s93", region: "johto", type: "puzzle", loc: "ruinsofalph", targetPuzzleId: "alph_mirror_path", target: 1, rewardMoney: 5600, rewardItems: { moonstone: 1 } },
  "s94": { id: "s94", region: "johto", type: "puzzle", loc: "sprouttower", targetPuzzleId: "sprout_bells", target: 1, rewardMoney: 3000, rewardItems: { miracle_seed: 1 } },
  "s95": { id: "s95", region: "johto", type: "puzzle", loc: "sprouttower", targetPuzzleId: "sprout_mantra", target: 1, rewardMoney: 3150, rewardItems: { spell_tag: 1 } },
  "s96": { id: "s96", region: "johto", type: "puzzle", loc: "burnedtower", targetPuzzleId: "burned_embers", target: 1, rewardMoney: 3000, rewardItems: { charcoal: 1 } },
  "s97": { id: "s97", region: "johto", type: "puzzle", loc: "burnedtower", targetPuzzleId: "burned_beast_word", target: 1, rewardMoney: 4900, rewardItems: { charcoal: 1 } },
  "s98": { id: "s98", region: "johto", type: "puzzle", loc: "icepath", targetPuzzleId: "icepath_riddle", target: 1, rewardMoney: 3500, rewardItems: { yache_berry: 1 } },
  "s99": { id: "s99", region: "johto", type: "puzzle", loc: "icepath", targetPuzzleId: "icepath_steps", target: 1, rewardMoney: 4550, rewardItems: { never_melt_ice: 1 } },
  "s100": { id: "s100", region: "hoenn", type: "puzzle", loc: "sealed_chamber", targetPuzzleId: "sealed_relicanth_wailord", target: 1, rewardMoney: 4200, rewardItems: { hard_stone: 1 } },
  "s101": { id: "s101", region: "hoenn", type: "puzzle", loc: "desert_ruins", targetPuzzleId: "regirock_braille_lesson", target: 1, rewardMoney: 3500, rewardItems: { hard_stone: 1 } },
  "s102": { id: "s102", region: "hoenn", type: "puzzle", loc: "desert_ruins", targetPuzzleId: "regirock_wait", target: 1, rewardMoney: 3500, rewardItems: { hard_stone: 1 } },
  "s103": { id: "s103", region: "hoenn", type: "puzzle", loc: "desert_ruins", targetPuzzleId: "regirock_name", target: 1, rewardMoney: 5600, rewardItems: { hard_stone: 1 } },
  "s104": { id: "s104", region: "hoenn", type: "puzzle", loc: "island_cave", targetPuzzleId: "regice_braille_lesson", target: 1, rewardMoney: 3500, rewardItems: { never_melt_ice: 1 } },
  "s105": { id: "s105", region: "hoenn", type: "puzzle", loc: "island_cave", targetPuzzleId: "regice_digits", target: 1, rewardMoney: 4200, rewardItems: { never_melt_ice: 1 } },
  "s106": { id: "s106", region: "hoenn", type: "puzzle", loc: "island_cave", targetPuzzleId: "regice_name", target: 1, rewardMoney: 5600, rewardItems: { never_melt_ice: 1 } },
  "s107": { id: "s107", region: "hoenn", type: "puzzle", loc: "ancient_tomb", targetPuzzleId: "registeel_braille_lesson", target: 1, rewardMoney: 3500, rewardItems: { metal_coat: 1 } },
  "s108": { id: "s108", region: "hoenn", type: "puzzle", loc: "ancient_tomb", targetPuzzleId: "registeel_arrows", target: 1, rewardMoney: 4200, rewardItems: { metal_coat: 1 } },
  "s109": { id: "s109", region: "hoenn", type: "puzzle", loc: "ancient_tomb", targetPuzzleId: "registeel_name", target: 1, rewardMoney: 5600, rewardItems: { metal_coat: 1 } },
  "s110": { id: "s110", region: "hoenn", type: "puzzle", loc: "seafloor_cavern", targetPuzzleId: "seafloor_pressure_a", target: 1, rewardMoney: 4900, rewardItems: { mystic_water: 1 } },
  "s111": { id: "s111", region: "hoenn", type: "puzzle", loc: "seafloor_cavern", targetPuzzleId: "seafloor_depth_code", target: 1, rewardMoney: 6300, rewardItems: { deep_sea_tooth: 1 } },
  "s112": { id: "s112", region: "hoenn", type: "puzzle", loc: "mt_pyre", targetPuzzleId: "mtpyre_ashes_a", target: 1, rewardMoney: 3500, rewardItems: { spell_tag: 1 } },
  "s113": { id: "s113", region: "hoenn", type: "puzzle", loc: "mt_pyre", targetPuzzleId: "mtpyre_summit_word", target: 1, rewardMoney: 4900, rewardItems: { spell_tag: 1 } },
  // ─── Quêtes secondaires Hoenn (densification) ───
  "s114": { id: "s114", region: "hoenn", type: "defeat_wild", loc: "route101", target: 10, rewardMoney: 800, rewardItems: {} },
  "s115": { id: "s115", region: "hoenn", type: "defeat_wild", loc: "route104", target: 12, rewardMoney: 1000, rewardItems: {} },
  "s116": { id: "s116", region: "hoenn", type: "defeat_wild", loc: "petalburg_woods", target: 15, rewardMoney: 1200, rewardItems: {"miracle_seed": 1} },
  "s117": { id: "s117", region: "hoenn", type: "defeat_wild", loc: "route110", target: 15, rewardMoney: 1400, rewardItems: {"magnet": 1} },
  "s118": { id: "s118", region: "hoenn", type: "defeat_wild", loc: "route111", target: 18, rewardMoney: 1600, rewardItems: {"soft_sand": 1} },
  "s119": { id: "s119", region: "hoenn", type: "defeat_wild", loc: "route112", target: 15, rewardMoney: 1500, rewardItems: {"charcoal": 1} },
  "s120": { id: "s120", region: "hoenn", type: "defeat_wild", loc: "route114", target: 15, rewardMoney: 1500, rewardItems: {"hard_stone": 1} },
  "s121": { id: "s121", region: "hoenn", type: "defeat_wild", loc: "route119", target: 20, rewardMoney: 2000, rewardItems: {"miracle_seed": 1} },
  "s122": { id: "s122", region: "hoenn", type: "defeat_wild", loc: "route120", target: 18, rewardMoney: 1800, rewardItems: {"coba_berry": 1} },
  "s123": { id: "s123", region: "hoenn", type: "defeat_wild", loc: "mt_chimney", target: 20, rewardMoney: 2200, rewardItems: {"firestone": 1} },
  "s124": { id: "s124", region: "hoenn", type: "defeat_wild", loc: "meteor_falls", target: 18, rewardMoney: 2000, rewardItems: {"dragon_scale": 1} },
  "s125": { id: "s125", region: "hoenn", type: "defeat_wild", loc: "route123", target: 15, rewardMoney: 1700, rewardItems: {"kebia_berry": 1} },
  "s126": { id: "s126", region: "hoenn", type: "defeat_wild", loc: "route124", target: 15, rewardMoney: 1800, rewardItems: {"mystic_water": 1} },
  "s127": { id: "s127", region: "hoenn", type: "defeat_wild", loc: "shoal_cave", target: 18, rewardMoney: 2000, rewardItems: {"never_melt_ice": 1} },
  "s128": { id: "s128", region: "hoenn", type: "defeat_wild", loc: "route127", target: 15, rewardMoney: 1800, rewardItems: {} },
  "s129": { id: "s129", region: "hoenn", type: "defeat_wild", loc: "victoryroad_ho", target: 25, rewardMoney: 3000, rewardItems: {"hard_stone": 1} },
  "s130": { id: "s130", region: "hoenn", type: "defeat_wild", loc: "sky_pillar", target: 20, rewardMoney: 2500, rewardItems: {"dragon_fang": 1} },
  "s131": { id: "s131", region: "hoenn", type: "defeat_wild", loc: "safari_zone_ho", target: 20, rewardMoney: 2200, rewardItems: {"leafstone": 1} },
  "s132": { id: "s132", region: "hoenn", type: "talk", loc: "slateport", target: 1, rewardMoney: 1000, rewardItems: {"silk_scarf": 1} },
  "s133": { id: "s133", region: "hoenn", type: "talk", loc: "lilycove", target: 1, rewardMoney: 1200, rewardItems: {"rarecandy": 1} },
  "s134": { id: "s134", region: "hoenn", type: "talk", loc: "mossdeep", target: 1, rewardMoney: 1200, rewardItems: {"twisted_spoon": 1} },
  "s135": { id: "s135", region: "hoenn", type: "talk", loc: "sootopolis", target: 1, rewardMoney: 1500, rewardItems: {"mystic_water": 1} },
  "s136": { id: "s136", region: "hoenn", type: "talk", loc: "pacifidlog", target: 1, rewardMoney: 1200, rewardItems: {"dragon_scale": 1} },
  "s137": { id: "s137", region: "hoenn", type: "talk", loc: "fallarbor", target: 1, rewardMoney: 1000, rewardItems: {"moonstone": 1} }
};

if (typeof SIDE_QUESTS !== 'undefined' && typeof window !== 'undefined') window.SIDE_QUESTS = SIDE_QUESTS;
