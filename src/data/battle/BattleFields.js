/**
 * @file BattleFields.js
 * @brief Battle field states: weathers and terrains (C++: enum class Weather / enum class Terrain).
 * As in the original game, screens (reflect, light screen, safeguard) and rooms (trick room…)
 * share the single weather slot of the battle: setting one replaces the current weather.
 */
export const Weathers = Object.freeze({
  RAIN: 'rain',
  SUN: 'sun',
  SAND: 'sand',
  HAIL: 'hail',
  FOG: 'fog',
  SOMBER: 'somber',
  REFLECT: 'reflect',
  LIGHTSCREEN: 'lightscreen',
  SAFEGUARD: 'safeguard',
  TRICKROOM: 'trickroom',
  WEIRDROOM: 'weirdroom',
  CROSSROOM: 'crossroom'
});

export const Terrains = Object.freeze({
  ELECTRIC: 'electric',
  GRASSY: 'grassy',
  MISTY: 'misty',
  PSYCHIC: 'psychic'
});
