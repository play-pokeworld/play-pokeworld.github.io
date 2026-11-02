/**
 * @file SanctuaryData.js
 * @brief Persistent sanctuary forge progress and boss completions.
 */
import { BaseModel } from '../core/BaseModel.js';

export class SanctuaryData extends BaseModel {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    super('SanctuaryData', 'Data');
    /** @type {Record<string, number>} locationId -> KOs accumulated towards next relic forge */
    this.progress = {};
    /** @type {Record<string, number>} sanctuaryId -> times completed/defeated */
    this.completions = {};
    this.deserialize(data);
  }

  /**
   * @param {string} locationId
   * @returns {number}
   */
  getProgress(locationId) {
    return this.progress[locationId] || 0;
  }

  /**
   * @param {string} locationId
   * @param {number} [count=1]
   */
  recordWildKO(locationId, count = 1) {
    if (!locationId || typeof locationId !== 'string') return;
    const amount = Math.max(1, Math.floor(Number(count) || 1));
    this.progress[locationId] = (this.progress[locationId] || 0) + amount;
  }

  /**
   * Deducts required KOs after forging a relic.
   * @param {string} locationId
   * @param {number} [required=30]
   */
  resetProgress(locationId, required = 30) {
    if (!locationId || typeof locationId !== 'string') return;
    const req = Math.max(1, Math.floor(Number(required) || 30));
    this.progress[locationId] = Math.max(0, (this.progress[locationId] || 0) - req);
  }

  /**
   * @param {string} sanctuaryId
   * @returns {number}
   */
  getCompletions(sanctuaryId) {
    return this.completions[sanctuaryId] || 0;
  }

  /**
   * @param {string} sanctuaryId
   */
  recordCompletion(sanctuaryId) {
    if (!sanctuaryId || typeof sanctuaryId !== 'string') return;
    this.completions[sanctuaryId] = (this.completions[sanctuaryId] || 0) + 1;
  }

  /** @override */
  serialize() {
    return {
      progress: { ...this.progress },
      completions: { ...this.completions }
    };
  }

  /** @override */
  deserialize(data = {}) {
    this.progress = {};
    if (data?.progress && typeof data.progress === 'object') {
      for (const [k, v] of Object.entries(data.progress)) {
        const count = Math.max(0, Math.floor(Number(v) || 0));
        if (count > 0) this.progress[k] = count;
      }
    }
    this.completions = {};
    if (data?.completions && typeof data.completions === 'object') {
      for (const [k, v] of Object.entries(data.completions)) {
        const count = Math.max(0, Math.floor(Number(v) || 0));
        if (count > 0) this.completions[k] = count;
      }
    }
  }
}
