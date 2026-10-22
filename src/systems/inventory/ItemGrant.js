/**
 * @file ItemGrant.js
 * @brief Gives items to a save following ItemStacking (C++: ItemGrantResult grantItem(SaveData&, …)).
 * Shared by every reward source (quests, battle loot…). Does not persist: the caller saves once.
 */
import { ItemStacking } from '../../data/items/ItemStacking.js';
import { BonusSystem } from '../BonusSystem.js';
import { BonusTypes } from '../../config/BonusRules.js';

/**
 * @param {import('../../data/save/SaveData.js').SaveData} save
 * @param {string} itemId
 * @param {number} quantity
 * @param {{deferSave?:boolean}} [options]
 * @returns {{added: number, money: number}}
 */
export function grantItem(save, itemId, quantity, { deferSave = false } = {}) {
  const result = ItemStacking.split(itemId, save.inventory.count(itemId), quantity);
  if (result.added > 0) save.inventory.add(itemId, result.added, { deferSave });
  if (result.money > 0) {
    result.money = BonusSystem.getInstance().applyMultiplier(result.money, BonusTypes.MONEY);
    save.currencies.add(BonusTypes.MONEY, result.money);
  }
  return result;
}
