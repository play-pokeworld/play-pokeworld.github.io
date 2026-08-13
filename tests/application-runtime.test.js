import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameSession, resetGameSession } from '../src/application/game-session.js';
import { createApplicationRuntime } from '../src/application/runtime.js';

test('createGameSession creates isolated game and battle state', () => {
  const first = createGameSession();
  const second = createGameSession();

  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.gameState, second.gameState);
  assert.notStrictEqual(first.battleState, second.battleState);
  assert.equal(first.gameState.region, 'kanto');
  assert.equal(first.battleState.active, false);
});

test('createApplicationRuntime composes one explicit runtime boundary', () => {
  const runtime = createApplicationRuntime();

  assert.equal(runtime.state.routeEvents.active, null);
  assert.equal(runtime.battle.active, false);
  assert.equal(typeof runtime.domain.damage.calculateBaseDamage, 'function');
  assert.equal(typeof runtime.core.randomInt, 'function');
  assert.equal(typeof runtime.events.eventBus.emit, 'function');
});

test('resetGameSession replaces both mutable state objects', () => {
  const session = createGameSession();
  const oldGameState = session.gameState;
  const oldBattleState = session.battleState;
  session.gameState.money = 999999;
  session.battleState.active = true;

  resetGameSession(session);

  assert.notStrictEqual(session.gameState, oldGameState);
  assert.notStrictEqual(session.battleState, oldBattleState);
  assert.equal(session.gameState.money, 2000);
  assert.equal(session.battleState.active, false);
});


