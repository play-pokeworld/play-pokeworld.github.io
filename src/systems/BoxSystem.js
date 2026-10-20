/**
 * @file BoxSystem.js
 * @brief PC box operations (C++ equivalent: class BoxSystem : public BaseSystem). No DOM access.
 * The box receives the Pokémon caught while the team is full (original G.collection).
 * Views never edit the box array themselves: they call this system and listen to BoxChangedEvent.
 */

import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { EventBus } from '../core/EventBus.js';
import { BoxChangedEvent } from '../core/events/BoxChangedEvent.js';

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

  /** @returns {import('../data/pokemon/PokemonData.js').PokemonData[]} Box of the active save (live array) */
  getBox() {
    return SaveSystem.getInstance().getCurrentSave()?.box ?? [];
  }

  /**
   * Stores a Pokémon in the box and marks it caught in the Pokédex. Does not persist: the caller
   * saves once after its whole operation.
   * @param {import('../data/pokemon/PokemonData.js').PokemonData} pokemon
   * @param {{notify?: boolean}} [options]
   * @returns {boolean} False when no save is loaded
   */
  addPokemon(pokemon, { notify = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !pokemon) return false;
    save.box.push(pokemon);
    save.pokedex.markCaught(pokemon.species, pokemon.shiny);
    if (notify) EventBus.getInstance().dispatch(new BoxChangedEvent(save.box.length));
    return true;
  }

  /**
   * Removes a Pokémon by its stable uid.
   * @param {string} uid
   * @param {{persist?: boolean, notify?: boolean}} [options]
   * @returns {import('../data/pokemon/PokemonData.js').PokemonData|null}
   */
  removePokemon(uid, { persist = true, notify = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return null;
    const index = save.box.findIndex((pokemon) => pokemon.uid === uid);
    if (index < 0) return null;
    const [pokemon] = save.box.splice(index, 1);
    if (persist) SaveSystem.getInstance().saveCurrent();
    if (notify) this.dispatchChanged();
    return pokemon;
  }

  /**
   * Replaces the PC contents as part of a batch roster operation.
   * @param {import('../data/pokemon/PokemonData.js').PokemonData[]} box
   * @param {{persist?: boolean, notify?: boolean}} [options]
   * @returns {boolean}
   */
  replaceContents(box, { persist = true, notify = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !Array.isArray(box)) return false;
    save.box = [...box];
    if (persist) SaveSystem.getInstance().saveCurrent();
    if (notify) this.dispatchChanged();
    return true;
  }

  /** Emits the standard box event after a batch roster mutation. */
  dispatchChanged() {
    EventBus.getInstance().dispatch(new BoxChangedEvent(this.getBox().length));
  }
}
