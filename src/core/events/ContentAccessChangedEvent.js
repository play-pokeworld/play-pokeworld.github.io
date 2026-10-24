/**
 * @file ContentAccessChangedEvent.js
 * @brief Publishes a new snapshot of progression and feature access to UI consumers.
 */
import { BaseEvent } from '../BaseEvent.js';

export class ContentAccessChangedEvent extends BaseEvent {
  static TYPE = 'ContentAccessChangedEvent';

  /**
   * @param {Object} snapshot - Plain, read-only access state produced by FeatureAccessSystem.
   * @param {Object} [metadata]
   */
  constructor(snapshot, metadata = {}) {
    super(ContentAccessChangedEvent.TYPE);
    this.reason = String(metadata.reason || 'progression');
    this.features = Object.freeze({ ...(snapshot?.features || {}) });
    this.locations = Object.freeze([...(snapshot?.locations || [])]);
    this.regions = Object.freeze([...(snapshot?.regions || [])]);
    this.regionStarters = Object.freeze([...(snapshot?.regionStarters || [])]);
    this.marketUnlocked = snapshot?.marketUnlocked === true;
    this.championTitle = snapshot?.championTitle === true;
    this.changedFeatures = Object.freeze([...(metadata.changedFeatures || [])]);
    this.changedLocations = Object.freeze([...(metadata.changedLocations || [])]);
    this.changedRegions = Object.freeze([...(metadata.changedRegions || [])]);
  }
}
