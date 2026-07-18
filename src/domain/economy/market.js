export const MARKET_PRICE_OVERRIDES = Object.freeze({1:100000,4:100000,7:100000,133:180000,137:250000,106:140000,107:140000,122:140000,124:160000,131:220000,152:150000,155:150000,158:150000,172:120000,173:120000,174:120000,175:160000,236:180000,196:250000,197:250000,199:220000,213:180000,238:160000,239:160000,240:160000});

export const MARKET_STOCK = Object.freeze({
  kanto: Object.freeze([1, 4, 7, 133, 137, 106, 107, 122, 124, 131]),
  johto: Object.freeze([152, 155, 158, 172, 173, 174, 175, 236, 196, 197, 199, 213, 238, 239, 240]),
});

export function getPokemonPrice(id, pokemonData) {
  if (MARKET_PRICE_OVERRIDES[id]) return MARKET_PRICE_OVERRIDES[id];
  const data = pokemonData[id];
  if (!data) return 999999;
  const baseStatTotal = data[3] + data[4] + data[5] + data[6] + (data[7] || 0) + (data[8] || 0);
  let multiplier = 240;
  if (baseStatTotal >= 520) multiplier = 520;
  else if (baseStatTotal >= 450) multiplier = 420;
  else if (baseStatTotal >= 380) multiplier = 330;
  else if (baseStatTotal >= 300) multiplier = 280;
  return Math.max(80000, Math.floor(baseStatTotal * multiplier));
}
