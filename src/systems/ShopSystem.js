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
import {
  NotificationChannels,
  NotificationTones,
} from '../config/NotificationConfig.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { ShopDB } from '../data/shops/ShopDB.js';
import { LeagueDB } from '../data/trainers/LeagueDB.js';
import { ShopOfferKinds } from './shop/ShopOfferKinds.js';
import { RelaunchRules } from '../config/RelaunchRules.js';
import { RelaunchChangedEvent } from '../core/events/RelaunchChangedEvent.js';
import { ShopRules } from '../config/ShopRules.js';
import { ShopCatalog } from './shop/ShopCatalog.js';
import { MarketCatalog } from './shop/MarketCatalog.js';
import { MarketPokemonFactory } from './shop/MarketPokemonFactory.js';
import { MarketRules } from '../config/MarketRules.js';
import { FeatureAccessSystem } from './FeatureAccessSystem.js';
import { TeamSystem } from './TeamSystem.js';
import { BoxSystem } from './BoxSystem.js';
import { SpeciesOwnership } from './catch/SpeciesOwnership.js';
import { Random } from '../core/Random.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { MarketPurchaseCompletedEvent } from '../core/events/MarketPurchaseCompletedEvent.js';

import { ShopPurchaseCompletedEvent } from '../core/events/ShopPurchaseCompletedEvent.js';
import { EventBus } from '../core/EventBus.js';
import { t } from '../localization/LocalizationManager.js';

/** Results of ShopSystem.buy(). */
export const PurchaseResults = Object.freeze({
  OK: 'ok',
  NO_SHOP: 'no_shop',
  LOCKED: 'locked',
  UNKNOWN_OFFER: 'unknown_offer',
  SOLD_OUT: 'sold_out',
  NOT_ENOUGH: 'not_enough',
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
    this._random = Random.default;
    this._marketBuying = false;
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
    if (!shop?.requiresLeague) return false;
    const save = SaveSystem.getInstance().getCurrentSave();
    const league = LeagueDB.getInstance().getById(shop.requiresLeague);
    if (!save || !league) return true;
    return !save.statistics.hasWonLeague(league.region);
  }

  /**
   * @param {string} [locationId]
   * @returns {Object[]} ShopCatalog offers ([] without a shop or a save)
   */
  getOffers(locationId = LocationSystem.getInstance().getCurrentLocationId()) {
    const save = SaveSystem.getInstance().getCurrentSave();
    return save
      ? ShopCatalog.offers(LocationDB.getInstance().getById(locationId), save)
      : [];
  }

  /** @returns {Object[]} Current regional Pokémon stock, independent of a town shop. */
  getMarketOffers() {
    return MarketCatalog.offers(SaveSystem.getInstance().getCurrentSave());
  }

  /** @param {Random} random */
  setRandom(random) {
    this._random = random || Random.default;
  }

  /** Canonical market purchase: no capture/hatch event, unique collection owner, one save. */
  buyMarket(speciesId, quantity = 1) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return PurchaseResults.NO_SHOP;
    if (!FeatureAccessSystem.getInstance().isMarketUnlocked())
      return this._fail(PurchaseResults.LOCKED, 'market_access_locked');
    if (this._marketBuying) return PurchaseResults.LOCKED;
    const offer = this.getMarketOffers().find(
      (entry) => entry.key === speciesId,
    );
    if (!offer)
      return this._fail(PurchaseResults.UNKNOWN_OFFER, 'market_not_listed');
    const requested = Number(quantity);
    const amount = Math.min(
      Number.isFinite(requested) ? Math.max(1, Math.floor(requested)) : 1,
      ShopCatalog.maxQuantity(offer, save),
    );
    const total = ShopCatalog.totalPrice(offer, amount, save);
    if (
      !Number.isSafeInteger(amount) ||
      !Number.isSafeInteger(total) ||
      save.currencies.get(offer.currency) < total
    )
      return this._fail(PurchaseResults.NOT_ENOUGH, 'market_need_pq', {
        price: TextFormatter.formatNumber(total),
      });
    this._marketBuying = true;
    try {
      const batch = MarketPokemonFactory.createBatch(
        save,
        offer.speciesId,
        amount,
        this._random,
      );
      if (!batch) return PurchaseResults.UNKNOWN_OFFER;
      const team = TeamSystem.getInstance(),
        box = BoxSystem.getInstance();
      let owned = offer.owned;
      for (const pokemon of batch) {
        const options = { notify: false, deferSave: true };
        if (!owned && team.hasFreeSlot()) team.addPokemon(pokemon, options);
        else box.addPokemon(pokemon, options);
        owned = true;
      }
      if (batch.some((pokemon) => pokemon.shiny))
        SpeciesOwnership.unlockShiny(save, offer.speciesId);
      save.currencies.add(MarketRules.CURRENCY, -total);
      box.dispatchChanged({ deferSave: true });
      team.dispatchChanged({ deferSave: true });
      EventBus.getInstance().dispatch(
        new MarketPurchaseCompletedEvent(
          offer.speciesId,
          amount,
          total,
          offer.region,
        ),
      );
      SaveSystem.getInstance().saveCurrent();
      this._notify(
        t('market_bought_n', {
          n: amount,
          name: t(`pokemon.${offer.speciesId}`),
          price: TextFormatter.formatNumber(total),
        }),
        NotificationTones.SUCCESS,
      );
      return PurchaseResults.OK;
    } finally {
      this._marketBuying = false;
    }
  }

  // --- Commands ---

  /**
   * @param {string} offerKey - ShopOffer key
   * @param {number} quantity
   * @param {string} [locationId]
   * @returns {string} PurchaseResults value
   */
  buy(
    offerKey,
    quantity,
    locationId = LocationSystem.getInstance().getCurrentLocationId(),
  ) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !this.getShop(locationId)) return PurchaseResults.NO_SHOP;
    if (this.isLocked(locationId))
      return this._fail(PurchaseResults.LOCKED, 'shop_locked');
    const offer = this.getOffers(locationId).find(
      (entry) => entry.key === offerKey,
    );
    if (!offer) return PurchaseResults.UNKNOWN_OFFER;
    if (offer.kind === ShopOfferKinds.UPGRADE)
      return this._buyRelaunch(save, offer.upgradeId, locationId);
    if (offer.soldOut)
      return this._fail(PurchaseResults.SOLD_OUT, 'shop_bag_full', {
        max: offer.limit,
      });
    const amount = Math.min(
      Math.max(1, Math.floor(Number(quantity) || 1)),
      ShopCatalog.maxQuantity(offer, save),
    );
    const total = ShopCatalog.totalPrice(offer, amount, save);
    if (save.currencies.get(offer.currency) < total)
      return this._fail(PurchaseResults.NOT_ENOUGH, 'shop_not_enough');

    save.currencies.add(offer.currency, -total);
    save.inventory.add(offer.itemId, amount);
    const honor = ShopRules.HONOR_BALL;
    const before = save.statistics.purchases[offer.itemId] || 0;
    save.statistics.recordPurchase(offer.itemId, amount);
    const bonus =
      offer.itemId === honor.from
        ? Math.floor((before + amount) / honor.every) -
          Math.floor(before / honor.every)
        : 0;
    if (bonus > 0) save.inventory.add(honor.ball, bonus);
    EventBus.getInstance().dispatch(
      new ShopPurchaseCompletedEvent(
        offer.itemId,
        amount,
        locationId,
        offer.currency,
        total,
      ),
    );
    SaveSystem.getInstance().saveCurrent();

    const name = t(`item.${offer.itemId}.name`);
    this._notify(
      t('shop_bought', { quantity: amount, name }),
      NotificationTones.SUCCESS,
    );
    if (bonus > 0)
      this._notify(
        t('shop_honor_bonus', {
          quantity: bonus,
          name: t(`item.${honor.ball}.name`),
        }),
        NotificationTones.ACCENT,
      );
    return PurchaseResults.OK;
  }

  /** Direct upgrade purchase uses the same transaction as the town shelf, as in main. @param {string} kind */
  buyRelaunch(kind) {
    const save = SaveSystem.getInstance().getCurrentSave();
    return save
      ? this._buyRelaunch(
          save,
          kind,
          LocationSystem.getInstance().getCurrentLocationId(),
        )
      : PurchaseResults.NO_SHOP;
  }
  /** @private */
  _buyRelaunch(save, kind, locationId) {
    const rule = RelaunchRules.UPGRADES[kind],
      state = save.relaunch?.[kind];
    if (!rule || !state) return PurchaseResults.UNKNOWN_OFFER;
    if (state.purchased) return PurchaseResults.SOLD_OUT;
    if (save.currencies.get(RelaunchRules.CURRENCY) < rule.cost)
      return this._fail(PurchaseResults.NOT_ENOUGH, 'shop_not_enough');
    state.purchased = true;
    state.enabled = true;
    save.currencies.add(RelaunchRules.CURRENCY, -rule.cost);
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new RelaunchChangedEvent(kind));
    EventBus.getInstance().dispatch(
      new ShopPurchaseCompletedEvent(
        rule.key,
        1,
        locationId,
        RelaunchRules.CURRENCY,
        rule.cost,
      ),
    );
    this._notify(
      t('shop_bought', { quantity: 1, name: t(rule.labelKey) }),
      NotificationTones.SUCCESS,
    );
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
    NotificationSystem.getInstance().notifyTemporary(text, {
      channel: NotificationChannels.GAMEPLAY,
      tone,
    });
  }
}
