import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBrowserSave } from '../src/core/save-compatibility.js';

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    has: (key) => data.has(key),
    keys: () => [...data.keys()],
  };
}

function withWindow(storage, callback) {
  const previous = globalThis.window;
  globalThis.window = { localStorage: storage };
  try {
    return callback();
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
}

test('invalid browser save is quarantined before removal', () => {
  const storage = createStorage({ pokeworld_save: '{invalid' });
  const result = withWindow(storage, () => validateBrowserSave());

  assert.equal(result.ok, false);
  assert.equal(result.recovered, true);
  assert.equal(storage.has('pokeworld_save'), false);
  assert.equal(storage.keys().some((key) => key.startsWith('pokeworld_save_recovery_')), true);
});

test('compatible browser save remains untouched', () => {
  const save = {
    version: 3,
    G: { team: [], collection: {}, inventory: {} },
  };
  const storage = createStorage({ pokeworld_save: JSON.stringify(save) });
  const result = withWindow(storage, () => validateBrowserSave());

  assert.equal(result.ok, true);
  assert.equal(storage.has('pokeworld_save'), true);
  assert.equal(storage.keys().some((key) => key.startsWith('pokeworld_save_recovery_')), false);
});
