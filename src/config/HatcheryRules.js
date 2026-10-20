/**
 * @file HatcheryRules.js
 * @brief Daycare and fossil incubation rules.
 */
export const HatcheryRules = Object.freeze({
  DEFAULT_SLOT_COUNT: 1,
  MAX_SLOT_COUNT: 4,
  SLOT_UPGRADE_COSTS: Object.freeze([500, 1000, 2500]),
  DAYCARE_KOS_PER_LEVEL: 10,
  MIN_FOSSIL_KOS: 25,
  MAX_FOSSIL_KOS: 100,
  LOCATION_ID: 'route5',
  BST_BANDS: Object.freeze([
    Object.freeze({ maximum: 250, kos: 25 }),
    Object.freeze({ maximum: 330, kos: 35 }),
    Object.freeze({ maximum: 420, kos: 50 }),
    Object.freeze({ maximum: 520, kos: 70 }),
    Object.freeze({ maximum: 600, kos: 85 })
  ])
});
