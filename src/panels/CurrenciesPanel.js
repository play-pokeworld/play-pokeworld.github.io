/**
 * @file CurrenciesPanel.js
 * @brief Wallet window: original horizontal currency columns with progressive discovery.
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIImage } from '../ui/UIImage.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { CURRENCIES } from '../data/save/CurrencyDefinitions.js';
import { CurrencyChangedEvent } from '../core/events/CurrencyChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { t } from '../localization/LocalizationManager.js';

export class CurrenciesPanel extends DraggablePanel {
  /** @param {string} column - Starting dashboard column (DashboardColumns value) */
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
    /** @private @type {Map<string, UIContainer>} */
    this._columns = new Map();
    this._definitions = CURRENCIES.filter((definition) => definition.shown);

    const wallet = new UIContainer({ className: 'pw-currency-panel' });
    for (const definition of this._definitions) {
      const amount = new UIText({ className: 'pw-cur-amount' });
      const label = t(definition.labelKey);
      const tooltip = definition.gainKey
        ? `${label} — ${t(definition.gainKey)}`
        : label;
      const currencyColumn = new UIContainer({
        id: `pw-cur-${definition.id}`,
        className: 'pw-cur-col',
        children: [
          new UIImage({
            src: AssetPaths.currency(definition.iconStem),
            alt: label,
            className: 'pw-cur-ico',
            pixelated: true
          }),
          amount,
          new UIText({ className: 'pw-cur-name', text: label })
        ]
      });
      currencyColumn.setTooltip(tooltip);
      this._amounts.set(definition.id, amount);
      this._columns.set(definition.id, currencyColumn);
      wallet.addChild(currencyColumn);
    }
    this.addChild(wallet);

    this._refresh();
    for (const eventClass of [CurrencyChangedEvent, SaveCreatedEvent, SaveLoadedEvent]) {
      this.listen(eventClass, () => this._refresh());
    }
  }

  /** @private */
  _refresh() {
    const currencies = SaveSystem.getInstance().getCurrentSave()?.currencies ?? null;
    for (const definition of this._definitions) {
      const amount = this._amounts.get(definition.id);
      const column = this._columns.get(definition.id);
      if (amount) {
        amount.setText(TextFormatter.formatNumber(currencies ? currencies.get(definition.id) : 0));
      }
      if (column) {
        const visible = currencies
          ? currencies.isRevealed(definition.id)
          : definition.id === 'money';
        if (visible) column.show();
        else column.hide();
      }
    }
  }
}
