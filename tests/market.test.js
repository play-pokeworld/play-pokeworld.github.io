import test from 'node:test';
import assert from 'node:assert/strict';
import { getPokemonPrice, MARKET_STOCK } from '../src/domain/economy/market.js';

test('market stock exposes both regions', () => {
  assert.ok(Array.isArray(MARKET_STOCK.kanto));
  assert.ok(Array.isArray(MARKET_STOCK.johto));
  assert.ok(MARKET_STOCK.kanto.length > 0);
  assert.ok(MARKET_STOCK.johto.length > 0);
});

test('price overrides are applied', () => {
  assert.equal(getPokemonPrice(1, {}), 100000);
  assert.equal(getPokemonPrice(137, {}), 250000);
});

test('price fallback scales with stats and respects minimum', () => {
  const pokemonData = {
    999: ['Testmon', 'Normal', null, 40, 50, 50, 50, 50, 50],
    1000: ['Bossmon', 'Dragon', null, 100, 120, 100, 120, 100, 100],
  };
  const normalPrice = getPokemonPrice(999, pokemonData);
  const bossPrice = getPokemonPrice(1000, pokemonData);
  assert.ok(normalPrice >= 80000);
  assert.ok(bossPrice > normalPrice);
});

