/**
 * @file TeamSystem.js
 * @brief Active team operations (C++ equivalent: class TeamSystem : public BaseSystem). No DOM access.
 * Views never edit the team array themselves: they call this system and listen to TeamChangedEvent.
 */

import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { EventBus } from '../core/EventBus.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { PlayerDefaults } from '../config/PlayerDefaults.js';
import { BoxSystem } from './BoxSystem.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { ItemKinds } from '../data/items/ItemKinds.js';

export class TeamSystem extends BaseSystem {
  /** @private @type {TeamSystem|null} */
  static _instance = null;

  /** @returns {TeamSystem} */
  static getInstance() {
    if (!TeamSystem._instance) {
      TeamSystem._instance = new TeamSystem();
    }
    return TeamSystem._instance;
  }

  constructor() {
    super('TeamSystem', 'System');
  }

  /** @returns {import('../data/pokemon/PokemonData.js').PokemonData[]} Team of the active save (live array) */
  getTeam() {
    return SaveSystem.getInstance().getCurrentSave()?.team ?? [];
  }

  /** @returns {boolean} The team has a free slot */
  hasFreeSlot() {
    return this.getTeam().length < PlayerDefaults.TEAM_SIZE;
  }

  /**
   * Adds a Pokémon to the team and marks it caught in the Pokédex. Does not persist: the caller
   * saves once after its whole operation.
   * @param {import('../data/pokemon/PokemonData.js').PokemonData} pokemon
   * @param {{notify?: boolean,deferSave?:boolean}} [options]
   * @returns {boolean} False when the team is full or no save is loaded
   */
  addPokemon(pokemon, { notify = true, deferSave = false } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !pokemon || !this.hasFreeSlot()) return false;
    save.team.push(pokemon);
    save.pokedex.markCaught(pokemon.species, pokemon.shiny, { deferSave });
    if (notify) EventBus.getInstance().dispatch(new TeamChangedEvent(save.team.length));
    return true;
  }

  /**
   * Removes a Pokémon without allowing the last team member to be stored away.
   * Persistence and event dispatch may be deferred by a larger atomic operation.
   * @param {string} uid
   * @param {{persist?: boolean, notify?: boolean}} [options]
   * @returns {import('../data/pokemon/PokemonData.js').PokemonData|null}
   */
  removePokemon(uid, { persist = true, notify = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || save.team.length <= 1) return null;
    const index = save.team.findIndex((pokemon) => pokemon.uid === uid);
    if (index < 0) return null;
    const [pokemon] = save.team.splice(index, 1);
    if (persist) SaveSystem.getInstance().saveCurrent();
    if (notify) this.dispatchChanged();
    return pokemon;
  }

  /**
   * Puts the Pokémon at `index` in first position (it fights first).
   * @param {number} index
   * @returns {boolean} False when the index is not a valid non-lead position
   */
  setLead(index) {
    const team = this.getTeam();
    if (!Number.isInteger(index) || index <= 0 || index >= team.length) return false;
    [team[0], team[index]] = [team[index], team[0]];
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new TeamChangedEvent(team.length));
    return true;
  }

  /**
   * Swaps two active team members by stable uid (drag/drop and keyboard reorder).
   * @param {string} firstUid
   * @param {string} secondUid
   * @param {{persist?:boolean,notify?:boolean}} [options]
   * @returns {boolean}
   */
  swapMembers(firstUid, secondUid, { persist = true, notify = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !firstUid || !secondUid || firstUid === secondUid) return false;
    const firstIndex = save.team.findIndex((pokemon) => pokemon.uid === firstUid);
    const secondIndex = save.team.findIndex((pokemon) => pokemon.uid === secondUid);
    if (firstIndex < 0 || secondIndex < 0) return false;
    [save.team[firstIndex], save.team[secondIndex]] = [save.team[secondIndex], save.team[firstIndex]];
    if (persist) SaveSystem.getInstance().saveCurrent();
    if (notify) this.dispatchChanged();
    return true;
  }

  /**
   * Replaces one active team member with a stored Pokémon as one roster operation.
   * The outgoing member is appended to the PC and both owning systems are notified.
   * @param {string} teamUid
   * @param {string} boxUid
   * @param {{persist?:boolean,notify?:boolean}} [options]
   * @returns {boolean}
   */
  swapWithBoxMember(teamUid, boxUid, { persist = true, notify = true } = {}) {
    if (!teamUid || !boxUid) return false;
    const team = this.getTeam();
    const box = BoxSystem.getInstance().getBox();
    const teamIndex = team.findIndex((pokemon) => pokemon.uid === teamUid);
    const boxIndex = box.findIndex((pokemon) => pokemon.uid === boxUid);
    if (teamIndex < 0 || boxIndex < 0) return false;
    const nextTeam = [...team];
    const nextBox = [...box];
    [nextTeam[teamIndex], nextBox[boxIndex]] = [nextBox[boxIndex], nextTeam[teamIndex]];
    if (!this.replaceRoster(nextTeam, nextBox, { persist: false, notify: false })) return false;
    if (persist) SaveSystem.getInstance().saveCurrent();
    if (notify) {
      this.dispatchChanged();
      BoxSystem.getInstance().dispatchChanged();
    }
    return true;
  }

  /**
   * Replaces the active team and box as one logical operation. Preset loading uses this instead
   * of changing either save array in a view; persistence and event dispatch can be deferred until
   * both arrays and the active preset id have been updated.
   * @param {import('../data/pokemon/PokemonData.js').PokemonData[]} team
   * @param {import('../data/pokemon/PokemonData.js').PokemonData[]} box
   * @param {{persist?: boolean, notify?: boolean}} [options]
   * @returns {boolean}
   */
  replaceRoster(team, box, { persist = true, notify = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !Array.isArray(team) || !Array.isArray(box) || team.length > PlayerDefaults.TEAM_SIZE) return false;
    const boxSystem = BoxSystem.getInstance();
    if (!boxSystem.replaceContents(box, { persist: false, notify: false })) return false;
    save.team = [...team];
    if (persist) SaveSystem.getInstance().saveCurrent();
    if (notify) {
      this.dispatchChanged();
      boxSystem.dispatchChanged();
    }
    return true;
  }

  /**
   * Sets or removes one Pokémon's held item. Inventory ownership and uniqueness are checked here
   * so every team mutation still passes through TeamSystem.
   * @param {number} index
   * @param {string|null} itemId
   * @returns {boolean}
   */
  setHeldItem(index, itemId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !Number.isInteger(index) || index < 0 || index >= save.team.length) return false;
    const normalizedId = typeof itemId === 'string' && itemId ? itemId : null;
    const pokemon = save.team[index];
    if (pokemon.heldItem === normalizedId) return true;
    if (normalizedId) {
      const item = ItemDB.getInstance().getById(normalizedId);
      if (!item || item.kind !== ItemKinds.HELD || !save.inventory.has(normalizedId)) return false;
      if (save.team.some((member, memberIndex) => memberIndex !== index && member.heldItem === normalizedId)) return false;
    }
    pokemon.heldItem = normalizedId;
    SaveSystem.getInstance().saveCurrent();
    this.dispatchChanged();
    return true;
  }

  /** @param {string} uid @returns {import('../data/pokemon/PokemonData.js').PokemonData|null} */
  getPokemonByUid(uid) {
    return this.getTeam().find((pokemon) => pokemon.uid === uid) ?? null;
  }

  /**
   * Applies a domain-system update to one owned team member without exposing the roster array.
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
    if (notify) this.dispatchChanged();
    return true;
  }

  /** Emits the standard team event after a batch roster mutation. */
  dispatchChanged() {
    EventBus.getInstance().dispatch(new TeamChangedEvent(this.getTeam().length));
  }
}
