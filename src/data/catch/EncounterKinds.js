/**
 * @file EncounterKinds.js
 * @brief Kinds of wild encounter a Poké Ball filter can target (C++: enum class EncounterKind),
 * original ENCOUNTER_TYPES. Label key: `ball_enc_<value>`.
 */
export const EncounterKinds = Object.freeze({
  ROUTE: 'route',
  DUNGEON: 'dungeon',
  /** Reserved by the original (no dungeon boss encounter exists yet). */
  DUNGEON_BOSS: 'dungeon_boss',
  ROAMING: 'roaming'
});
