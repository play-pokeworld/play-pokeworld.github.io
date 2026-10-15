import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';
import { SAVE_VERSION, OLDEST_LOADABLE_SAVE_VERSION } from '../src/data/game-config.js';

// V7 · DBT-02 — l'ancien module mort src/core/save-compatibility.js a été
// supprimé ; ces tests visent désormais la quarantaine LIVE du pont classique
// (classic-bridge.js : validateBrowserSave() exécutée au chargement), avec le
// schéma de sauvegarde lu depuis sa source unique (game-config.js, DBT-05).

function bootBridge(initialStorage = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'http://localhost/' });
  for (const [k, v] of Object.entries(initialStorage)) dom.window.localStorage.setItem(k, v);
  const sandbox = dom.getInternalVMContext();
  sandbox.G = {}; sandbox.battle = {};
  vm.runInContext(harnessBundleSource(['src/engine/runtime/classic-bridge.js']), sandbox, { filename: 'classic-bridge [iife]' });
  const keys = [];
  for (let i = 0; i < dom.window.localStorage.length; i++) keys.push(dom.window.localStorage.key(i));
  return { dom, sandbox, keys, has: (k) => dom.window.localStorage.getItem(k) !== null };
}

test('invalid browser save is quarantined (recovery copy) before removal', () => {
  const r = bootBridge({ pokeworld_save: '{invalid' });
  assert.equal(r.has('pokeworld_save'), false);
  assert.equal(r.keys.some((key) => key.startsWith('pokeworld_save_recovery_')), true);
});

test('compatible browser save remains untouched', () => {
  const save = { version: SAVE_VERSION, G: { team: [], collection: {}, inventory: {} } };
  const r = bootBridge({ pokeworld_save: JSON.stringify(save) });
  assert.equal(r.has('pokeworld_save'), true);
  assert.equal(r.keys.some((key) => key.startsWith('pokeworld_save_recovery_')), false);
});

test('V7 · FORM-02 — a schema-4 browser save (forms) is accepted and never quarantined', () => {
  const save = {
    version: 4,
    G: { team: [{ id: 351, form: 1, lvl: 20 }], collection: { '351-1': 1 }, inventory: {}, pokedex: { 351: { seen: true, caught: true, forms: { 1: { seen: true, caught: true } } } } },
  };
  const r = bootBridge({ pokeworld_save: JSON.stringify(save) });
  assert.equal(r.has('pokeworld_save'), true);
  assert.equal(r.keys.some((key) => key.startsWith('pokeworld_save_recovery_')), false);
});

test('V7 · FORM-02 — a pre-forms save (version 2) is quarantined as too old, a v3 one is kept for migration', () => {
  const old = bootBridge({ pokeworld_save: JSON.stringify({ version: OLDEST_LOADABLE_SAVE_VERSION - 1, G: { team: [] } }) });
  assert.equal(old.has('pokeworld_save'), false);
  assert.equal(old.keys.some((key) => key.startsWith('pokeworld_save_recovery_')), true);
  const v3 = bootBridge({ pokeworld_save: JSON.stringify({ version: 3, G: { team: [{ id: 387, lvl: 5 }], collection: { 387: 1 }, inventory: {} } }) });
  assert.equal(v3.has('pokeworld_save'), true, 'v3 stays loadable: migrateV3toV4 rewrites legacy ids at load time');
});

test('V7 · DBT-05 — the bridge and save.js read the SAME save schema (game-config.js), no local copy left', async () => {
  const fs = await import('node:fs');
  const bridge = fs.readFileSync(new URL('../src/engine/runtime/classic-bridge.js', import.meta.url), 'utf8');
  const save = fs.readFileSync(new URL('../src/application/save/save.js', import.meta.url), 'utf8');
  assert.doesNotMatch(bridge, /const CURRENT_SAVE_VERSION = \d/, 'bridge: no literal save version');
  assert.doesNotMatch(save, /const SAVE_VERSION = \d/, 'save.js: no literal save version');
  assert.match(bridge, /from '\.\.\/\.\.\/data\/game-config\.js'/);
  assert.match(save, /from '\.\.\/\.\.\/data\/game-config\.js'/);
  assert.equal(SAVE_VERSION, 4);
  assert.equal(OLDEST_LOADABLE_SAVE_VERSION, 3);
});
