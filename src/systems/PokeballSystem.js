/**
 * @file PokeballSystem.js
 * @brief Poké Ball filters and ball stock of the active save (C++ equivalent: class
 * PokeballSystem : public BaseSystem). No DOM access. Port of the filter management of the
 * original pokeballs.js:
 *   - setBall / toggleEnabled work on every filter;
 *   - base (locked) filters cannot be deleted, renamed or have their options edited;
 *   - create() adds a custom filter at the top ("not caught", Poké Ball), reset() restores the
 *     presets; reorder() moves a filter to the place of another (drag & drop).
 * Every change saves once and dispatches BallFiltersChangedEvent.
 */

import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { EventBus } from '../core/EventBus.js';
import { BallFiltersChangedEvent } from '../core/events/BallFiltersChangedEvent.js';
import { BallFilterData } from '../data/save/BallFilterData.js';
import { BallFiltersData } from '../data/save/BallFiltersData.js';
import { BallFilterOptions, BALL_FILTER_TYPES } from '../data/catch/BallFilterOptions.js';
import { EncounterKinds } from '../data/catch/EncounterKinds.js';
import { BallFilterPresets } from '../data/catch/BallFilterPresets.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { BallRules } from '../config/BallRules.js';
import { t } from '../localization/LocalizationManager.js';

export class PokeballSystem extends BaseSystem {
  /** @private @type {PokeballSystem|null} */
  static _instance = null;

  /** @returns {PokeballSystem} */
  static getInstance() {
    if (!PokeballSystem._instance) {
      PokeballSystem._instance = new PokeballSystem();
    }
    return PokeballSystem._instance;
  }

  constructor() {
    super('PokeballSystem', 'System');
  }

  // --- Queries ---

  /** @returns {BallFilterData[]} Filters of the active save, priority order (empty without save) */
  getFilters() {
    return this._save()?.ballFilters.getAll() ?? [];
  }

  /**
   * @param {string} filterId
   * @returns {BallFilterData|null}
   */
  getFilter(filterId) {
    return this._save()?.ballFilters.getById(filterId) ?? null;
  }

  /**
   * @param {string} ballId
   * @returns {number} Copies in the bag
   */
  getCount(ballId) {
    return this._save()?.inventory.count(ballId) ?? 0;
  }

  /**
   * Balls offered by the picker: every ball in the original order, a hidden ball only once owned.
   * @returns {Readonly<Object>[]} ItemDB ball items
   */
  getSelectableBalls() {
    return ItemDB.getInstance().getBalls().filter((ball) => !ball.hidden || this.getCount(ball.id) > 0);
  }

  /**
   * @param {BallFilterData} filter
   * @returns {string} Display name (preset label or player name)
   */
  getLabel(filter) {
    return filter.isLocked() ? t(BallFilterPresets.labelKey(filter.id)) : filter.name || filter.id;
  }

  /**
   * @param {BallFilterData} filter
   * @param {string} toggle - BallFilterOptions.NEW | CAUGHT | SHINY | CAUGHT_SHINY
   * @returns {boolean} Editor toggle state (original ballFilterOptionOn)
   */
  isToggleOn(filter, toggle) {
    const options = filter.options;
    switch (toggle) {
      case BallFilterOptions.NEW: return options.caught === false;
      case BallFilterOptions.CAUGHT: return options.caught === true;
      case BallFilterOptions.SHINY: return options.shiny === true;
      case BallFilterOptions.CAUGHT_SHINY: return options.caughtShiny === true;
      default: return false;
    }
  }

  // --- Commands (every filter) ---

  /**
   * @param {string} filterId
   * @param {string} ballId - Ball item id or BallRules.NO_BALL
   * @returns {boolean}
   */
  setBall(filterId, ballId) {
    const filter = this.getFilter(filterId);
    const valid = ballId === BallRules.NO_BALL || !!ItemDB.getInstance().getById(ballId)?.ball;
    if (!filter || !valid) return false;
    filter.ball = ballId;
    return this._commit(filterId);
  }

  /**
   * @param {string} filterId
   * @returns {boolean}
   */
  toggleEnabled(filterId) {
    const filter = this.getFilter(filterId);
    if (!filter) return false;
    filter.enabled = !filter.enabled;
    return this._commit(filterId);
  }

  /**
   * Moves a filter to the place of another one (original reorderBallFilter).
   * @param {string} fromId
   * @param {string} toId
   * @returns {boolean}
   */
  reorder(fromId, toId) {
    const filters = this._save()?.ballFilters;
    if (!filters || fromId === toId) return false;
    const list = filters.getAll();
    const from = filters.indexOf(fromId);
    const to = filters.indexOf(toId);
    if (from < 0 || to < 0) return false;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    return this._commit(null);
  }

  /** @returns {string|null} Id of the new custom filter (first in priority) */
  create() {
    const filters = this._save()?.ballFilters;
    if (!filters) return null;
    const list = filters.getAll();
    let id = `${BallRules.CUSTOM_FILTER_ID_PREFIX}${Date.now()}`;
    while (filters.getById(id)) id = `${id}_`;
    list.unshift(new BallFilterData({
      id,
      name: t('ball_custom_filter_name', { n: list.length + 1 }),
      options: { ...BallRules.CUSTOM_FILTER_OPTIONS },
      ball: BallRules.CUSTOM_FILTER_BALL,
      enabled: true
    }));
    this._commit(null);
    return id;
  }

  /** Restores the presets (custom filters are removed). @returns {boolean} */
  reset() {
    const save = this._save();
    if (!save) return false;
    save.ballFilters = new BallFiltersData();
    return this._commit(null);
  }

  // --- Commands (custom filters only) ---

  /**
   * @param {string} filterId
   * @returns {boolean}
   */
  remove(filterId) {
    const filters = this._save()?.ballFilters;
    const filter = this.getFilter(filterId);
    if (!filters || !filter || filter.isLocked()) return false;
    filters.getAll().splice(filters.indexOf(filterId), 1);
    return this._commit(null);
  }

  /**
   * @param {string} filterId
   * @param {string} name - Empty = back to the id
   * @returns {boolean}
   */
  rename(filterId, name) {
    const filter = this._editable(filterId);
    if (!filter) return false;
    filter.name = String(name ?? '').trim() || null;
    return this._commit(filterId);
  }

  /**
   * Turns an editor toggle on or off (original setBallFilterOption).
   * @param {string} filterId
   * @param {string} toggle - BallFilterOptions.NEW | CAUGHT | SHINY | CAUGHT_SHINY
   * @param {boolean} on
   * @returns {boolean}
   */
  setToggle(filterId, toggle, on) {
    const filter = this._editable(filterId);
    if (!filter) return false;
    const options = filter.options;
    switch (toggle) {
      case BallFilterOptions.NEW:
      case BallFilterOptions.CAUGHT:
        if (on) options.caught = toggle === BallFilterOptions.CAUGHT;
        else delete options.caught;
        break;
      case BallFilterOptions.SHINY:
        if (on) options.shiny = true;
        else delete options.shiny;
        break;
      case BallFilterOptions.CAUGHT_SHINY:
        if (on) { options.caughtShiny = true; options.caught = true; } else delete options.caughtShiny;
        break;
      default:
        return false;
    }
    return this._commit(filterId);
  }

  /**
   * Sets or removes a value option (original setBallFilterValueOption).
   * @param {string} filterId
   * @param {string} option - BallFilterOptions.TYPE | ENCOUNTER
   * @param {string|null} value - null removes the option
   * @returns {boolean}
   */
  setValue(filterId, option, value) {
    const filter = this._editable(filterId);
    if (!filter || !this._isValidValue(option, value)) return false;
    if (value === null) delete filter.options[option];
    else filter.options[option] = value;
    return this._commit(filterId);
  }

  /**
   * Adds a value option with its default value (type normal / encounter route).
   * @param {string} filterId
   * @param {string} option - BallFilterOptions.TYPE | ENCOUNTER
   * @returns {boolean}
   */
  addValue(filterId, option) {
    const value = option === BallFilterOptions.TYPE ? BallRules.DEFAULT_TYPE_OPTION : BallRules.DEFAULT_ENCOUNTER_OPTION;
    return this.setValue(filterId, option, value);
  }

  // --- Internals ---

  /** @private @returns {import('../data/save/SaveData.js').SaveData|null} */
  _save() {
    return SaveSystem.getInstance().getCurrentSave();
  }

  /** @private @returns {BallFilterData|null} A custom filter */
  _editable(filterId) {
    const filter = this.getFilter(filterId);
    return filter && !filter.isLocked() ? filter : null;
  }

  /** @private */
  _isValidValue(option, value) {
    if (value === null) return option === BallFilterOptions.TYPE || option === BallFilterOptions.ENCOUNTER;
    if (option === BallFilterOptions.TYPE) return BALL_FILTER_TYPES.includes(value);
    if (option === BallFilterOptions.ENCOUNTER) return Object.values(EncounterKinds).includes(value);
    return false;
  }

  /**
   * @private
   * @param {string|null} filterId
   * @returns {boolean} true
   */
  _commit(filterId) {
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new BallFiltersChangedEvent(filterId));
    return true;
  }
}
