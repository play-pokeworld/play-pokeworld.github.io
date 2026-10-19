/**
 * @file PokemonSpecies.js
 * @brief Strongly-typed Pokémon species definition (C++ equivalent: class PokemonSpecies : public BaseModel).
 * Encapsulates Pokédex number, localized names, primary/secondary types, and base stats.
 */

import { BaseModel } from './BaseModel.js';
import { AssetPaths } from '../config/AssetPaths.js';

export class PokemonSpecies extends BaseModel {
  /**
   * @param {number} id - Pokédex numeric ID
   * @param {Array|Object} rawData - Raw entry from PD database
   */
  constructor(id, rawData) {
    super(`Species_${id}`, 'Data');

    this.id = Number(id);
    this.name = '';
    this.primaryType = 'Normal';
    this.secondaryType = null;

    this.baseStats = {
      hp: 45,
      atk: 49,
      def: 49,
      spa: 65,
      spd: 65,
      spe: 45
    };

    this.catchRate = 45;
    this.baseExp = 60;

    this._parseRawData(rawData);
  }

  _parseRawData(raw) {
    if (!raw) return;

    if (Array.isArray(raw)) {
      // Format: [name, type1, type2, hp, atk, def, spa, spd, spe, moves, catchRate, baseExp]
      this.name = raw[0] || `Pokémon #${this.id}`;
      this.primaryType = raw[1] || 'Normal';
      this.secondaryType = raw[2] ? raw[2] : null;
      this.baseStats = {
        hp: Number(raw[3]) || 45,
        atk: Number(raw[4]) || 49,
        def: Number(raw[5]) || 49,
        spa: Number(raw[6]) || 65,
        spd: Number(raw[7]) || 65,
        spe: Number(raw[8]) || 45
      };
      this.catchRate = Number(raw[10]) || 45;
      this.baseExp = Number(raw[11]) || 60;
    } else if (typeof raw === 'object') {
      this.name = raw.name || `Pokémon #${this.id}`;
      this.primaryType = raw.type1 || (Array.isArray(raw.types) ? raw.types[0] : 'Normal');
      this.secondaryType = raw.type2 || (Array.isArray(raw.types) ? raw.types[1] : null);
      if (raw.bst) {
        this.baseStats = { ...raw.bst };
      }
    }
  }

  /**
   * Species slug used for save data and sprite file names
   * ('Mr. Mime' -> 'mr-mime', 'Nidoran♀' -> 'nidoran-f', "Farfetch'd" -> 'farfetchd').
   * @returns {string}
   */
  getSlug() {
    return PokemonSpecies.toSlug(this.name);
  }

  /**
   * @param {string} rawName - English species name from the raw Pokedex data
   * @returns {string}
   */
  static toSlug(rawName) {
    return String(rawName || '')
      .toLowerCase()
      .replace(/\u2640/g, '-f') // female sign
      .replace(/\u2642/g, '-m') // male sign
      .replace(/[.\s]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /** @returns {string} Localization key of the species name */
  getNameKey() {
    return `pokemon.${this.id}`;
  }

  /** @returns {string} Default-form sprite path */
  getSpritePath() {
    return AssetPaths.pokemonSprite(this.getSlug());
  }

  /** @returns {string[]} */
  getTypes() {
    return this.secondaryType ? [this.primaryType, this.secondaryType] : [this.primaryType];
  }
}

