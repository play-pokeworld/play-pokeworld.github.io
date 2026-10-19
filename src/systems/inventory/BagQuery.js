/**
 * @file BagQuery.js
 * @brief Read-only view of the bag (original renderInventory model): category of an item,
 * per-tab counts, filtered and sorted entries. Pure; names come from the caller (UI language).
 *
 * BagEntry: { itemId, quantity, category, name, holder (team Pokémon holding it) | null }
 */
import { ItemDB } from '../../data/items/ItemDB.js';
import { BAG_CATEGORIES, BagCategoryIds, BagSorts } from '../../config/BagCategories.js';

export class BagQuery {
  /**
   * @param {string} itemId
   * @returns {string} BagCategoryIds value
   */
  static categoryOf(itemId) {
    const kind = ItemDB.getInstance().getById(itemId)?.kind;
    return BAG_CATEGORIES.find((category) => category.kinds.includes(kind))?.id ?? BagCategoryIds.SPECIAL;
  }

  /**
   * @param {import('../../data/save/SaveData.js').SaveData} save
   * @param {(itemId: string) => string} nameOf - Localized item name
   * @returns {Object[]} Every owned, known item as a BagEntry
   */
  static entries(save, nameOf) {
    const items = ItemDB.getInstance();
    return save.inventory.entries()
      .filter(({ id, quantity }) => quantity > 0 && items.has(id))
      .map(({ id, quantity }) => ({
        itemId: id,
        quantity,
        category: BagQuery.categoryOf(id),
        name: nameOf(id),
        holder: save.team.find((pokemon) => pokemon.heldItem === id) ?? null
      }));
  }

  /**
   * @param {Object[]} entries - BagEntry list
   * @returns {Record<string, number>} Item count per category id
   */
  static counts(entries) {
    const counts = Object.fromEntries(BAG_CATEGORIES.map((category) => [category.id, 0]));
    for (const entry of entries) counts[entry.category] = (counts[entry.category] || 0) + 1;
    return counts;
  }

  /**
   * The search is global (every tab); without a search only the category is shown.
   * @param {Object[]} entries
   * @param {{category: string, search: string, sort: string}} filters
   * @param {(itemId: string) => string} [descOf] - Localized description (searched too)
   * @returns {Object[]}
   */
  static filter(entries, { category, search, sort }, descOf = () => '') {
    const needle = String(search || '').trim().toLowerCase();
    const list = needle
      ? entries.filter((entry) => `${entry.name} ${entry.itemId} ${descOf(entry.itemId)}`.toLowerCase().includes(needle))
      : entries.filter((entry) => entry.category === category);
    const byName = (a, b) => a.name.localeCompare(b.name);
    if (sort === BagSorts.NAME_DESC) return list.sort((a, b) => byName(b, a));
    if (sort === BagSorts.QTY_DESC) return list.sort((a, b) => b.quantity - a.quantity || byName(a, b));
    if (sort === BagSorts.QTY_ASC) return list.sort((a, b) => a.quantity - b.quantity || byName(a, b));
    return list.sort(byName);
  }
}
