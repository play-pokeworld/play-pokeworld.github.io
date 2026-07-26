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
"sitrus_berry": 2
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
"prine_berry": 2
 }
 },
 "s3": {
"id":"s3",
"region":"kanto",
"type":"defeat_wild",
"loc":"route22",
"target": 12,
"rewardMoney": 1600,
"rewardItems": {
"cheri_berry": 2
 }
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
"sitrus_berry": 2
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
 "s14": { "id":"s14", "region":"kanto", "type":"defeat_wild", "loc":"route24", "target": 12, "rewardMoney": 1000, "rewardItems": { "oran_berry": 2 } },
 "s15": { "id":"s15", "region":"kanto", "type":"defeat_wild", "loc":"route25", "target": 12, "rewardMoney": 1100, "rewardItems": { "cheri_berry": 2 } },
 "s16": { "id":"s16", "region":"kanto", "type":"defeat_wild", "loc":"route5", "target": 12, "rewardMoney": 1200, "rewardItems": { "oran_berry": 2 } },
 "s17": { "id":"s17", "region":"kanto", "type":"defeat_wild", "loc":"route6", "target": 14, "rewardMoney": 1300, "rewardItems": { "cheri_berry": 2 } },
 "s18": { "id":"s18", "region":"kanto", "type":"defeat_wild", "loc":"diglettscave", "target": 12, "rewardMoney": 1500, "rewardItems": { "soft_sand": 1 } },
 "s19": { "id":"s19", "region":"kanto", "type":"defeat_wild", "loc":"route8", "target": 15, "rewardMoney": 1700, "rewardItems": { "oran_berry": 2 } },
 "s20": { "id":"s20", "region":"kanto", "type":"defeat_wild", "loc":"rocktunnel", "target": 15, "rewardMoney": 1900, "rewardItems": { "stardust": 1 } },
 "s21": { "id":"s21", "region":"kanto", "type":"defeat_wild", "loc":"route13", "target": 15, "rewardMoney": 2000, "rewardItems": { "sitrus_berry": 2 } },
 "s22": { "id":"s22", "region":"kanto", "type":"defeat_wild", "loc":"route7", "target": 15, "rewardMoney": 2100, "rewardItems": { "cheri_berry": 2 } },
 "s23": { "id":"s23", "region":"kanto", "type":"defeat_wild", "loc":"route16", "target": 12, "rewardMoney": 2200, "rewardItems": { "oran_berry": 2 } },
 "s24": { "id":"s24", "region":"kanto", "type":"defeat_wild", "loc":"route14", "target": 16, "rewardMoney": 2400, "rewardItems": { "sitrus_berry": 2 } },
 "s25": { "id":"s25", "region":"kanto", "type":"defeat_wild", "loc":"route15", "target": 16, "rewardMoney": 2500, "rewardItems": { "cheri_berry": 2 } },
 "s26": { "id":"s26", "region":"kanto", "type":"catch", "target": 14, "rewardMoney": 2600, "rewardItems": { "black_belt": 1 } },
 "s27": { "id":"s27", "region":"kanto", "type":"defeat_wild", "loc":"route20", "target": 15, "rewardMoney": 2800, "rewardItems": { "sitrus_berry": 2 } },
 "s28": { "id":"s28", "region":"kanto", "type":"defeat_wild", "loc":"route21", "target": 18, "rewardMoney": 3000, "rewardItems": { "sitrus_berry": 2 } },
 "s29": { "id":"s29", "region":"kanto", "type":"mine_sell", "target": 8, "rewardMoney": 2700, "rewardItems": { "cheri_berry": 2 } },
 "s30": { "id":"s30", "region":"kanto", "type":"defeat_wild", "loc":"victoryroad", "target": 18, "rewardMoney": 3500, "rewardItems": { "sitrus_berry": 2 } },
 "s31": {
"id":"s31",
"region":"johto",
"type":"defeat_wild",
"loc":"jroute30",
"target": 12,
"rewardMoney": 1600,
"rewardItems": {
"sitrus_berry": 2
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
"oran_berry": 2
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
"oran_berry": 2
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
"sitrus_berry": 1
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
"oran_berry": 2
 }
 },
 "s47": {
"id":"s47",
"region":"johto",
"type":"defeat_wild",
"loc":"jroute34",
"target": 15,
"rewardMoney": 2200,
"rewardItems": {
"sitrus_berry": 1
 }
 },
 "s48": {
"id":"s48",
"region":"johto",
"type":"defeat_wild",
"loc":"jroute39",
"target": 15,
"rewardMoney": 2600,
"rewardItems": {
"sitrus_berry": 2
 }
 },
 "s49": {
"id":"s49",
"region":"johto",
"type":"defeat_wild",
"loc":"jroute40",
"target": 15,
"rewardMoney": 2800,
"rewardItems": {
"oran_berry": 3
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
"sitrus_berry": 1
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
"sitrus_berry": 1
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
"oran_berry": 3
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
"sitrus_berry": 2
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
"sitrus_berry": 2
 }
 }
};


// --- Migrated to ES module, globals exposed ---
if (typeof SIDE_QUESTS !== 'undefined' && typeof window !== 'undefined') window.SIDE_QUESTS = SIDE_QUESTS;
