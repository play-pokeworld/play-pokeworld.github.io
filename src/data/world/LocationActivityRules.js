/** @file LocationActivityRules.js @brief Pure selection of the single exploration action offered by a location. */
import { LocationKinds } from './LocationKinds.js';
import { LocationActivityKinds } from '../../config/LocationActivityKinds.js';
export class LocationActivityRules {
  /** @param {Object|null} location @param {number} encounterCount @param {boolean} [hasRoamingEncounter=false] @returns {string|null} */
  static forLocation(location, encounterCount, hasRoamingEncounter = false) {
    if (!location) return null;
    if (location.kind === LocationKinds.DUNGEON)
      return LocationActivityKinds.DUNGEON;
    if (
      location.kind !== LocationKinds.TOWN &&
      (encounterCount > 0 || hasRoamingEncounter)
    )
      return LocationActivityKinds.WILD;
    return null;
  }
}
