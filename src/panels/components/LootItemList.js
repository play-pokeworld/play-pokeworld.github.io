/**
 * @file LootItemList.js
 * @brief Shared "found items" list of the battle summary and the AFK report.
 *
 * Both summaries used to build their own row with a raw <img> plus a class nobody styled
 * (`battle-summary-item-icon`), so the sprite rendered at its file size: 30 px for a candy,
 * 371 px for a Master Ball. Item media is the canonical UIItemSprite in the canonical round frame,
 * exactly like the drops of the location window (`.pw-grid-media`, 72 px).
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIItemSprite } from '../../ui/UIItemSprite.js';
import { TextFormatter } from '../../core/TextFormatter.js';
import { t } from '../../localization/LocalizationManager.js';

export class LootItemList extends UIContainer {
  /**
   * @param {{items:Array<{itemId:string,quantity:number}>, emptyKey:string, resolveName:(itemId:string)=>string}} options
   *   `resolveName` lets the caller keep its own tolerant lookup (localized name or raw id).
   */
  constructor({ items = [], emptyKey, resolveName }) {
    super({ className: 'pw-col pw-gap-sm', name: 'LootItemList' });
    this.addChild(new UIText({ tagName: 'h3', className: 'pw-section-title', text: t('found_items_title') }));
    const filtered = items.filter((entry) => entry?.itemId && entry.quantity > 0);
    if (!filtered.length) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-empty-state is-sm', text: t(emptyKey) }));
      return;
    }
    const list = new UIContainer({ className: 'pw-row-wrap pw-gap-sm' });
    for (const entry of filtered) {
      const name = resolveName(entry.itemId);
      list.addChild(new UIContainer({
        className: 'loot-item-entry',
        children: [
          new UIItemSprite({ itemId: entry.itemId, alt: name, className: 'pw-grid-media' }),
          new UIContainer({
            className: 'loot-item-meta',
            children: [
              new UIText({ tagName: 'div', className: 'pw-bold pw-text-sm pw-light2', text: name }),
              new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1', text: `×${TextFormatter.formatNumber(entry.quantity)}` })
            ]
          })
        ]
      }));
    }
    this.addChild(list);
  }
}
