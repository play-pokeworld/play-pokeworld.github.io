/**
 * @file TalentEffectKinds.js
 * @brief Vocabulary of the declarative talent effects of data/raw/talents-data.js (C++: enum class TalentEffectKind).
 * Every kind is documented in docs/BATTLE_EFFECTS.md, with its parameters and the original rule.
 * The battle engine maps each kind to one handler; TalentDB.validate() rejects unknown kinds.
 */
export const TalentEffectKinds = Object.freeze({
  ATTACK_STAT: 'attack_stat',
  CONTACT_STATUS: 'contact_status',
  CROSS_POWER: 'cross_power',
  CURE_ON_SWITCH: 'cure_on_switch',
  DAMAGE: 'damage',
  DAMAGE_PER_FAINTED_ALLY: 'damage_per_fainted_ally',
  DAMAGE_TAKEN: 'damage_taken',
  DEFENSE_STAT: 'defense_stat',
  ENTRY_FOE_STAT: 'entry_foe_stat',
  ENTRY_TERRAIN: 'entry_terrain',
  ENTRY_WEATHER: 'entry_weather',
  EVASION: 'evasion',
  FLINCH_IMMUNITY: 'flinch_immunity',
  FOE_ATTACK_STAT: 'foe_attack_stat',
  IGNORE_DEFENSE_MODS: 'ignore_defense_mods',
  IGNORE_TYPE_IMMUNITY: 'ignore_type_immunity',
  INVERT_STAT_CHANGES: 'invert_stat_changes',
  LOOT_WEIGHT: 'loot_weight',
  MAX_HITS: 'max_hits',
  MOVE_SPEED: 'move_speed',
  MOVE_TYPE_CHANGE: 'move_type_change',
  NEVER_MISS: 'never_miss',
  NO_INDIRECT_DAMAGE: 'no_indirect_damage',
  NO_SECONDARY_EFFECTS: 'no_secondary_effects',
  ON_KO_STAT: 'on_ko_stat',
  ON_SUPER_EFFECTIVE_HIT: 'on_super_effective_hit',
  POWER: 'power',
  REFLECT_STATUS: 'reflect_status',
  RESISTED_DAMAGE: 'resisted_damage',
  SECONDARY_CHANCE: 'secondary_chance',
  SPEED: 'speed',
  STAB: 'stab',
  STAB_MINIMUM: 'stab_minimum',
  STAT_DROP_IMMUNITY: 'stat_drop_immunity',
  STATUS_DURATION: 'status_duration',
  STATUS_DAMAGE: 'status_damage',
  STATUS_IMMUNITY: 'status_immunity',
  STATUS_RESIST_CHANCE: 'status_resist_chance',
  TURN_STAT: 'turn_stat',
  TYPE_IMMUNITY: 'type_immunity',
  WEATHER_DURATION: 'weather_duration'
});
