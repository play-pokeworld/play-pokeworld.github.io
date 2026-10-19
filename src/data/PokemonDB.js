/**
 * @file PokemonDB.js
 * @brief Singleton repository managing the entire Pokémon database (C++: class PokemonDB : public BaseObject).
 * Provides fast O(1) indexed lookups by Pokédex ID, species name, and region.
 */

import { BaseObject } from '../core/BaseObject.js';
import { PokemonSpecies } from './PokemonSpecies.js';
import { PD } from './raw/pd-data.js';

export class PokemonDB extends BaseObject {
  /** @type {PokemonDB|null} */
  static _instance = null;

  /** @returns {PokemonDB} */
  static getInstance() {
    if (!PokemonDB._instance) {
      PokemonDB._instance = new PokemonDB();
    }
    return PokemonDB._instance;
  }

  constructor() {
    super('PokemonDB', 'Data');

    /** @private @type {Map<number, PokemonSpecies>} */
    this._byId = new Map();

    /** @private @type {Map<string, PokemonSpecies>} */
    this._byName = new Map();

    /** @private @type {Map<string, PokemonSpecies>} */
    this._bySlug = new Map();

    /** @private @type {Map<string, number[]>} */
    this._byRegion = new Map();

    this._isLoaded = false;
    this.init();
  }

  init() {
    if (this._isLoaded) return;

    const source = PD || [];
    for (let id = 1; id < source.length; id++) {
      const rawEntry = source[id];
      if (!rawEntry) continue;

      const species = new PokemonSpecies(id, rawEntry);
      this._byId.set(id, species);
      this._byName.set(species.name.toLowerCase(), species);
      this._bySlug.set(species.getSlug(), species);

      // Classify region
      const region = id <= 151 ? 'kanto' : id <= 251 ? 'johto' : 'hoenn';
      if (!this._byRegion.has(region)) {
        this._byRegion.set(region, []);
      }
      this._byRegion.get(region).push(id);
    }

    this._isLoaded = true;
  }

  /**
   * Look up by numeric Pokédex ID
   * @param {number} id
   * @returns {PokemonSpecies|null}
   */
  getById(id) {
    return this._byId.get(Number(id)) || null;
  }

  /**
   * Look up by species name
   * @param {string} name
   * @returns {PokemonSpecies|null}
   */
  getByName(name) {
    if (!name) return null;
    return this._byName.get(String(name).toLowerCase()) || null;
  }

  /**
   * Look up by species slug (the identifier stored in saves, e.g. 'mr-mime')
   * @param {string} slug
   * @returns {PokemonSpecies|null}
   */
  getBySlug(slug) {
    if (!slug) return null;
    return this._bySlug.get(String(slug).toLowerCase()) || null;
  }

  /**
   * Returns all Pokémon IDs for a specific region
   * @param {'kanto'|'johto'|'hoenn'} region
   * @returns {number[]}
   */
  getByRegion(region) {
    return this._byRegion.get(region) || [];
  }

  /** @returns {PokemonSpecies[]} */
  getAll() {
    return Array.from(this._byId.values());
  }

  /** @returns {number} */
  get count() {
    return this._byId.size;
  }
}

