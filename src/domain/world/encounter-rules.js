/**
 * PokeWorld Domain — Encounter Rules
 *
 * Pure business rules for wild encounter rates, roaming legends, and route drops.
 * Zero DOM access. The `world:encounter` ECS system
 * (src/application/ecs-gameplay-systems.js) consumes these rules — the retired
 * classic picker (formerly in the display layer) was deleted once this module
 * reached strict behavioral parity.
 *
 * @module domain/world/encounter-rules
 */

/**
 * Calculate effective wild encounter interval in milliseconds based on route rate.
 * @param {number} baseIntervalMs - Base interval between encounters
 * @param {number} [repelMultiplier=1] - Multiplier from Repel or Lure items
 * @returns {number}
 */
export function calculateEncounterInterval(baseIntervalMs = 2000, repelMultiplier = 1) {
  const base = Math.max(200, Number(baseIntervalMs) || 2000);
  const mult = Math.max(0.1, Number(repelMultiplier) || 1);
  return Math.round(base * mult);
}

/**
 * Calculate whether has roaming legendary encounter triggers on a route.
 * @param {number} [baseChance=0.005] - Base probability roll per encounter (0.5%)
 * @param {number} [lureBonus=1] - Lure item probability multiplier
 * @returns {boolean}
 */
export function rollRoamingLegendary(baseChance = 0.005, lureBonus = 1) {
  const prob = Math.min(1, Math.max(0, baseChance * Math.max(0.1, lureBonus)));
  return Math.random() < prob;
}

/**
 * Calculate whether a route drop item is awarded after defeating a wild Pokemon.
 * @param {number} [dropChance=0.15] - Base drop probability
 * @returns {boolean}
 */
export function rollRouteDrop(dropChance = 0.15) {
  const prob = Math.min(1, Math.max(0, Number(dropChance) || 0.15));
  return Math.random() < prob;
}

// ─── Wild encounter table resolution (parity with the retired classic picker) ───

export const ROAMING_CHANCE = 0.003; // 0.3% per spawn when a roaming legendary is on the route
export const ROAMING_LEVEL = 75;
export const BUCKET_ODDS = { rare: 0.04, uncommon: 0.2 }; // remainder = common

function defaultInt(minIncl, maxIncl, rng) {
  const lo = Math.min(minIncl, maxIncl);
  const hi = Math.max(minIncl, maxIncl);
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/**
 * Resolve one wild spawn from a route spawn table.
 *
 * Strictly reproduces the historical rule (formerly `pickWildEncounter` in the
 * display layer):
 *   1. When a roaming legendary is present on the route, a 0.3% roll may force
 *      it at level 45 (wild shiny still rolled at capture time, not here).
 *   2. Otherwise a rarity bucket is rolled: 4% rare / 20% uncommon / 76% common.
 *   3. Empty bucket falls back to `common`, then to the whole table.
 *   4. The entry and its level [minLv, maxLv] are rolled uniformly.
 *
 * The caller owns RNG injection (`rng` defaults to Math.random) so offline
 * fast-forward suites replay deterministic streams.
 *
 * @param {Array<Array>} wildEntries - Route spawn table rows [speciesId, minLv, maxLv, bucket?]
 * @param {Object} [opts]
 * @param {number} [opts.roamingId=0] - Roaming legendary species id on this route (0 = none)
 * @param {Function} [opts.rng=Math.random] - Deterministic RNG source (tests/offline)
 * @returns {{speciesId:number, level:number, bucket:string, isRoaming:boolean}|null}
 */
export function pickWildFromTable(wildEntries, opts = {}) {
  const roamingId = Number(opts.roamingId) || 0;
  const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;
  const wild = Array.isArray(wildEntries) ? wildEntries : [];

  if (roamingId && rng() < ROAMING_CHANCE) {
    return { speciesId: roamingId, level: ROAMING_LEVEL, bucket: 'roaming', isRoaming: true };
  }
  if (!wild.length) return null;

  const r = rng();
  const targetBucket = r < BUCKET_ODDS.rare ? 'rare' : (r < BUCKET_ODDS.rare + BUCKET_ODDS.uncommon ? 'uncommon' : 'common');
  let bucketEntries = wild.filter((w) => (w[3] || 'common') === targetBucket);
  if (!bucketEntries.length) {
    bucketEntries = wild.filter((w) => (w[3] || 'common') === 'common');
    if (!bucketEntries.length) bucketEntries = wild;
  }
  const entry = bucketEntries[defaultInt(0, bucketEntries.length - 1, rng)];
  return {
    speciesId: Number(entry[0]),
    level: defaultInt(Number(entry[1]), Number(entry[2]), rng),
    bucket: targetBucket,
    isRoaming: false,
  };
}
