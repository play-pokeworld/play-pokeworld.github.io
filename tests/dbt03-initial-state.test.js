import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';
import { createInitialGameState, createInitialBattleState } from '../src/domain/game/initial-state.js';

// V7 · DBT-03 — UN état initial : les trois points d'entrée produisent le même
// objet (domaine, pont classique `window.PokeWorldState`, save.js
// `createFreshGameState`).

function bootBridge() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'http://localhost/' });
  const sandbox = dom.getInternalVMContext();
  sandbox.G = {}; sandbox.battle = {};
  vm.runInContext(harnessBundleSource(['src/engine/runtime/classic-bridge.js']), sandbox, { filename: 'classic-bridge [iife]' });
  return sandbox;
}

test('DBT-03 — the classic bridge builds G and battle from the domain factories', () => {
  const sb = bootBridge();
  const bridgeG = JSON.parse(JSON.stringify(sb.PokeWorldState.createInitialGameState()));
  const bridgeB = JSON.parse(JSON.stringify(sb.PokeWorldBattleState.createInitialBattleState()));
  assert.deepEqual(bridgeG, JSON.parse(JSON.stringify(createInitialGameState())));
  assert.deepEqual(bridgeB, JSON.parse(JSON.stringify(createInitialBattleState())));
  // Every call is a fresh object (no shared nested state).
  const a = createInitialGameState(), b = createInitialGameState();
  a.inventory.x = 1; a.tutorial.completed.y = true;
  assert.equal(b.inventory.x, undefined); assert.equal(b.tutorial.completed.y, undefined);
});

test('DBT-03 — save.js createFreshGameState() returns the domain state (+ stored language only)', () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'http://localhost/' });
  const sandbox = dom.getInternalVMContext();
  // save.js arms its autosave/offline tickers at load: neutralise the timers so the test process exits.
  const noop = () => 0;
  sandbox.setInterval = noop; sandbox.setTimeout = noop; sandbox.requestAnimationFrame = noop;
  sandbox.G = {}; sandbox.battle = {};
  vm.runInContext(harnessBundleSource(['src/application/save/save.js']), sandbox, { filename: 'save.js [iife]' });
  const fresh = JSON.parse(JSON.stringify(sandbox.createFreshGameState()));
  dom.window.close();
  const expected = JSON.parse(JSON.stringify(createInitialGameState()));
  assert.deepEqual(fresh, expected);
  assert.equal(Object.keys(fresh).length, Object.keys(expected).length);
});

test('DBT-03 — no other literal initial state is left (grep guard)', async () => {
  const fs = await import('node:fs');
  for (const f of ['src/engine/runtime/classic-bridge.js', 'src/application/save/save.js']) {
    const src = fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /location:\s*'pallet',\s*region:\s*'kanto',\s*team:\s*\[\]/, `${f}: literal initial state removed`);
    assert.match(src, /domain\/game\/initial-state\.js/, `${f}: imports the domain factory`);
  }
});
