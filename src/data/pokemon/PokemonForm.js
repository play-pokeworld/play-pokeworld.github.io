/**
 * @file PokemonForm.js
 * @brief Immutable definition of an alternate form (C++: struct PokemonForm).
 * Built by PokemonDB from data/raw/forms-data.js. A form overrides the types and base stats of
 * its species; catch rate, experience yield, talents and evolutions stay those of the species.
 * The id `<species>_<form>` is the sprite file stem and the localization key suffix.
 */
import { deepFreeze } from '../core/DataRepository.js';
import { PokemonSpecies } from './PokemonSpecies.js';

export class PokemonForm {
  /**
   * @param {string} id - '<species>_<form>'
   * @param {Object} raw - FORMS_TABLE entry
   */
  constructor(id, raw) {
    /** @type {string} */
    this.id = id;
    /** @type {string} Species id */
    this.species = raw.species;
    /** @type {string} Form suffix */
    this.form = raw.form;
    /** @type {ReadonlyArray<string>} */
    this.types = deepFreeze([...raw.types]);
    /** @type {Readonly<Record<string, number>>} */
    this.baseStats = PokemonSpecies.statsFromArray(raw.stats);
    /** @type {string} Form kind ('alt') */
    this.kind = raw.kind || 'alt';
    /** @type {string|null} Shop selling the form */
    this.shop = raw.shop || null;
    /** @type {number} */
    this.price = Number(raw.price) || 0;
    Object.freeze(this);
  }

  /** @returns {string} Localization key of the form name */
  getNameKey() {
    return `pokemon.${this.id}`;
  }
}
