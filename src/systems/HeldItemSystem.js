/**
 * @file HeldItemSystem.js
 * @brief Validates held-item assignment and delegates roster mutations to TeamSystem.
 */
import { BaseSystem } from './BaseSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { TeamSystem } from './TeamSystem.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { ItemKinds } from '../data/items/ItemKinds.js';

export class HeldItemSystem extends BaseSystem {
  /** @private @type {HeldItemSystem|null} */
  static _instance = null;

  /** @returns {HeldItemSystem} */
  static getInstance() {
    if (!HeldItemSystem._instance) HeldItemSystem._instance = new HeldItemSystem();
    return HeldItemSystem._instance;
  }

  constructor() {
    super('HeldItemSystem', 'System');
  }

  /** @returns {boolean} */
  isLocked() {
    return BattleSystem.getInstance().isActive();
  }

  /**
   * @param {number} teamIndex
   * @param {string} itemId
   * @returns {boolean}
   */
  equip(teamIndex, itemId) {
    if (this.isLocked() || typeof itemId !== 'string') return false;
    const save = SaveSystem.getInstance().getCurrentSave();
    const item = ItemDB.getInstance().getById(itemId);
    if (!save || !item || item.kind !== ItemKinds.HELD || !save.inventory.has(itemId)) return false;
    return TeamSystem.getInstance().setHeldItem(teamIndex, itemId);
  }

  /** @param {number} teamIndex @returns {boolean} */
  unequip(teamIndex) {
    if (this.isLocked()) return false;
    return TeamSystem.getInstance().setHeldItem(teamIndex, null);
  }

  /**
   * Inventory-backed held items for the picker. `heldByIndex` is -1 when unused.
   * @param {number} teamIndex
   * @returns {Array<{itemId:string, quantity:number, heldByIndex:number}>}
   */
  getOptions(teamIndex) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return [];
    return save.inventory.entries()
      .filter(({ id, quantity }) => quantity > 0 && ItemDB.getInstance().getById(id)?.kind === ItemKinds.HELD)
      .map(({ id, quantity }) => ({
        itemId: id,
        quantity,
        heldByIndex: save.team.findIndex((pokemon, index) => index !== teamIndex && pokemon.heldItem === id)
      }));
  }
}
