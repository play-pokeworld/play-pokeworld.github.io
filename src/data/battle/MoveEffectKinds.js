/**
 * @file MoveEffectKinds.js
 * @brief Vocabulary of the declarative move effects of data/raw/moves-data.js (C++: enum class MoveEffectKind).
 * Every kind is documented in docs/BATTLE_EFFECTS.md, with its parameters and the original rule.
 * The battle engine maps each kind to one handler; MoveDB.validate() rejects unknown kinds.
 */
export const MoveEffectKinds = Object.freeze({
  STATUS: 'status',
  STAT: 'stat',
  FLINCH: 'flinch',
  ACCURACY_DOWN: 'accuracy_down',
  RECOIL: 'recoil',
  RECOIL_MAX_HP: 'recoil_max_hp',
  DRAIN: 'drain',
  CONSECUTIVE_POWER: 'consecutive_power',
  CONDITIONAL_POWER: 'conditional_power',
  EFFECTIVENESS_AGAINST: 'effectiveness_against',
  RANDOM_POWER: 'random_power',
  SWITCH_OUT: 'switch_out',
  WEATHER: 'weather',
  TERRAIN: 'terrain',
  ADD_TYPE: 'add_type',
  SELF_FAINT: 'self_faint',
  RANDOM_STATS: 'random_stats',
  CURE: 'cure',
  WEATHER_TYPE: 'weather_type',
  COPY_FIRST_MOVE_TYPE: 'copy_first_move_type',
  CALL_RANDOM_MOVE: 'call_random_move',
  USE_FOE_FIRST_MOVE: 'use_foe_first_move',
  USE_OWN_FIRST_MOVE: 'use_own_first_move',
  BATTLE_BONUS: 'battle_bonus',
  FIXED_POWER_HIT: 'fixed_power_hit',
  TRANSFORM: 'transform',
  IGNORE_TYPE_IMMUNITY: 'ignore_type_immunity',
  IGNORE_STAT_MODS: 'ignore_stat_mods'
});
