/**
 * PokeWorld Domain — Pokemon Market Rules
 *
 * Pure business rules for the Pokemon black market (stock, prices, purchases).
 * Zero DOM access. The `economy:market` ECS system
 * (src/application/ecs-gameplay-systems.js) consumes this module.
 *
 * DESIGN DECISION (wave 33, documented in MIGRATION_STATUS.md): STRICT GAMEPLAY
 * PARITY with the shipped game. The interim domain version shipped in an earlier
 * pass had divergent stock lists (Pikachu #25, Abra #63, Gastly #92, Scyther
 * #123...) and a different BST multiplier curve. This module now carries the
 * exact stock/overrides/multipliers of the retired classic implementation
 * (src/game/economy/market.js, deleted) and the ECS system queries it — no
 * silent rebalancing.
 *
 * @module domain/economy/market
 */

/** Fixed price overrides (₽) — identical to the retired classic table. */
export const MARKET_PRICE_OVERRIDES = {
  1: 100000, 4: 100000, 7: 100000, 133: 180000, 137: 250000,
  106: 140000, 107: 140000, 122: 140000, 124: 160000, 131: 220000,
  152: 150000, 155: 150000, 158: 150000, 172: 120000, 173: 120000,
  174: 120000, 175: 160000, 236: 180000, 196: 250000, 197: 250000,
  199: 220000, 213: 180000, 238: 160000, 239: 160000, 240: 160000,
  252: 150000, 255: 150000, 258: 150000, 298: 120000, 351: 160000,
  374: 250000, 385: 300000, 386: 300000,
};

/** Region → species ids offered on the market — classic lists, unchanged. */
export const MARKET_STOCK = {
  kanto: [1, 4, 7, 133, 137, 106, 107, 122, 124, 131],
  johto: [152, 155, 158, 172, 173, 174, 175, 236, 196, 197, 199, 213, 238, 239, 240],
  hoenn: [252, 255, 258, 298, 351],
};

/** BST → price-per-stat multiplier bands (parity with the classic pricing). */
const BST_PRICE_BANDS = [
  { minBst: 520, multiplier: 520 },
  { minBst: 450, multiplier: 420 },
  { minBst: 380, multiplier: 330 },
  { minBst: 300, multiplier: 280 },
  { minBst: 0, multiplier: 240 },
];
export const MIN_POKEMON_PRICE = 80000;
export const MISSING_POKEMON_PRICE = 999999;

/**
 * Price of one market Pokemon. Override table first, then BST × band
 * multiplier with a 80 000₽ floor — exact classic formula.
 * @param {number} id - National dex id
 * @param {Object} [pokemonData={}] - PD-like rows: id → [name,t1,t2,hp,atk,def,spa,spd,spe,...]
 * @returns {number}
 */
export function getPokemonPrice(id, pokemonData = {}) {
  const n = Number(id);
  if (MARKET_PRICE_OVERRIDES[n]) return MARKET_PRICE_OVERRIDES[n];
  const row = pokemonData[n] || pokemonData[String(n)];
  if (!Array.isArray(row)) return MISSING_POKEMON_PRICE;
  const bst = [3, 4, 5, 6, 7, 8].reduce((sum, i) => sum + (Number(row[i]) || 0), 0);
  let mult = BST_PRICE_BANDS[BST_PRICE_BANDS.length - 1].multiplier;
  for (const band of BST_PRICE_BANDS) {
    if (bst >= band.minBst) { mult = band.multiplier; break; }
  }
  return Math.max(MIN_POKEMON_PRICE, Math.floor(bst * mult));
}

// Region legendaries never appear on the market (classic parity).
const BANNED_BY_REGION = {
  kanto: [144, 145, 146, 150, 151],
  johto: [243, 244, 245, 249, 250, 251],
  hoenn: [380, 381, 382, 383, 384],
};
// Castform stays listed even though it (rarely) spawns at the Weather Center:
// it feeds the Weather Lab forms (guaranteed purchase vs very rare spawn).
const WILD_EXEMPT = new Set([351]);
// Eevee/Porygon/Jynx stay listed even though they are evolution bases.
const EVO_ALLOW_LIST = new Set([137, 133, 124]);

/**
 * Compute the purchasable species list for a region — exact classic filters:
 *   1. drop species catchable in the region's wild tables (except WILD_EXEMPT);
 *   2. drop species that are targets of level/stone evolutions (except allow-list);
 *   3. drop the region's banned legendaries.
 * All world knowledge is injected (`wildSpeciesIds`, `evoTargetIds`) so the
 * rule stays pure; the ECS system builds those sets from the data layer.
 *
 * @param {string} region - 'kanto' | 'johto' | 'hoenn'
 * @param {Object} ctx
 * @param {Set<number>} [ctx.wildSpeciesIds] - Ids present in the region's wild tables
 * @param {Set<number>} [ctx.evoTargetIds] - Ids that start an evolution chain
 * @param {Object} [ctx.pokemonData] - PD-like rows (price attribution)
 * @returns {Array<{id:number, price:number}>} Stock entries (id + unit price)
 */
export function computeMarketStock(region, ctx = {}) {
  const reg = MARKET_STOCK[region] ? region : 'kanto';
  const wild = ctx.wildSpeciesIds instanceof Set ? ctx.wildSpeciesIds : new Set();
  const evoTargets = ctx.evoTargetIds instanceof Set ? ctx.evoTargetIds : new Set();
  const banned = BANNED_BY_REGION[reg] || BANNED_BY_REGION.kanto;
  return (MARKET_STOCK[reg] || [])
    .filter((id) => !wild.has(id) || WILD_EXEMPT.has(id))
    .filter((id) => !evoTargets.has(id) || EVO_ALLOW_LIST.has(id))
    .filter((id) => !banned.includes(id))
    .map((id) => ({ id, price: getPokemonPrice(id, ctx.pokemonData || {}) }));
}

/** Species buckets used by the market UI (parity with the classic grouping). */
export const MARKET_CATEGORIES = {
  starter: [1, 4, 7, 152, 155, 158, 252, 255, 258],
  fossil: [138, 139, 140, 141, 142, 345, 347],
  rare: [133, 137, 106, 107, 122, 124, 131, 175, 236, 298, 351, 374],
};

/**
 * Bucket a species id into its market category.
 * @param {number} id
 * @returns {'starter'|'fossil'|'rare'|'other'}
 */
export function categorizeMarketSpecies(id) {
  const n = Number(id);
  if (MARKET_CATEGORIES.starter.includes(n)) return 'starter';
  if (MARKET_CATEGORIES.fossil.includes(n)) return 'fossil';
  if (MARKET_CATEGORIES.rare.includes(n)) return 'rare';
  return 'other';
}

