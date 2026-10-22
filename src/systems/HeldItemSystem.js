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

}
