/**
 * @file Regions.js
 * @brief Playable regions (C++ equivalent: static const RegionDef REGIONS[]).
 */

/**
 * @typedef {Object} RegionDefinition
 * @property {string} id         - Region id (map file stem, LocationDB key)
 * @property {string} labelKey   - Localization key of the display name
 * @property {boolean} available - False for regions announced but not playable yet
 */

/** @type {ReadonlyArray<RegionDefinition>} */
export const REGIONS = Object.freeze([
  Object.freeze({ id: 'kanto', labelKey: 'map_region_kanto', available: true }),
  Object.freeze({ id: 'johto', labelKey: 'map_region_johto', available: true }),
  Object.freeze({ id: 'hoenn', labelKey: 'map_region_hoenn', available: true }),
  Object.freeze({ id: 'sinnoh', labelKey: 'map_region_sinnoh', available: false })
]);

/** Size of the map canvas every location coordinate refers to. */
export const MAP_CANVAS = Object.freeze({ width: 1600, height: 960 });
