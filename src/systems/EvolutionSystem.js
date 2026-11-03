/**
 * @file EvolutionSystem.js
 * @brief Single owner of evolution effects (level based and item based), DOM-free.
 *
 * Evolution NEVER transforms the Pokémon that triggers it: the source keeps its species, level,
 * talent and moves, and the evolved species joins the collection as a NEW Pokémon at level 1
 * (reference behaviour). Each source Pokémon produces a given target species at most once, tracked
 * by `PokemonData.evolvedTargets`, so a Pokémon that keeps levelling does not flood the box.
 *
 * Eligibility lives in the content data (`species.evolutions[]`): `level` for level based entries,
 * `item` (+ optional `minLevel`) for item based ones, optional `condition` for IV driven splits.
 * Region gating uses the same rule as the item path: a species from a locked region cannot be
 * produced yet, and stays pending until that region is unlocked.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { BoxSystem } from './BoxSystem.js';
import { FeatureAccessSystem } from './FeatureAccessSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { PokemonFactory } from '../data/pokemon/PokemonFactory.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { PokemonRules } from '../config/PokemonRules.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { t } from '../localization/LocalizationManager.js';
import { EventBus } from '../core/EventBus.js';
import { PokemonEvolvedEvent } from '../core/events/PokemonEvolvedEvent.js';

export class EvolutionSystem extends BaseSystem {
  /** @private @type {EvolutionSystem|null} */
  static _instance = null;

  /** @returns {EvolutionSystem} */
  static getInstance() {
    if (!EvolutionSystem._instance) EvolutionSystem._instance = new EvolutionSystem();
    return EvolutionSystem._instance;
  }

  constructor() {
    super('EvolutionSystem', 'System');
  }

  /**
   * Ids of the species this Pokémon can produce right now through a level based evolution.
   * @param {import('../data/pokemon/PokemonData.js').PokemonData} pokemon
   * @returns {string[]}
   */
  getLevelTargets(pokemon) {
    if (!pokemon) return [];
    return pokemon.getPendingLevelEvolutions().filter((id) => this._isAccessible(id));
  }

  /**
   * Applies every level based evolution due for one Pokémon (called after a level change).
   * @param {import('../data/pokemon/PokemonData.js').PokemonData} pokemon
   * @param {{notify?:boolean, deferSave?:boolean}} [options]
   * @returns {{targets:string[], blocked:string[], created:string[]}} Produced ids, region blocked ids and new collection ids
   */
  applyLevelEvolutions(pokemon, { notify = true, deferSave = false } = {}) {
    const result = { targets: [], blocked: [], created: [] };
    if (!pokemon) return result;
    for (const targetId of pokemon.getPendingLevelEvolutions()) {
      if (!this._isAccessible(targetId)) {
        result.blocked.push(targetId);
        continue;
      }
      const outcome = this._produce(pokemon, targetId, { notify, deferSave });
      if (!outcome) continue;
      result.targets.push(targetId);
      if (outcome.createdUid) result.created.push(outcome.createdUid);
    }
    if (result.targets.length && !deferSave) SaveSystem.getInstance().saveCurrent();
    return result;
  }

  /**
   * Applies an item based evolution (stone, link stone, ...).
   * @param {import('../data/pokemon/PokemonData.js').PokemonData} pokemon
   * @param {string} itemId
   * @param {{notify?:boolean, deferSave?:boolean}} [options]
   * @returns {{target:string, createdUid:string|null}|null} Null when the item cannot evolve it now
   */
  applyItemEvolution(pokemon, itemId, { notify = true, deferSave = false } = {}) {
    const evolution = this.findItemEvolution(pokemon, itemId);
    if (!evolution) return null;
    const outcome = this._produce(pokemon, evolution.to, { notify, deferSave, itemId });
    if (!outcome) return null;
    if (!deferSave) SaveSystem.getInstance().saveCurrent();
    return { target: evolution.to, createdUid: outcome.createdUid };
  }

  /**
   * The evolution entry this item unlocks for this Pokémon, or null when none is available now.
   * @param {import('../data/pokemon/PokemonData.js').PokemonData} pokemon
   * @param {string} itemId
   * @returns {Object|null}
   */
  findItemEvolution(pokemon, itemId) {
    if (!pokemon || !itemId) return null;
    const species = PokemonDB.getInstance().getById(pokemon.species);
    if (!species?.evolutions?.length) return null;
    const evolution = species.evolutions.find((entry) =>
      entry.item === itemId
      && pokemon.level >= (Number(entry.minLevel) || PokemonRules.MIN_LEVEL)
      && !pokemon.hasEvolvedInto(entry.to));
    return evolution && this._isAccessible(evolution.to) ? evolution : null;
  }

  /**
   * Creates the evolved species at level 1 and registers it, then flags the source Pokémon.
   * @private
   * @param {import('../data/pokemon/PokemonData.js').PokemonData} pokemon
   * @param {string} targetId
   * @param {{notify?:boolean, deferSave?:boolean, itemId?:string|null}} options
   * @returns {{createdUid:string|null}|null}
   */
  _produce(pokemon, targetId, { notify = true, deferSave = false, itemId = null } = {}) {
    const target = PokemonDB.getInstance().getById(targetId);
    if (!target || pokemon.hasEvolvedInto(target.id)) return null;
    // Without a save there is no collection to register the new Pokémon in: nothing to evolve yet.
    if (!SaveSystem.getInstance().getCurrentSave()) return null;
    const evolved = PokemonFactory.create(target.id, PokemonRules.MIN_LEVEL, { shiny: pokemon.shiny });
    if (!evolved || !BoxSystem.getInstance().addPokemon(evolved, { notify: false, deferSave: true })) return null;
    // Recorded only once the new Pokémon is registered, so a failed creation can be retried.
    pokemon.markEvolvedInto(target.id);
    const createdUid = evolved.uid;
    if (notify) this._notifySuccess(pokemon, target.id, { itemId });
    EventBus.getInstance().dispatch(new PokemonEvolvedEvent(pokemon.uid, pokemon.species, target.id, createdUid, { deferSave }));
    return { createdUid };
  }

  /**
   * @private
   * @param {import('../data/pokemon/PokemonData.js').PokemonData} pokemon
   * @param {string} targetId
   * @param {{itemId?:string|null}} options
   */
  _notifySuccess(pokemon, targetId, { itemId = null } = {}) {
    const name = pokemon.getDisplayName();
    const evolution = t(`pokemon.${targetId}`);
    const message = itemId
      ? t('evolution_item_success', { name, item: t(`item.${itemId}.name`), evolution, level: PokemonRules.MIN_LEVEL })
      : t('evolution_level_success', { name, evolution, level: PokemonRules.MIN_LEVEL });
    NotificationSystem.getInstance().notifyTemporary(message, {
      channel: NotificationChannels.GAMEPLAY,
      tone: NotificationTones.SUCCESS
    });
  }

  /**
   * @private
   * @param {string} speciesId
   * @returns {boolean} True when the species belongs to an unlocked region
   */
  _isAccessible(speciesId) {
    const target = PokemonDB.getInstance().getById(speciesId);
    if (!target) return false;
    const regions = FeatureAccessSystem.getInstance().getSnapshot().regions;
    return !regions || regions.includes(target.region);
  }
}
