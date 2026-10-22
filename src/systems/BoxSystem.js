/**
 * @file BoxSystem.js
 * @brief PC box = the collection of every owned Pokémon (C++ equivalent: class BoxSystem :
 * public BaseSystem). No DOM access.
 *
 * The collection is the single owner of Pokémon data: the party, the daycare and the other modes
 * reference its Pokémon by uid (see PokemonUsageSystem for "where is it used"). A Pokémon therefore
 * never leaves the PC box when it joins the team or the daycare.
 * Views never edit the collection themselves: they call this system and listen to BoxChangedEvent.
 */

import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { EventBus } from '../core/EventBus.js';
import { BoxChangedEvent } from '../core/events/BoxChangedEvent.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';

export class BoxSystem extends BaseSystem {
  /** @private @type {BoxSystem|null} */
  static _instance = null;

  /** @returns {BoxSystem} */
  static getInstance() {
    if (!BoxSystem._instance) {
      BoxSystem._instance = new BoxSystem();
    }
    return BoxSystem._instance;
  }

  constructor() {
    super('BoxSystem', 'System');
  }

  /** @returns {ReadonlyArray<import('../data/pokemon/PokemonData.js').PokemonData>} Every owned Pokémon */
  getAll() {
    return SaveSystem.getInstance().getCurrentSave()?.collection.getAll() ?? [];
  }

  /** @returns {number} Number of owned Pokémon */
  getCount() {
    return SaveSystem.getInstance().getCurrentSave()?.collection.size ?? 0;
  }

  /**
   * Registers a newly obtained Pokémon in the collection (it is then shown by the PC) and marks it
   * caught in the Pokédex. Does not persist: the caller saves once after its whole operation.
   * @param {import('../data/pokemon/PokemonData.js').PokemonData} pokemon
   * @param {{notify?: boolean,deferSave?:boolean}} [options]
   * @returns {boolean} False when no save is loaded or the Pokémon is already registered
   */
  addPokemon(pokemon, { notify = true, deferSave = false } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !pokemon || !save.collection.add(pokemon)) return false;
    save.pokedex.markCaught(pokemon.species, pokemon.shiny, { deferSave });
    if (notify) this.dispatchChanged();
    return true;
  }

  /** @param {string} uid @returns {import('../data/pokemon/PokemonData.js').PokemonData|null} */
  getPokemonByUid(uid) {
    return SaveSystem.getInstance().getCurrentSave()?.collection.get(uid) ?? null;
  }

  /**
   * Applies a domain-system update to one owned Pokémon, wherever it is used. Party views are
   * notified too when the Pokémon is a party member.
   * @param {string} uid
   * @param {(pokemon: import('../data/pokemon/PokemonData.js').PokemonData) => boolean} update
   * @param {{persist?:boolean, notify?:boolean}} [options]
   * @returns {boolean}
   */
  updatePokemon(uid, update, { persist = true, notify = true } = {}) {
    if (typeof update !== 'function') return false;
    const pokemon = this.getPokemonByUid(uid);
    if (!pokemon || update(pokemon) !== true) return false;
    if (persist) SaveSystem.getInstance().saveCurrent();
    if (notify) this.dispatchPokemonChanged(uid);
    return true;
  }

  /**
   * Emits the collection event, plus the party event when the changed Pokémon is a party member.
   * @param {string} uid
   */
  dispatchPokemonChanged(uid) {
    this.dispatchChanged();
    const save = SaveSystem.getInstance().getCurrentSave();
    if (save?.teamMembers.includes(uid)) EventBus.getInstance().dispatch(new TeamChangedEvent(save.teamMembers.size));
  }

  /** Emits the standard collection event after a mutation. */
  dispatchChanged() {
    EventBus.getInstance().dispatch(new BoxChangedEvent(this.getCount()));
  }
}
