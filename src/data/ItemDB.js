/**
 * @file ItemDB.js
 * @brief Singleton repository managing game items and inventory objects (C++: class ItemDB : public BaseObject).
 * Provides fast indexed lookups by item ID, type, and category.
 */

import { BaseObject } from '../core/BaseObject.js';
import { ITEMS } from './raw/items-data.js';
import { AssetPaths } from '../config/AssetPaths.js';

export class ItemDB extends BaseObject {
  /** @type {ItemDB|null} */
  static _instance = null;

  /** @returns {ItemDB} */
  static getInstance() {
    if (!ItemDB._instance) {
      ItemDB._instance = new ItemDB();
    }
    return ItemDB._instance;
  }

  constructor() {
    super('ItemDB', 'Data');

    /** @private @type {Map<string, Object>} */
    this._items = new Map();

    /** @private @type {Map<string, string[]>} */
    this._byType = new Map();

    this.init();
  }

  init() {
    if (this._items.size > 0) return;

    for (const [id, itemData] of Object.entries(ITEMS || {})) {
      const entry = { id, ...itemData };
      // Raw data only stores file stems: paths are always resolved by AssetPaths.
      if (entry.ballSprite) {
        entry.spritePath = AssetPaths.pokeball(entry.ballSprite);
      }
      this._items.set(id, entry);

      const itemType = entry.type || 'misc';
      if (!this._byType.has(itemType)) {
        this._byType.set(itemType, []);
      }
      this._byType.get(itemType).push(id);
    }
  }

  /**
   * Look up item by ID
   * @param {string} id
   * @returns {Object|null}
   */
  getById(id) {
    return this._items.get(id) || null;
  }

  /**
   * Get all items of a given type ('ball', 'berry', 'stone', 'fossil', etc.)
   * @param {string} type
   * @returns {Object[]}
   */
  getByType(type) {
    const ids = this._byType.get(type) || [];
    return ids.map(id => this._items.get(id));
  }

  /** @returns {Object[]} */
  getAll() {
    return Array.from(this._items.values());
  }

  /** @returns {number} */
  get count() {
    return this._items.size;
  }
}

