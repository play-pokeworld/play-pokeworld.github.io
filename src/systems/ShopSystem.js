/**
 * @file ShopSystem.js
 * @brief Town shop purchases (C++ equivalent: class ShopSystem : public BaseSystem). DOM-free.
 * Original buyItem / buyPokeballs / buyMasterBall: checks the offer is sold at the player's
 * location, the shop is open (league-locked shops), the price and the bag space; pays, adds the
 * items, counts the purchase (Master Ball price steps), grants the Honor Ball bonus, saves.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { LocationSystem } from './LocationSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { ShopDB } from '../data/shops/ShopDB.js';
import { ShopRules } from '../config/ShopRules.js';
import { ShopCatalog } from './shop/ShopCatalog.js';
import { t } from '../localization/LocalizationManager.js';

/** Results of ShopSystem.buy(). */
export const PurchaseResults = Object.freeze({
  OK: 'ok',
  NO_SHOP: 'no_shop',
  LOCKED: 'locked',
  UNKNOWN_OFFER: 'unknown_offer',
  SOLD_OUT: 'sold_out',
  NOT_ENOUGH: 'not_enough'
});

export class ShopSystem extends BaseSystem {
  /** @private @type {ShopSystem|null} */
  static _instance = null;

  /** @returns {ShopSystem} */
  static getInstance() {
    if (!ShopSystem._instance) ShopSystem._instance = new ShopSystem();
    return ShopSystem._instance;
  }

  constructor() {
    super('ShopSystem', 'System');
  }

  // --- Queries ---

  /**
   * @param {string} [locationId] - Defaults to the player position
   * @returns {Readonly<Object>|null} ShopDB definition of the location shop
   */
  getShop(locationId = LocationSystem.getInstance().getCurrentLocationId()) {
    const shopId = LocationDB.getInstance().getById(locationId)?.shop;
    return shopId ? ShopDB.getInstance().getById(shopId) : null;
  }

  /**
   * @param {string} [locationId]
   * @returns {boolean} true when the shop waits for a league title
   */
  isLocked(locationId = LocationSystem.getInstance().getCurrentLocationId()) {
    const shop = this.getShop(locationId);
    const save = SaveSystem.getInstance().getCurrentSave();
    return !!shop?.requiresLeague && !save?.player.hasBadge(shop.requiresLeague);
  }

  /**
   * @param {string} [locationId]
   * @returns {Object[]} ShopCatalog offers ([] without a shop or a save)
   */
  getOffers(locationId = LocationSystem.getInstance().getCurrentLocationId()) {
    const save = SaveSystem.getInstance().getCurrentSave();
    return save ? ShopCatalog.offers(LocationDB.getInstance().getById(locationId), save) : [];
  }

  // --- Commands ---

  /**
   * @param {string} offerKey - ShopOffer key
   * @param {number} quantity
   * @param {string} [locationId]
   * @returns {string} PurchaseResults value
   */
  buy(offerKey, quantity, locationId = LocationSystem.getInstance().getCurrentLocationId()) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.getShop(locationId)) return PurchaseResults.NO_SHOP;
    if (this.isLocked(locationId)) return this._fail(PurchaseResults.LOCKED, 'shop_locked');
    const offer = this.getOffers(locationId).find((entry) => entry.key === offerKey);
    if (!offer) return PurchaseResults.UNKNOWN_OFFER;
    if (offer.soldOut) return this._fail(PurchaseResults.SOLD_OUT, 'shop_bag_full', { max: offer.limit });
    const amount = Math.min(Math.max(1, Math.floor(Number(quantity) || 1)), ShopCatalog.maxQuantity(offer, save));
    const total = ShopCatalog.totalPrice(offer, amount, save);
    if (save.currencies.get(offer.currency) < total) return this._fail(PurchaseResults.NOT_ENOUGH, 'shop_not_enough');

    save.currencies.add(offer.currency, -total);
    save.inventory.add(offer.itemId, amount);
    const honor = ShopRules.HONOR_BALL;
    const before = save.statistics.purchases[offer.itemId] || 0;
    save.statistics.recordPurchase(offer.itemId, amount);
    const bonus = offer.itemId === honor.from ? Math.floor((before + amount) / honor.every) - Math.floor(before / honor.every) : 0;
    if (bonus > 0) save.inventory.add(honor.ball, bonus);
    SaveSystem.getInstance().saveCurrent();

    const name = t(`item.${offer.itemId}.name`);
    this._notify(t('shop_bought', { quantity: amount, name }), NotificationTones.SUCCESS);
    if (bonus > 0) this._notify(t('shop_honor_bonus', { quantity: bonus, name: t(`item.${honor.ball}.name`) }), NotificationTones.ACCENT);
    return PurchaseResults.OK;
  }

  // --- Internals ---

  /** @private */
  _fail(result, key, params) {
    this._notify(t(key, params), NotificationTones.DANGER);
    return result;
  }

  /** @private */
  _notify(text, tone) {
    NotificationSystem.getInstance().notifyTemporary(text, { channel: NotificationChannels.GAMEPLAY, tone });
  }
}
