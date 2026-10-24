/** @file MarketPanel.js @brief Regional market in the same fullscreen purchase flow as the town shop. */
import { UIFullscreenPanel } from '../../ui/UIFullscreenPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { ModalIds } from '../../config/ModalIds.js';
import { MarketRules } from '../../config/MarketRules.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { ShopSystem } from '../../systems/ShopSystem.js';
import { ShopCatalog } from '../../systems/shop/ShopCatalog.js';
import { ShopOfferKinds } from '../../systems/shop/ShopOfferKinds.js';
import { FeatureAccessSystem } from '../../systems/FeatureAccessSystem.js';
import { MoneyRow } from '../components/MoneyRow.js';
import { ShopFooter } from '../components/ShopFooter.js';
import { MarketCategoryView } from '../components/MarketCategoryView.js';
import { CurrencyChangedEvent } from '../../core/events/CurrencyChangedEvent.js';
import { BoxChangedEvent } from '../../core/events/BoxChangedEvent.js';
import { PokedexChangedEvent } from '../../core/events/PokedexChangedEvent.js';
import { MarketPurchaseCompletedEvent } from '../../core/events/MarketPurchaseCompletedEvent.js';
import { ContentAccessChangedEvent } from '../../core/events/ContentAccessChangedEvent.js';
import { LocationChangedEvent } from '../../core/events/LocationChangedEvent.js';
import { SaveCreatedEvent } from '../../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../../core/events/SaveDeletedEvent.js';
import { LanguageChangedEvent } from '../../core/events/LanguageChangedEvent.js';
import { t } from '../../localization/LocalizationManager.js';

export class MarketPanel extends UIFullscreenPanel {
  constructor() {
    super({
      id: ModalIds.MARKET,
      title: t('panel_market_title'),
      name: 'MarketPanel',
    });
    this._selected = null;
    this._quantity = 1;
    this._context = '';
    this._wallet = new MoneyRow(0, {
      currency: MarketRules.CURRENCY,
      compact: true,
    });
    this.setFilters([
      new UIContainer({
        className: 'pw-market-wallet',
        children: [this._wallet],
      }),
    ]);
    this._message = new UIText({
      tagName: 'div',
      className: 'pw-empty-state-lg',
    });
    this._categories = new Map(
      MarketRules.CATEGORY_ORDER.map((id) => [
        id,
        new MarketCategoryView(id, (offer) => this._select(offer)),
      ]),
    );
    this._list = new UIContainer({
      className: 'pw-market-list',
      children: [...this._categories.values()],
    });
    this._footer = new ShopFooter({
      offer: { kind: ShopOfferKinds.POKEMON, currency: MarketRules.CURRENCY },
      quantity: 1,
      total: 0,
      className: 'pw-market-footer',
      liveQuantity: true,
      compactNumbers: true,
      onQuantity: (quantity) => this._setQuantity(quantity),
      onAdd: (step) => this._setQuantity(this._quantity + step),
      onMax: () => {
        const offer = this._selectedOffer();
        if (offer)
          this._setQuantity(
            ShopCatalog.maxQuantity(
              offer,
              SaveSystem.getInstance().getCurrentSave(),
            ),
          );
      },
      onBuy: () => this._buy(),
    });
    this.setContent([this._message, this._list, this._footer]);
    for (const type of [
      CurrencyChangedEvent,
      BoxChangedEvent,
      PokedexChangedEvent,
      MarketPurchaseCompletedEvent,
      ContentAccessChangedEvent,
      LocationChangedEvent,
      SaveCreatedEvent,
      SaveLoadedEvent,
      SaveDeletedEvent,
      LanguageChangedEvent,
    ])
      this.listen(type, () => {
        if (this.isOpen()) this._refresh();
      });
  }
  /** @override */
  onOpen() {
    this._refresh();
  }
  /** @private @returns {Object|null} */
  _selectedOffer() {
    return (
      ShopSystem.getInstance()
        .getMarketOffers()
        .find((offer) => offer.key === this._selected) || null
    );
  }
  /** @private */
  _refresh() {
    const save = SaveSystem.getInstance().getCurrentSave(),
      context = save ? `${save.id}:${save.player.region}` : '';
    if (context !== this._context) {
      this._context = context;
      this._selected = null;
      this._quantity = 1;
    }
    this.setTitle(t('panel_market_title'));
    this._wallet.setAmount(save?.currencies.get(MarketRules.CURRENCY) || 0);
    const accessible = FeatureAccessSystem.getInstance().isMarketUnlocked();
    const offers = accessible ? ShopSystem.getInstance().getMarketOffers() : [];
    const selected =
      offers.find((offer) => offer.key === this._selected) || null;
    if (!selected) this._selected = null;
    if (selected)
      this._quantity = Math.min(
        this._quantity,
        ShopCatalog.maxQuantity(selected, save),
      );
    this._message.setText(
      t(accessible ? 'market_empty' : 'market_access_locked'),
    );
    this._message.setVisible(!accessible || offers.length === 0);
    this._list.setVisible(accessible && offers.length > 0);
    for (const [id, view] of this._categories)
      view.setOffers(
        offers.filter((offer) => offer.category === id),
        this._selected,
      );
    this._footer.setVisible(!!selected);
    this._footer.refreshLabels();
    if (selected)
      this._footer.setQuote(
        this._quantity,
        ShopCatalog.totalPrice(selected, this._quantity, save),
      );
  }
  /** @private @param {Object} offer */
  _select(offer) {
    this._selected = offer.key;
    this._quantity = 1;
    this._refresh();
  }
  /** @private @param {number} quantity */
  _setQuantity(quantity) {
    this._quantity = Number.isFinite(Number(quantity))
      ? Math.max(1, Math.floor(Number(quantity)))
      : 1;
    this._refresh();
  }
  /** @private */
  _buy() {
    if (!this._selected) return;
    ShopSystem.getInstance().buyMarket(this._selected, this._quantity);
    this._quantity = 1;
    this._refresh();
  }
}
