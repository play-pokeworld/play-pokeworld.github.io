/**
 * @file PokemonCollectionData.js
 * @brief Every Pokémon owned by the player, keyed by its stable uid
 * (C++ equivalent: class PokemonCollectionData : public BaseModel).
 *
 * Serialized shape (save schema 16):
 *   [ PokemonData… ]   (acquisition order)
 *
 * This is the single owner of per-save Pokémon data. The team, the daycare and any other mode
 * only store uids that reference this collection, so a Pokémon stays the same object wherever it
 * is used. The PC box is the view of this whole collection.
 */
import { BaseModel } from '../core/BaseModel.js';
import { PokemonData } from '../pokemon/PokemonData.js';

export class PokemonCollectionData extends BaseModel {
  /** @param {Array<Object>} [data=[]] - Serialized PokemonData list */
  constructor(data = []) {
    super('PokemonCollectionData', 'Data');
    /** @private @type {Map<string, PokemonData>} uid -> Pokémon, in acquisition order */
    this._byUid = new Map();
    this.deserialize(data);
  }

  /** @returns {number} Number of owned Pokémon */
  get size() {
    return this._byUid.size;
  }

  /** @returns {ReadonlyArray<PokemonData>} Every owned Pokémon in acquisition order (fresh array) */
  getAll() {
    return Object.freeze([...this._byUid.values()]);
  }

  /** @param {string} uid @returns {PokemonData|null} */
  get(uid) {
    return typeof uid === 'string' ? this._byUid.get(uid) ?? null : null;
  }

  /** @param {string} uid @returns {boolean} */
  has(uid) {
    return typeof uid === 'string' && this._byUid.has(uid);
  }

  /**
   * Adds a newly obtained Pokémon. The same Pokémon object can never be registered twice; a new
   * Pokémon whose generated uid collides with an owned one (e.g. created by a seeded random)
   * receives a fresh uid so both stay distinct.
   * @param {PokemonData} pokemon
   * @returns {boolean}
   */
  add(pokemon) {
    if (!(pokemon instanceof PokemonData) || !pokemon.uid) return false;
    if (this._byUid.get(pokemon.uid) === pokemon) return false;
    while (this._byUid.has(pokemon.uid)) pokemon.uid = PokemonData.generateUid();
    this._byUid.set(pokemon.uid, pokemon);
    return true;
  }

  /**
   * Removes a Pokémon from the collection. Callers must release every reference first.
   * @param {string} uid
   * @returns {PokemonData|null}
   */
  remove(uid) {
    const pokemon = this.get(uid);
    if (!pokemon) return null;
    this._byUid.delete(uid);
    return pokemon;
  }

  /** @override @returns {Object[]} */
  serialize() {
    return [...this._byUid.values()].map((pokemon) => pokemon.serialize());
  }

  /**
   * Reads the current shape only. A repeated uid (corrupted save) gets a fresh uid so that no
   * Pokémon is lost.
   * @override
   * @param {Array<Object>} [data=[]]
   */
  deserialize(data = []) {
    this._byUid = new Map();
    for (const raw of Array.isArray(data) ? data : []) {
      if (!raw || typeof raw !== 'object') continue;
      const pokemon = raw instanceof PokemonData ? raw : new PokemonData(raw);
      while (this._byUid.has(pokemon.uid)) pokemon.uid = PokemonData.generateUid();
      this._byUid.set(pokemon.uid, pokemon);
    }
  }
}
