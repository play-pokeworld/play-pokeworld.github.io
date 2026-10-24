/**
 * @file PriceTag.js
 * @brief Amount preceded by its currency icon (original moneySpriteHtml / currencyAmountSpriteHtml).
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIImage } from '../../ui/UIImage.js';
import { AssetPaths } from '../../config/AssetPaths.js';
import { CURRENCIES } from '../../data/save/CurrencyDefinitions.js';
import { TextFormatter } from '../../core/TextFormatter.js';
import { t } from '../../localization/LocalizationManager.js';

export class PriceTag extends UIContainer {
  /**
   * @param {string} currency - CurrencyDefinitions id
   * @param {number} amount
   * @param {string} [className='']
   */
  constructor(currency, amount, className = '', { compact = false } = {}) {
    super({
      tagName: 'span',
      className: `pw-price-tag ${className}`.trim(),
      name: 'PriceTag',
    });
    this._compact = compact;
    const def = CURRENCIES.find((entry) => entry.id === currency);
    this._icon = new UIImage({
      loading: 'eager',
      src: AssetPaths.currency(def?.iconStem ?? currency),
      alt: def ? t(def.labelKey) : '',
      className: 'pw-price-tag-ico',
    });
    this._amount = new UIText({
      className: 'pw-price-tag-amount',
      text: this._compact
        ? TextFormatter.formatCompactNumber(amount)
        : TextFormatter.formatNumber(amount),
    });
    this.addChildren([this._icon, this._amount]);
  }

  /** @param {number} amount */
  setAmount(amount) {
    this._amount.setText(
      this._compact
        ? TextFormatter.formatCompactNumber(amount)
        : TextFormatter.formatNumber(amount),
    );
    if (this._compact) this.setTooltip(TextFormatter.formatNumber(amount));
  }
}
