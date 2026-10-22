/**
 * @file InventoryData.js
 * @brief Bag of the player: item id -> quantity (C++: class InventoryData : public BaseModel).
 * Serialized shape (save schema 3): { <itemId>: quantity } (only positive quantities).
 */
import { BaseModel } from '../core/BaseModel.js';
import { EventBus } from '../../core/EventBus.js';
import { InventoryChangedEvent } from '../../core/events/InventoryChangedEvent.js';
import { ItemDB } from '../items/ItemDB.js';

export class InventoryData extends BaseModel {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    super('InventoryData', 'Data');
    /** @private @type {Map<string, number>} */
    this._items = new Map();
    this.deserialize(data);
  }

  /**
   * @param {string} itemId
   * @returns {number}
   */
  count(itemId) {
    return this._items.get(itemId) || 0;
  }

  /**
   * @param {string} itemId
   * @returns {boolean}
   */
  has(itemId) {
    return this.count(itemId) > 0;
  }

  /**
   * @param {string} itemId - ItemDB id (unknown ids are ignored)
   * @param {number} [quantity=1]
   * @param {{deferSave?:boolean}} [options] - Event listeners defer persistence to the owning transaction.
   * @returns {boolean} false for an unknown item or a non-positive quantity
   */
  add(itemId, quantity = 1, { deferSave = false } = {}) {
    const amount = Math.floor(quantity);
    if (!(amount > 0) || !ItemDB.getInstance().has(itemId)) return false;
    this._set(itemId, this.count(itemId) + amount, { deferSave });
    return true;
  }

  /**
   * @param {string} itemId
   * @param {number} [quantity=1]
   * @param {{deferSave?:boolean}} [options] - Event listeners defer persistence to the owning transaction.
   * @returns {boolean} false when the bag does not hold that many
   */
  remove(itemId, quantity = 1, { deferSave = false } = {}) {
    const amount = Math.floor(quantity);
    if (!(amount > 0) || this.count(itemId) < amount) return false;
    this._set(itemId, this.count(itemId) - amount, { deferSave });
    return true;
  }

  /** @returns {Array<{id: string, quantity: number}>} */
  entries() {
    return [...this._items].map(([id, quantity]) => ({ id, quantity }));
  }

  /**
   * @private
   * @param {string} itemId
   * @param {number} quantity
   * @param {{deferSave?:boolean}} [options]
   */
  _set(itemId, quantity, { deferSave = false } = {}) {
    if (quantity > 0) this._items.set(itemId, quantity);
    else this._items.delete(itemId);
    EventBus.getInstance().dispatch(new InventoryChangedEvent(itemId, quantity, { deferSave }));
  }

  /** @override */
  serialize() {
    return Object.fromEntries(this._items);
  }

  /** @override */
  deserialize(data = {}) {
    this._items.clear();
    const items = ItemDB.getInstance();
    for (const [id, quantity] of Object.entries(data || {})) {
      const amount = Math.floor(Number(quantity) || 0);
      if (amount > 0 && items.has(id)) this._items.set(id, amount);
    }
  }
}
