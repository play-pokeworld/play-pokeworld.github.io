/**
 * @file RoamingSpecies.js
 * @brief Species treated as roaming Pokémon by the Poké Ball filters (C++: constexpr array),
 * original ROAMING_IDS of pokeballs.js / catch.js (#144 145 146 151 243 244 245 251 380 381 385 386).
 */
export const ROAMING_SPECIES = Object.freeze(new Set([
  'articuno', 'zapdos', 'moltres', 'mew',
  'raikou', 'entei', 'suicune', 'celebi',
  'latias', 'latios', 'jirachi', 'deoxys'
]));
