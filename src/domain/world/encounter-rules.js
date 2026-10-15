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

// V7 · P1a · ROAM-01 (D3, D18): 1 % per spawn when a roaming legendary is on
// the route (expected 100 spawns per sighting — the UI label said « 1 % »
// while the code rolled 0.3 %), level 75 fixed. The two constants are also
// exposed on the classic surface so the location panel reads THEM (TXT-01:
// no hard-coded « 1% » / « Nv.45 » in the UI).
export const ROAMING_CHANCE = 0.01;
export const ROAMING_LEVEL = 75;
if (typeof globalThis !== 'undefined') {
  globalThis.ROAMING_CHANCE = ROAMING_CHANCE;
  globalThis.ROAMING_LEVEL = ROAMING_LEVEL;
}
export const BUCKET_ODDS = { rare: 0.04, uncommon: 0.2 }; // remainder = common
// V7 · TXT-01 — exposed so the location panel labels (« ~4 % ») read the rule.
if (typeof globalThis !== 'undefined') globalThis.BUCKET_ODDS = BUCKET_ODDS;

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
 * @param {number} [opts.rareBoostPct=0] - % d'augmentation du poids du seau « rare » (Encens Pur, PokeChill)
 * @param {string} [opts.bucketHint=null] - PASSE 38f : force le seau ('common' |
 *   'uncommon' | 'rare'). Utilisé par les donjons : les cases combats = seau
 *   commun, les cases élites = seau peu commun, le boss = seau rare (retour
 *   joueur : « les rares de la zone doivent être les boss, les peu communs
 *   les combats corsés, les autres les communs »). Un seau forcé désactive le
 *   tirage roaming (jamais de légendaire errant dans un donjon).
 * @param {Function} [opts.rng=Math.random] - Deterministic RNG source (tests/offline)
 * @returns {{speciesId:number, level:number, bucket:string, isRoaming:boolean}|null}
 */
export function pickWildFromTable(wildEntries, opts = {}) {
  const roamingId = Number(opts.roamingId) || 0;
  const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;
  const wild = Array.isArray(wildEntries) ? wildEntries : [];
  const rareBoostPct = Math.max(0, Math.min(100, Number(opts.rareBoostPct) || 0));
  const bucketHint =
    opts.bucketHint === 'rare' || opts.bucketHint === 'uncommon' || opts.bucketHint === 'common'
      ? opts.bucketHint
      : null;

  // The roaming roll is ALWAYS drawn on a free spawn (even with no roamer on
  // the route) so two sessions sharing one RNG stay in lockstep whether or
  // not a roamer is present — the offline fast-forward (roamingId forced to
  // 0, ROAM-01) must replay exactly the live chain.
  if (!bucketHint) {
    const roamRoll = rng();
    if (roamingId && roamRoll < ROAMING_CHANCE) {
      return { speciesId: roamingId, level: ROAMING_LEVEL, bucket: 'roaming', isRoaming: true };
    }
  }
  if (!wild.length) return null;

  // DORM-02g — Encens Pur : le poids du seau « rare » augmente de rareBoostPct %.
  // PASSE 38f — un seau FORCÉ (case de donjon) prime sur le tirage pondéré.
  const rareOdds = BUCKET_ODDS.rare * (1 + rareBoostPct / 100);
  const r = rng();
  const targetBucket =
    bucketHint ||
    (r < rareOdds ? 'rare' : r < rareOdds + BUCKET_ODDS.uncommon ? 'uncommon' : 'common');
  // Repli par PALIER (jamais de saut) : seau visé → rare → peu commun →
  // commun → toute la table. C'est ce qui garantit qu'un donjon sans rare
  // utilise ses peu communs pour le boss, et ainsi de suite.
  const bucketOrder = ['rare', 'uncommon', 'common'].slice(
    ['rare', 'uncommon', 'common'].indexOf(targetBucket)
  );
  let bucketEntries = [];
  for (const b of bucketOrder) {
    const ent = wild.filter((w) => (w[3] || 'common') === b);
    if (ent.length) {
      bucketEntries = ent;
      break;
    }
  }
  if (!bucketEntries.length) bucketEntries = wild;
  const entry = bucketEntries[defaultInt(0, bucketEntries.length - 1, rng)];
  return {
    speciesId: Number(entry[0]),
    level: defaultInt(Number(entry[1]), Number(entry[2]), rng),
    bucket: targetBucket,
    isRoaming: false,
  };
}
