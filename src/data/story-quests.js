// Wave 40 — native ESM module. The classic surface (window/globalThis) is
// kept verbatim further down: classic consumers and VM harnesses.
// ═══ Main quests — phase 18: tidying, renumbering, rebalancing ═══
// • Kanto  1 -> 44  (strict adventure order; quest 22 "Team Rocket at
//   the Pokemon Tower" is NEW — FRLG canon, documented insertion)
// • Johto 101 -> 126 (same order as before, unique numbering — the old
//   ids 20-31/60-66/1101-1108 could clash with Kanto, since
//   getMainQuestDef lookup does not filter by region)
// • Rebalanced rewards (validated rule: the player must not become
//   too rich nor drown in items): total Kanto money ≈ 241,300₽
//   (-33% vs 358,000₽) + ≈ 57,000₽ of trainer-battle bonuses;
//   Johto ≈ 226 100₽ (-25 % vs 301 800₽) + ≈ 42 300₽ de primes.
//   Items: never a duplicate stone, only one "prestige" reward per
//   quest; the Prine Berry is now actually defined in ITEMS.
// • trainer_battle quests: money is paid on victory by the trainer
//   (OFFICIAL_TEAMS[idx].rewardMoney); the quest claim gives nothing.
// Save migration: see migrateQuestSaveV2 (quest-core.js).
var STORY_QUESTS = [
 // ─────────── KANTO (1-60) — phase 21: densification (+16 quests) ───────────
// Insertions canon RFVF : Bill (13), Fan Club (14), Capitaine S.S. Anne (19),
// Route 8 (24), Eevee/Porygon of Celadon (31-32), Cycling Road (35),
// Gold Teeth of the Safari Zone (36), Sylph Lapras (39), DOJO of
// Safrania → Tyrogue (40, RFVF : Kicklee/Tygnon Nv.37 @ Ceinture Noire),
// Mr. Psychic (42), Collector (44), fossil lab -> Aerodactyl (47), Channel 21
// (50), Ultimate training on Victory Road (52), Mansion Memories (58).
// Save migration: migrateQuestSaveV4 (quest-core.js).
 {
  "id": 1,
  "region": "kanto",
  "type": "talk",
  "loc": "pallet",
  "target": 1,
  "rewardMoney": 400,
  "rewardItems": { "babiri_berry": 1 }
 },
 {
  "id": 2,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route1",
  "target": 10,
  "rewardMoney": 600,
  "rewardItems": { "roseli_berry": 1 }
 },
 {
  "id": 3,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "viridianforest",
  "target": 15,
  "rewardMoney": 1000,
  "rewardItems": { "prine_berry": 1 }
 },
 {
  "id": 4,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route22",
  "target": 20,
  "rewardMoney": 1400,
  "rewardItems": { "tanga_berry": 1 }
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
  "rewardItems": { "charti_berry": 1 }
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
  "rewardItems": { "colbur_berry": 1 }
 },
 {
  "id": 14,
  "region": "kanto",
  "type": "talk",
  "loc": "cerulean",
  "target": 1,
  "rewardMoney": 700,
  "rewardItems": {}
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
  "rewardItems": { "passho_berry": 1 }
 },
 {
  "id": 17,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route6",
  "target": 25,
  "rewardMoney": 2200,
  "rewardItems": {}
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
  "rewardItems": {}
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
  "rewardItems": { "yache_berry": 1 }
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
  "rewardItems": { "payapa_berry": 1 },
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
  "rewardItems": {},
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
  "rewardItems": {}
 },
 {
  "id": 36,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "safarizone",
  "target": 15,
  "rewardMoney": 3200,
  "rewardItems": { "occa_berry": 1 }
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
  "rewardItems": { "wacan_berry": 1 },
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
  "rewardItems": { "tanga_berry": 1 }
 },
 {
  "id": 43,
  "region": "kanto",
  "type": "mine_sell",
  "target": 5,
  "rewardMoney": 5000,
  "rewardItems": { "chople_berry": 1 }
 },
 {
  "id": 44,
  "region": "kanto",
  "type": "catch",
  "target": 15,
  "rewardMoney": 3000,
  "rewardItems": { "prine_berry": 1 }
 },
 {
  "id": 45,
  "region": "kanto",
  "type": "defeat_wild",
  "loc": "route20",
  "target": 60,
  "rewardMoney": 6500,
  "rewardItems": {}
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
  "rewardItems": {},
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
  "rewardItems": {}
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
  "rewardItems": { "rarecandy": 5, "nugget": 3, "leftovers": 1 }
 },
 // ─────────── JOHTO (101-140) — passe 20: step 4, densification ───────────
 // New content: GS Ball arc (Kurt -> Ilex Forest), MOVIE 3 arc at the
 // Ruins of Alph (Professor Hale / Unown / crystal Entei), Eusine &
 // Suicune, the remedy for Amphy the Ampharos (HGSS canon: the sick
 // lighthouse Ampharos), Lance at the Lake of Rage, the RED GYARADOS
 // (shiny encounter), the Blackthorn dragon trial (Dratini).
 // Renumbering → V3 migration on the core side.
 {
  "id": 101,
  "region": "johto",
  "type": "talk",
  "loc": "newbark",
  "target": 1,
  "rewardMoney": 400,
  "rewardItems": { "coba_berry": 1 }
 },
 {
  "id": 102,
  "region": "johto",
  "type": "defeat_wild",
  "loc": "jroute29",
  "target": 10,
  "rewardMoney": 700,
  "rewardItems": { "roseli_berry": 1 }
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
  "rewardItems": {}
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
 // ── GS Ball arc (movie 4): Kurt studies the mysterious GS Ball ──
 {
  "id": 108,
  "region": "johto",
  "type": "talk",
  "loc": "azalea",
  "target": 1,
  "rewardMoney": 600,
  "rewardItems": { "shuca_berry": 1 }
 },
 {
  "id": 109,
  "region": "johto",
  "type": "defeat_wild",
  "loc": "ilexforest",
  "target": 20,
  "rewardMoney": 2600,
  "rewardItems": { "rindo_berry": 1 }
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
 // ── MOVIE 3 arc (Spell of the Unown): Ruins of Alph ──
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
  "rewardItems": { "babiri_berry": 1 }
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
 // ── Eusine, the Suicune hunter (Crystal canon) ──
 {
  "id": 117,
  "region": "johto",
  "type": "talk",
  "loc": "burnedtower",
  "target": 1,
  "rewardMoney": 1000,
  "rewardItems": {}
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
 // ── Sick Amphy (HGSS canon): the Cianwood remedy for the Olivine Lighthouse ──
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
  "rewardItems": { "yache_berry": 1 }
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
 // ── Lake of Rage: Lance investigates + the RED GYARADOS (HGSS canon) ──
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
 // ── Blackthorn dragon trial (HGSS canon: the Dragon's Den) ──
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
 // ── Suicune pursuit (sightings along Route 42) ──
 {
  "id": 134,
  "region": "johto",
  "type": "defeat_wild",
  "loc": "jroute42",
  "target": 25,
  "rewardMoney": 5000,
  "rewardItems": {}
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
if (typeof STORY_QUESTS !== 'undefined') { if (typeof window !== 'undefined') window.STORY_QUESTS = STORY_QUESTS; if (typeof globalThis !== 'undefined') globalThis.STORY_QUESTS = STORY_QUESTS; }


// Wave 40 — native ESM module: grouped export of the same names as the
// classic surface kept above/here (bodies unchanged).
export {
  STORY_QUESTS,
};
