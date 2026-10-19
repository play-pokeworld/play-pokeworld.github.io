/**
 * @file talent-effects.mjs
 * @brief Port table: declarative battle effects of every talent, transcribed from the hard-coded
 * checks of the original combat code (application/combat/battle-attack.js, battle-init.js,
 * battle-status.js, stat-mods.js, domain/battle/tick.js). The numbers are the ones the original
 * code applies, which sometimes differ from the talent descriptions (e.g. Huge Power x1.6).
 *
 * Effect vocabulary: see docs/BATTLE_EFFECTS.md. Talents absent from this table get `effects: []`
 * and are listed as "not ported" by gen-talents.mjs.
 */

const TYPES_BY_GUARD = {
  flameguard: 'fire', waterguard: 'water', leafguard: 'grass', electricguard: 'electric', iceguard: 'ice',
  frostguard: 'ice', fightingguard: 'fighting', grabguard: 'fighting', poisonguard: 'poison',
  groundguard: 'ground', flyingguard: 'flying', psychicguard: 'psychic', bugguard: 'bug', rockguard: 'rock',
  ghostguard: 'ghost', curseguard: 'ghost', dragonguard: 'dragon', darkguard: 'dark', sinisterguard: 'dark',
  steelguard: 'steel', fairyguard: 'fairy', normalguard: 'normal', plainguard: 'normal',
  // The original TYPE_GUARD_MAP also lists "voltage" (Electric) as a guard.
  voltage: 'electric'
};

const ABSORB_TYPES = {
  waterabsorb: 'water', stormdrain: 'water', voltabsorb: 'electric', flashfire: 'fire', sapsipper: 'grass',
  poisonabsorb: 'poison', frostabsorb: 'ice', psychicabsorb: 'psychic', lightabsorb: 'fairy',
  growthabsorb: 'grass', flareabsorb: 'fire', curseabsorb: 'ghost'
};

const FLASH_TYPES = {
  flashelectro: 'electric', flashaqua: 'water', flashpyro: 'fire', flashumbra: 'ghost', flashvenum: 'poison',
  flashcryo: 'ice', flashpsycha: 'psychic', flashfae: 'fairy', flashherba: 'grass'
};

const LOW_HP_TYPES = {
  overgrow: 'grass', blaze: 'fire', torrent: 'water', swarm: 'bug', bastion: 'steel', average: 'normal',
  resolve: 'fighting', mistify: 'psychic', hexerei: 'ghost', glimmer: 'fairy', skyward: 'flying',
  draconic: 'dragon', noxious: 'poison', solid: 'rock', rime: 'ice', voltage: 'electric', earthy: 'ground',
  shadowy: 'dark'
};

const ATE_TYPES = {
  aerilate: 'flying', pixilate: 'fairy', galvanize: 'electric', pyrolate: 'fire', toxilate: 'poison',
  hydrolate: 'water', glaciate: 'ice', gloomilate: 'dark', ferrilate: 'steel', espilate: 'psychic',
  chrysilate: 'bug', dragonmaw: 'dragon', terralate: 'ground', verdify: 'grass'
};

/** Hand-ported talents (id -> effects). */
const SPECIFIC = {
  adaptability: [{ kind: 'stab', mult: 2 }],
  protean: [{ kind: 'stab_minimum', mult: 1.5 }],
  normalize: [{ kind: 'move_type_change', from: null, to: 'normal', powerMult: 1.3 }],
  tintedlens: [{ kind: 'resisted_damage', mult: 2 }],
  scrappy: [{ kind: 'ignore_type_immunity', moveTypes: ['normal', 'fighting'] }],
  noguard: [{ kind: 'never_miss' }],
  compoundeyes: [{ kind: 'accuracy', add: 30 }],
  sandveil: [{ kind: 'evasion', add: 20 }],
  snowcloak: [{ kind: 'evasion', add: 20 }],
  levitate: [{ kind: 'type_immunity', moveType: 'ground' }],
  lightningrod: [{ kind: 'type_immunity', moveType: 'electric' }, { kind: 'attack_stat', category: 'special', mult: 1.25 }],
  intimidate: [
    { kind: 'foe_attack_stat', category: 'physical', mult: 0.75 },
    { kind: 'entry_foe_stat', stat: 'atk', mult: 0.75, blockedBy: ['fullmetalbody', 'hypercutter'] }
  ],
  dauntinglook: [{ kind: 'entry_foe_stat', stat: 'spa', mult: 0.5 }],
  livingshield: [{ kind: 'defense_stat', category: 'special', mult: 1.5, when: { selfStatus: true } }],
  hugepower: [{ kind: 'attack_stat', category: 'physical', mult: 1.6 }],
  purepower: [{ kind: 'attack_stat', category: 'physical', mult: 1.6 }],
  solarpower: [{ kind: 'attack_stat', category: 'special', mult: 1.3 }],
  gorillatactics: [{ kind: 'attack_stat', category: 'physical', mult: 1.5 }],
  brittlearmor: [{ kind: 'attack_stat', category: 'special', mult: 1.5, when: { selfStatus: true } }],
  flareboost: [{ kind: 'damage', mult: 1.2, when: { selfStatus: ['burn'] } }, { kind: 'status_damage', statuses: ['burn'], mult: 0 }],
  toxicboost: [{ kind: 'damage', mult: 1.2, when: { selfStatus: ['poison', 'badpoison'] } }, { kind: 'status_damage', statuses: ['poison', 'badpoison'], mult: 0 }],
  // Original applyEndOfTurnStatus: end of turn status damage ×2 (holder) / ×0 (Flare / Toxic Boost).
  scorch: [{ kind: 'status_damage', statuses: ['burn'], mult: 2 }],
  corrosion: [{ kind: 'status_damage', statuses: ['poison', 'badpoison'], mult: 2 }],
  raindish: [{ kind: 'attack_stat', category: 'special', mult: 1.5, when: { weather: ['rain'] } }],
  protosynthesis: [{ kind: 'attack_stat', mult: 1.5, when: { weather: ['sun'] } }],
  quarkdrive: [{ kind: 'attack_stat', mult: 1.5, when: { terrain: ['electric'] } }],
  guts: [{ kind: 'attack_stat', category: 'physical', mult: 1.5, when: { selfStatus: true } }],
  technician: [{ kind: 'power', mult: 1.5, when: { maxPower: 60 } }],
  steelyspirit: [{ kind: 'power', mult: 1.25, when: { moveTypes: ['steel'] } }],
  thickfat: [{ kind: 'defense_stat', mult: 2, when: { moveTypes: ['fire', 'ice'] } }],
  multiscale: [{ kind: 'defense_stat', mult: 2, when: { selfHpFull: true } }],
  filter: [{ kind: 'defense_stat', mult: 1.33, when: { superEffective: true } }],
  solidrock: [{ kind: 'defense_stat', mult: 1.33, when: { superEffective: true } }],
  marvelscale: [{ kind: 'defense_stat', category: 'physical', mult: 1.5, when: { selfStatus: true } }],
  icebody: [{ kind: 'defense_stat', category: 'physical', mult: 1.5, when: { weather: ['hail'] } }],
  ambidextrous: [{ kind: 'cross_power', add: 0.3 }],
  treasureofruin: [{ kind: 'cross_power', add: 0.5 }],
  strongjaw: [{ kind: 'damage', mult: 2, when: { moveTag: 'fang' } }],
  toughclaws: [{ kind: 'damage', mult: 2, when: { moveTag: 'claw' } }],
  ironfist: [{ kind: 'damage', mult: 1.5, when: { moveTag: 'punch' } }],
  sharpness: [{ kind: 'damage', mult: 1.5, when: { moveTag: 'sharp' } }],
  megalauncher: [{ kind: 'damage', mult: 1.5, when: { moveTag: 'pulse' } }],
  metalhead: [{ kind: 'damage', mult: 1.5, when: { moveTag: 'head' } }],
  reckless: [{ kind: 'damage', mult: 1.5, when: { slowMove: true } }],
  libero: [{ kind: 'damage', mult: 2, when: { fastMove: true } }],
  merciless: [{ kind: 'damage', mult: 1.5, when: { targetStatus: true } }],
  rivalry: [{ kind: 'damage', mult: 1.5, when: { sharesType: true } }],
  sheerforce: [{ kind: 'damage', mult: 1.25, when: { hasSecondary: true } }, { kind: 'no_secondary_effects' }],
  parentalbond: [{ kind: 'damage', mult: 1.5 }],
  sandforce: [{ kind: 'damage', mult: 1.5, when: { weather: ['sand'], category: 'physical' } }],
  supremeoverlord: [{ kind: 'damage_per_fainted_ally', add: 0.15 }],
  wonderguard: [{ kind: 'damage_taken', mult: 0.2, when: { notSuperEffective: true } }],
  purifyingsalt: [{ kind: 'damage_taken', mult: 0.75, when: { moveTypes: ['ghost'] } }],
  // shellarmor / battlearmor / sniper / sturdy: handled by the original combat code but absent
  // from its talent table (no Pokémon can have them), and no move carries the crit flag, so
  // critical hits never happen. Not transcribed (docs/BATTLE_EFFECTS.md).
  justified: [{ kind: 'on_super_effective_hit', stat: 'spa', mult: 2 }],
  angerpoint: [{ kind: 'on_super_effective_hit', stat: 'atk', mult: 2 }],
  skilllink: [{ kind: 'max_hits' }],
  serenegrace: [{ kind: 'secondary_chance', mult: 2 }],
  insomnia: [{ kind: 'status_immunity', statuses: ['sleep'] }],
  immunity: [{ kind: 'status_immunity', statuses: ['poison', 'badpoison'] }],
  limber: [{ kind: 'status_immunity', statuses: ['para'] }],
  owntempo: [{ kind: 'status_immunity', statuses: ['confuse'] }],
  magmaarmor: [{ kind: 'status_immunity', statuses: ['freeze'] }],
  waterveil: [{ kind: 'status_immunity', statuses: ['burn'] }],
  wonderskin: [{ kind: 'status_resist_chance', chance: 50 }],
  // Original isImmuneToStatus: full status immunity under a weather / terrain ('statuses'
  // omitted = every status). blackpelt ('somber') matches no field and stays unported.
  hydratation: [{ kind: 'status_immunity', when: { weather: ['rain'] } }],
  moistpelt: [{ kind: 'status_immunity', when: { weather: ['rain'] } }],
  fierypelt: [{ kind: 'status_immunity', when: { weather: ['sun'] } }],
  sandypelt: [{ kind: 'status_immunity', when: { weather: ['sand'] } }],
  icypelt: [{ kind: 'status_immunity', when: { weather: ['hail'] } }],
  grassypelt: [{ kind: 'status_immunity', when: { terrain: ['grassy'] } }],
  pixiepelt: [{ kind: 'status_immunity', when: { terrain: ['psychic'] } }],
  spikypelt: [{ kind: 'status_immunity', when: { terrain: ['electric'] } }],
  synchronize: [{ kind: 'reflect_status' }],
  static: [{ kind: 'contact_status', status: 'para', chance: 25, turns: 2 }],
  poisonpoint: [{ kind: 'contact_status', status: 'poison', chance: 25, turns: 3 }],
  flamebody: [{ kind: 'contact_status', status: 'burn', chance: 15, turns: 3 }],
  glacialbody: [{ kind: 'contact_status', status: 'freeze', chance: 5, turns: 3 }],
  strangecharm: [{ kind: 'contact_status', status: 'confuse', chance: 15, turns: 2 }],
  effectspore: [{ kind: 'contact_status', statuses: ['sleep', 'poison', 'para'], chance: 5 }],
  fullmetalbody: [{ kind: 'stat_drop_immunity' }, { kind: 'flinch_immunity' }],
  hypercutter: [{ kind: 'stat_drop_immunity', stats: ['atk'] }],
  bigpecks: [{ kind: 'stat_drop_immunity', stats: ['def'] }],
  contrary: [{ kind: 'invert_stat_changes' }],
  unaware: [{ kind: 'ignore_defense_mods' }],
  magicguard: [{ kind: 'no_indirect_damage' }],
  naturalcure: [{ kind: 'cure_on_switch' }],
  regenerator: [{ kind: 'entry_heal', fraction: 0.25 }],
  climatact: [{ kind: 'weather_duration', turns: 15 }],
  drizzle: [{ kind: 'entry_weather', weather: 'rain' }],
  drought: [{ kind: 'entry_weather', weather: 'sun' }],
  sandstream: [{ kind: 'entry_weather', weather: 'sand' }],
  snowwarning: [{ kind: 'entry_weather', weather: 'hail' }],
  somberfield: [{ kind: 'entry_weather', weather: 'somber' }],
  electricsurge: [{ kind: 'entry_terrain', terrain: 'electric' }],
  grassysurge: [{ kind: 'entry_terrain', terrain: 'grassy' }],
  mistysurge: [{ kind: 'entry_terrain', terrain: 'misty' }],
  moxie: [{ kind: 'on_ko_stat', stat: 'atk', mult: 1.5 }],
  strategist: [{ kind: 'on_ko_stat', stat: 'spa', mult: 1.5 }],
  beastboost: [{ kind: 'on_ko_stat', stat: 'best_attack', mult: 1.5 }],
  speedboost: [{ kind: 'on_ko_stat', stat: 'spe', mult: 1.5 }, { kind: 'turn_stat', stat: 'spe', mult: 1.15 }],
  chlorophyll: [{ kind: 'speed', mult: 1.35, when: { weather: ['sun'] } }],
  swiftswim: [{ kind: 'speed', mult: 1.5, when: { weather: ['rain'] } }],
  sandrush: [{ kind: 'speed', mult: 1.5, when: { weather: ['sand'] } }],
  slushrush: [{ kind: 'speed', mult: 1.5, when: { weather: ['hail'] } }],
  moltshed: [{ kind: 'speed', mult: 1.5, when: { weather: ['sun'] } }],
  intangible: [{ kind: 'speed', mult: 1.5, when: { weather: ['somber'] } }],
  faerush: [{ kind: 'speed', mult: 1.5, when: { terrain: ['misty'] } }],
  hyperconductor: [{ kind: 'speed', mult: 1.5, when: { terrain: ['electric'] } }],
  quickfeet: [{ kind: 'speed', mult: 1.5, when: { selfStatus: true } }],
  unburden: [{ kind: 'speed', mult: 1.5, when: { noHeldItem: true } }],
  galewings: [{ kind: 'move_speed', mult: 1.5, when: { moveTypes: ['flying', 'bug'] } }],
  prankster: [{ kind: 'move_speed', mult: 1.5, when: { moveTypes: ['ghost', 'dark'] } }],
  neuroforce: [{ kind: 'move_speed', mult: 1.5, when: { moveTypes: ['psychic', 'fairy'] } }],
  cacophony: [{ kind: 'move_speed', mult: 1.5, when: { moveTag: 'sound' } }],
  dancer: [{ kind: 'move_speed', mult: 1.5, when: { moveTag: 'dance' } }],
  windrider: [{ kind: 'move_speed', mult: 1.5, when: { moveTag: 'wind' } }],
  iaido: [{ kind: 'move_speed', mult: 1.5, when: { moveTag: 'sharp' } }],
  colorspore: [{ kind: 'status_duration', mult: 3 }],
  pickpocket: [{ kind: 'loot_weight', add: 1 }]
};

/**
 * @param {string} id - Talent id (lowercase)
 * @returns {Object[]|null} Effects, or null when the talent is not ported
 */
export function talentEffects(id) {
  const effects = [];
  if (TYPES_BY_GUARD[id]) effects.push({ kind: 'damage_taken', mult: 0.5, when: { moveTypes: [TYPES_BY_GUARD[id]] } });
  if (ABSORB_TYPES[id]) effects.push({ kind: 'type_immunity', moveType: ABSORB_TYPES[id], healFraction: 0.25 });
  if (FLASH_TYPES[id]) effects.push({ kind: 'type_immunity', moveType: FLASH_TYPES[id], boost: { stat: 'spe', mult: 1.5 } });
  if (LOW_HP_TYPES[id]) effects.push({ kind: 'power', mult: 1.35, when: { moveTypes: [LOW_HP_TYPES[id]], selfHpBelow: 0.35 } });
  if (ATE_TYPES[id]) effects.push({ kind: 'move_type_change', from: 'normal', to: ATE_TYPES[id], powerMult: 1.3 });
  if (SPECIFIC[id]) effects.push(...SPECIFIC[id]);
  return effects.length ? effects : null;
}
