/**
 * @file LegacyLocationAccessMigration.js
 * @brief Reconstruct persisted map-access facts from legacy save shapes.
 *
 * The optional badge backfill mirrors only the original game's save-loader compatibility repair.
 * It is not applied to older Rework saves, whose own migrations require explicit map/feature proof.
 */

const FIRST_BADGE_LOCATIONS = Object.freeze([
  'pallet', 'route1', 'viridian', 'route2', 'viridianforest', 'pewter', 'route3', 'route22'
]);

const BADGE_LOCATION_UNLOCKS = Object.freeze({
  misty: Object.freeze(['mtmoon', 'route4', 'cerulean', 'route5']),
  surge: Object.freeze(['route6', 'vermilion']),
  koga: Object.freeze(['fuchsia'])
});

/** @param {*} value @param {{includeAllObjectKeys?:boolean}} [options] @returns {string[]} */
function readIds(value, { includeAllObjectKeys = false } = {}) {
  if (Array.isArray(value)) return value.filter((id) => typeof id === 'string' && id.length > 0);
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value)
    .filter(([, enabled]) => includeAllObjectKeys || !!enabled)
    .map(([id]) => id)
    .filter((id) => id.length > 0);
}

/**
 * Collects already-persisted unlock evidence. Top-level aliases cover early Rework saves; nested
 * access data covers later saves. `visitedMaps` is treated as a set of visited ids, matching main's
 * load repair (which restored every key in that map).
 *
 * @param {*} raw - Original `{G: ...}` payload or an early Rework save.
 * @param {{mainBadgeBackfill?:boolean}} [options]
 * @returns {string[]}
 */
export function collectLegacyLocationUnlocks(raw, { mainBadgeBackfill = false } = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const access = source.access && typeof source.access === 'object' ? source.access : {};
  const unlocked = new Set();

  for (const collection of [
    source.unlockedLocations,
    source.unlockedLocs,
    access.unlockedLocations,
    access.locations,
    access.unlockedLocs
  ]) {
    for (const id of readIds(collection)) unlocked.add(id);
  }

  for (const visited of [source.visitedMaps, access.visitedMaps]) {
    for (const id of readIds(visited, { includeAllObjectKeys: true })) unlocked.add(id);
  }

  for (const locationId of [source.player?.location, source.location]) {
    if (typeof locationId === 'string' && locationId.length > 0) unlocked.add(locationId);
  }

  if (mainBadgeBackfill) {
    const badges = readIds(source.badges ?? source.player?.badges);
    // The original save loader restored this first segment after any Gym badge.
    if (badges.length > 0) for (const id of FIRST_BADGE_LOCATIONS) unlocked.add(id);
    for (const [badgeId, locations] of Object.entries(BADGE_LOCATION_UNLOCKS)) {
      if (badges.includes(badgeId)) for (const id of locations) unlocked.add(id);
    }
  }

  return [...unlocked];
}
