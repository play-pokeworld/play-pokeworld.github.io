/**
 * @file StatusConditions.js
 * @brief Status conditions of the battle engine (C++: enum class StatusCondition). Values are
 * the ids used by the data tables (move / talent / held item effects).
 */
export const StatusConditions = Object.freeze({
  BURN: 'burn',
  FREEZE: 'freeze',
  PARALYSIS: 'para',
  POISON: 'poison',
  BAD_POISON: 'badpoison',
  SLEEP: 'sleep',
  CONFUSION: 'confuse'
});

/**
 * Types that can never receive a status (original applySecondary type checks).
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const STATUS_IMMUNE_TYPES = Object.freeze({
  burn: Object.freeze(['fire']),
  para: Object.freeze(['electric', 'ground']),
  poison: Object.freeze(['poison', 'steel']),
  badpoison: Object.freeze(['poison', 'steel']),
  freeze: Object.freeze(['ice'])
});
