/**
 * @file ItemStacking.js
 * @brief Pure stacking rules of granted items (C++: class ItemStacking), ported from the original
 * getItemStackLimit / getDuplicateItemPayout / grantRewardItem:
 *  - treasures and fossils are never capped;
 *  - held items and categorized items stack up to LIMITED_STACK, the rest is unlimited;
 *  - copies above the limit are converted to money at DUPLICATE_PAYOUT_RATE × price.
 */
import { ItemDB } from './ItemDB.js';
import { ItemKinds } from './ItemKinds.js';
import { InventoryRules } from '../../config/InventoryRules.js';

export class ItemStacking {
  /**
   * @param {string} itemId
   * @returns {number} Maximum quantity in the inventory
   */
  static stackLimit(itemId) {
    const item = ItemDB.getInstance().getById(itemId);
    if (!item || item.kind === ItemKinds.TREASURE || item.kind === ItemKinds.FOSSIL) return Infinity;
    return item.kind === ItemKinds.HELD || item.category ? InventoryRules.LIMITED_STACK : InventoryRules.UNLIMITED_STACK;
  }

  /**
   * @param {string} itemId
   * @param {number} quantity
   * @returns {number} Money paid for `quantity` overflowing copies
   */
  static duplicatePayout(itemId, quantity) {
    const item = ItemDB.getInstance().getById(itemId);
    const unit = Math.max(0, Math.floor((item?.price || item?.value || 0) * InventoryRules.DUPLICATE_PAYOUT_RATE));
    return unit * Math.max(0, quantity);
  }

  /**
   * How a grant of `quantity` copies splits between the inventory and money.
   * Unknown items grant nothing (original behaviour).
   * @param {string} itemId
   * @param {number} owned - Copies already in the inventory
   * @param {number} quantity
   * @returns {{added: number, money: number}}
   */
  static split(itemId, owned, quantity) {
    if (!ItemDB.getInstance().has(itemId)) return { added: 0, money: 0 };
    const wanted = Math.max(1, Math.floor(Number(quantity) || 1));
    const added = Math.min(Math.max(0, ItemStacking.stackLimit(itemId) - owned), wanted);
    return { added, money: ItemStacking.duplicatePayout(itemId, wanted - added) };
  }
}
