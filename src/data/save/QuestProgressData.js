/**
 * @file QuestProgressData.js
 * @brief Quest state of a save (C++: class QuestProgressData : public BaseModel).
 * Definitions live in QuestDB (read-only); this model only stores what the player did.
 * A quest is referenced by its QuestDB key '<category>.<id>' ('main.12', 'side.s4', 'repeatable.r3').
 *
 * Serialized shape (save schema 12):
 *   { mainStep: { <region>: index of the current main quest in the region chain },
 *     active: { <questKey>: { progress } },   active main, side and repeatable quests
 *     completed: [questKeys],                 claimed side quests (done once for all)
 *     repeatablesCompleted: n,
 *     repeatableUnlocked, repeatableChoices, repeatableLastRollAt, repeatableSlotUpgrades }
 */
import { BaseModel } from '../core/BaseModel.js';
import { QuestRules } from '../../config/QuestRules.js';

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

  /** @returns {string[]} Copy of the saved repeatable offer ids */
  getRepeatableChoices() {
    return [...this.repeatableChoices];
  }

  /**
   * Replaces the persisted board choices with unique ids, capped at the original offer count.
   * @param {*} choices
   * @returns {boolean} Whether the stored choices changed
   */
  setRepeatableChoices(choices) {
    const normalized = [];
    for (const value of Array.isArray(choices) ? choices : []) {
      if (typeof value !== 'string') continue;
      const id = value.trim();
      if (!id || normalized.includes(id)) continue;
      normalized.push(id);
      if (normalized.length >= QuestRules.REPEATABLE_OFFER_COUNT) break;
    }
    const changed = normalized.length !== this.repeatableChoices.length ||
      normalized.some((id, index) => id !== this.repeatableChoices[index]);
    this.repeatableChoices = normalized;
    return changed;
  }

  /** @returns {boolean} Whether the repeatable board is unlocked */
  isRepeatableUnlocked() {
    return this.repeatableUnlocked;
  }

  /** @param {boolean} unlocked @returns {boolean} Whether the value changed */
  setRepeatableUnlocked(unlocked) {
    const value = unlocked === true;
    const changed = this.repeatableUnlocked !== value;
    this.repeatableUnlocked = value;
    return changed;
  }

  /** @returns {number} Timestamp (milliseconds since epoch) of the last roll */
  getRepeatableLastRollAt() {
    return this.repeatableLastRollAt;
  }

  /** @param {*} timestamp @returns {boolean} Whether the timestamp changed */
  setRepeatableLastRollAt(timestamp) {
    const number = Number(timestamp);
    const value = Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
    const changed = this.repeatableLastRollAt !== value;
    this.repeatableLastRollAt = value;
    return changed;
  }

  /** @returns {number} Number of purchased additional repeatable slots */
  getRepeatableSlotUpgrades() {
    return this.repeatableSlotUpgrades;
  }

  /** @param {*} upgrades @returns {boolean} Whether the upgrade count changed */
  setRepeatableSlotUpgrades(upgrades) {
    const number = Number(upgrades);
    const value = Number.isFinite(number)
      ? Math.max(0, Math.min(QuestRules.REPEATABLE_SLOT_UPGRADE_COSTS.length, Math.floor(number)))
      : 0;
    const changed = this.repeatableSlotUpgrades !== value;
    this.repeatableSlotUpgrades = value;
    return changed;
  }

  /** @returns {number} Base slot plus purchased slot upgrades */
  getRepeatableSlotCount() {
    return Math.min(QuestRules.REPEATABLE_MAX_SLOTS, QuestRules.REPEATABLE_SLOTS + this.repeatableSlotUpgrades);
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
      repeatablesCompleted: this.repeatablesCompleted,
      repeatableUnlocked: this.repeatableUnlocked,
      repeatableChoices: [...this.repeatableChoices],
      repeatableLastRollAt: this.repeatableLastRollAt,
      repeatableSlotUpgrades: this.repeatableSlotUpgrades
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
    this.repeatableUnlocked = raw.repeatableUnlocked === true;
    this.repeatableChoices = [];
    this.setRepeatableChoices(raw.repeatableChoices);
    this.repeatableLastRollAt = 0;
    this.setRepeatableLastRollAt(raw.repeatableLastRollAt);
    this.repeatableSlotUpgrades = 0;
    this.setRepeatableSlotUpgrades(raw.repeatableSlotUpgrades);
  }
}
