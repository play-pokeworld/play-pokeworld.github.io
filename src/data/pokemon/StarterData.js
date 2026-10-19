/**
 * @file StarterData.js
 * @brief Starter Pokémon offered at the beginning of a new save (C++ equivalent: static const StarterDef[]).
 * Pure data: display names and descriptions are resolved through localization keys.
 */

/**
 * @typedef {Object} StarterDefinition
 * @property {string} species   - PokemonDB id (sprite + save data)
 * @property {string} nameKey   - Localization key of the species name
 * @property {string} descKey   - Localization key of the short description
 */

/** @type {Readonly<Record<string, ReadonlyArray<StarterDefinition>>>} */
export const STARTERS_BY_REGION = Object.freeze({
  kanto: Object.freeze([
    Object.freeze({ species: 'bulbasaur', nameKey: 'pokemon.bulbasaur', descKey: 'starter_kanto_bulbasaur_desc' }),
    Object.freeze({ species: 'charmander', nameKey: 'pokemon.charmander', descKey: 'starter_kanto_charmander_desc' }),
    Object.freeze({ species: 'squirtle', nameKey: 'pokemon.squirtle', descKey: 'starter_kanto_squirtle_desc' })
  ])
});

/** Region used when a new save is created. */
export const DEFAULT_STARTER_REGION = 'kanto';

/**
 * Finds a starter definition by species slug in every region.
 * @param {string} species
 * @returns {StarterDefinition|null}
 */
export function findStarter(species) {
  for (const list of Object.values(STARTERS_BY_REGION)) {
    const match = list.find((starter) => starter.species === species);
    if (match) return match;
  }
  return null;
}
