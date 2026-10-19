/**
 * @file QuestBase.js
 * @brief Polymorphic Quest class hierarchy following strict C++ OOP principles (C++: class QuestBase : public BaseModel).
 * Encapsulates quest categories, targets, progression, and rewards.
 */

import { BaseModel } from '../BaseModel.js';

export class QuestBase extends BaseModel {
  /**
   * @param {Object} data
   */
  constructor(data = {}) {
    super(`Quest_${data.id || 'unknown'}`, 'Quest');

    this.id = data.id;
    this.category = data.category || 'main'; // 'main' | 'side' | 'repeatable' | 'legendary'
    this.region = data.region || 'kanto';
    this.type = data.type || 'talk';
    this.target = Number(data.target) || 1;
    this.progress = Number(data.progress) || 0;
    this.loc = data.loc || null;
    this.rewardMoney = Number(data.rewardMoney) || 0;
    this.rewardItems = data.rewardItems || {};
    this.rewardPoke = data.rewardPoke || null;
    this.isClaimed = !!data.isClaimed;
  }

  /** @returns {boolean} */
  isCompleted() {
    return this.progress >= this.target;
  }

  /** @returns {number} 0-100 percentage */
  getProgressPercentage() {
    return Math.min(100, Math.max(0, Math.round((this.progress / this.target) * 100)));
  }

  /**
   * Advances progress by amount
   * @param {number} [amount=1]
   */
  advance(amount = 1) {
    this.progress = Math.min(this.target, this.progress + amount);
  }

  /**
   * Abstract check handler
   * @virtual
   * @param {string} eventType
   * @param {Object} eventData
   */
  checkEvent(eventType, eventData) {}

  /**
   * @override
   * @returns {Object}
   */
  serialize() {
    return {
      id: this.id,
      category: this.category,
      region: this.region,
      type: this.type,
      target: this.target,
      progress: this.progress,
      loc: this.loc,
      rewardMoney: this.rewardMoney,
      rewardItems: this.rewardItems,
      isClaimed: this.isClaimed
    };
  }

  /**
   * @override
   * @param {Object} data
   */
  deserialize(data) {
    if (!data) return;
    this.id = data.id;
    this.category = data.category || 'main';
    this.region = data.region || 'kanto';
    this.type = data.type || 'talk';
    this.target = Number(data.target) || 1;
    this.progress = Number(data.progress) || 0;
    this.loc = data.loc || null;
    this.rewardMoney = Number(data.rewardMoney) || 0;
    this.rewardItems = data.rewardItems || {};
    this.isClaimed = !!data.isClaimed;
  }
}
