/**
 * @file BattleSnapshotRules.js
 * @brief Explicit versioned DTO vocabulary; no callbacks, caches or owned Pokémon copies.
 */
export const BattleSnapshotRules = Object.freeze({
  VERSION: 1,
  MAX_TEAM_SIZE: 6,
  MAX_FOES: 128,
  MAX_RECORDS: 10000,
  MAX_NUMBER: 1e12,
  MAX_HP_MULTIPLIER: 10000,
  MAX_JSON_DEPTH: 12,
  FIELD_FIELDS: Object.freeze(['defaultWeather', 'weather', 'weatherTurns', 'terrain', 'terrainTurns']),
  COMBATANT_FIELDS: Object.freeze([
    'side', 'npc', 'hiddenTalentActive', 'heldQuantity', 'hpMultiplier', 'dungeonBoss',
    'dungeonEnraged', 'legendaryBoss', '_baseStatMultipliers', 'statMods', 'statModTurns', 'status', 'statusTurns',
    'accuracyPenalty', 'lastCrossType', 'seedBoost', 'flinched', 'moveIndex', 'lastMoveId',
    'consecutiveUses', 'addedType', 'typeOverride', 'nextDamageMult'
  ]),
  SESSION_FIELDS: Object.freeze([
    'training', 'healBetweenFoes', 'playerKOs', 'activeIndex', 'outcome',
    'playerCooldownMs', 'foeCooldownMs', 'playerCooldownTotalMs', 'foeCooldownTotalMs',
    '_pendingFoeAdvance', 'foeTurns', 'playerAttacks'
  ])
});
