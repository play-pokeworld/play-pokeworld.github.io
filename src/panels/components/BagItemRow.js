/**
 * @file BagItemRow.js
 * @brief One bag entry (original BagView cell): icon, name, holder mark, quantity.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIImage } from '../../ui/UIImage.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { t } from '../../localization/LocalizationManager.js';

export class BagItemRow extends UIContainer {
  /**
   * @param {Object} entry - BagQuery entry
   * @param {boolean} selected
   * @param {(itemId: string) => void} onSelect
   */
  constructor(entry, selected, onSelect) {
    super({ className: 'inv-item pw-starter-chosen', name: 'BagItemRow' });
    this.toggleClass('selected', selected);
    const name = new UIContainer({ className: 'inv-name pw-starter-chosen-label', children: [new UIText({ text: entry.name })] });
    if (entry.holder) name.addChild(new UIText({ className: 'inv-holder', text: t('bag_held_by', { name: entry.holder.getDisplayName() }) }));
    this.addChildren([
      new UIContainer({
        className: 'inv-icon',
        children: [new UIImage({ src: ItemDB.getInstance().getImagePath(entry.itemId), alt: entry.name, className: 'inv-icon-img', pixelated: true })]
      }),
      new UIContainer({ className: 'pw-flex-1', children: [name] }),
      new UIText({ tagName: 'div', className: 'inv-qty pw-starter-chosen-level', text: t('bag_qty', { n: entry.quantity }) })
    ]);
    this.addDomListener('click', () => onSelect(entry.itemId));
  }
}
