/**
 * @file TrainingOpponentDB.js
 * @brief Type-matched six-species pools for training sessions.
 */
import { DataRepository, deepFreeze } from '../core/DataRepository.js';
import { TRAINING_OPPONENTS_TABLE } from '../raw/training-opponents-data.js';
import { PokemonDB } from '../pokemon/PokemonDB.js';
import { TrainingRules } from '../../config/TrainingRules.js';

export class TrainingOpponentDB extends DataRepository {
  /** @type {TrainingOpponentDB|null} */
  static _instance = null;

  /** @returns {TrainingOpponentDB} */
  static getInstance() {
    if (!TrainingOpponentDB._instance) TrainingOpponentDB._instance = new TrainingOpponentDB();
    return TrainingOpponentDB._instance;
  }

  constructor() {
    super('TrainingOpponentDB');
  }

  /** @protected @override */
  _build() {
    for (const [type, species] of Object.entries(TRAINING_OPPONENTS_TABLE)) {
      this._entries.set(type, deepFreeze({ type, species: [...species] }));
    }
  }

  /**
   * @param {string} type
   * @returns {ReadonlyArray<string>} Species ids; normal is the fallback pool.
   */
  getSpeciesForType(type) {
    return this.getById(type)?.species ?? this.getById('normal')?.species ?? [];
  }

  /** @override */
  validate() {
    const problems = [];
    const speciesDb = PokemonDB.getInstance();
    for (const pool of this._entries.values()) {
      if (pool.species.length !== TrainingRules.OPPONENT_COUNT) {
        problems.push(this._problem(pool.type, 'species.length', pool.species.length));
      }
      for (const speciesId of pool.species) {
        if (!speciesDb.has(speciesId)) problems.push(this._problem(pool.type, 'species', speciesId));
      }
    }
    return problems;
  }
}
