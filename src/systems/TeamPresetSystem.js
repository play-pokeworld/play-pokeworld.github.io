/**
 * @file TeamPresetSystem.js
 * @brief Save, edit and load ordered team presets. The system is DOM-free; party changes go
 * through TeamSystem, while presets store only uids of collection (PC box) Pokémon.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { TeamSystem } from './TeamSystem.js';
import { BoxSystem } from './BoxSystem.js';
import { PokemonUsageSystem } from './PokemonUsageSystem.js';
import { PokemonActionIds } from '../config/PokemonUsageRules.js';
import { BattleSystem } from './BattleSystem.js';
import { EventBus } from '../core/EventBus.js';
import { TeamPresetsChangedEvent } from '../core/events/TeamPresetsChangedEvent.js';

export class TeamPresetSystem extends BaseSystem {
  /** @private @type {TeamPresetSystem|null} */
  static _instance = null;

  /** @returns {TeamPresetSystem} */
  static getInstance() {
    if (!TeamPresetSystem._instance) TeamPresetSystem._instance = new TeamPresetSystem();
    return TeamPresetSystem._instance;
  }

  constructor() {
    super('TeamPresetSystem', 'System');
  }

  /** @returns {import('../data/save/TeamPresetsData.js').TeamPresetsData|null} */
  getData() {
    return SaveSystem.getInstance().getCurrentSave()?.teamPresets ?? null;
  }

  /** @returns {Array<{id: string, name: string|null, members: string[]}>} */
  getAll() {
    return this.getData()?.getAll() ?? [];
  }

  /** @param {string} id @returns {Object|null} */
  getPreset(id) {
    return this.getData()?.getById(id) ?? null;
  }

  /** @returns {Object|null} */
  getActivePreset() {
    const data = this.getData();
    return data ? data.getById(data.activeId) : null;
  }

  /**
   * Resolves one saved uid against the collection. `source` is 'team' for a party member and
   * 'box' otherwise; Pokémon another mode uses (daycare, training…) are not resolvable for a party.
   * @param {string} uid
   * @returns {{pokemon: import('../data/pokemon/PokemonData.js').PokemonData, source: 'team'|'box'}|null}
   */
  resolvePokemon(uid) {
    if (!uid) return null;
    const pokemon = BoxSystem.getInstance().getPokemonByUid(uid);
    if (!pokemon) return null;
    if (TeamSystem.getInstance().isMember(uid)) return { pokemon, source: 'team' };
    return PokemonUsageSystem.getInstance().canPerform(uid, PokemonActionIds.JOIN_TEAM)
      ? { pokemon, source: 'box' }
      : null;
  }

  /**
   * Resolves every saved member in order, retaining unresolved references for the UI to show.
   * @param {string} id
   * @returns {Array<{uid: string, pokemon: import('../data/pokemon/PokemonData.js').PokemonData|null, source: string|null}>}
   */
  getResolvedMembers(id) {
    const preset = this.getPreset(id);
    if (!preset) return [];
    return preset.members.map((uid) => {
      const resolved = this.resolvePokemon(uid);
      return { uid, pokemon: resolved?.pokemon ?? null, source: resolved?.source ?? null };
    });
  }

  /**
   * Pokémon a preset can use: the party first, then the collection Pokémon free to join it.
   * @returns {Array<{pokemon: import('../data/pokemon/PokemonData.js').PokemonData, source: 'team'|'box'}>}
   */
  getRosterMembers() {
    const team = TeamSystem.getInstance().getTeam();
    const usage = PokemonUsageSystem.getInstance();
    const available = BoxSystem.getInstance().getAll()
      .filter((pokemon) => usage.canPerform(pokemon.uid, PokemonActionIds.JOIN_TEAM));
    return [
      ...team.map((pokemon) => ({ pokemon, source: 'team' })),
      ...available.map((pokemon) => ({ pokemon, source: 'box' }))
    ].filter(({ pokemon }) => pokemon && typeof pokemon.uid === 'string' && pokemon.uid);
  }

  /** @param {string} id @param {string} name @returns {boolean} */
  rename(id, name) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !save.teamPresets.setName(id, name)) return false;
    SaveSystem.getInstance().saveCurrent();
    this._emitChanged(id);
    return true;
  }

  /** @param {string} id @param {string[]} members @returns {boolean} */
  setMembers(id, members) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !save.teamPresets.setMembers(id, members)) return false;
    SaveSystem.getInstance().saveCurrent();
    this._emitChanged(id);
    return true;
  }

  /**
   * Stores the current party as a preset without changing which preset is active.
   * @param {string} id
   * @returns {boolean}
   */
  saveCurrentToPreset(id) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !save.teamPresets.setMembers(id, TeamSystem.getInstance().getTeam().map((pokemon) => pokemon.uid).filter(Boolean))) return false;
    SaveSystem.getInstance().saveCurrent();
    this._emitChanged(id);
    return true;
  }

  /**
   * Applies a preset to the active party; unselected party members simply leave it (they stay in
   * the PC box). Loading is blocked during a battle; unresolved or busy uids are skipped.
   * @param {string} id
   * @returns {{ok: boolean, reason?: string, count?: number, missingCount?: number}}
   */
  load(id) {
    const saveSystem = SaveSystem.getInstance();
    const save = saveSystem.getCurrentSave();
    const preset = save?.teamPresets.getById(id);
    if (!save || !preset) return { ok: false, reason: 'missing' };
    if (BattleSystem.getInstance().isActive()) return { ok: false, reason: 'battle' };
    if (preset.members.length === 0) return { ok: false, reason: 'empty' };

    const nextUids = [];
    const selectedUids = new Set();
    let missingCount = 0;
    for (const uid of preset.members) {
      const resolved = this.resolvePokemon(uid);
      if (!resolved) {
        missingCount++;
        continue;
      }
      if (selectedUids.has(uid)) continue;
      selectedUids.add(uid);
      nextUids.push(uid);
    }
    if (nextUids.length === 0) return { ok: false, reason: 'not-found' };

    const teamSystem = TeamSystem.getInstance();
    if (!teamSystem.setMembers(nextUids, { persist: false, notify: false })) {
      return { ok: false, reason: 'roster' };
    }
    save.teamPresets.setActiveId(id);
    saveSystem.saveCurrent();
    teamSystem.dispatchChanged();
    BoxSystem.getInstance().dispatchChanged();
    this._emitChanged(id);
    return { ok: true, count: nextUids.length, missingCount };
  }

  /** @private @param {string} id */
  _emitChanged(id) {
    EventBus.getInstance().dispatch(new TeamPresetsChangedEvent(id));
  }
}
