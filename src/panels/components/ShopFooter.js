/**
 * @file ShopFooter.js
 * @brief Purchase bar of the shop (original shopFooterHtml): Reset, quantity, +10 / +100, Max,
 * total price and Buy. The quantity state lives in the ShopPanel; this bar only reports clicks.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { ShopOfferKinds } from '../../systems/shop/ShopOfferKinds.js';
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
  constructor({
    offer,
    quantity,
    total,
    onQuantity,
    onAdd,
    onMax,
    onBuy,
    className = '',
    liveQuantity = false,
    compactNumbers = false,
  }) {
    super({
      className: `pw-shop-footer ${className}`.trim(),
      name: 'ShopFooter',
    });
    this._total = new PriceTag(
      offer.currency,
      offer.kind === ShopOfferKinds.UPGRADE ? offer.unitPrice : total,
      'pw-shop-total',
      { compact: compactNumbers },
    );
    this._labels = [];
    const buy = new UIButton({
      variant: 'hbtn',
      className: 'pw-shop-buy',
      text: t('buy_btn'),
      onClick: () => onBuy(),
    });
    this._labels.push([buy, 'buy_btn']);
    if (offer.kind === ShopOfferKinds.UPGRADE) {
      this.addChildren([
        new UIText({ text: t('relaunch_one_time') }),
        this._total,
        buy,
      ]);
      return;
    }
    this._input = new UITextInput({
      type: 'number',
      min: 1,
      value: String(quantity),
      className: 'pw-shop-qty',
      onChange: (value) => onQuantity(Number(value)),
      onInput: liveQuantity ? (value) => onQuantity(Number(value)) : null,
    });
    this.addChildren([
      this._textButton('shop_reset', () => onQuantity(1)),
      this._input,
      ...ShopRules.QUANTITY_STEPS.map(
        (step) =>
          new UIButton({
            variant: 'hbtn',
            text: t('shop_add_qty', { n: step }),
            onClick: () => onAdd(step),
          }),
      ),
      this._textButton('shop_max', () => onMax()),
      this._total,
      buy,
    ]);
  }
  /** @private @param {string} key @param {Function} onClick */
  _textButton(key, onClick) {
    const button = new UIButton({ variant: 'hbtn', text: t(key), onClick });
    this._labels.push([button, key]);
    return button;
  }
  /** @param {number} quantity @param {number} total */
  setQuote(quantity, total) {
    if (this._input) this._input.setValue(String(quantity));
    this._total.setAmount(total);
  }
  /** Keeps translated actions and field accessible without replacing nodes. */
  refreshLabels() {
    for (const [button, key] of this._labels) button.setText(t(key));
    if (this._input) this._input.setAriaLabel(t('market_quantity_label'));
  }
}
