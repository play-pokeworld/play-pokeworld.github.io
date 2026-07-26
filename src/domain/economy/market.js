export const MARKET_STOCK = {
  kanto: [1, 4, 7, 25, 63, 92, 123, 137],
  johto: [152, 155, 158, 172, 179, 196, 197, 246],
};

const PRICE_OVERRIDES = {
  1: 100000,
  4: 100000,
  7: 100000,
  25: 120000,
  63: 180000,
  92: 160000,
  123: 220000,
  137: 250000,
  152: 120000,
  155: 120000,
  158: 120000,
  196: 240000,
  197: 240000,
  246: 300000,
};

export function getPokemonPrice(id, pokemonData = {}) {
  const n = Number(id);
  if (PRICE_OVERRIDES[n]) return PRICE_OVERRIDES[n];
  const row = pokemonData[n] || pokemonData[String(n)];
  if (!Array.isArray(row)) return 80000;
  const stats = row.slice(3, 9).map((v) => Number(v) || 0);
  const total = stats.reduce((sum, value) => sum + value, 0);
  const rarityMultiplier = total >= 600 ? 650 : total >= 500 ? 520 : 360;
  return Math.max(80000, Math.round(total * rarityMultiplier));
}
