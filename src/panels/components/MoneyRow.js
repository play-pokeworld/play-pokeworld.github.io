/** @file MoneyRow.js @brief Shared fullscreen wallet row; money by default, with typed currency support for the market. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { PriceTag } from './PriceTag.js';
import { CURRENCIES } from '../../data/save/CurrencyDefinitions.js';
import { TextFormatter } from '../../core/TextFormatter.js';
import { t } from '../../localization/LocalizationManager.js';
export class MoneyRow extends UIContainer {
  /** @param {number} amount @param {{currency?:string}} [options] */
  constructor(amount, { currency = 'money', compact = false } = {}) {
    super({ className: 'pw-money-row', name: 'MoneyRow' });
    this._currency = currency;
    this.setAttribute('role', 'status');
    this.setAttribute('aria-live', 'polite');
    this._label = new UIText({ className: 'pw-money-label' });
    this._amount =
      currency === 'money'
        ? new UIText({ tagName: 'b', className: 'pw-money-amount' })
        : new PriceTag(currency, amount, 'pw-money-amount', { compact });
    this.addChildren([this._label, this._amount]);
    this.setAmount(amount);
  }
  /** @param {number} amount */
  setAmount(amount) {
    const definition = CURRENCIES.find((entry) => entry.id === this._currency);
    this._label.setText(
      t(
        this._currency === 'money'
          ? 'money'
          : definition?.labelKey || 'currency_quest_points',
      ),
    );
    if (this._currency === 'money')
      this._amount.setText(
        t('money_amount', { value: TextFormatter.formatNumber(amount) }),
      );
    else this._amount.setAmount(amount);
  }
}
