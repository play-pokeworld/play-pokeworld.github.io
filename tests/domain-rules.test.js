import test from 'node:test';
import assert from 'node:assert/strict';
// V7 · DBT-02 — quest-rules / inventory-rules / base-rules étaient des modules
// morts (jamais importés par src/main.js) : supprimés avec leurs tests.
import { calculateRequiredEggSteps, isEggReadyToHatch, rollHatchShiny, calculateBreedingExpReward } from '../src/domain/breeding/hatchery-rules.js';
import { calculatePurchasePrice, canAffordPurchase, calculateMaxAffordableQuantity } from '../src/domain/economy/shop-rules.js';
import { calculateEncounterInterval, rollRoamingLegendary, rollRouteDrop } from '../src/domain/world/encounter-rules.js';

test('breeding/hatchery-rules works correctly', () => {
  assert.equal(calculateRequiredEggSteps(2560, 2), 1280);
  assert.equal(isEggReadyToHatch(3000, 2560), true);
  assert.equal(isEggReadyToHatch(100, 2560), false);
  assert.equal(calculateBreedingExpReward(10, 100), 200);
});

test('economy/shop-rules works correctly', () => {
  assert.equal(calculatePurchasePrice(200, 5, 0.9), 900);
  assert.equal(canAffordPurchase(1000, 900), true);
  assert.equal(canAffordPurchase(500, 900), false);
  assert.equal(calculateMaxAffordableQuantity(1000, 200, 1), 5);
});

test('world/encounter-rules works correctly', () => {
  assert.equal(calculateEncounterInterval(2000, 0.5), 1000);
  assert.equal(typeof rollRoamingLegendary(0.005, 1), 'boolean');
  assert.equal(typeof rollRouteDrop(0.15), 'boolean');
});



