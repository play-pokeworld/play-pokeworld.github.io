/**
 * @file ShopFooter.js
 * @brief Purchase bar of the shop (original shopFooterHtml): Reset, quantity, +10 / +100, Max,
 * total price and Buy. The quantity state lives in the ShopPanel; this bar only reports clicks.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIButton } from '../../ui/UIButton.js';
import { UITextInput } from '../../ui/UITextInput.js';
import { ShopRules } from '../../config/ShopRules.js';
import { PriceTag } from './PriceTag.js';
import { t } from '../../localization/LocalizationManager.js';

export class ShopFooter extends UIContainer {
  /**
   * @param {Object} options
   * @param {Object} options.offer - Selected offer
   * @param {number} options.quantity
   * @param {number} options.total
   * @param {(quantity: number) => void} options.onQuantity - Typed / reset quantity
   * @param {(step: number) => void} options.onAdd
   * @param {() => void} options.onMax
   * @param {() => void} options.onBuy
   */
  constructor({ offer, quantity, total, onQuantity, onAdd, onMax, onBuy }) {
    super({ className: 'pw-shop-footer', name: 'ShopFooter' });
    this._input = new UITextInput({
      type: 'number',
      min: 1,
      value: String(quantity),
      className: 'pw-shop-qty',
      onChange: (value) => onQuantity(Number(value))
    });
    this._total = new PriceTag(offer.currency, total, 'pw-shop-total');
    this.addChildren([
      new UIButton({ variant: 'hbtn', text: t('shop_reset'), onClick: () => onQuantity(1) }),
      this._input,
      ...ShopRules.QUANTITY_STEPS.map((step) => new UIButton({ variant: 'hbtn', text: t('shop_add_qty', { n: step }), onClick: () => onAdd(step) })),
      new UIButton({ variant: 'hbtn', text: t('shop_max'), onClick: () => onMax() }),
      this._total,
      new UIButton({ variant: 'hbtn', className: 'pw-shop-buy', text: t('buy_btn'), onClick: () => onBuy() })
    ]);
  }
}
