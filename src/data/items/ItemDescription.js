/**
 * @file ItemDescription.js
 * @brief Description shown for an item, resolved from the item data itself (C++: helper of ItemDB).
 *
 * Priority:
 *   1. `item.<id>.desc`          — the authored description (both languages);
 *   2. `item_effect_<kind>`      — derived from the held `effect` of the item (berries, held items…);
 *   3. `item_category_<category>`— derived from the item category (mints, shards, key items…);
 *   4. `item_effect_treasure`    — a treasure is described by its resale value;
 *   5. ''                        — no description: the view hides the block instead of showing a key.
 *
 * Every text is a localization key derived from data: adding an item never needs a new description
 * in the components, and nothing is displayed in a fixed language.
 */

import { t, compose } from '../../localization/LocalizationManager.js';
import { LocalizationManager } from '../../localization/LocalizationManager.js';
import { ItemDB } from './ItemDB.js';

export class ItemDescription {
  /**
   * @param {string} itemId
   * @returns {import('../../localization/LocalizedText.js').LocalizedText|string} Empty string when unknown
   */
  static of(itemId) {
    const id = String(itemId || '');
    const localization = LocalizationManager.getInstance();
    if (!id) return '';

    const authoredKey = `item.${id}.desc`;
    if (localization.has(authoredKey)) return t(authoredKey);

    const item = ItemDB.getInstance().getById(id);
    if (!item) return '';

    const effectKind = item.effect?.kind;
    if (effectKind && localization.has(`item_effect_${effectKind}`)) {
      return t(`item_effect_${effectKind}`, ItemDescription._effectParams(item.effect));
    }

    if (item.category && localization.has(`item_category_${item.category}`)) {
      return t(`item_category_${item.category}`);
    }

    if (item.kind === 'treasure' && item.value > 0) {
      return t('item_effect_treasure', { value: item.value });
    }

    return '';
  }

  /**
   * Parameters available to an effect description.
   * @private
   * @param {Object} effect
   * @returns {Object}
   */
  static _effectParams(effect) {
    const params = {};
    if (effect.status) params.status = t(`status_${effect.status}`);
    if (effect.stat) params.stat = t(`stat_${effect.stat}`);
    if (effect.type) params.type = t(`type.${effect.type}`);
    if (effect.percent) params.percent = effect.percent;
    if (effect.power?.base) params.percent = Math.round(effect.power.base * 100);
    return params;
  }

  /**
   * Description of an item followed by an extra sentence (used by the ball list).
   * @param {string} itemId
   * @param {any} extra
   * @returns {import('../../localization/LocalizedText.js').LocalizedText|string}
   */
  static composeWith(itemId, extra) {
    const base = ItemDescription.of(itemId);
    if (!base) return extra || '';
    if (!extra) return base;
    return compose(base, ' ', extra);
  }
}
