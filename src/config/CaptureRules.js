/**
 * @file CaptureRules.js
 * @brief What a successful catch gives, ported from the original catch.js and game-config.js
 * GAME.CAPTURE (C++: namespace CaptureRules).
 */
export const CaptureRules = Object.freeze({
  /** A caught Pokémon starts at level 1 (original createPoke(id, 1, …)). */
  CAUGHT_LEVEL: 1,
  /** Luxury Ball: level of the caught Pokémon (game design decision, v1.6). */
  LUXURY_CAUGHT_LEVEL: 5,
  /** Chance (percent) of +1 IV on the caught Pokémon, or on the owned one for a duplicate. */
  IV_CHANCE_PCT: 10,
  /** Talent of a caught Pokémon: weight of every talent of the species pool by rarity. */
  TALENT_WEIGHT_BY_RARITY: Object.freeze({ 1: 60, 2: 30 }),
  TALENT_WEIGHT_OTHER: 12,
  /**
   * Dungeon tokens per catch, duplicates included (original tokensPerCatch, PokéClicker
   * routeDungeonTokens): max(MIN, round(BASE × (RANK_FACTOR × rank / (DIVISOR / (1 + region / REGION_DIVISOR)))^EXPONENT)).
   */
  TOKENS_BASE: 6,
  TOKENS_RANK_FACTOR: 2,
  TOKENS_DIVISOR: 2.8,
  TOKENS_REGION_DIVISOR: 3,
  TOKENS_EXPONENT: 1.08,
  TOKENS_MIN: 1
});
