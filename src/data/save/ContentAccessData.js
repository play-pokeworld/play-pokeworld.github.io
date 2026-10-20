/**
 * @file ContentAccessData.js
 * @brief Persistent, sticky access already earned by a save.
 *
 * This model stores only progression facts. Rules are resolved by FeatureAccessSystem;
 * rendering and DOM state are deliberately kept out of the save layer.
 */
import { BaseModel } from '../core/BaseModel.js';

export const CONTENT_FEATURE_IDS = Object.freeze(['hatchery', 'mine', 'training']);

/** @param {*} value @returns {string[]} */
function readIds(value) {
  const entries = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.entries(value).filter(([, enabled]) => enabled === true).map(([id]) => id)
      : [];
  return [...new Set(entries.filter((id) => typeof id === 'string' && id.length > 0))];
}

export class ContentAccessData extends BaseModel {
  /** @param {Object} [data={}] */
  constructor(data = {}) {
    super('ContentAccessData', 'Data');
    this.deserialize(data);
  }

  /** @param {string} locationId @returns {boolean} */
  hasLocation(locationId) {
    return this.unlockedLocations.includes(locationId);
  }

  /** @param {string} locationId @returns {boolean} */
  unlockLocation(locationId) {
    if (typeof locationId !== 'string' || !locationId || this.hasLocation(locationId)) return false;
    this.unlockedLocations.push(locationId);
    return true;
  }

  /** @param {string} featureId @returns {boolean} */
  hasFeature(featureId) {
    return this.unlockedFeatures[featureId] === true;
  }

  /** @param {string} featureId @returns {boolean} */
  unlockFeature(featureId) {
    if (!CONTENT_FEATURE_IDS.includes(featureId) || this.hasFeature(featureId)) return false;
    this.unlockedFeatures[featureId] = true;
    return true;
  }

  /** @param {string} regionId @returns {boolean} */
  hasRegionStarter(regionId) {
    return this.regionStarters.includes(regionId);
  }

  /** @param {string} regionId @returns {boolean} */
  unlockRegionStarter(regionId) {
    if (typeof regionId !== 'string' || !regionId || this.hasRegionStarter(regionId)) return false;
    this.regionStarters.push(regionId);
    return true;
  }

  /** @override */
  serialize() {
    return {
      unlockedLocations: [...this.unlockedLocations],
      unlockedFeatures: { ...this.unlockedFeatures },
      regionStarters: [...this.regionStarters],
      championTitle: this.championTitle
    };
  }

  /** @override @param {Object} [data={}] */
  deserialize(data = {}) {
    const raw = data && typeof data === 'object' ? data : {};
    this.unlockedLocations = readIds(raw.unlockedLocations ?? raw.locations ?? raw.unlockedLocs);
    this.regionStarters = readIds(raw.regionStarters);
    const rawFeatures = raw.unlockedFeatures ?? raw.features ?? {};
    this.unlockedFeatures = Object.fromEntries(CONTENT_FEATURE_IDS.map((id) => [id, rawFeatures?.[id] === true]));
    this.championTitle = raw.championTitle === true || raw.milestones?.championTitle === true;
  }
}
