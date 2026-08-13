import test from 'node:test';
import assert from 'node:assert/strict';
import { getBattleState, getGameState } from '../src/application/runtime-access.js';

test('runtime access prefers the application runtime over compatibility globals', () => {
  const previous = {
    app: globalThis.PokeWorldApp,
    game: globalThis.G,
    battle: globalThis.battle,
  };
  const state = { id: 'runtime-state' };
  const battle = { id: 'runtime-battle' };
  globalThis.PokeWorldApp = { state, battle };
  globalThis.G = { id: 'legacy-state' };
  globalThis.battle = { id: 'legacy-battle' };

  try {
    assert.equal(getGameState(), state);
    assert.equal(getBattleState(), battle);
  } finally {
    if (previous.app === undefined) delete globalThis.PokeWorldApp;
    else globalThis.PokeWorldApp = previous.app;
    if (previous.game === undefined) delete globalThis.G;
    else globalThis.G = previous.game;
    if (previous.battle === undefined) delete globalThis.battle;
    else globalThis.battle = previous.battle;
  }
});


