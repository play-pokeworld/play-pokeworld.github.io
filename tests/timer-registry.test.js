import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimerRegistry } from '../src/core/timer-registry.js';

test('timer registry replaces named timers and stops them', () => {
  let nextId = 0;
  const cleared = [];
  const registry = createTimerRegistry({
    setIntervalFn: () => ++nextId,
    clearIntervalFn: (id) => cleared.push(id),
  });

  registry.set('autosave', () => {}, 1000);
  registry.set('autosave', () => {}, 1000);
  assert.equal(registry.size(), 1);
  assert.deepEqual(cleared, [1]);
  assert.equal(registry.stop('autosave'), true);
  assert.deepEqual(cleared, [1, 2]);
  assert.equal(registry.stop('autosave'), false);
});

test('timer registry stops all named timers', () => {
  const cleared = [];
  const registry = createTimerRegistry({
    setIntervalFn: (callback) => callback,
    clearIntervalFn: (id) => cleared.push(id),
  });
  registry.set('battle', () => {}, 100);
  registry.set('mine', () => {}, 100);
  registry.stopAll();

  assert.equal(registry.size(), 0);
  assert.equal(cleared.length, 2);
});

