/**
 * @file HeldEffectKinds.js
 * @brief Vocabulary of the held item effects of data/raw/items-data.js (C++: enum class HeldEffectKind).
 * Documented in docs/BATTLE_EFFECTS.md. The power of a stacked held item at stack level L is
 * `power.base + power.perLevel * L` (original held-item stacking).
 */
export const HeldEffectKinds = Object.freeze({
  CURE_ALL: 'cure_all',
  DEFENSE: 'defense',
  RESISTANCE_BERRY: 'resistance_berry',
  TYPE_BOOST: 'type_boost',
  GEM: 'gem',
  Z_CRYSTAL: 'z_crystal',
  CHOICE: 'choice',
  PROTECT: 'protect',
  WEATHER: 'weather',
  EJECT: 'eject',
  SEED: 'seed',
  EVIOLITE: 'eviolite',
  STATUS: 'status',
  HAZARDS: 'hazards',
  SLOW: 'slow',
  LEFTOVERS: 'leftovers',
  LIFE_ORB: 'life_orb',
  EXTEND: 'extend',
  MULTI_HIT: 'multi_hit',
  LOOT: 'loot',
  EXP: 'exp',
  PUNCH: 'punch',
  CURE: 'cure',
  CONSECUTIVE: 'consecutive',
  CHARGE: 'charge',
  ENCOUNTER: 'encounter',
  SPEED: 'speed',
  TERRAIN: 'terrain',
  BOOST: 'boost',
  IMMUNITY_BERRY: 'immunity_berry',
  SKIP_CD: 'skip_cd',
  PINCH_HEAL: 'pinch_heal',
  PINCH_STAT: 'pinch_stat',
  PINCH_DMG: 'pinch_dmg',
  PINCH_RANDOM: 'pinch_random',
  ENTRY_DEBUFF: 'entry_debuff',
  PINCH_FAST: 'pinch_fast',
  PINCH_FIRST: 'pinch_first',
  COUNTER_PHYS: 'counter_phys',
  COUNTER_SPEC: 'counter_spec',
  HIT_BUFF: 'hit_buff',
  SUPER_HEAL: 'super_heal',
  ICE_BOOST: 'ice_boost',
  LOOT_BOOST: 'loot_boost',
  FLAVOR: 'flavor',
  MEGA_STONE: 'mega_stone',
  BREEDING: 'breeding',
  TRAINING: 'training'
});

/**
 * Berry effects with a power formula. NPC berries use a fixed level instead of the canonical
 * NPC multipliers (original berryLevel: NPC = level 3, i.e. 10 copies).
 */
export const BERRY_EFFECT_KINDS = Object.freeze(new Set([
  HeldEffectKinds.SKIP_CD,
  HeldEffectKinds.PINCH_HEAL,
  HeldEffectKinds.PINCH_STAT,
  HeldEffectKinds.PINCH_DMG,
  HeldEffectKinds.PINCH_RANDOM,
  HeldEffectKinds.ENTRY_DEBUFF,
  HeldEffectKinds.HIT_BUFF,
  HeldEffectKinds.SUPER_HEAL,
  HeldEffectKinds.ICE_BOOST
]));
