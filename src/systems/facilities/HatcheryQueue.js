/**
 * @file HatcheryQueue.js
 * @brief Read-only fossil reservations and queue capacity, derived from the canonical save.
 */
import { FacilityRules } from '../../config/FacilityRules.js';

export class HatcheryQueue {
  /** @param {Object} save @returns {number} */
  static capacity(save) { return FacilityRules.QUEUE_DEFAULT + (save?.hatchery.queueLevel || 0) * FacilityRules.QUEUE_STEP; }
  /** @param {Object} save @param {string} itemId @returns {number} */
  static reservedFossils(save, itemId) {
    return save?.hatchery.queues.flat().filter((entry) => entry.kind === 'fossil' && entry.itemId === itemId).length || 0;
  }
  /** @param {Object} save @param {string} itemId @returns {number} */
  static freeFossils(save, itemId) { return Math.max(0, (save?.inventory.count(itemId) || 0) - this.reservedFossils(save, itemId)); }
}
