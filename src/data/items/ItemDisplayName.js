/**
 * @file ItemDisplayName.js
 * @brief Display name of an item, including the technical-machine suffix (C++: free helper of ItemDB).
 *
 * The name is never stored: it is a LocalizedText resolved from `item.<id>.name` plus a suffix key,
 * so every view (bag, dictionary, shop, loot strip, PC) shows the name in the active language and
 * a language change reaches it without rebuilding anything. No component tests `currentLang` anymore.
 */

import { t, compose } from '../../localization/LocalizationManager.js';
import { ItemDB } from './ItemDB.js';
import { ItemKinds } from './ItemKinds.js';

export class ItemDisplayName {
  /**
   * @param {string} itemId
   * @returns {import('../../localization/LocalizedText.js').LocalizedText}
   */
  static of(itemId) {
    const id = String(itemId || '');
    if (!id) return t('item_unknown_name');
    const item = ItemDB.getInstance().getById(id);
    const base = t(`item.${id}.name`);
    if (id.startsWith('ct_') || item?.kind === ItemKinds.TM) return compose(base, t('item_suffix_tm'));
    if (id.startsWith('cs_') || item?.kind === ItemKinds.HM) return compose(base, t('item_suffix_hm'));
    return base;
  }
}
