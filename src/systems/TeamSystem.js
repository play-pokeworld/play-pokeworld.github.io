/**
 * @file TeamSystem.js
 * @brief Active team operations (C++ equivalent: class TeamSystem : public BaseSystem). No DOM access.
 *
 * The party only stores uids of Pokémon owned by the collection (BoxSystem): joining or leaving the
 * team never copies nor removes a Pokémon, it only changes this ordered reference list.
 * Views never edit the party themselves: they call this system and listen to TeamChangedEvent.
 */

import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { EventBus } from '../core/EventBus.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { PlayerDefaults } from '../config/PlayerDefaults.js';
import { PokemonActionIds } from '../config/PokemonUsageRules.js';
import { BoxSystem } from './BoxSystem.js';
import { PokemonUsageSystem } from './PokemonUsageSystem.js';
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

  /** @returns {ReadonlyArray<import('../data/pokemon/PokemonData.js').PokemonData>} Party Pokémon, lead first */
  getTeam() {
    return SaveSystem.getInstance().getCurrentSave()?.team ?? [];
  }

  /** @returns {ReadonlyArray<string>} Party uids, lead first */
  getMemberUids() {
    return SaveSystem.getInstance().getCurrentSave()?.teamMembers.getUids() ?? [];
  }

  /** @param {string} uid @returns {boolean} */
  isMember(uid) {
    return SaveSystem.getInstance().getCurrentSave()?.teamMembers.includes(uid) === true;
  }

  /** @returns {boolean} The team has a free slot */
  hasFreeSlot() {
    return this.getMemberUids().length < PlayerDefaults.TEAM_SIZE;
  }

  /**
   * Registers a newly obtained Pokémon in the collection and puts it in the party. Does not
   * persist: the caller saves once after its whole operation.
   * @param {import('../data/pokemon/PokemonData.js').PokemonData} pokemon
   * @param {{notify?: boolean,deferSave?:boolean}} [options]
   * @returns {boolean} False when the team is full or no save is loaded (nothing is registered)
   */
  addPokemon(pokemon, { notify = true, deferSave = false } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !pokemon || !this.hasFreeSlot()) return false;
    if (!BoxSystem.getInstance().addPokemon(pokemon, { notify: false, deferSave })) return false;
    save.teamMembers.setUids([...save.teamMembers.getUids(), pokemon.uid]);
    if (notify) {
      this.dispatchChanged();
      BoxSystem.getInstance().dispatchChanged();
    }
    return true;
  }

  /**
   * Puts an owned Pokémon that no mode uses into a free party slot.
   * @param {string} uid
   * @param {{persist?: boolean, notify?: boolean}} [options]
   * @returns {boolean}
   */
  addMember(uid, { persist = true, notify = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.hasFreeSlot() || !this._canJoin(uid)) return false;
    if (!save.teamMembers.setUids([...save.teamMembers.getUids(), uid])) return false;
    this._finish({ persist, notify });
    return true;
  }

  /**
   * Takes a Pokémon out of the party (it stays in the collection, so in the PC box). The last
   * party member cannot leave. Persistence and event dispatch may be deferred by a larger operation.
   * @param {string} uid
   * @param {{persist?: boolean, notify?: boolean}} [options]
   * @returns {import('../data/pokemon/PokemonData.js').PokemonData|null}
   */
  removePokemon(uid, { persist = true, notify = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || save.teamMembers.size <= 1 || !save.teamMembers.includes(uid)) return null;
    save.teamMembers.setUids(save.teamMembers.getUids().filter((member) => member !== uid));
    this._finish({ persist, notify });
    return save.collection.get(uid);
  }

  /**
   * Puts the Pokémon at `index` in first position (it fights first).
   * @param {number} index
   * @returns {boolean} False when the index is not a valid non-lead position
   */
  setLead(index) {
    const uids = [...this.getMemberUids()];
    if (!Number.isInteger(index) || index <= 0 || index >= uids.length) return false;
    [uids[0], uids[index]] = [uids[index], uids[0]];
    return this._setOrder(uids);
  }

  /**
   * Swaps two active team members by stable uid (drag/drop and keyboard reorder).
   * @param {string} firstUid
   * @param {string} secondUid
   * @param {{persist?:boolean,notify?:boolean}} [options]
   * @returns {boolean}
   */
  swapMembers(firstUid, secondUid, { persist = true, notify = true } = {}) {
    if (!firstUid || !secondUid || firstUid === secondUid) return false;
    const uids = [...this.getMemberUids()];
    const firstIndex = uids.indexOf(firstUid);
    const secondIndex = uids.indexOf(secondUid);
    if (firstIndex < 0 || secondIndex < 0) return false;
    [uids[firstIndex], uids[secondIndex]] = [uids[secondIndex], uids[firstIndex]];
    return this._setOrder(uids, { persist, notify });
  }

  /**
   * Replaces one party member with an owned Pokémon that no mode uses, keeping the slot position.
   * The outgoing member simply leaves the party and stays in the PC box.
   * @param {string} teamUid
   * @param {string} incomingUid
   * @param {{persist?:boolean,notify?:boolean}} [options]
   * @returns {boolean}
   */
  replaceMember(teamUid, incomingUid, { persist = true, notify = true } = {}) {
    if (!teamUid || !incomingUid || teamUid === incomingUid || !this._canJoin(incomingUid)) return false;
    const uids = [...this.getMemberUids()];
    const index = uids.indexOf(teamUid);
    if (index < 0) return false;
    uids[index] = incomingUid;
    return this._setOrder(uids, { persist, notify });
  }

  /**
   * Replaces the whole party (preset loading). Every uid must be owned and either already in the
   * party or free of any other usage; the party cannot be emptied.
   * @param {string[]} uids
   * @param {{persist?: boolean, notify?: boolean}} [options]
   * @returns {boolean}
   */
  setMembers(uids, { persist = true, notify = true } = {}) {
    if (!Array.isArray(uids) || uids.length === 0) return false;
    if (!uids.every((uid) => this.isMember(uid) || this._canJoin(uid))) return false;
    return this._setOrder(uids, { persist, notify });
  }

  /**
   * Sets or removes one Pokémon's held item. Inventory ownership and uniqueness are checked here
   * so every team mutation still passes through TeamSystem.
   * @param {number} index
   * @param {string|null} itemId
   * @returns {boolean}
   */
  setHeldItem(index, itemId) {
    const team = this.getTeam();
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !Number.isInteger(index) || index < 0 || index >= team.length) return false;
    const normalizedId = typeof itemId === 'string' && itemId ? itemId : null;
    const pokemon = team[index];
    if (pokemon.heldItem === normalizedId) return true;
    if (!PokemonUsageSystem.getInstance().canPerform(pokemon.uid, PokemonActionIds.CHANGE_HELD_ITEM)) return false;
    if (normalizedId) {
      const item = ItemDB.getInstance().getById(normalizedId);
      if (!item || item.kind !== ItemKinds.HELD || !save.inventory.has(normalizedId)) return false;
      if (team.some((member, memberIndex) => memberIndex !== index && member.heldItem === normalizedId)) return false;
    }
    pokemon.heldItem = normalizedId;
    SaveSystem.getInstance().saveCurrent();
    BoxSystem.getInstance().dispatchPokemonChanged(pokemon.uid);
    return true;
  }

  /** @param {string} uid @returns {import('../data/pokemon/PokemonData.js').PokemonData|null} Party member only */
  getPokemonByUid(uid) {
    return this.isMember(uid) ? BoxSystem.getInstance().getPokemonByUid(uid) : null;
  }

  /**
   * Applies a domain-system update to one party member (battle rewards, team-only effects).
   * @param {string} uid
   * @param {(pokemon: import('../data/pokemon/PokemonData.js').PokemonData) => boolean} update
   * @param {{persist?:boolean, notify?:boolean}} [options]
   * @returns {boolean}
   */
  updatePokemon(uid, update, options = {}) {
    return this.isMember(uid) && BoxSystem.getInstance().updatePokemon(uid, update, options);
  }

  /** Emits the standard team event (and the usage event) after a party mutation. */
  dispatchChanged() {
    EventBus.getInstance().dispatch(new TeamChangedEvent(this.getMemberUids().length));
    PokemonUsageSystem.getInstance().dispatchChanged();
  }

  /** @private @param {string} uid @returns {boolean} Owned and allowed to join the party */
  _canJoin(uid) {
    return !!BoxSystem.getInstance().getPokemonByUid(uid)
      && PokemonUsageSystem.getInstance().canPerform(uid, PokemonActionIds.JOIN_TEAM);
  }

  /** @private @param {string[]} uids @param {{persist?:boolean,notify?:boolean}} [options] @returns {boolean} */
  _setOrder(uids, { persist = true, notify = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !uids.every((uid) => save.collection.has(uid)) || !save.teamMembers.setUids(uids)) return false;
    this._finish({ persist, notify });
    return true;
  }

  /** @private @param {{persist:boolean,notify:boolean}} options */
  _finish({ persist, notify }) {
    if (persist) SaveSystem.getInstance().saveCurrent();
    if (notify) this.dispatchChanged();
  }
}
