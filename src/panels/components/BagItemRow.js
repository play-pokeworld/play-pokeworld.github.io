/**
 * @file BagItemRow.js
 * @brief One reusable Bag entry row for inspection or a focused held-item selection flow.
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
   * @param {{description?:string,holderLabel?:string,quantityLabel?:string,disabled?:boolean,rowClassName?:string}} [options]
   */
  constructor(entry, selected, onSelect, options = {}) {
    const disabled = options.disabled === true;
    const rowClassName = options.rowClassName || '';
    super({
      className: `inv-item pw-starter-chosen${rowClassName ? ` ${rowClassName}` : ''}${disabled ? ' is-disabled' : ''}`,
      name: 'BagItemRow'
    });
    this.setData('itemId', entry.itemId);
    this.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    this.toggleClass('selected', selected);

    const name = new UIContainer({
      className: 'inv-name pw-starter-chosen-label',
      children: [new UIText({ text: entry.name })]
    });
    if (options.description) name.addChild(new UIText({ className: 'inv-desc', text: options.description }));
    const holderLabel = options.holderLabel ?? (entry.holder ? t('bag_held_by', { name: entry.holder.getDisplayName() }) : '');
    if (holderLabel) name.addChild(new UIText({ className: 'inv-holder', text: holderLabel }));

    this.addChildren([
      new UIContainer({
        className: 'inv-icon',
        children: [new UIImage({ src: ItemDB.getInstance().getImagePath(entry.itemId), alt: entry.name, className: 'inv-icon-img', pixelated: true })]
      }),
      new UIContainer({ className: 'pw-flex-1', children: [name] }),
      new UIText({
        tagName: 'div',
        className: 'inv-qty pw-starter-chosen-level',
        text: options.quantityLabel ?? t('bag_qty', { n: entry.quantity })
      })
    ]);

    if (!disabled && typeof onSelect === 'function') {
      this.setAttribute('role', 'button');
      this.setAttribute('tabindex', '0');
      this.addDomListener('click', (event) => {
        // A native double click produces a second rebuild under the pointer and shifts the list.
        if (event.detail > 1) return;
        onSelect(entry.itemId);
      });
      this.addDomListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onSelect(entry.itemId);
      });
    }
  }
}
