/**
 * @file talent-pools.mjs
 * @brief Rule that builds the talent pool of a species, shared by the data generator and the
 * repair script (tools/data/apply-talent-pools.mjs).
 *
 * The original data (src/data/poke-talents.js) stores a literal pool per species, but the pool is
 * actually a RULE: every talent whose `affinity` contains one of the types of the species, plus
 * every talent whose affinity is `all` (TALENTS_TABLE). Most of the upstream file follows that
 * rule, except 135 species of the Hoenn / Sinnoh ranges whose pool was never filled in: they only
 * list their signature ability, often twice, e.g. `treecko: ["overgrow", "overgrow", "unburden"]`.
 * With such a pool the talent roll always returns the same talent and the Pokédex shows a single
 * talent, which is the defect fixed in 1.16.4.
 *
 * The completed pool is the union of
 *   1. the talents listed by the original data (keeps the signature abilities that the type rule
 *      does not cover, e.g. `guts` for Machop or `rockguard` for Skarmory), in their listed order,
 *      duplicates removed;
 *   2. the talents derived from the types of the species, in TALENTS_TABLE order.
 *
 * A pool built this way always contains at least PokemonRules.MIN_TALENT_POOL distinct talents
 * (15 for the smallest one, Misdreavus) and never changes for a species whose upstream pool was
 * already complete.
 */

import { TALENTS_TABLE } from '../../src/data/raw/talents-data.js';

/** Affinity meaning "every species can draw this talent" (TALENTS_TABLE.affinity). */
export const ANY_AFFINITY = 'all';

/**
 * Talents any species of these types can draw, in TALENTS_TABLE declaration order.
 * @param {string[]} types - Species types (any casing)
 * @returns {string[]} Talent ids
 */
export function affinityTalentIds(types) {
  const wanted = new Set((types || []).map((type) => String(type).toLowerCase()));
  const ids = [];
  for (const [id, talent] of Object.entries(TALENTS_TABLE)) {
    const affinity = talent.affinity || [];
    if (affinity.includes(ANY_AFFINITY) || affinity.some((type) => wanted.has(type))) ids.push(id);
  }
  return ids;
}

/**
 * Pool of a species: the talents listed by the original data, completed with the type affinities.
 * @param {string[]} types - Species types
 * @param {string[]} [listed] - Talents listed by the original data (POKE_TALENTS[dex])
 * @returns {string[]} Talent ids, listed order first, no duplicate
 */
export function completeTalentPool(types, listed = []) {
  const pool = [];
  const seen = new Set();
  const add = (id) => {
    const talent = String(id).toLowerCase();
    if (!talent || seen.has(talent)) return;
    seen.add(talent);
    pool.push(talent);
  };
  for (const id of listed) add(id);
  for (const id of affinityTalentIds(types)) add(id);
  return pool;
}
