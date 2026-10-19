/**
 * @file ObjectiveTypes.js
 * @brief Objective types of data/raw/quests-data.js (C++: enum class ObjectiveType).
 * One class per type in data/quests/objectives/ (registered in ObjectiveRegistry.js).
 */
export const ObjectiveTypes = Object.freeze({
  TALK: 'talk',
  KILL: 'kill',
  CATCH: 'catch',
  BOSS: 'boss',
  BADGE: 'badge',
  ITEM: 'item',
  MINE_DIG: 'mine_dig',
  MINE_SELL: 'mine_sell',
  HATCH: 'hatch',
  HATCHERY_LEVEL: 'hatchery_level',
  TRAINING: 'training',
  FOSSIL: 'fossil',
  PUZZLE: 'puzzle',
  BASE_VISIT: 'base_visit',
  BASE_ESTABLISH: 'base_establish',
  REGION_WINS: 'region_wins',
  DEX_REGION: 'dex_region',
  OWN_SPECIES: 'own_species'
});
