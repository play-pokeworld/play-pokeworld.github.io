/**
 * @file PokemonSpecies.js
 * @brief Immutable definition of a Pokémon species (C++: struct PokemonSpecies).
 * Built by PokemonDB from data/raw/species-data.js. The id is the English-name slug, which is
 * also the sprite file stem and the localization key suffix (`pokemon.<id>`).
 */
import { AssetPaths } from '../../config/AssetPaths.js';
import { PokemonRules } from '../../config/PokemonRules.js';
import { deepFreeze } from '../core/DataRepository.js';

/**
 * @typedef {Object} Evolution
 * @property {string}  to          - Target species id
 * @property {number}  [level]     - Level reached
 * @property {string}  [item]      - Item id used on the Pokémon
 * @property {number}  [minLevel]  - Minimum level for an item evolution
 * @property {boolean} [split]     - Every split branch is obtained together (Shedinja)
 * @property {string}  [condition] - Special rule id (Tyrogue: 'atk_gt_def'…)
 */

export class PokemonSpecies {
  /**
   * @param {string} id - Species slug
   * @param {Object} raw - SPECIES_TABLE entry
   */
  constructor(id, raw) {
    /** @type {string} */
    this.id = id;
    /** @type {number} National Pokédex number */
    this.dex = Number(raw.dex);
    /** @type {string} */
    this.region = raw.region;
    /** @type {ReadonlyArray<string>} Lowercase type ids */
    this.types = deepFreeze([...raw.types]);
    /** @type {Readonly<Record<string, number>>} Base stats keyed by PokemonRules.STAT_KEYS */
    this.baseStats = PokemonSpecies.statsFromArray(raw.stats);
    /** @type {number} Kept from the original data (the original catch formula ignores it). */
    this.catchRate = Number(raw.catchRate) || 0;
    /** @type {number} Experience yield */
    this.xpYield = Number(raw.xpYield) || 0;
    /** @type {ReadonlyArray<string>} Talent pool (TalentDB ids) */
    this.talents = deepFreeze([...(raw.talents || [])]);
    /** @type {string|null} Hidden talent (TalentDB id) */
    this.hiddenTalent = raw.hiddenTalent || null;
    /** @type {ReadonlyArray<Evolution>} */
    this.evolutions = deepFreeze((raw.evolutions || []).map((evolution) => ({ ...evolution })));
    /** @type {ReadonlyArray<import('./PokemonForm.js').PokemonForm>} filled by PokemonDB */
    this.forms = [];
  }

  /** @returns {string} Localization key of the species name */
  getNameKey() {
    return `pokemon.${this.id}`;
  }

  /**
   * @param {boolean} [shiny=false]
   * @returns {string}
   */
  getSpritePath(shiny = false) {
    return AssetPaths.pokemonSprite(this.id, '', shiny);
  }

  /** @returns {ReadonlyArray<string>} */
  getTypes() {
    return this.types;
  }

  /**
   * @param {string} formKey - Form suffix ('sunny')
   * @returns {import('./PokemonForm.js').PokemonForm|null}
   */
  getForm(formKey) {
    return this.forms.find((form) => form.form === formKey) || null;
  }

  /**
   * @param {number[]} values - Six base stats in PokemonRules.STAT_KEYS order
   * @returns {Readonly<Record<string, number>>}
   */
  static statsFromArray(values) {
    const stats = {};
    PokemonRules.STAT_KEYS.forEach((key, index) => { stats[key] = Number(values?.[index]) || 0; });
    return Object.freeze(stats);
  }
}
