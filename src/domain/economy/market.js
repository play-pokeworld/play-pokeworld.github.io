export const MARKET_STOCK = Object.freeze({
  kanto: Object.freeze([1, 4, 7, 133, 137, 106, 107, 122]),
  johto: Object.freeze([152, 155, 158, 172, 173, 174, 175, 236, 196, 197, 199, 213, 238, 239, 240]),
});

export function getPokemonPrice(id, pokemonData) {
  if (id === 151) return 100000;
  if (id === 150) return 75000;
  if ([144, 145, 146].includes(id)) return 50000;
  const data = pokemonData[id];
  if (!data) return 999999;
  const baseStatTotal = data[3] + data[4] + data[5] + data[6];
  if ([1, 4, 7, 152, 155, 158].includes(id)) return 5000;
  if ([2, 5, 8].includes(id)) return 8000;
  if ([3, 6, 9].includes(id)) return 12000;
  if ([138, 140].includes(id)) return 8000;
  if ([139, 141].includes(id)) return 12000;
  if ([142].includes(id)) return 15000;
  if ([147].includes(id)) return 10000;
  if ([148].includes(id)) return 15000;
  if ([149].includes(id)) return 25000;
  let multiplier = 12;
  if (baseStatTotal >= 350) multiplier = 22;
  else if (baseStatTotal >= 300) multiplier = 18;
  else if (baseStatTotal >= 250) multiplier = 15;
  else if (baseStatTotal >= 200) multiplier = 13;
  return Math.max(1500, Math.floor(baseStatTotal * multiplier));
}
