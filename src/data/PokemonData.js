/**
 * @file PokemonData.js
 * @brief Owned Pokemon instance (C++ equivalent: class PokemonData : public BaseModel).
 * Stores identifiers only (species slug, optional form, optional nickname): the display
 * name and the sprite path are always derived, never persisted.
 */

import { BaseModel } from './BaseModel.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { PokemonDB } from './PokemonDB.js';
import { LocalizationManager, t } from '../localization/LocalizationManager.js';

/** Fallback species when a save entry is corrupted. */
const DEFAULT_SPECIES = 'pikachu';

export class PokemonData extends BaseModel {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    super(`Pokemon_${data.species || DEFAULT_SPECIES}`, 'Data');
    this.deserialize(data);
  }

  /**
   * Nickname if any, otherwise the species name in the active language.
   * @returns {string}
   */
  getDisplayName() {
    if (this.nickname) return this.nickname;
    const species = PokemonDB.getInstance().getBySlug(this.species);
    if (!species) return this.species;
    // Species beyond the translated Pokedex range keep their raw (English) data name.
    return LocalizationManager.getInstance().has(species.getNameKey()) ? t(species.getNameKey()) : species.name;
  }

  /** @returns {string} */
  getSpritePath() {
    return AssetPaths.pokemonSprite(this.species, this.form, this.shiny);
  }

  /** @returns {number} HP ratio in percent (0..100) */
  getHpPercent() {
    return this.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((this.hp / this.maxHp) * 100))) : 0;
  }

  /** @returns {number} Experience ratio in percent (0..100) */
  getExpPercent() {
    return this.maxExp > 0 ? Math.max(0, Math.min(100, Math.round((this.exp / this.maxExp) * 100))) : 0;
  }

  /**
   * Adds experience points and handles level ups
   * @param {number} amount
   * @returns {boolean} true if leveled up
   */
  addExp(amount) {
    this.exp += amount;
    let leveledUp = false;
    while (this.exp >= this.maxExp) {
      this.exp -= this.maxExp;
      this.level++;
      this.maxExp = Math.round(this.maxExp * 1.25);
      this.maxHp = Math.round(this.maxHp * 1.15) + 2;
      this.hp = this.maxHp;
      leveledUp = true;
    }
    return leveledUp;
  }

  /** @param {number} damage */
  takeDamage(damage) {
    this.hp = Math.max(0, this.hp - damage);
  }

  /** @returns {boolean} */
  isFainted() {
    return this.hp <= 0;
  }

  /** Fully heals the Pokemon */
  healFull() {
    this.hp = this.maxHp;
  }

  /**
   * @override
   * @returns {Object}
   */
  serialize() {
    return {
      species: this.species,
      form: this.form,
      nickname: this.nickname,
      level: this.level,
      hp: this.hp,
      maxHp: this.maxHp,
      exp: this.exp,
      maxExp: this.maxExp,
      types: this.types,
      moves: this.moves,
      shiny: this.shiny
    };
  }

  /**
   * Older saves stored a translated `name` and a `sprite` path: both are dropped
   * (the name is re-derived from the species in the active language).
   * @override
   * @param {Object} data
   */
  deserialize(data = {}) {
    const raw = data || {};
    this.species = String(raw.species || DEFAULT_SPECIES).toLowerCase();
    this.form = raw.form || '';
    this.nickname = raw.nickname || '';
    this.level = raw.level ?? 5;
    this.maxHp = raw.maxHp ?? 20;
    this.hp = raw.hp ?? this.maxHp;
    this.exp = raw.exp ?? 0;
    this.maxExp = raw.maxExp ?? 100;
    this.types = Array.isArray(raw.types) ? [...raw.types] : [];
    this.moves = Array.isArray(raw.moves) ? [...raw.moves] : [];
    this.shiny = raw.shiny === true;
  }
}
