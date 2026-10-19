/**
 * @file MigrationV3ToV4.js
 * @brief Save migration 3 -> 4 (v1.4 -> v1.5 Poké Ball system) (C++: struct MigrationV3ToV4 : SaveMigration).
 *  - `ballFilters`: the filters carried from an original export (customName -> name), otherwise
 *    absent (BallFiltersData then starts from the presets);
 *  - Poké Balls stay inventory items: the counts carried from an original export are added to
 *    the inventory; a rework save without any ball gets the starting balls (no v1.4 save could
 *    obtain one, so without them it could never catch anything);
 *  - `box`: carried from an original export, empty otherwise;
 *  - the temporary `pokeballs` field is dropped.
 */
import { ItemDB } from '../../items/ItemDB.js';
import { BallRules } from '../../../config/BallRules.js';

/**
 * @param {Object[]|null|undefined} filters - Original G.pokeballs.filters
 * @returns {Object[]|undefined} Schema 4 filters, undefined = presets
 */
function convertFilters(filters) {
  if (!Array.isArray(filters)) return undefined;
  return filters
    .filter((filter) => filter && typeof filter === 'object' && filter.id)
    .map((filter) => ({
      id: String(filter.id),
      name: filter.customName || null,
      options: { ...(filter.options || {}) },
      ball: filter.ball || BallRules.NO_BALL,
      enabled: filter.enabled !== false
    }));
}

/**
 * @param {Object} inventory
 * @returns {boolean}
 */
function holdsBalls(inventory) {
  return ItemDB.getInstance().getBalls().some((ball) => Number(inventory[ball.id]) > 0);
}

export const MigrationV3ToV4 = Object.freeze({
  from: 3,
  to: 4,
  /**
   * @param {Object} raw
   * @returns {Object}
   */
  migrate(raw) {
    const { pokeballs, ...rest } = raw;
    const inventory = { ...(raw.inventory || {}) };
    if (pokeballs) {
      for (const [ballId, count] of Object.entries(pokeballs.counts || {})) {
        inventory[ballId] = (Number(inventory[ballId]) || 0) + count;
      }
    } else if (!holdsBalls(inventory)) {
      Object.assign(inventory, BallRules.STARTING_BALLS);
    }
    const migrated = { ...rest, version: 4, box: Array.isArray(raw.box) ? raw.box : [], inventory };
    const ballFilters = convertFilters(pokeballs?.filters);
    if (ballFilters) migrated.ballFilters = ballFilters;
    return migrated;
  }
});
