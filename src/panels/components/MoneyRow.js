/**
 * @file MoneyRow.js
 * @brief Balance line of the full-screen panels (original moneyRowVNode): label + bold amount.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { TextFormatter } from '../../core/TextFormatter.js';
import { t } from '../../localization/LocalizationManager.js';

export class MoneyRow extends UIContainer {
  /**
   * @param {number} amount - Pokédollars
   */
  constructor(amount) {
    super({ className: 'pw-money-row', name: 'MoneyRow' });
    this.setAttribute('role', 'status');
    this.setAttribute('aria-live', 'polite');
    this.addChildren([
      new UIText({ className: 'pw-money-label', text: t('money') }),
      new UIText({ tagName: 'b', className: 'pw-money-amount', text: t('money_amount', { value: TextFormatter.formatNumber(amount) }) })
    ]);
  }
}
