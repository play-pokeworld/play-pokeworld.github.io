/**
 * @file LocationSystem.js
 * @brief Player position on the world map and travel rules (C++ equivalent: class LocationSystem : public BaseSystem).
 */

import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { EventBus } from '../core/EventBus.js';
import { LocationDB } from '../data/LocationDB.js';
import { PlayerDefaults } from '../config/PlayerDefaults.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { t } from '../localization/LocalizationManager.js';

/** Map node states (each maps to a CSS class of UIMapView). */
export const LocationStates = Object.freeze({
  CURRENT: 'current',
  ADJACENT: 'adjacent',
  REACHABLE: 'reachable',
  LOCKED: 'locked'
});

export class LocationSystem extends BaseSystem {
  /** @private @type {LocationSystem|null} */
  static _instance = null;

  /** @returns {LocationSystem} */
  static getInstance() {
    if (!LocationSystem._instance) {
      LocationSystem._instance = new LocationSystem();
    }
    return LocationSystem._instance;
  }

  constructor() {
    super('LocationSystem', 'System');
  }

  /** @private @returns {import('../data/PlayerData.js').PlayerData|null} */
  _player() {
    return SaveSystem.getInstance().getCurrentSave()?.player ?? null;
  }

  /** @returns {string} LocationDB id of the player position */
  getCurrentLocationId() {
    return this._player()?.location ?? PlayerDefaults.LOCATION_ID;
  }

  /** @returns {string} Region of the player position */
  getCurrentRegion() {
    return LocationDB.getInstance().getById(this.getCurrentLocationId())?.region ?? PlayerDefaults.REGION;
  }

  /**
   * @param {string} locationId
   * @returns {boolean} True when the badge requirement is not met
   */
  isLocked(locationId) {
    const location = LocationDB.getInstance().getById(locationId);
    if (!location) return true;
    return (location.badgeReq ?? 0) > (this._player()?.badges ?? 0);
  }

  /**
   * @param {string} locationId
   * @returns {string} One of LocationStates
   */
  getState(locationId) {
    const currentId = this.getCurrentLocationId();
    if (locationId === currentId) return LocationStates.CURRENT;
    if (this.isLocked(locationId)) return LocationStates.LOCKED;
    const current = LocationDB.getInstance().getById(currentId);
    return current && (current.conn || []).includes(locationId) ? LocationStates.ADJACENT : LocationStates.REACHABLE;
  }

  /**
   * Moves the player, persists the save and emits LocationChangedEvent.
   * @param {string} locationId
   * @returns {boolean} False when the location is unknown or locked
   */
  travelTo(locationId) {
    const location = LocationDB.getInstance().getById(locationId);
    const player = this._player();
    if (!location || !player || this.isLocked(locationId)) {
      console.warn(t('debug_travel_refused', { id: locationId }));
      return false;
    }
    player.location = locationId;
    player.region = location.region;
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new LocationChangedEvent(location.region, locationId));
    return true;
  }
}
