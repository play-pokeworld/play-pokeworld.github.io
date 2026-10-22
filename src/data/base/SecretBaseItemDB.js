/**
 * @file SecretBaseItemDB.js
 * @brief Read-only decoration catalog and Emerald placement footprints.
 */
import { DataRepository, deepFreeze } from '../core/DataRepository.js';
import { SECRET_BASE_ITEMS, SECRET_BASE_ITEM_CATEGORIES, SECRET_BASE_MAX_PLACED } from '../content/SecretBaseItemsContent.js';

export class SecretBaseItemDB extends DataRepository {
  /** @private @type {SecretBaseItemDB|null} */
  static _instance = null;

  /** @returns {SecretBaseItemDB} */
  static getInstance() {
    if (!SecretBaseItemDB._instance) SecretBaseItemDB._instance = new SecretBaseItemDB();
    return SecretBaseItemDB._instance;
  }

  constructor() {
    super('SecretBaseItemDB');
  }

  /** @override @protected */
  _build() {
    for (const raw of SECRET_BASE_ITEMS) {
      if (!raw || typeof raw.id !== 'string' || this._entries.has(raw.id)) continue;
      this._entries.set(raw.id, deepFreeze({
        ...raw,
        nameKey: `i.${raw.id}`
      }));
    }
  }

  /** @override @param {string} id @returns {Readonly<Object>|null} */
  getById(id) {
    return super.getById(String(id || '').trim().toLowerCase());
  }

  /** @override @param {string} id @returns {boolean} */
  has(id) {
    return this.getById(id) !== null;
  }

  /** @param {string} category @returns {Readonly<Object>[]} */
  getByCategory(category) {
    return this.getAll().filter((item) => item.category === category);
  }

  /** @returns {string[]} Stable catalog categories in display order. */
  getCategories() {
    return [...SECRET_BASE_ITEM_CATEGORIES];
  }

  /** @returns {number} */
  getMaxPlaced() {
    return SECRET_BASE_MAX_PLACED;
  }

  /**
   * Returns the collision footprint, distinct from the full sprite dimensions.
   * @param {string|Readonly<Object>} itemOrId
   * @returns {{width:number,depth:number}}
   */
  getFootprint(itemOrId) {
    const item = typeof itemOrId === 'string' ? this.getById(itemOrId) : itemOrId;
    if (!item) return { width: 1, depth: 1 };
    if (item.layer === 'surface') return { width: 1, depth: 1 };
    if (item.behind) return { width: item.width, depth: 1 };
    if (item.overhang) return { width: item.width, depth: Math.max(1, item.depth - item.overhang) };
    return { width: item.width, depth: item.depth };
  }

  /** @param {string|Readonly<Object>} itemOrId @returns {{x:number,y:number}} */
  getDrawOffset(itemOrId) {
    const item = typeof itemOrId === 'string' ? this.getById(itemOrId) : itemOrId;
    return { x: 0, y: item?.overhang ? -item.overhang : 0 };
  }

  /** @override @returns {Array<Object>} */
  validate() {
    const problems = [];
    const categories = new Set(SECRET_BASE_ITEM_CATEGORIES);
    for (const item of this.getAll()) {
      if (!categories.has(item.category)) problems.push(this._problem(item.id, 'category', item.category));
      if (!['floor', 'surface', 'wall'].includes(item.layer)) problems.push(this._problem(item.id, 'layer', item.layer));
      if (!Number.isInteger(item.width) || item.width < 1) problems.push(this._problem(item.id, 'width', item.width));
      if (!Number.isInteger(item.depth) || item.depth < 1) problems.push(this._problem(item.id, 'depth', item.depth));
      if (item.price !== null && (!Number.isFinite(item.price) || item.price < 0)) problems.push(this._problem(item.id, 'price', item.price));
    }
    return problems;
  }
}
