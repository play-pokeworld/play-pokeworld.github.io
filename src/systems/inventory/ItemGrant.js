/**
 * @file ItemGrant.js
 * @brief Gives items to a save following ItemStacking (C++: ItemGrantResult grantItem(SaveData&, …)).
 * Shared by every reward source (quests, battle loot…). Does not persist: the caller saves once.
 */
import { ItemStacking } from '../../data/items/ItemStacking.js';

/**
 * @param {import('../../data/save/SaveData.js').SaveData} save
 * @param {string} itemId
 * @param {number} quantity
 * @returns {{added: number, money: number}}
 */
export function grantItem(save, itemId, quantity) {
  const result = ItemStacking.split(itemId, save.inventory.count(itemId), quantity);
  if (result.added > 0) save.inventory.add(itemId, result.added);
  if (result.money > 0) save.currencies.add('money', result.money);
  return result;
}
