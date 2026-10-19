/**
 * @file SaveData.js
 * @brief Comprehensive save file data model (C++ equivalent: class SaveData : public BaseModel).
 * Encapsulates trainer profile, party team, currencies, card background theme, and timestamps.
 * Uses the original PokeWorld save id format (PW-TIMESTAMP-RANDOM).
 */

import { BaseModel } from './BaseModel.js';
import { PlayerData } from './PlayerData.js';
import { PokemonData } from './PokemonData.js';
import { CurrenciesData } from './CurrenciesData.js';
import { PokemonDB } from './PokemonDB.js';
import { SaveThemes } from './SaveThemes.js';
import { STARTERS_BY_REGION, DEFAULT_STARTER_REGION, findStarter } from './StarterData.js';
import { PlayerDefaults } from '../config/PlayerDefaults.js';

/**
 * Generates a save id in the original PokeWorld format (e.g. PW-LM9Z20K-8A7F1)
 * @returns {string}
 */
export function generateSaveId() {
  return (
    'PW-' +
    Date.now().toString(36).toUpperCase() +
    '-' +
    Math.random().toString(36).slice(2, 7).toUpperCase()
  );
}

export class SaveData extends BaseModel {
  /**
   * @param {number|string} slotIdOrSaveId
   */
  constructor(slotIdOrSaveId = 1) {
    super(`SaveData_${slotIdOrSaveId}`, 'Save');

    if (typeof slotIdOrSaveId === 'string' && slotIdOrSaveId.startsWith('PW-')) {
      this.id = slotIdOrSaveId;
      this.slotId = 1;
    } else {
      this.slotId = Number(slotIdOrSaveId) || 1;
      this.id = generateSaveId();
    }

    this.background = SaveThemes.DEFAULT;
    this.createdAt = Date.now();
    this.updatedAt = Date.now();

    /** @type {PlayerData} */
    this.player = new PlayerData();

    /** @type {CurrenciesData} */
    this.currencies = new CurrenciesData();

    /** @type {PokemonData[]} */
    this.team = [];
  }

  /**
   * Creates a fresh save with the chosen starter.
   * @param {number|string} slotId
   * @param {string} trainerName
   * @param {string} starterSpecies - Species slug from StarterData
   * @param {string} [background] - SaveThemes id
   * @returns {SaveData}
   */
  static createNew(slotId, trainerName, starterSpecies, background = SaveThemes.DEFAULT) {
    const save = new SaveData(slotId);
    save.id = generateSaveId();
    save.background = SaveThemes.normalize(background);
    save.player.trainerName = trainerName || PlayerDefaults.TRAINER_NAME;

    const starter = findStarter(starterSpecies) || STARTERS_BY_REGION[DEFAULT_STARTER_REGION][0];
    const species = PokemonDB.getInstance().getById(starter.id);
    save.team = [
      new PokemonData({
        species: starter.species,
        level: PlayerDefaults.STARTER_LEVEL,
        types: species ? species.getTypes() : []
      })
    ];
    return save;
  }

  /**
   * @override
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      saveId: this.id,
      slotId: this.slotId,
      background: this.background,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      player: this.player.serialize(),
      currencies: this.currencies.serialize(),
      team: this.team.map(p => p.serialize())
    };
  }

  /**
   * @override
   * @param {Object} data
   */
  deserialize(data) {
    if (!data) return;

    // Saves exported by the original game wrap their state in `.G`.
    const legacy = data.G || null;
    const rawMeta = legacy && legacy.saveMeta ? legacy.saveMeta : null;

    this.id = data.id || data.saveId || (rawMeta && rawMeta.id) || generateSaveId();
    this.slotId = data.slotId ?? 1;
    this.background = SaveThemes.normalize(data.background || (rawMeta && rawMeta.background));
    this.createdAt = data.createdAt ?? (rawMeta && rawMeta.createdAt) ?? Date.now();
    this.updatedAt = data.updatedAt ?? (rawMeta && rawMeta.updatedAt) ?? Date.now();

    this.player = new PlayerData(data.player || (legacy ? {
      trainerName: (rawMeta && rawMeta.name) || legacy.trainerName,
      badges: Array.isArray(legacy.badges) ? legacy.badges.length : Number(legacy.badges || 0),
      location: legacy.location,
      caughtCount: legacy.pokedex ? Object.keys(legacy.pokedex).length : 1
    } : {}));

    // Money moved from the player profile to the wallet: keep older values.
    const legacyMoney = data.player && Number.isFinite(data.player.money) ? data.player.money
      : (legacy && Number.isFinite(Number(legacy.money)) ? Number(legacy.money) : undefined);
    this.currencies = new CurrenciesData({
      ...(legacyMoney !== undefined ? { money: legacyMoney } : {}),
      ...(data.currencies || {})
    });

    const teamArray = data.team || (legacy && legacy.team);
    this.team = Array.isArray(teamArray) ? teamArray.map((raw) => new PokemonData(raw)) : [];
  }
}
