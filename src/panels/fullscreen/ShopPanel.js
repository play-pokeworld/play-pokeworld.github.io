/**
 * @file ShopPanel.js
 * @brief Town shop full-screen panel (original renderShop / shop-panel.js, PokéClicker style):
 * click an offer to select it, set the quantity in the footer, then Buy.
 * States: no shop here, locked (league title missing), offers.
 */
import { UIFullscreenPanel } from '../../ui/UIFullscreenPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { ModalIds } from '../../config/ModalIds.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { ShopSystem } from '../../systems/ShopSystem.js';
import { ShopCatalog } from '../../systems/shop/ShopCatalog.js';
import { CurrencyChangedEvent } from '../../core/events/CurrencyChangedEvent.js';
import { InventoryChangedEvent } from '../../core/events/InventoryChangedEvent.js';
import { LocationChangedEvent } from '../../core/events/LocationChangedEvent.js';
import { ShopPurchaseCompletedEvent } from '../../core/events/ShopPurchaseCompletedEvent.js';
import { PriceTag } from '../components/PriceTag.js';
import { MoneyRow } from '../components/MoneyRow.js';
import { ShopItemCard } from '../components/ShopItemCard.js';
import { ShopFooter } from '../components/ShopFooter.js';
import { t } from '../../localization/LocalizationManager.js';

export class ShopPanel extends UIFullscreenPanel {
  constructor() {
    super({ id: ModalIds.SHOP, title: t('panel_shop_title'), name: 'ShopPanel' });
    /** @private @type {string|null} Selected offer key */
    this._selected = null;
    /** @private */
    this._quantity = 1;
    /** @private @type {string|null} Shop of the last render (selection reset on change) */
    this._shopId = null;
    const refresh = () => {
      if (this.isOpen()) this._render();
    };
    this.listen(CurrencyChangedEvent, refresh);
    this.listen(ShopPurchaseCompletedEvent,refresh);
    this.listen(InventoryChangedEvent, refresh);
    this.listen(LocationChangedEvent, refresh);
  }

  /** @override */
  onOpen() {
    this._render();
  }

  /** @private */
  _render() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const shops = ShopSystem.getInstance();
    const shop = shops.getShop();
    this.setTitle(shop ? t(`shop.${shop.id}.name`) : t('panel_shop_title'));
    this.setFilters([new UIContainer({className:'pw-shop-wallet',children:[new MoneyRow(save?.currencies.get('money')??0),new PriceTag('questPoint',save?.currencies.get('questPoint')??0)]})]);
    if (!shop || !save) {
      this.setContent([new UIText({ tagName: 'div', className: 'pw-empty-state-lg', text: t('shop_empty') })]);
      return;
    }
    if (shops.isLocked()) {
      const league = t(`trainer.${shop.requiresLeague}.name`);
      this.setContent([new UIContainer({
        className: 'pw-empty-state-lg',
        children: [
          new UIContainer({ className: 'pw-big-icon' }),
          new UIText({ tagName: 'div', className: 'pw-choice-title', text: t('shop_locked_title') }),
          new UIText({ tagName: 'div', className: 'pw-choice-desc', text: t('shop_locked_desc', { league }) })
        ]
      })]);
      return;
    }
    if (this._shopId !== shop.id) {
      this._shopId = shop.id;
      this._selected = null;
      this._quantity = 1;
    }
    const offers = shops.getOffers();
    const selected = offers.find((offer) => offer.key === this._selected) ?? null;
    if (selected) this._quantity = Math.min(Math.max(1, this._quantity), ShopCatalog.maxQuantity(selected, save));
    const grid = new UIContainer({ className: 'pw-shop-list' });
    for (const offer of offers) {
      grid.addChild(new ShopItemCard(offer, offer.key === this._selected, (picked) => this._select(picked)));
    }
    const children = [new UIText({ tagName: 'div', className: 'pw-cur-section-title', text: t('shop_items_title') }), grid];
    if (selected) {
      children.push(new ShopFooter({
        offer: selected,
        quantity: this._quantity,
        total: ShopCatalog.totalPrice(selected, this._quantity, save),
        onQuantity: (quantity) => this._setQuantity(quantity),
        onAdd: (step) => this._setQuantity(this._quantity + step),
        onMax: () => this._setQuantity(ShopCatalog.maxQuantity(selected, save)),
        onBuy: () => this._buy()
      }));
    }
    this.setContent(children);
  }

  /** @private */
  _select(offer) {
    this._selected = offer.key;
    this._quantity = 1;
    this._render();
  }

  /** @private */
  _setQuantity(quantity) {
    this._quantity = Math.max(1, Math.floor(Number(quantity) || 1));
    this._render();
  }

  /** @private */
  _buy() {
    if (!this._selected) return;
    ShopSystem.getInstance().buy(this._selected, this._quantity);
    this._quantity = 1;
    this._render();
  }
}
