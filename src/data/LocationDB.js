/**
 * @file LocationDB.js
 * @brief Singleton repository managing world map locations, routes, and wild encounter tables (C++: class LocationDB : public BaseObject).
 */

import { BaseObject } from '../core/BaseObject.js';
import { LOCS, LOCS_JOHTO } from './raw/locations-data.js';
import { LOCS_HOENN } from './raw/locations-hoenn.js';

/** Raw location tables by region id. */
const REGION_TABLES = Object.freeze({ kanto: LOCS, johto: LOCS_JOHTO, hoenn: LOCS_HOENN });

export class LocationDB extends BaseObject {
  /** @type {LocationDB|null} */
  static _instance = null;

  /** @returns {LocationDB} */
  static getInstance() {
    if (!LocationDB._instance) {
      LocationDB._instance = new LocationDB();
    }
    return LocationDB._instance;
  }

  constructor() {
    super('LocationDB', 'Data');

    /** @private @type {Map<string, Object>} */
    this._locations = new Map();

    /** @private @type {Map<string, string[]>} */
    this._byRegion = new Map();

    this.init();
  }

  init() {
    if (this._locations.size > 0) return;
    for (const [region, table] of Object.entries(REGION_TABLES)) {
      const ids = [];
      for (const [id, data] of Object.entries(table || {})) {
        this._locations.set(id, { id, region, ...data });
        ids.push(id);
      }
      this._byRegion.set(region, ids);
    }
  }

  /**
   * Look up location by ID (e.g. 'pallet', 'route1', 'viridian')
   * @param {string} id
   * @returns {Object|null}
   */
  getById(id) {
    return this._locations.get(id) || null;
  }

  /**
   * Get all locations for a region
   * @param {'kanto'|'johto'|'hoenn'} region
   * @returns {Object[]}
   */
  getByRegion(region) {
    const ids = this._byRegion.get(region) || [];
    return ids.map(id => this._locations.get(id));
  }

  /**
   * Returns wild encounter table for a location
   * @param {string} id
   * @returns {Array<{speciesId: number, minLvl: number, maxLvl: number, rarity: string}>}
   */
  getEncounters(id) {
    const loc = this.getById(id);
    if (!loc || !Array.isArray(loc.wild)) return [];

    return loc.wild.map(entry => ({
      speciesId: entry[0],
      minLvl: entry[1],
      maxLvl: entry[2],
      rarity: entry[3] || 'common'
    }));
  }

  /** @returns {number} */
  get count() {
    return this._locations.size;
  }
}

