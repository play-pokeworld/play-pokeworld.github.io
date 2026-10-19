/**
 * @file StarterData.js
 * @brief Starter Pokémon offered at the beginning of a new save (C++ equivalent: static const StarterDef[]).
 * Pure data: display names and descriptions are resolved through localization keys.
 */

/**
 * @typedef {Object} StarterDefinition
 * @property {number} id        - National Pokédex number
 * @property {string} species   - Species slug (sprite + save data)
 * @property {string} nameKey   - Localization key of the species name
 * @property {string} descKey   - Localization key of the short description
 */

/** @type {Readonly<Record<string, ReadonlyArray<StarterDefinition>>>} */
export const STARTERS_BY_REGION = Object.freeze({
  kanto: Object.freeze([
    Object.freeze({ id: 1, species: 'bulbasaur', nameKey: 'pokemon.1', descKey: 'starter_kanto_bulbasaur_desc' }),
    Object.freeze({ id: 4, species: 'charmander', nameKey: 'pokemon.4', descKey: 'starter_kanto_charmander_desc' }),
    Object.freeze({ id: 7, species: 'squirtle', nameKey: 'pokemon.7', descKey: 'starter_kanto_squirtle_desc' })
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
