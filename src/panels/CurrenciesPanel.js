/**
 * @file CurrenciesPanel.js
 * @brief Wallet window: one column per visible currency (C++: class CurrenciesPanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIImage } from '../ui/UIImage.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { CURRENCIES } from '../data/CurrencyDefinitions.js';
import { CurrencyChangedEvent } from '../core/events/CurrencyChangedEvent.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { t } from '../localization/LocalizationManager.js';

export class CurrenciesPanel extends DraggablePanel {
  /**
   * @param {string} column - Starting dashboard column (DashboardColumns value)
   */
  constructor(column) {
    super({
      id: WindowIds.CURRENCY,
      column,
      title: t('panel_currency_title'),
      icon: 'pokedollar',
      bodyId: 'currency-window-body',
      name: 'CurrenciesPanel'
    });

    /** @private @type {Map<string, UIText>} */
    this._amounts = new Map();
    const wallet = new UIContainer({ className: 'pw-currency-panel' });
    for (const def of CURRENCIES.filter((c) => c.shown)) {
      const amount = new UIText({ className: 'pw-cur-amount' });
      this._amounts.set(def.id, amount);
      const column = new UIContainer({
        id: `pw-cur-${def.id}`,
        className: 'pw-cur-col',
        children: [
          new UIImage({ src: AssetPaths.currency(def.iconStem), className: 'pw-cur-ico' }),
          amount,
          new UIText({ className: 'pw-cur-name', text: t(def.labelKey) })
        ]
      });
      column.setTooltip(t(def.labelKey));
      wallet.addChild(column);
    }
    this.addChild(wallet);

    this._refresh();
    this.listen(CurrencyChangedEvent, () => this._refresh());
  }

  /** @private */
  _refresh() {
    const currencies = SaveSystem.getInstance().getCurrentSave()?.currencies;
    for (const [id, text] of this._amounts) {
      const value = TextFormatter.formatNumber(currencies ? currencies.get(id) : 0);
      text.setText(id === 'money' ? t('money_amount', { value }) : value);
    }
  }
}
