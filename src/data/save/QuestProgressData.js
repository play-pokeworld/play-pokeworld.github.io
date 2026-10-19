/**
 * @file QuestProgressData.js
 * @brief Quest state of a save (C++: class QuestProgressData : public BaseModel).
 * Definitions live in QuestDB (read-only); this model only stores what the player did.
 * A quest is referenced by its QuestDB key '<category>.<id>' ('main.12', 'side.s4').
 *
 * Serialized shape (save schema 3):
 *   { mainStep: { <region>: index of the current main quest in the region chain },
 *     active: { <questKey>: { progress } },   active quests (current main quests included)
 *     completed: [questKeys],                 claimed side quests (done once for all)
 *     repeatablesCompleted: n }
 */
import { BaseModel } from '../core/BaseModel.js';

export class QuestProgressData extends BaseModel {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    super('QuestProgressData', 'Data');
    this.deserialize(data);
  }

  /**
   * @param {string} region
   * @returns {number} Index of the current main quest in the region chain
   */
  getMainStep(region) {
    return this.mainStep[region] || 0;
  }

  /**
   * @param {string} region
   * @param {number} step
   */
  setMainStep(region, step) {
    this.mainStep[region] = Math.max(0, Math.floor(step));
  }

  /** @returns {string[]} Keys of the active quests */
  getActiveKeys() {
    return Object.keys(this.active);
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  isActive(key) {
    return Object.prototype.hasOwnProperty.call(this.active, key);
  }

  /**
   * @param {string} key
   * @returns {number}
   */
  getProgress(key) {
    return this.active[key]?.progress || 0;
  }

  /**
   * @param {string} key
   * @param {number} progress
   */
  setProgress(key, progress) {
    if (this.isActive(key)) this.active[key].progress = Math.max(0, Math.floor(progress));
  }

  /** @param {string} key */
  activate(key) {
    if (!this.isActive(key)) this.active[key] = { progress: 0 };
  }

  /** @param {string} key */
  deactivate(key) {
    delete this.active[key];
  }

  /**
   * @param {string} key
   * @returns {boolean} true when a side quest has been claimed
   */
  isCompleted(key) {
    return this.completed.includes(key);
  }

  /** @param {string} key */
  markCompleted(key) {
    if (!this.isCompleted(key)) this.completed.push(key);
  }

  /** @override */
  serialize() {
    const active = {};
    for (const [key, state] of Object.entries(this.active)) active[key] = { progress: state.progress };
    return {
      mainStep: { ...this.mainStep },
      active,
      completed: [...this.completed],
      repeatablesCompleted: this.repeatablesCompleted
    };
  }

  /** @override */
  deserialize(data = {}) {
    const raw = data || {};
    /** @type {Record<string, number>} */
    this.mainStep = {};
    for (const [region, step] of Object.entries(raw.mainStep || {})) {
      const value = Math.floor(Number(step) || 0);
      if (value > 0) this.mainStep[region] = value;
    }
    /** @type {Record<string, {progress: number}>} */
    this.active = {};
    for (const [key, state] of Object.entries(raw.active || {})) {
      this.active[key] = { progress: Math.max(0, Math.floor(Number(state?.progress) || 0)) };
    }
    /** @type {string[]} */
    this.completed = Array.isArray(raw.completed) ? [...new Set(raw.completed.filter((key) => typeof key === 'string'))] : [];
    this.repeatablesCompleted = Math.max(0, Math.floor(Number(raw.repeatablesCompleted) || 0));
  }
}
