import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRequiredEggSteps, isEggReadyToHatch, rollHatchShiny, calculateBreedingExpReward } from '../src/domain/breeding/hatchery-rules.js';
import { isQuestComplete, calculateProgressIncrement, calculateQuestRewards } from '../src/domain/quests/quest-rules.js';
import { calculatePurchasePrice, canAffordPurchase, calculateMaxAffordableQuantity } from '../src/domain/economy/shop-rules.js';
import { isHoldableCategory, calculateRemainingStack, isReusableCtCs } from '../src/domain/economy/inventory-rules.js';
import { calculateEncounterInterval, rollRoamingLegendary, rollRouteDrop } from '../src/domain/world/encounter-rules.js';
import { getBaseRankFromFlags, canPlaceDecoration } from '../src/domain/base/base-rules.js';

test('breeding/hatchery-rules works correctly', () => {
  assert.equal(calculateRequiredEggSteps(2560, 2), 1280);
  assert.equal(isEggReadyToHatch(3000, 2560), true);
  assert.equal(isEggReadyToHatch(100, 2560), false);
  assert.equal(calculateBreedingExpReward(10, 100), 200);
});

test('quests/quest-rules works correctly', () => {
  assert.equal(isQuestComplete(5, 5), true);
  assert.equal(isQuestComplete(3, 5), false);
  assert.equal(calculateProgressIncrement('defeat_wild', 'defeat_wild', 3), 3);
  assert.equal(calculateProgressIncrement('catch', 'defeat_wild', 1), 0);
  assert.deepEqual(calculateQuestRewards({ rewards: { money: 500, tokens: 5, items: ['pokeball'] } }), {
    money: 500,
    tokens: 5,
    items: ['pokeball'],
  });
});

test('economy/shop-rules works correctly', () => {
  assert.equal(calculatePurchasePrice(200, 5, 0.9), 900);
  assert.equal(canAffordPurchase(1000, 900), true);
  assert.equal(canAffordPurchase(500, 900), false);
  assert.equal(calculateMaxAffordableQuantity(1000, 200, 1), 5);
});

test('economy/inventory-rules works correctly', () => {
  assert.equal(isHoldableCategory('held'), true);
  assert.equal(isHoldableCategory('stone'), false);
  assert.equal(calculateRemainingStack(10, 3), 7);
  assert.equal(isReusableCtCs('ct_fire_blast'), true);
});

test('world/encounter-rules works correctly', () => {
  assert.equal(calculateEncounterInterval(2000, 0.5), 1000);
  assert.equal(typeof rollRoamingLegendary(0.005, 1), 'boolean');
  assert.equal(typeof rollRouteDrop(0.15), 'boolean');
});

test('base/base-rules works correctly', () => {
  assert.deepEqual(getBaseRankFromFlags(150), { rank: 'silver', color: '#C0C0C0', nextThreshold: 500 });
  assert.equal(canPlaceDecoration(15, 16), true);
  assert.equal(canPlaceDecoration(16, 16), false);
});
