/**
 * @file RoamingSystem.js
 * @brief UTC rotation, route assignment, and view clock for roaming Pokémon. No DOM access.
 */
import { BaseSystem } from './BaseSystem.js';
import { EventBus } from '../core/EventBus.js';
import { RoamingRotationTickEvent } from '../core/events/RoamingRotationTickEvent.js';
import { RoamingRules } from '../config/RoamingRules.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { LocationKinds } from '../data/world/LocationKinds.js';

const OUTDOOR_KINDS = new Set([LocationKinds.ROUTE, LocationKinds.SEA]);

export class RoamingSystem extends BaseSystem {
  /** @private @type {RoamingSystem|null} */
  static _instance = null;

  /** @returns {RoamingSystem} */
  static getInstance() {
    if (!RoamingSystem._instance) RoamingSystem._instance = new RoamingSystem();
    return RoamingSystem._instance;
  }

  constructor() {
    super('RoamingSystem', 'System');
    this._lastTickSecond = null;
  }

  /** @param {number} [now=Date.now()] @returns {number} Shared 12-hour UTC window */
  static getRotationWindow(now = Date.now()) {
    return Math.floor(now / RoamingRules.ROTATION_MS);
  }

  /** @param {number} [now=Date.now()] @returns {number} Milliseconds until the next UTC window */
  static getTimeUntilRotation(now = Date.now()) {
    return (RoamingSystem.getRotationWindow(now) + 1) * RoamingRules.ROTATION_MS - now;
  }

  /**
   * @param {string} locationId
   * @param {number} [now=Date.now()]
   * @returns {string|null} Species assigned to this outdoor location for this UTC window
   */
  static getSpeciesAt(locationId, now = Date.now()) {
    const location = LocationDB.getInstance().getById(locationId);
    if (!location || !OUTDOOR_KINDS.has(location.kind)) return null;
    const regionPool = RoamingRules.REGIONS[location.region];
    if (!regionPool) return null;

    const window = RoamingSystem.getRotationWindow(now);
    const firstRouteIndex = RoamingSystem._positiveModulo(window + regionPool.windowOffset, regionPool.routes.length);
    for (let index = 0; index < regionPool.species.length; index++) {
      const routeIndex = RoamingSystem._positiveModulo(
        firstRouteIndex + regionPool.offsets[index],
        regionPool.routes.length
      );
      if (regionPool.routes[routeIndex] === locationId) return regionPool.species[index];
    }
    return null;
  }

  /**
   * @param {number} [now=Date.now()]
   * @returns {string} Zero-padded HH:MM:SS countdown, suitable for localized UI interpolation
   */
  static formatCountdown(now = Date.now()) {
    const seconds = Math.max(0, Math.floor(RoamingSystem.getTimeUntilRotation(now) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    const pad = (value) => String(value).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
  }

  /**
   * View clock is emitted against wall time (not accumulated frame delta) so tab throttling
   * cannot make the displayed UTC rotation drift.
   * @override
   */
  update() {
    const now = Date.now();
    const second = Math.floor(now / 1000);
    if (second === this._lastTickSecond) return;
    this._lastTickSecond = second;
    EventBus.getInstance().dispatch(new RoamingRotationTickEvent(now));
  }

  /** @private @param {number} value @param {number} modulus @returns {number} */
  static _positiveModulo(value, modulus) {
    return ((value % modulus) + modulus) % modulus;
  }
}
