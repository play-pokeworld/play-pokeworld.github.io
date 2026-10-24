/**
 * @file ShopItemCard.js
 * @brief One offer of the shop grid (original shopGridHtml card): icon, name, price, bag count.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIIcon } from '../../ui/UIIcon.js';
import { UIImage } from '../../ui/UIImage.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { ShopOfferKinds } from '../../systems/shop/ShopOfferKinds.js';
import { CURRENCIES } from '../../data/save/CurrencyDefinitions.js';
import { PriceTag } from './PriceTag.js';
import { TextFormatter } from '../../core/TextFormatter.js';
import { t } from '../../localization/LocalizationManager.js';

export class ShopItemCard extends UIContainer {
  /**
   * @param {Object} offer - ShopCatalog offer
   * @param {boolean} selected
   * @param {(offer: Object) => void} onSelect
   */
  constructor(offer, selected, onSelect) {
    super({ className: 'pw-shop-item', name: 'ShopItemCard' });
    this.toggleClass('selected', selected);
    this.toggleClass('soldout', offer.soldOut);
    const name = ShopItemCard.offerName(offer);
    this.setData('offerKey',offer.key);
    this.addChildren([
      new UIContainer({
        className: 'pw-shop-ico',
        children:[offer.kind===ShopOfferKinds.UPGRADE?new UIIcon({name:offer.icon,className:'pw-shop-upgrade-icon'}):new UIImage({src:ItemDB.getInstance().getImagePath(offer.itemId),alt:name,className:'pw-shop-ico-img',pixelated:true})]
      }),
      new UIText({ tagName: 'div', className: 'pw-shop-name', text: name }),
      new UIContainer({ className: 'pw-shop-price', children: [new PriceTag(offer.currency, offer.unitPrice)] }),
      offer.soldOut
        ? new UIText({ tagName: 'div', className: 'pw-shop-soldout', text: t('shop_bag_max', { n: offer.limit }) })
        : new UIText({ tagName: 'div', className: 'pw-shop-stock', text:offer.kind===ShopOfferKinds.UPGRADE?t(offer.descriptionKey):`${t('shop_bag_lbl')} : ${TextFormatter.formatNumber(offer.owned)}` })
    ]);
    if (!offer.soldOut) this.addDomListener('click', () => onSelect(offer));
  }

  /**
   * @param {Object} offer
   * @returns {string} Item name; Master Ball offers add their currency
   */
  static offerName(offer) {
    if(offer.kind===ShopOfferKinds.UPGRADE)return t(offer.labelKey);
    const name = t(`item.${offer.itemId}.name`);
    if (offer.kind !== ShopOfferKinds.MASTER_BALL) return name;
    const currency = CURRENCIES.find((entry) => entry.id === offer.currency);
    return t('shop_offer_with_currency', { name, currency: currency ? t(currency.labelKey) : offer.currency });
  }
}
