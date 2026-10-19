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
  /** Damage of the player's lead: random in [min, min + spread). */
  PLAYER_DAMAGE_MIN: 3,
  PLAYER_DAMAGE_SPREAD: 4,
  /** Damage of the wild Pokémon: random in [min, min + spread). */
  FOE_DAMAGE_MIN: 2,
  FOE_DAMAGE_SPREAD: 4,
  /** Rewards: base + level * perLevel. */
  EXP_BASE: 25,
  EXP_PER_LEVEL: 5,
  MONEY_BASE: 20,
  MONEY_PER_LEVEL: 4,
  /** Wild HP: base species HP * level / divisor + level + flat. */
  WILD_HP_DIVISOR: 50,
  WILD_HP_FLAT: 10,
  /** Default move used by both sides until the move system is ported. */
  DEFAULT_MOVE_ID: 'tackle',
  /** Type of the default move. */
  DEFAULT_MOVE_TYPE: 'normal',
  /** Number of move slots shown on a Pokémon card. */
  MOVE_SLOTS: 4,
  /** Encounter weights by rarity tag of the location tables. */
  RARITY_WEIGHTS: Object.freeze({ common: 60, uncommon: 30, rare: 10, very_rare: 3 })
});
