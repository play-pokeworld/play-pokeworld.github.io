/**
 * @file DataRepository.js
 * @brief Base class of every read-only game data repository (C++: template<class T> class DataRepository).
 *
 * A repository is built ONCE from a generated table of data/raw/ (see tools/data/): every raw
 * entry is turned into a frozen definition object by the subclass, then never changes.
 * Repositories never hold player state (that lives in data/save/) and never hold text
 * (names and descriptions are localization keys built from the ids).
 *
 * Subclasses implement:
 *   - `_build()`: fill `this._entries` (id -> frozen definition);
 *   - `validate()` (optional): return DataProblem objects for broken references.
 */
import { BaseObject } from '../../core/BaseObject.js';

/**
 * @typedef {Object} DataProblem
 * @property {string} repository - Repository name ('PokemonDB'…)
 * @property {string} id         - Entry id
 * @property {string} field      - Faulty field
 * @property {*}      value      - Faulty value (unknown reference…)
 */

export class DataRepository extends BaseObject {
  /**
   * @param {string} name - Repository name (used in DataProblem.repository)
   */
  constructor(name) {
    super(name, 'Data');
    /** @protected @type {Map<string, Readonly<Object>>} */
    this._entries = new Map();
    this._build();
  }

  /**
   * Fills `this._entries`.
   * @protected
   * @virtual
   */
  _build() {}

  /**
   * @param {string} id
   * @returns {Readonly<Object>|null}
   */
  getById(id) {
    return this._entries.get(id) || null;
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return this._entries.has(id);
  }

  /** @returns {Readonly<Object>[]} Definitions in table order */
  getAll() {
    return [...this._entries.values()];
  }

  /** @returns {string[]} */
  getIds() {
    return [...this._entries.keys()];
  }

  /** @returns {number} */
  get count() {
    return this._entries.size;
  }

  /**
   * Checks the references of the entries (cross-repository checks included).
   * @virtual
   * @returns {DataProblem[]}
   */
  validate() {
    return [];
  }

  /**
   * Helper for validate(): DataProblem factory.
   * @protected
   * @param {string} id
   * @param {string} field
   * @param {*} value
   * @returns {DataProblem}
   */
  _problem(id, field, value) {
    return Object.freeze({ repository: this.getName(), id, field, value });
  }
}

/**
 * Deep-freezes a plain data value (objects and arrays) and returns it.
 * @param {*} value
 * @returns {*}
 */
export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
