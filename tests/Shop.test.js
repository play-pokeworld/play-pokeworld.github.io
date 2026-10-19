/**
 * @file Shop.test.js
 * @brief Town shops: data, offers by badge requirement, Master Ball rising price, purchases,
 * Honor Ball bonus, league-locked shop.
 */

import { describe, assert } from './TestRunner.js';
import { ShopDB } from '../src/data/shops/ShopDB.js';
import { LocationDB } from '../src/data/world/LocationDB.js';
import { ShopCatalog } from '../src/systems/shop/ShopCatalog.js';
import { ShopOfferKinds } from '../src/systems/shop/ShopOfferKinds.js';
import { ShopSystem, PurchaseResults } from '../src/systems/ShopSystem.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { ShopRules } from '../src/config/ShopRules.js';

describe('Shops', (test) => {
  test('every shop sells priced items and every location shop exists', () => {
    assert.deepEqual(ShopDB.getInstance().validate(), []);
    assert.ok(ShopDB.getInstance().getAll().length >= 38);
    assert.equal(ShopDB.getInstance().getById('indigo').requiresLeague, 'elite4');
  });

  test('balls follow the badge requirement of the location', () => {
    const save = SaveSystem.getInstance().createNewSave('Client', 'bulbasaur');
    const balls = (id) => ShopCatalog.offers(LocationDB.getInstance().getById(id), save)
      .filter((offer) => offer.kind !== ShopOfferKinds.ITEM).map((offer) => offer.key);
    assert.deepEqual(balls('pewter'), ['pokeball']);
    assert.deepEqual(balls('indigo'), ['pokeball', 'greatball', 'ultraball',
      ...ShopRules.MASTER_BALL.prices.map((price) => `masterball:${price.currency}`)]);
  });

  test('the Master Ball costs one step more for every copy bought', () => {
    const save = SaveSystem.getInstance().createNewSave('Client', 'bulbasaur');
    const offer = ShopCatalog.offers(LocationDB.getInstance().getById('indigo'), save).find((entry) => entry.key === 'masterball:diamond');
    assert.equal(offer.unitPrice, 500);
    assert.equal(ShopCatalog.totalPrice(offer, 3, save), 500 + 750 + 1000);
    save.statistics.recordPurchase('masterball', 2);
    const dearer = ShopCatalog.offers(LocationDB.getInstance().getById('indigo'), save).find((entry) => entry.key === 'masterball:diamond');
    assert.equal(dearer.unitPrice, 1000);
  });

  test('buying pays, fills the bag, counts the purchase and grants Honor Balls', () => {
    const save = SaveSystem.getInstance().createNewSave('Client', 'bulbasaur');
    const price = ShopCatalog.offers(LocationDB.getInstance().getById('pewter'), save).find((entry) => entry.key === 'pokeball').unitPrice;
    save.currencies.add('money', price * 25 - save.currencies.get('money'));
    const honorBefore = save.inventory.count('honorball');
    const pokeBefore = save.inventory.count('pokeball');
    assert.equal(ShopSystem.getInstance().buy('pokeball', 25, 'pewter'), PurchaseResults.OK);
    assert.equal(save.currencies.get('money'), 0);
    assert.equal(save.inventory.count('pokeball'), pokeBefore + 25);
    assert.equal(save.inventory.count('honorball'), honorBefore + 2);
    assert.equal(save.statistics.purchases.pokeball, 25);
    assert.equal(ShopSystem.getInstance().buy('pokeball', 1, 'pewter'), PurchaseResults.NOT_ENOUGH);
    assert.equal(ShopSystem.getInstance().buy('masterball:money', 1, 'pewter'), PurchaseResults.UNKNOWN_OFFER);
  });

  test('the Indigo shop waits for the league title', () => {
    const save = SaveSystem.getInstance().createNewSave('Client', 'bulbasaur');
    save.currencies.add('money', 1000000);
    assert.equal(ShopSystem.getInstance().isLocked('indigo'), true);
    assert.equal(ShopSystem.getInstance().buy('rarecandy', 1, 'indigo'), PurchaseResults.LOCKED);
    save.player.earnBadge('elite4');
    assert.equal(ShopSystem.getInstance().isLocked('indigo'), false);
    assert.equal(ShopSystem.getInstance().buy('rarecandy', 1, 'indigo'), PurchaseResults.OK);
  });

  test('purchase counters survive a save round trip', () => {
    const save = SaveSystem.getInstance().createNewSave('Client', 'bulbasaur');
    save.statistics.recordPurchase('masterball', 3);
    const copy = new save.statistics.constructor(save.statistics.serialize());
    assert.equal(copy.purchases.masterball, 3);
  });
});
