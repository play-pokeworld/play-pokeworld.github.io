/**
 * @file ShopDB.js
 * @brief Read-only repository of the town shops (C++: class ShopDB : public DataRepository).
 * Source: SHOPS_TABLE (tools/data/gen-shops.mjs) + SHOPS_CONTENT (hand-made, wins on same id).
 * ShopDefinition: { id, items[item ids, display order], requiresLeague|null }
 * A location opens its shop through its `shop` field. Name: t('shop.<id>.name').
 */
import { DataRepository, deepFreeze } from '../core/DataRepository.js';
import { withContent } from '../core/ContentTables.js';
import { SHOPS_TABLE } from '../raw/shops-data.js';
import { SHOPS_CONTENT } from '../content/shops-content.js';
import { ItemDB } from '../items/ItemDB.js';
import { LeagueDB } from '../trainers/LeagueDB.js';

export class ShopDB extends DataRepository {
  /** @type {ShopDB|null} */
  static _instance = null;

  /** @returns {ShopDB} */
  static getInstance() {
    if (!ShopDB._instance) ShopDB._instance = new ShopDB();
    return ShopDB._instance;
  }

  constructor() {
    super('ShopDB');
  }

  /** @protected @override */
  _build() {
    for (const [id, raw] of Object.entries(withContent(SHOPS_TABLE, SHOPS_CONTENT))) {
      this._entries.set(id, deepFreeze({
        id,
        items: [...(raw.items || [])],
        requiresLeague: raw.requiresLeague || null
      }));
    }
  }

  /** @override */
  validate() {
    const problems = [];
    const items = ItemDB.getInstance();
    for (const shop of this.getAll()) {
      for (const itemId of shop.items) {
        const item = items.getById(itemId);
        if (!item || !(item.price > 0)) problems.push(this._problem(shop.id, 'items', itemId));
      }
      if (shop.requiresLeague && !LeagueDB.getInstance().has(shop.requiresLeague)) problems.push(this._problem(shop.id, 'requiresLeague', shop.requiresLeague));
    }
    return problems;
  }
}
