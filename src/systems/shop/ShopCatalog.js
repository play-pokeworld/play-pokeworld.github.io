/**
 * @file ShopCatalog.js
 * @brief Offers of a town shop and their prices (original shopItemsModel / shopMaxAllowed /
 * masterBallTotalPrice). Pure: reads the data and the save, never writes.
 *
 * ShopOffer: { key, kind (ShopOfferKinds), itemId, currency, unitPrice, owned, soldOut }
 */
import { ShopDB } from '../../data/shops/ShopDB.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { ItemStacking } from '../../data/items/ItemStacking.js';
import { ShopRules } from '../../config/ShopRules.js';
import { ShopOfferKinds } from './ShopOfferKinds.js';
import { InventoryRules } from '../../config/InventoryRules.js';

export class ShopCatalog {
  /**
   * @param {Readonly<Object>} location - LocationDB definition with a `shop`
   * @param {import('../../data/save/SaveData.js').SaveData} save
   * @returns {Object[]} ShopOffer list, display order (stock, balls, Master Balls)
   */
  static offers(location, save) {
    const shop = location?.shop ? ShopDB.getInstance().getById(location.shop) : null;
    if (!shop) return [];
    const offers = [];
    for (const itemId of shop.items) {
      const item = ItemDB.getInstance().getById(itemId);
      if (!item || !(item.price > 0)) continue;
      const owned = save.inventory.count(itemId);
      offers.push({
        key: itemId,
        kind: ShopOfferKinds.ITEM,
        itemId,
        currency: ShopRules.CURRENCY,
        unitPrice: item.price,
        owned,
        limit: ItemStacking.stackLimit(itemId),
        soldOut: owned >= ItemStacking.stackLimit(itemId)
      });
    }
    for (const stock of ShopRules.BALL_STOCK) {
      if (location.badgesRequired < stock.badgesRequired) continue;
      offers.push({
        key: stock.ball,
        kind: ShopOfferKinds.BALL,
        itemId: stock.ball,
        currency: ShopRules.CURRENCY,
        unitPrice: ItemDB.getInstance().getById(stock.ball)?.price ?? 0,
        owned: save.inventory.count(stock.ball),
        limit: InventoryRules.UNLIMITED_STACK,
        soldOut: false
      });
    }
    const master = ShopRules.MASTER_BALL;
    if (location.badgesRequired >= master.badgesRequired) {
      const bought = save.statistics.purchases[master.ball] || 0;
      for (const price of master.prices) {
        offers.push({
          key: `${master.ball}:${price.currency}`,
          kind: ShopOfferKinds.MASTER_BALL,
          itemId: master.ball,
          currency: price.currency,
          unitPrice: price.base + price.step * bought,
          owned: save.inventory.count(master.ball),
          limit: InventoryRules.UNLIMITED_STACK,
          soldOut: false
        });
      }
    }
    return offers;
  }

  /**
   * @param {Object} offer
   * @param {number} quantity
   * @param {import('../../data/save/SaveData.js').SaveData} save
   * @returns {number} Total price (Master Ball: every copy one step dearer)
   */
  static totalPrice(offer, quantity, save) {
    if (offer.kind !== ShopOfferKinds.MASTER_BALL) return offer.unitPrice * quantity;
    const price = ShopRules.MASTER_BALL.prices.find((entry) => entry.currency === offer.currency);
    const bought = save.statistics.purchases[offer.itemId] || 0;
    let total = 0;
    for (let index = 0; index < quantity; index++) total += price.base + price.step * (bought + index);
    return total;
  }

  /**
   * Largest quantity the player can buy (money and bag space), at least 1.
   * @param {Object} offer
   * @param {import('../../data/save/SaveData.js').SaveData} save
   * @returns {number}
   */
  static maxQuantity(offer, save) {
    const balance = save.currencies.get(offer.currency);
    let max = offer.unitPrice > 0 ? Math.floor(balance / offer.unitPrice) : 1;
    if (offer.kind === ShopOfferKinds.MASTER_BALL) {
      max = Math.min(max, ShopRules.MASTER_BALL.maxPerPurchase);
      while (max > 1 && ShopCatalog.totalPrice(offer, max, save) > balance) max--;
    }
    if (offer.kind === ShopOfferKinds.ITEM) max = Math.min(max, Math.max(0, offer.limit - offer.owned));
    return Math.max(1, max);
  }
}
