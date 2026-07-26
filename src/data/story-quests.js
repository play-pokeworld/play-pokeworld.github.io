// ═══ Quêtes principales — passe 18 : rangement, renumérotation, rééquilibrage ═══
// • Kanto  1 → 44  (ordre strict de l'aventure ; la quête 22 « Team Rocket à
//   la Tour Pokémon » est NOUVELLE — canon RFVF, insertion documentée)
// • Johto 101 → 126 (même ordre qu'avant, numérotation unique — les anciens
//   ids 20-31/60-66/1101-1108 pouvaient entrer en conflit avec Kanto, la
//   recherche getMainQuestDef ne filtrant pas par région)
// • Récompenses rééquilibrées (règle validée : le joueur ne doit pas devenir
//   trop riche ni crouler sous les objets) : total argent Kanto ≈ 241 300₽
//   (-33 % vs 358 000₽) + ≈ 57 000₽ de primes de combats de dresseurs ;
//   Johto ≈ 226 100₽ (-25 % vs 301 800₽) + ≈ 42 300₽ de primes.
//   Objets : jamais de doublon de pierre, une seule récompense « prestige »
//   par quête, Baie Prine désormais réellement définie dans ITEMS.
// • Quêtes trainer_battle : l'argent est versé à la victoire par le dresseur
//   (OFFICIAL_TEAMS[idx].rewardMoney), le claim de quête ne donne rien.
// Migration des sauvegardes : voir migrateQuestSaveV2 (quest-core.js).
var STORY_QUESTS = [
 // ─────────── KANTO (1-60) — passe 21 : densification (+16 quêtes) ───────────
// Insertions canon RFVF : Bill (13), Fan Club (14), Capitaine S.S. Anne (19),
// Route 8 (24), Évoli/Porygon de Céladopole (31-32), Piste Cyclable (35),
// Dentiers d'or du Parc Safari (36), Lokhlass de la Sylphe (39), DOJO de
// Safrania → Tyrogue (40, RFVF : Kicklee/Tygnon Nv.37 @ Ceinture Noire),
// M. Psyché (42), Collecteur (44), labo des fossiles → Ptéra (47), Chenal 21
// (50), Ultime entraînement de la Route Victoire (52), Mémoires du Manoir (58).
// Migration des sauvegardes : migrateQuestSaveV4 (quest-core.js).
 {
  "id": 1,
  "region": "kanto",
  "type": "talk",
  "loc": "pallet",
  "target": 1,
  "rewardMoney": 400,
  "rewardItems": { "oran_berry": 1 }
 },
 {
  "id": 2,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route1",
  "target": 10,
  "rewardMoney": 600,
  "rewardItems": { "oran_berry": 2 }
 },
 {
  "id": 3,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "viridianforest",
  "target": 15,
  "rewardMoney": 1000,
  "rewardItems": { "sitrus_berry": 1 }
 },
 {
  "id": 4,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route22",
  "target": 20,
  "rewardMoney": 1400,
  "rewardItems": { "cheri_berry": 1 }
 },
 {
  "id": 5,
  "region": "kanto",
  "type": "trainer_battle",
  "loc": "route22",
  "battleId": "kanto_rival_route22",
  "target": 1
 },
 {
  "id": 6,
  "region": "kanto",
  "type": "badge",
  "targetBadge": "brock",
  "target": 1,
  "rewardMoney": 2200,
  "rewardItems": {}
 },
 {
  "id": 7,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route3",
  "target": 25,
  "rewardMoney": 1800,
  "rewardItems": { "moonstone": 1 }
 },
 {
  "id": 8,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "mtmoon",
  "target": 30,
  "rewardMoney": 2600,
  "rewardItems": { "stardust": 1 }
 },
 {
  "id": 9,
  "region": "kanto",
  "type": "trainer_battle",
  "loc": "mtmoon",
  "battleId": "kanto_rocket_mtmoon",
  "target": 1
 },
 {
  "id": 10,
  "region": "kanto",
  "type": "trainer_battle",
  "loc": "mtmoon",
  "battleId": "kanto_super_nerd_fossil",
  "target": 1
 },
 {
  "id": 11,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route4",
  "target": 20,
  "rewardMoney": 1600,
  "rewardItems": { "prine_berry": 1 }
 },
 {
  "id": 12,
  "region": "kanto",
  "type": "trainer_battle",
  "loc": "cerulean",
  "battleId": "kanto_rival_cerulean",
  "target": 1
 },
 {
  "id": 13,
  "region": "kanto",
  "type": "talk",
  "loc": "route25",
  "target": 1,
  "rewardMoney": 900,
  "rewardItems": { "sitrus_berry": 1 }
 },
 {
  "id": 14,
  "region": "kanto",
  "type": "talk",
  "loc": "cerulean",
  "target": 1,
  "rewardMoney": 700,
  "rewardItems": { "oran_berry": 2 }
 },
 {
  "id": 15,
  "region": "kanto",
  "type": "badge",
  "targetBadge": "misty",
  "target": 1,
  "rewardMoney": 3500,
  "rewardItems": { "nugget": 1 }
 },
 {
  "id": 16,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route5",
  "target": 25,
  "rewardMoney": 2200,
  "rewardItems": { "sitrus_berry": 1 }
 },
 {
  "id": 17,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route6",
  "target": 25,
  "rewardMoney": 2200,
  "rewardItems": { "oran_berry": 1 }
 },
 {
  "id": 18,
  "region": "kanto",
  "type": "trainer_battle",
  "loc": "vermilion",
  "battleId": "kanto_rival_ssanne",
  "target": 1
 },
 {
  "id": 19,
  "region": "kanto",
  "type": "talk",
  "loc": "vermilion",
  "target": 1,
  "rewardMoney": 1100,
  "rewardItems": { "cheri_berry": 2 }
 },
 {
  "id": 20,
  "region": "kanto",
  "type": "badge",
  "targetBadge": "surge",
  "target": 1,
  "rewardMoney": 5000,
  "rewardItems": { "thunderstone": 1 }
 },
 {
  "id": 21,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "diglettscave",
  "target": 35,
  "rewardMoney": 4000,
  "rewardItems": { "soft_sand": 1 }
 },
 {
  "id": 22,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route10",
  "target": 40,
  "rewardMoney": 4000,
  "rewardItems": { "prine_berry": 1 }
 },
 {
  "id": 23,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "rocktunnel",
  "target": 50,
  "rewardMoney": 5200,
  "rewardItems": { "hard_stone": 1 }
 },
 {
  "id": 24,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route8",
  "target": 15,
  "rewardMoney": 2800,
  "rewardItems": { "oran_berry": 2 }
 },
 {
  "id": 25,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "pokemontower",
  "target": 45,
  "rewardMoney": 5800,
  "rewardItems": { "rarecandy": 1, "pokeflute": 1 }
 },
 {
  "id": 26,
  "region": "kanto",
  "type": "trainer_battle",
  "loc": "pokemontower",
  "battleId": "kanto_rocket_tower",
  "target": 1
 },
 {
  "id": 27,
  "region": "kanto",
  "type": "item",
  "requiredItem": "pokeflute",
  "rewardPoke": 143,
  "rewardLevel": 30,
  "target": 1,
  "rewardMoney": 3500
 },
 {
  "id": 28,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route7",
  "target": 35,
  "rewardMoney": 3800,
  "rewardItems": { "leafstone": 1 }
 },
 {
  "id": 29,
  "region": "kanto",
  "type": "trainer_battle",
  "loc": "celadon",
  "battleId": "kanto_rocket_hideout",
  "target": 1
 },
 {
  "id": 30,
  "region": "kanto",
  "type": "trainer_battle",
  "loc": "celadon",
  "battleId": "kanto_giovanni_hideout",
  "target": 1
 },
 {
  "id": 31,
  "region": "kanto",
  "type": "talk",
  "loc": "celadon",
  "target": 1,
  "rewardMoney": 800,
  "rewardItems": { "oran_berry": 1 },
  "rewardPoke": 133,
  "rewardLevel": 25
 },
 {
  "id": 32,
  "region": "kanto",
  "type": "talk",
  "loc": "celadon",
  "target": 1,
  "rewardMoney": 1000,
  "rewardItems": { "cheri_berry": 1 },
  "rewardPoke": 137,
  "rewardLevel": 20
 },
 {
  "id": 33,
  "region": "kanto",
  "type": "badge",
  "targetBadge": "erika",
  "target": 1,
  "rewardMoney": 7000,
  "rewardItems": { "leafstone": 1 }
 },
 {
  "id": 34,
  "region": "kanto",
  "type": "badge",
  "targetBadge": "koga",
  "target": 1,
  "rewardMoney": 8500,
  "rewardItems": { "poison_barb": 1 }
 },
 {
  "id": 35,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route17",
  "target": 20,
  "rewardMoney": 3600,
  "rewardItems": { "oran_berry": 2 }
 },
 {
  "id": 36,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "safarizone",
  "target": 15,
  "rewardMoney": 3200,
  "rewardItems": { "sitrus_berry": 2 }
 },
 {
  "id": 37,
  "region": "kanto",
  "type": "trainer_battle",
  "loc": "saffron",
  "battleId": "kanto_rival_silph",
  "target": 1
 },
 {
  "id": 38,
  "region": "kanto",
  "type": "trainer_battle",
  "loc": "saffron",
  "battleId": "kanto_giovanni_silph",
  "target": 1
 },
 {
  "id": 39,
  "region": "kanto",
  "type": "talk",
  "loc": "saffron",
  "target": 1,
  "rewardMoney": 900,
  "rewardItems": { "sitrus_berry": 1 },
  "rewardPoke": 131,
  "rewardLevel": 25
 },
 {
  "id": 40,
  "region": "kanto",
  "type": "trainer_battle",
  "loc": "saffron",
  "battleId": "kanto_dojo_master",
  "target": 1,
  "rewardPoke": 236,
  "rewardLevel": 25
 },
 {
  "id": 41,
  "region": "kanto",
  "type": "badge",
  "targetBadge": "sabrina",
  "target": 1,
  "rewardMoney": 10000,
  "rewardItems": { "twisted_spoon": 1 }
 },
 {
  "id": 42,
  "region": "kanto",
  "type": "talk",
  "loc": "saffron",
  "target": 1,
  "rewardMoney": 900,
  "rewardItems": { "sitrus_berry": 1 }
 },
 {
  "id": 43,
  "region": "kanto",
  "type": "mine_sell",
  "target": 5,
  "rewardMoney": 5000,
  "rewardItems": { "stardust": 1 }
 },
 {
  "id": 44,
  "region": "kanto",
  "type": "catch",
  "target": 15,
  "rewardMoney": 3000,
  "rewardItems": { "cheri_berry": 2 }
 },
 {
  "id": 45,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route20",
  "target": 60,
  "rewardMoney": 6500,
  "rewardItems": { "oran_berry": 1 }
 },
 {
  "id": 46,
  "region": "kanto",
  "type": "badge",
  "targetBadge": "blaine",
  "target": 1,
  "rewardMoney": 12500,
  "rewardItems": { "firestone": 1 }
 },
 {
  "id": 47,
  "region": "kanto",
  "type": "talk",
  "loc": "cinnabar",
  "target": 1,
  "rewardMoney": 1200,
  "rewardItems": { "cheri_berry": 1 },
  "rewardPoke": 142,
  "rewardLevel": 30
 },
 {
  "id": 48,
  "region": "kanto",
  "type": "badge",
  "targetBadge": "giovanni",
  "target": 1,
  "rewardMoney": 16000,
  "rewardItems": { "rarecandy": 1 }
 },
 {
  "id": 49,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route23",
  "target": 80,
  "rewardMoney": 10000,
  "rewardItems": { "rarecandy": 1 }
 },
 {
  "id": 50,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route21",
  "target": 20,
  "rewardMoney": 5200,
  "rewardItems": { "mystic_water": 1 }
 },
 {
  "id": 51,
  "region": "kanto",
  "type": "trainer_battle",
  "loc": "victoryroad",
  "battleId": "kanto_rival_victory",
  "target": 1
 },
 {
  "id": 52,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "victoryroad",
  "target": 25,
  "rewardMoney": 7000,
  "rewardItems": { "silk_scarf": 1 }
 },
 {
  "id": 53,
  "region": "kanto",
  "type": "badge",
  "targetBadge": "elite4",
  "target": 1,
  "rewardMoney": 28000,
  "rewardItems": { "rarecandy": 1 }
 },
 {
  "id": 54,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "seafoamislands",
  "rewardPoke": 144,
  "rewardLevel": 50,
  "target": 150,
  "rewardMoney": 9000
 },
 {
  "id": 55,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "powerplant",
  "rewardPoke": 145,
  "rewardLevel": 50,
  "target": 150,
  "rewardMoney": 9000
 },
 {
  "id": 56,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "victoryroad",
  "rewardPoke": 146,
  "rewardLevel": 50,
  "target": 150,
  "rewardMoney": 9000
 },
 {
  "id": 57,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "pokemonmansion",
  "target": 90,
  "rewardMoney": 13000,
  "rewardItems": { "rarecandy": 1 }
 },
 {
  "id": 58,
  "region": "kanto",
  "type": "talk",
  "loc": "cinnabar",
  "target": 1,
  "rewardMoney": 1500,
  "rewardItems": { "stardust": 1 }
 },
 {
  "id": 59,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "ceruleancave",
  "rewardPoke": 150,
  "rewardLevel": 70,
  "target": 150,
  "rewardMoney": 22000
 },
 {
  "id": 60,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "safarizone",
  "rewardPoke": 151,
  "rewardLevel": 50,
  "target": 150,
  "rewardMoney": 25000,
  "rewardItems": { "shiny_charm": 1 }
 },
 // ─────────── JOHTO (101-140) — passe 20 : étape 4, densification ───────────
 // Nouveautés : arc GS Ball (Fargot → Bois aux Chênes), arc FILM 3 aux Ruines
 // d'Alpha (Professeur Hale / Zarbi / Entei cristallin), Eusine & Suicune,
 // le remède d'Amphy le Pharamp (canon OAC : le Pharamp malade du phare),
 // Peter au Lac Colère, le LÉVIATOR ROUGE (rencontre shiny), l'épreuve du
 // dragon d'Ébénelle (Minidraco). Renumérotation → migration V3 côté core.
 {
  "id": 101,
  "region": "johto",
  "type": "talk",
  "loc": "newbark",
  "target": 1,
  "rewardMoney": 400,
  "rewardItems": { "oran_berry": 1 }
 },
 {
  "id": 102,
  "region": "johto",
  "type": "defeat_wild",
  "loc": "jroute29",
  "target": 10,
  "rewardMoney": 700,
  "rewardItems": { "oran_berry": 2 }
 },
 {
  "id": 103,
  "region": "johto",
  "type": "trainer_battle",
  "loc": "cherrygrove",
  "battleId": "johto_rival_cherrygrove",
  "target": 1
 },
 {
  "id": 104,
  "region": "johto",
  "type": "trainer_battle",
  "loc": "sprouttower",
  "battleId": "johto_sprout_elder",
  "target": 1
 },
 {
  "id": 105,
  "region": "johto",
  "type": "badge",
  "targetBadge": "falkner",
  "target": 1,
  "rewardMoney": 2800,
  "rewardItems": { "sitrus_berry": 1 }
 },
 {
  "id": 106,
  "region": "johto",
  "type": "trainer_battle",
  "loc": "slowpokewell",
  "battleId": "johto_rocket_slowpoke",
  "target": 1
 },
 {
  "id": 107,
  "region": "johto",
  "type": "badge",
  "targetBadge": "bugsy",
  "target": 1,
  "rewardMoney": 4200,
  "rewardItems": { "silver_powder": 1 }
 },
 // ── Arc GS Ball (film 4) : Fargot étudie la mystérieuse GS Ball ──
 {
  "id": 108,
  "region": "johto",
  "type": "talk",
  "loc": "azalea",
  "target": 1,
  "rewardMoney": 600,
  "rewardItems": { "sitrus_berry": 1 }
 },
 {
  "id": 109,
  "region": "johto",
  "type": "defeat_wild",
  "loc": "ilexforest",
  "target": 20,
  "rewardMoney": 2600,
  "rewardItems": { "oran_berry": 3 }
 },
 {
  "id": 110,
  "region": "johto",
  "type": "trainer_battle",
  "loc": "ilexforest",
  "battleId": "johto_rival_ilex",
  "target": 1
 },
 {
  "id": 111,
  "region": "johto",
  "type": "badge",
  "targetBadge": "whitney",
  "target": 1,
  "rewardMoney": 6500,
  "rewardItems": { "silk_scarf": 1 }
 },
 // ── Arc FILM 3 (Le Sort des Zarbi) : Ruines d'Alpha ──
 {
  "id": 112,
  "region": "johto",
  "type": "talk",
  "loc": "ruinsofalph",
  "target": 1,
  "rewardMoney": 800
 },
 {
  "id": 113,
  "region": "johto",
  "type": "defeat_wild",
  "loc": "ruinsofalph",
  "target": 15,
  "rewardMoney": 3200,
  "rewardItems": { "sitrus_berry": 2 }
 },
 {
  "id": 114,
  "region": "johto",
  "type": "trainer_battle",
  "loc": "ruinsofalph",
  "battleId": "johto_film3_entei",
  "target": 1
 },
 {
  "id": 115,
  "region": "johto",
  "type": "talk",
  "loc": "ruinsofalph",
  "target": 1,
  "rewardMoney": 4000,
  "rewardItems": { "charcoal": 1 }
 },
 {
  "id": 116,
  "region": "johto",
  "type": "trainer_battle",
  "loc": "burnedtower",
  "battleId": "johto_rival_burned",
  "target": 1
 },
 // ── Eusine, le chasseur de Suicune (canon Cristal) ──
 {
  "id": 117,
  "region": "johto",
  "type": "talk",
  "loc": "burnedtower",
  "target": 1,
  "rewardMoney": 1000,
  "rewardItems": { "oran_berry": 2 }
 },
 {
  "id": 118,
  "region": "johto",
  "type": "badge",
  "targetBadge": "morty",
  "target": 1,
  "rewardMoney": 8500,
  "rewardItems": { "spell_tag": 1 }
 },
 {
  "id": 119,
  "region": "johto",
  "type": "badge",
  "targetBadge": "chuck",
  "target": 1,
  "rewardMoney": 10000,
  "rewardItems": { "black_belt": 1 }
 },
 // ── Amphy malade (canon OAC) : le remède d'Irisia pour le Phare d'Oliville ──
 {
  "id": 120,
  "region": "johto",
  "type": "talk",
  "loc": "cianwood",
  "target": 1,
  "rewardMoney": 800
 },
 {
  "id": 121,
  "region": "johto",
  "type": "talk",
  "loc": "olivine",
  "target": 1,
  "rewardMoney": 3000,
  "rewardItems": { "oran_berry": 2 }
 },
 {
  "id": 122,
  "region": "johto",
  "type": "badge",
  "targetBadge": "jasmine",
  "target": 1,
  "rewardMoney": 11500,
  "rewardItems": { "metal_coat": 1 }
 },
 // ── Lac Colère : Peter enquête + le LÉVIATOR ROUGE (canon OAC) ──
 {
  "id": 123,
  "region": "johto",
  "type": "talk",
  "loc": "lakerage",
  "target": 1,
  "rewardMoney": 1000
 },
 {
  "id": 124,
  "region": "johto",
  "type": "defeat_wild",
  "loc": "lakerage",
  "target": 25,
  "rewardMoney": 6000,
  "rewardPoke": 130,
  "rewardLevel": 30,
  "rewardShiny": true
 },
 {
  "id": 125,
  "region": "johto",
  "type": "trainer_battle",
  "loc": "lakerage",
  "battleId": "johto_rocket_lake",
  "target": 1
 },
 {
  "id": 126,
  "region": "johto",
  "type": "badge",
  "targetBadge": "pryce",
  "target": 1,
  "rewardMoney": 13000,
  "rewardItems": { "never_melt_ice": 1 }
 },
 {
  "id": 127,
  "region": "johto",
  "type": "trainer_battle",
  "loc": "goldenrod",
  "battleId": "johto_rocket_radio",
  "target": 1
 },
 {
  "id": 128,
  "region": "johto",
  "type": "badge",
  "targetBadge": "clair",
  "target": 1,
  "rewardMoney": 17500,
  "rewardItems": { "dragon_fang": 1, "rarecandy": 1 }
 },
 // ── Épreuve du dragon d'Ébénelle (canon OAC : l'Antre du Dragon) ──
 {
  "id": 129,
  "region": "johto",
  "type": "talk",
  "loc": "blackthorn",
  "target": 1,
  "rewardMoney": 1000
 },
 {
  "id": 130,
  "region": "johto",
  "type": "defeat_wild",
  "loc": "mtmortar",
  "target": 20,
  "rewardMoney": 5000,
  "rewardPoke": 147,
  "rewardLevel": 15
 },
 {
  "id": 131,
  "region": "johto",
  "type": "trainer_battle",
  "loc": "victoryroad_jo",
  "battleId": "johto_rival_victory",
  "target": 1
 },
 {
  "id": 132,
  "region": "johto",
  "type": "badge",
  "targetBadge": "johto_elite4",
  "target": 1,
  "rewardMoney": 30000,
  "rewardItems": { "rarecandy": 1 }
 },
 {
  "id": 133,
  "region": "johto",
  "type": "defeat_wild",
  "loc": "burnedtower",
  "target": 60,
  "rewardMoney": 9000,
  "rewardItems": { "silver_wing": 1 }
 },
 // ── Poursuite de Suicune (repérages le long de la Route 42) ──
 {
  "id": 134,
  "region": "johto",
  "type": "defeat_wild",
  "loc": "jroute42",
  "target": 25,
  "rewardMoney": 5000,
  "rewardItems": { "sitrus_berry": 2 }
 },
 {
  "id": 135,
  "region": "johto",
  "type": "defeat_wild",
  "loc": "burnedtower",
  "rewardPoke": 243,
  "rewardLevel": 50,
  "target": 150,
  "rewardMoney": 16000
 },
 {
  "id": 136,
  "region": "johto",
  "type": "defeat_wild",
  "loc": "burnedtower",
  "rewardPoke": 244,
  "rewardLevel": 50,
  "target": 150,
  "rewardMoney": 16000
 },
 {
  "id": 137,
  "region": "johto",
  "type": "defeat_wild",
  "loc": "burnedtower",
  "rewardPoke": 245,
  "rewardLevel": 50,
  "target": 150,
  "rewardMoney": 16000,
  "rewardItems": { "rainbow_wing": 1 }
 },
 {
  "id": 138,
  "region": "johto",
  "type": "item",
  "loc": "whirlislands",
  "requiredItem": "silver_wing",
  "rewardPoke": 249,
  "rewardLevel": 70,
  "target": 1,
  "rewardMoney": 20000
 },
 {
  "id": 139,
  "region": "johto",
  "type": "item",
  "loc": "tintower",
  "requiredItem": "rainbow_wing",
  "rewardPoke": 250,
  "rewardLevel": 70,
  "target": 1,
  "rewardMoney": 20000
 },
 {
  "id": 140,
  "region": "johto",
  "type": "defeat_wild",
  "loc": "ilexforest",
  "rewardPoke": 251,
  "rewardLevel": 50,
  "target": 150,
  "rewardMoney": 20000
 }
];


// --- Migrated to ES module, globals exposed ---
if (typeof STORY_QUESTS !== 'undefined' && typeof window !== 'undefined') window.STORY_QUESTS = STORY_QUESTS;
