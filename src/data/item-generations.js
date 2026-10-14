// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept verbatim further down: classic consumers and VM harnesses.
/**
 * PokéWorld — Génération des objets (règle joueur « progressive discovery »).
 *
 * Chaque objet tenu/objet clé/objet d'évolution/fossile/pierre est associé à
 * la GÉNÉRATION de son contenu :
 *   - 1 = Kanto (RVB) · 2 = Johto (OAC) · 3 = Hoenn (RSE) ;
 *   - 4+ = Sinnoh et au-delà — PAS encore disponibles : masqués du
 *     dictionnaire et retirés de la distribution tant que la région
 *     correspondante n'existe pas.
 *
 * Les capsules techniques (clés « ct_… » / « cs_… ») sont HORS génération :
 * la table ne les liste pas → elles restent toujours visibles (le pool de
 * capacités est PokéClicker et mélange volontairement les générations).
 *
 * Les objets « custom » (PokéClicker / stand-ins de contenu Gen 1-3) sont
 * classés dans la génération du contenu qu'ils servent, avec un commentaire.
 *
 * @module data/item-generations
 */
export const ITEM_GEN = {
  // ── Poké Balls (mécanique centrale, Gen 1) ──
  pokeball: 1, greatball: 1, ultraball: 1, masterball: 1,
  honorball: 1, // custom (Honor Ball = Premier Ball « maison », donnée dès Kanto)

  // ── Bonbon ──
  rarecandy: 1,

  // ── Objets clés ──
  pokeflute: 1,
  silver_wing: 2, rainbow_wing: 2,
  shiny_charm: 1, // custom QoL (récompense de Pokédex Kanto)

  // ── Trésors (mine, PokéClicker) ──
  nugget: 1, stardust: 2, star_piece: 2,
  heart_scale: 3, big_nugget: 3, rare_bone: 3, iron_ball: 3, // trésors « maison »

  // ── Fossiles ──
  helix_fossil: 1, dome_fossil: 1, old_amber: 1, fossil: 1, // « Vieux Fossile »
  root_fossil: 3, claw_fossil: 3,
  armor_fossil: 4, skull_fossil: 4,
  cover_fossil: 6, plume_fossil: 6, jaw_fossil: 6, sail_fossil: 6,
  fossilized_bird: 8, fossilized_dino: 8, fossilized_drake: 8, fossilized_fish: 8,

  // ── Pierres d'évolution ──
  firestone: 1, waterstone: 1, thunderstone: 1, leafstone: 1, moonstone: 1,
  link_stone: 1, // custom (remplace les échanges de Gen 1)
  sunstone: 2,
  dawn_stone: 4, dusk_stone: 4, shiny_stone: 4, oval_stone: 4,
  ice_stone: 7,

  // ── Objets d'évolution tenus ──
  kings_rock: 2, metal_coat: 2, dragon_scale: 2, upgrade: 2,
  everstone: 1,
  deep_sea_scale: 3, deep_sea_tooth: 3,
  prism_scale: 3, // stand-in Gen 3 (remplace le concours « Beauté » RSE pour Barpau→Milobellus)
  razor_claw: 4, razor_fang: 4, reaper_cloth: 4, protector: 4,
  electirizer: 4, magmarizer: 4, dubious_disc: 4,
  sachet: 6, whipped_dream: 6,
  sweet_apple: 8, tart_apple: 8, syrupy_apple: 8,
  chipped_pot: 8, cracked_pot: 8, unremarkable_teacup: 8, masterpiece_teacup: 8,
  peat_block: 8, galarica_cuff: 8, galarica_wreath: 8,
  auspicious_armor: 9, malicious_armor: 9,

  // ── Objets tenus de combat ──
  // boosters de type (Gen 2, sauf mention)
  black_belt: 2, black_glasses: 2, charcoal: 2, dragon_fang: 2,
  hard_stone: 2, magnet: 2, miracle_seed: 2, mystic_water: 2,
  never_melt_ice: 2, poison_barb: 2, sharp_beak: 2, silver_powder: 2,
  soft_sand: 2, spell_tag: 2, twisted_spoon: 2,
  silk_scarf: 3,
  muscle_band: 4,
  fairy_feather: 6, // custom (type Fée = Gen 6)
  // choix
  choice_band: 3, choice_specs: 3,
  // divers Gen 1-3
  leftovers: 2, lucky_egg: 2, lucky_punch: 2, quick_claw: 2, mental_herb: 3,
  prine_berry: 1, // custom (baie de Kanto, remplace Oran)
  // Gen 4+
  life_orb: 4, flame_orb: 4, toxic_orb: 4, light_clay: 4, power_herb: 4,
  lagging_tail: 4, metronome: 4, pure_incense: 4, luck_incense: 4,
  eviolite: 5, eject_button: 5,
  weakness_policy: 6, assault_vest: 6,
  terrain_extender: 7, electric_seed: 7, grassy_seed: 7, misty_seed: 7, foggy_seed: 7,
  heavy_duty_boots: 8, eject_pack: 8,
  loaded_dice: 9, clear_amulet: 9,
  // Baies de résistance : officiellement Gen 4, mais EXCEPTION JOUEUR
  // (Passe 19) — conservées et distribuées partout (boutiques, routes,
  // quêtes) → classées Gen 1 pour rester visibles dès Kanto.
  babiri_berry: 1, charti_berry: 1, chople_berry: 1, coba_berry: 1,
  colbur_berry: 1, haban_berry: 1, kasib_berry: 1, kebia_berry: 1,
  occa_berry: 1, passho_berry: 1, payapa_berry: 1, rindo_berry: 1,
  roseli_berry: 1, shuca_berry: 1, tanga_berry: 1, wacan_berry: 1,
  yache_berry: 1,
  // joyaux (Gen 5)
  bug_gem: 5, dark_gem: 5, dragon_gem: 5, electric_gem: 5, fairy_gem: 5,
  fighting_gem: 5, fire_gem: 5, flying_gem: 5, ghost_gem: 5, grass_gem: 5,
  ground_gem: 5, ice_gem: 5, normal_gem: 5, poison_gem: 5, psychic_gem: 5,
  rock_gem: 5, steel_gem: 5, water_gem: 5,

  // ── Clés de voûte (Gen 6) ──
  ancient_keystone: 6, frozen_keystone: 6, steel_keystone: 6,

  // ── Cristaux Z (Gen 7) ──
  buginium_z: 7, darkinium_z: 7, dragonium_z: 7, electrium_z: 7, fairium_z: 7,
  fightinium_z: 7, firium_z: 7, flyinium_z: 7, ghostium_z: 7, grassium_z: 7,
  groundium_z: 7, icium_z: 7, normalium_z: 7, poisonium_z: 7, psychium_z: 7,
  rockium_z: 7, steelium_z: 7, waterium_z: 7,


  // ── DORM-06b — objets futurs / non distribués (visibles en debug) ──
  abomasite: 6,
  absolite: 6,
  aerodactylite: 6,
  aggronite: 6,
  alakazite: 6,
  altarianite: 6,
  ampharosite: 6,
  audinite: 6,
  banettite: 6,
  barbaracite: 6,
  baxcaliburite: 6,
  beedrillite: 6,
  blastoisinite: 6,
  blazikenite: 6,
  cameruptite: 6,
  diancite: 6,
  dragonitite: 6,
  falinksite: 6,
  galladite: 6,
  garchompite: 6,
  gardevoirite: 6,
  gengarite: 6,
  glalitite: 6,
  gyaradosite: 6,
  hawluchanite: 6,
  heracronite: 6,
  houndoominite: 6,
  kangaskhanite: 6,
  latiasite: 6,
  latiosite: 6,
  lopunnite: 6,
  lucarionite: 6,
  manectite: 6,
  mawilite: 6,
  medichamite: 6,
  metagrossite: 6,
  pidgeotite: 6,
  pinsirite: 6,
  pyroarite: 6,
  sablenite: 6,
  salamencite: 6,
  sceptilite: 6,
  scizorite: 6,
  sharpedonite: 6,
  slowbronite: 6,
  steelixite: 6,
  swampertite: 6,
  tyranitarite: 6,
  venusaurite: 6,
  charizardite_x: 6,
  charizardite_y: 6,
  mewtwonite_x: 6,
  mewtwonite_y: 6,
  raichutite_x: 6,
  raichutite_y: 6,
  mega_piece: 6,
  mega_shard: 6,
  mega_cluster: 6,
  mega_chunk: 6,
  mystery_egg: 9,
  time_candy: 9,
  time_candy_xl: 9,
  red_apricorn: 2,
  blue_apricorn: 2,
  yellow_apricorn: 2,
  green_apricorn: 2,
  pink_apricorn: 2,
  white_apricorn: 2,
  black_apricorn: 2,
  red_orb: 3,
  blue_orb: 3,
  gs_ball_celebi: 2,
  clear_bell_hooh: 2,
  tidal_bell_lugia: 2,
  eon_ticket_latis: 3,
  meteorite_shard_delta: 3,
  meteorite_bills_errand: 3,
  destiny_knot: 6,
  macho_brace: 3,
  power_bracer: 4,
  power_belt: 4,
  power_lens: 4,
  power_band: 4,
  power_anklet: 4,
  power_weight: 4,
  neutral_mint: 8,
  red_shard: 4,
  blue_shard: 4,
  yellow_shard: 4,
  green_shard: 4,
  white_shard: 4,
  black_shard: 4,
  purple_shard: 4,
  pink_shard: 4,
  cyan_shard: 4,
  beige_shard: 4,
  brown_shard: 4,
  crimson_shard: 4,
  grey_shard: 4,
  lime_shard: 4,
  ochre_shard: 4,
  rose_shard: 4,
  slate_shard: 4,
  blank_plate: 4,
  draco_plate: 4,
  dread_plate: 4,
  earth_plate: 4,
  fist_plate: 4,
  flame_plate: 4,
  icicle_plate: 4,
  insect_plate: 4,
  iron_plate: 4,
  meadow_plate: 4,
  mind_plate: 4,
  pixie_plate: 4,
  sky_plate: 4,
  splash_plate: 4,
  spooky_plate: 4,
  stone_plate: 4,
  toxic_plate: 4,
  zap_plate: 4,
  amaze_mulch: 4,
  boost_mulch: 4,
  freeze_mulch: 4,
  gooey_mulch: 4,
  rich_mulch: 4,
  surprise_mulch: 4,
  berry_shovel: 4,
  mulch_shovel: 4,
  cerulean_berry_shop_permit: 4,
  red_flute: 3,
  blue_flute: 3,
  yellow_flute: 3,
  white_flute: 3,
  black_flute: 3,
  time_flute: 3,
  treasure_scanner: 4,
  dowsing_machine: 4,
  token_collector: 4,

  // ── Mémoire (Gen 7) ──
  stoned_memory: 7,
};

/**
 * Génération d'un objet, ou null pour un objet « hors génération »
 * (capsules techniques et tout objet absent de la table).
 * @param {string} key
 * @returns {number|null}
 */
export function itemGeneration(key) {
  if (!key) return null;
  const k = String(key);
  if (k.startsWith('ct') || k.startsWith('cs')) return null;
  return Object.prototype.hasOwnProperty.call(ITEM_GEN, k) ? ITEM_GEN[k] : null;
}

/**
 * Plus haute génération d'objets « débloquée » : 1 = Kanto seul,
 * 2 = Johto accessible, 3 = Hoenn accessible. Sans contexte région
 * (tests/headless), on montre les 3 générations implémentées.
 * @returns {number}
 */
export function maxUnlockedItemGen() {
  try {
    if (typeof canAccessRegion === 'function') {
      if (canAccessRegion('hoenn')) return 3;
      if (canAccessRegion('johto')) return 2;
      return 1;
    }
  } catch (_) { /* contexte sans G */ }
  return 3; // tests/headless : les 3 générations implémentées restent visibles
}

/**
 * Un objet est-il visible dans le dictionnaire à l'étape actuelle ?
 * @param {string} key
 * @returns {boolean}
 */
export function isItemGenUnlocked(key) {
  const gen = itemGeneration(key);
  if (gen == null) return true;
  return gen <= maxUnlockedItemGen();
}

// --- Migrated to ES module, globals exposed ---
if (typeof globalThis !== 'undefined') {
  globalThis.ITEM_GEN = ITEM_GEN;
  globalThis.itemGeneration = itemGeneration;
  globalThis.maxUnlockedItemGen = maxUnlockedItemGen;
  globalThis.isItemGenUnlocked = isItemGenUnlocked;
}

