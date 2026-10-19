/**
 * @file BallFilterData.js
 * @brief One Poké Ball filter of the player (C++: class BallFilterData : public BaseModel).
 * Port of the original G.pokeballs.filters entries.
 *
 * Serialized shape (save schema 4):
 *   { id, name|null (custom filters only), options { caught?, shiny?, caughtShiny?, type?, encounter? },
 *     ball (ItemDB ball id | BallRules.NO_BALL), enabled }
 * `locked` is not stored: a filter is locked when its id is a preset id (BallFilterPresets),
 * and the options of a locked filter are always re-read from the preset table.
 */
import { BaseModel } from '../core/BaseModel.js';
import { BallFilterPresets } from '../catch/BallFilterPresets.js';
import { EncounterKinds } from '../catch/EncounterKinds.js';
import { BALL_FILTER_TYPES } from '../catch/BallFilterOptions.js';
import { ItemDB } from '../items/ItemDB.js';
import { ItemKinds } from '../items/ItemKinds.js';
import { BallRules } from '../../config/BallRules.js';

const ENCOUNTER_VALUES = new Set(Object.values(EncounterKinds));

/**
 * @param {*} raw
 * @returns {Object} Options with known keys and valid values only
 */
function readOptions(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const options = {};
  for (const key of ['caught', 'shiny', 'caughtShiny']) {
    if (typeof source[key] === 'boolean') options[key] = source[key];
  }
  if (BALL_FILTER_TYPES.includes(source.type)) options.type = source.type;
  if (ENCOUNTER_VALUES.has(source.encounter)) options.encounter = source.encounter;
  return options;
}

/**
 * @param {*} ball
 * @returns {string} A ball item id, or BallRules.NO_BALL
 */
function readBall(ball) {
  return ItemDB.getInstance().getById(ball)?.kind === ItemKinds.BALL ? ball : BallRules.NO_BALL;
}

export class BallFilterData extends BaseModel {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    super('BallFilterData', 'Data');
    this.deserialize(data);
  }

  /**
   * @param {string} presetId
   * @returns {BallFilterData} The preset as a new save gets it (no ball, enabled)
   */
  static fromPreset(presetId) {
    return new BallFilterData({ id: presetId, ball: BallRules.NO_BALL, enabled: true });
  }

  /** @returns {boolean} Base filter: not deletable, not renamable, options read-only */
  isLocked() {
    return BallFilterPresets.has(this.id);
  }

  /** @returns {boolean} A ball is set (BallRules.NO_BALL otherwise) */
  hasBall() {
    return this.ball !== BallRules.NO_BALL;
  }

  /** @override */
  serialize() {
    return {
      id: this.id,
      name: this.isLocked() ? null : this.name,
      options: { ...this.options },
      ball: this.ball,
      enabled: this.enabled
    };
  }

  /** @override */
  deserialize(data = {}) {
    /** @type {string} */
    this.id = String(data?.id || '');
    /** @type {string|null} Player name of a custom filter */
    this.name = typeof data?.name === 'string' && data.name.trim() ? data.name.trim() : null;
    /** @type {Object} */
    this.options = this.isLocked() ? BallFilterPresets.optionsOf(this.id) : readOptions(data?.options);
    /** @type {string} */
    this.ball = readBall(data?.ball);
    /** @type {boolean} */
    this.enabled = data?.enabled !== false;
  }
}
