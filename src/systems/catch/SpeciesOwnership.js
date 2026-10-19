/**
 * @file SpeciesOwnership.js
 * @brief What the player really owns (C++: class SpeciesOwnership, static), port of the original
 * isSpeciesOwnedReal() / isSpeciesShiny(): ownership is read from the team and the PC box,
 * never from the Pokédex (a form is a Pokémon of its own); the shiny state of a species is
 * unlocked by the Pokédex entry or by an owned shiny of that species.
 */
import { CaughtStatus } from '../../data/save/PokedexData.js';

export class SpeciesOwnership {
  /**
   * @param {import('../../data/save/SaveData.js').SaveData} save
   * @returns {import('../../data/pokemon/PokemonData.js').PokemonData[]} Team first, then the box
   */
  static ownedPokemon(save) {
    return [...save.team, ...save.box];
  }

  /**
   * @param {import('../../data/save/SaveData.js').SaveData} save
   * @param {string} species
   * @param {string} [form='']
   * @returns {import('../../data/pokemon/PokemonData.js').PokemonData|null} First owned one (team first)
   */
  static findOwned(save, species, form = '') {
    return SpeciesOwnership.ownedPokemon(save).find((pokemon) => pokemon.species === species && pokemon.form === form) ?? null;
  }

  /**
   * @param {import('../../data/save/SaveData.js').SaveData} save
   * @param {string} species
   * @param {string} [form='']
   * @returns {boolean}
   */
  static isOwned(save, species, form = '') {
    return SpeciesOwnership.findOwned(save, species, form) !== null;
  }

  /**
   * @param {import('../../data/save/SaveData.js').SaveData} save
   * @param {string} species
   * @param {string} [form='']
   * @returns {boolean} The shiny of that species is unlocked
   */
  static isShinyUnlocked(save, species, form = '') {
    if (save.pokedex.getCaughtStatus(species) === CaughtStatus.SHINY) return true;
    return SpeciesOwnership.ownedPokemon(save).some((pokemon) => pokemon.species === species && pokemon.form === form && pokemon.shiny);
  }
}
