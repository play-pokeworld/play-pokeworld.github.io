/**
 * @file BattleConfig.js
 * @brief Tuning constants of the automatic wild battles (C++ equivalent: namespace BattleConfig).
 */

export const BattleConfig = Object.freeze({
  /**
   * Attack cooldown of each side, as in the original (calcAttackCd):
   * BASE * 100 / (100 + min(speed, SPEED_CAP)), clamped to [MIN, MAX] (milliseconds).
   */
  ATTACK_COOLDOWN_BASE_MS: 1900,
  ATTACK_COOLDOWN_MIN_MS: 500,
  ATTACK_COOLDOWN_MAX_MS: 2600,
  ATTACK_SPEED_CAP: 180,
  /** Pause after the battle start before the first attacks (seconds). */
  START_DELAY_S: 0.8,
  /** Pause before a trainer's next Pokémon acts (original champion switch: 500 + 1000 ms). */
  FOE_SWITCH_DELAY_S: 1.5,
  /** Number of move slots shown on a Pokémon card. */
  MOVE_SLOTS: 4,
  /** Chips kept in the battle timeline (oldest removed first). */
  TIMELINE_MAX_CHIPS: 8,
  /** Encounter weights by rarity tag of the location tables. */
  RARITY_WEIGHTS: Object.freeze({ common: 60, uncommon: 30, rare: 10, very_rare: 3 })
});
