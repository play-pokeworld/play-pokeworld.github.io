/**
 * @file BagCategories.js
 * @brief Tabs of the bag, in display order, and the item kinds each one holds
 * (original ui/game/inventory.js itemCat). Unlisted kinds fall into SPECIAL.
 */
import { ItemKinds } from '../data/items/ItemKinds.js';

export const BagCategoryIds = Object.freeze({
  POKEBALLS: 'pokeballs',
  HELD: 'held',
  TM_HM: 'ct_cs',
  EVOLUTION: 'evolution',
  FOSSIL: 'fossil',
  TREASURE: 'treasure',
  SPECIAL: 'special'
});

export const BAG_CATEGORIES = Object.freeze([
  Object.freeze({ id: BagCategoryIds.POKEBALLS, labelKey: 'cat_pokeballs', kinds: Object.freeze([ItemKinds.BALL]) }),
  Object.freeze({ id: BagCategoryIds.HELD, labelKey: 'cat_held_items', kinds: Object.freeze([ItemKinds.HELD]) }),
  Object.freeze({ id: BagCategoryIds.TM_HM, labelKey: 'cat_tm_hm', kinds: Object.freeze([ItemKinds.TM, ItemKinds.HM]) }),
  Object.freeze({ id: BagCategoryIds.EVOLUTION, labelKey: 'cat_evolution', kinds: Object.freeze([ItemKinds.STONE, ItemKinds.EVOLUTION]) }),
  Object.freeze({ id: BagCategoryIds.FOSSIL, labelKey: 'cat_fossils', kinds: Object.freeze([ItemKinds.FOSSIL]) }),
  Object.freeze({ id: BagCategoryIds.TREASURE, labelKey: 'cat_treasures', kinds: Object.freeze([ItemKinds.TREASURE]) }),
  Object.freeze({ id: BagCategoryIds.SPECIAL, labelKey: 'cat_key_special', kinds: Object.freeze([]) })
]);

/** Sort orders of the bag (both directions for every key, original user request). */
export const BagSorts = Object.freeze({
  NAME_ASC: 'name',
  NAME_DESC: 'name_desc',
  QTY_DESC: 'qty',
  QTY_ASC: 'qty_asc'
});

export const BAG_SORT_OPTIONS = Object.freeze([
  Object.freeze({ id: BagSorts.NAME_ASC, labelKey: 'sort_name_asc' }),
  Object.freeze({ id: BagSorts.NAME_DESC, labelKey: 'sort_name_desc' }),
  Object.freeze({ id: BagSorts.QTY_DESC, labelKey: 'sort_quantity_desc' }),
  Object.freeze({ id: BagSorts.QTY_ASC, labelKey: 'sort_quantity_asc' })
]);
