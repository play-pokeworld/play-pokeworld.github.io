/**
 * @file TutorialProgressData.js
 * @brief Persistent completion and one-time reward flags for the guided tutorial.
 */
import { BaseModel } from '../core/BaseModel.js';

/** @param {*} value @returns {string[]} */
function readIds(value) {
  if (Array.isArray(value)) return [...new Set(value.filter((id) => typeof id === 'string' && id))];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).filter(([, enabled]) => enabled === true).map(([id]) => id);
}

export class TutorialProgressData extends BaseModel {
  /** @param {Object} [data] */
  constructor(data) {
    super('TutorialProgressData', 'Data');
    this.deserialize(data);
  }

  /** @param {string} stepId @returns {boolean} */
  isCompleted(stepId) {
    return this.completed.includes(stepId);
  }

  /** @param {string} stepId @returns {boolean} */
  markCompleted(stepId) {
    if (!stepId || this.isCompleted(stepId)) return false;
    this.completed.push(stepId);
    return true;
  }

  /** @param {string} stepId @returns {boolean} */
  isRewardClaimed(stepId) {
    return this.rewardsClaimed.includes(stepId);
  }

  /** @param {string} stepId @returns {boolean} */
  markRewardClaimed(stepId) {
    if (!stepId || this.isRewardClaimed(stepId)) return false;
    this.rewardsClaimed.push(stepId);
    return true;
  }

  /** @override */
  serialize() {
    return {
      enabled: this.enabled,
      completed: [...this.completed],
      rewardsClaimed: [...this.rewardsClaimed]
    };
  }

  /** @override */
  deserialize(data) {
    const raw = data && typeof data === 'object' ? data : {};
    this.enabled = typeof raw.enabled === 'boolean' ? raw.enabled : true;
    this.completed = readIds(raw.completed);
    this.rewardsClaimed = readIds(raw.rewardsClaimed ?? raw.rewards);
  }
}
