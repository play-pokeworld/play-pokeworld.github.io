/**
 * @file BattleRules.js
 * @brief Numeric rules of the battle engine, ported from the original combat code
 * (battle-attack.js, battle-status.js, stat-mods.js, battle-init.js, progression.js, catch.js,
 * currency.js). C++: namespace BattleRules. Pacing constants (cooldown bounds, start delay…)
 * live in BattleConfig.
 */
export const BattleRules = Object.freeze({
  /** Stat modifiers are multipliers clamped to [MIN, MAX]; a change lasts TURNS turns. */
  STAT_MOD_MIN: 0.25,
  STAT_MOD_MAX: 3,
  STAT_MOD_TURNS: 3,
  /** Random damage factor in percent: rand(MIN, 100) / 100. */
  DAMAGE_RANDOM_MIN: 85,
  STAB: 1.5,
  /** Temporary added type (Soak, Forest's Curse…): super effective ×1.25, resisted ×0.75. */
  ADDED_TYPE_WEAK: 1.25,
  ADDED_TYPE_RESIST: 0.75,
  /** Reflect / Light Screen halve physical / special damage. */
  SCREEN_MULT: 0.5,
  /** Weather damage multipliers by move type; sand gives Rock types ×1.5 special defense. */
  WEATHER_TYPE_MULT: Object.freeze({
    rain: Object.freeze({ water: 1.5, fire: 0.5 }),
    sun: Object.freeze({ fire: 1.5, water: 0.5 })
  }),
  SAND_ROCK_DEFENSE: 1.5,
  /** Camouflage (weather_type): user type by weather, `default` otherwise. */
  CAMOUFLAGE_TYPES: Object.freeze({ rain: 'water', sun: 'fire', sand: 'ground', hail: 'ice', default: 'normal' }),
  /** Accuracy: each accuracy_down stack removes STEP points, never below FLOOR. */
  ACCURACY_DOWN_STEP: 30,
  ACCURACY_FLOOR: 50,
  /** Held items with fixed values. */
  EVIOLITE_DEFENSE_BONUS: 0.5,
  SEED_DEFENSE: 1.5,
  GEM_MULT: 1.3,
  ASSAULT_VEST_MULT: 0.9,
  METRONOME_STEP: 0.2,
  METRONOME_MAX_STACKS: 5,
  LIFE_ORB_RECOIL: 1 / 10,
  COUNTER_BERRY_DAMAGE: 0.12,
  ENTRY_DEBUFF_MULT: 0.85,
  /** Cooldown of a Custap (pinch_first) / Leppa (skip_cd) turn, Micle (pinch_fast) divisor. */
  INSTANT_COOLDOWN_MS: 100,
  PINCH_FAST_DIVISOR: 2,
  /** Cross Room adds this to the cross_power bonus. */
  CROSS_ROOM_ADD: 0.3,
  /** Training battles: damage dealt by the foe ×0.25. */
  TRAINING_FOE_DAMAGE: 0.25,
  /** Default weather / terrain duration and the duration with the matching held item. */
  FIELD_TURNS: 5,
  FIELD_EXTENDED_TURNS: 8,
  /** Status durations in turns (sleep is random in [min, max]; badpoison counts up and never ends). */
  STATUS_TURNS: Object.freeze({ sleep: Object.freeze([1, 3]), para: 2, badpoison: 0, default: 3 }),
  /** Status orbs (flame_orb / toxic_orb) durations. */
  ORB_STATUS_TURNS: Object.freeze({ burn: 3, poison: 5 }),
  /** Chances in percent. */
  PARA_SKIP_CHANCE: 25,
  FREEZE_THAW_CHANCE: 20,
  CONFUSE_SKIP_CHANCE: 50,
  /** End of turn damage as a fraction of max HP. */
  BURN_DAMAGE: 1 / 16,
  POISON_DAMAGE: 1 / 8,
  BAD_POISON_STEP: 1 / 16,
  LEFTOVERS_HEAL: 1 / 16,
  /** Pinch berries trigger below this HP ratio. */
  PINCH_HP_RATIO: 0.25,
  /** Type immunity talents with healing (Water Absorb…) heal this fraction of max HP. */
  ABSORB_HEAL: 0.25,
  /** Resistance berries cut super effective damage by this percent when the item has none. */
  RESIST_BERRY_PERCENT: 30,
  /** Accuracy and evasion stages read as multipliers; a move with accuracy 0 never misses. */
  /** Experience: base = xpYield * foeLevel / 7, shared at 70 %, lucky egg ×1.5. */
  EXP_YIELD_DIVISOR: 7,
  EXP_SHARE: 0.7,
  EXP_LEVEL_GAP_CAP: 10,
  EXP_UNDERDOG_BONUS: 0.15,
  /** Lucky Egg (exp held item): fixed ×1.5, as in the original gainXP. */
  LUCKY_EGG_MULT: 1.5,
  /** Money per wild win: max(10, round(3d + 5d^1.15)), d = region index * 9 + badgesRequired + 1. */
  MONEY_MIN: 10,
  MONEY_LINEAR: 3,
  MONEY_POWER_FACTOR: 5,
  MONEY_EXPONENT: 1.15,
  MONEY_REGION_STEP: 9,
  MONEY_MAX_BADGES: 8,
  /** Original route-drop chance; active team loot talents add their declared bonus. */
  WILD_DROP_BASE_CHANCE_PCT: 1,
  WILD_DROP_MAX_CHANCE_PCT: 10,
  WILD_DROP_HELD_ITEM_BONUS_PCT: 1,
  /** Catch: ball rate in percent (default when the ball has none); 100+ always succeeds. */
  DEFAULT_BALL_RATE: 10,
  GUARANTEED_CATCH_RATE: 100,
  /** Wild shiny probability (original SHINY_BASE_RATE). */
  SHINY_BASE_RATE: 1 / 4096,
  /** Team talents multiplying the shiny rate (original getTeamShinyRateMultiplier). */
  SHINY_TALENT_MULTS: Object.freeze({ goodasgold: 1.15, superluck: 1.15, serenegrace: 1.1 }),
  /** Held item power level from the owned quantity of that item (original heldPowerLevel). */
  HELD_POWER_LEVELS: Object.freeze([[25, 6], [20, 5], [15, 4], [10, 3], [5, 2]]),
  /** Power level of NPC / wild berries (original berryLevel). */
  NPC_BERRY_LEVEL: 3,
  /** Canonical held item power of NPC / wild Pokémon (never scaled by the player's inventory). */
  NPC_HELD_POWER: Object.freeze({ choice: 1.5, life_orb: 1.3, type_boost: 1.3, extend: 1.06, hazards: 1.15, speed: 1.15 })
});
