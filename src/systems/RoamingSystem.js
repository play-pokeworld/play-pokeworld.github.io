/**
 * @file RoamingSystem.js
 * @brief UTC rotation, route assignment, and view clock for roaming Pokémon. No DOM access.
 *
 * The whole roaming feature is switched off by RoamingRules.ROAMING_ENABLED. That switch is
 * enforced HERE, once: every game query returns nothing and the view clock stops. Callers must not
 * re-test the flag (two of them used to, a third forgot, and the map kept painting the purple
 * roaming state on routes that could never host a roamer).
 * The deterministic rotation stays available as getAssignedSpecies() for the rules and their tests.
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

  /** @returns {boolean} True when the roaming feature is part of the game */
  static isEnabled() {
    return RoamingRules.ROAMING_ENABLED === true;
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
   * @returns {string|null} Species assigned to this outdoor location, whatever the feature switch:
   * the rotation itself is a rule, not a live game query. Use getSpeciesAt() in the game.
   */
  static getAssignedSpecies(locationId, now = Date.now()) {
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
   * Live game query: the roamer standing on this location, or null when the feature is disabled.
   * @param {string} locationId
   * @param {number} [now=Date.now()]
   * @returns {string|null}
   */
  static getSpeciesAt(locationId, now = Date.now()) {
    if (!RoamingSystem.isEnabled()) return null;
    return RoamingSystem.getAssignedSpecies(locationId, now);
  }

  /**
   * Finds the current outdoor location for a roaming species in the active UTC window.
   * @param {string} speciesId
   * @param {number} [now=Date.now()]
   * @returns {{region: string, locationId: string}|null}
   */
  static getRouteForSpecies(speciesId, now = Date.now()) {
    if (!speciesId || !RoamingSystem.isEnabled()) return null;
    for (const [region, regionPool] of Object.entries(RoamingRules.REGIONS || {})) {
      const speciesIndex = (regionPool.species || []).indexOf(speciesId);
      if (speciesIndex === -1) continue;
      const window = RoamingSystem.getRotationWindow(now);
      const firstRouteIndex = RoamingSystem._positiveModulo(window + regionPool.windowOffset, regionPool.routes.length);
      const routeIndex = RoamingSystem._positiveModulo(
        firstRouteIndex + regionPool.offsets[speciesIndex],
        regionPool.routes.length
      );
      return { region, locationId: regionPool.routes[routeIndex] };
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
    if (!RoamingSystem.isEnabled()) return;
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
