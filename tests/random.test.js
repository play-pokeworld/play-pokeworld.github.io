import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, randomInt, chancePercent } from '../src/core/random.js';

test('clamp bounds values', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-2, 0, 10), 0);
  assert.equal(clamp(99, 0, 10), 10);
});

test('randomInt stays inside inclusive range', () => {
  for (let i = 0; i < 200; i += 1) {
    const value = randomInt(3, 7);
    assert.ok(value >= 3 && value <= 7);
  }
});

test('chancePercent handles edge percentages', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  assert.equal(chancePercent(0), false);
  assert.equal(chancePercent(1), true);
  Math.random = () => 0.999999;
  assert.equal(chancePercent(100), true);
  Math.random = originalRandom;
});



