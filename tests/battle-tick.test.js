import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getActivePlayerPoke,
  resolveBattleStateAnomalies,
} from '../src/domain/battle/tick.js';

function resetGlobals() {
  delete globalThis.G;
  delete globalThis.battle;
  delete globalThis.resetPlayerCd;
  delete globalThis.resetEnemyCd;
  delete globalThis.updateBattleUI;
  delete globalThis.renderMoveButtons;
  delete globalThis.renderBattleTeamRow;
  delete globalThis.renderEnemyMoveBars;
  delete globalThis.endBattle;
  delete globalThis.onEnemyFaint;
  delete globalThis.onPlayerPokeFaint;
}

test('getActivePlayerPoke uses trainee during training', () => {
  globalThis.G = { team: [{ id: 1 }, { id: 2 }] };
  globalThis.battle = { isTraining: true, trainee: { id: 999 }, playerPokeIdx: 0 };
  assert.deepEqual(getActivePlayerPoke(), { id: 999 });
  resetGlobals();
});

test('resolveBattleStateAnomalies restores next alive team member when active slot is invalid', () => {
  let resetCalled = 0;
  let uiCalled = 0;
  globalThis.G = { team: [null, { currentHP: 25, id: 2 }] };
  globalThis.battle = { active: true, resolvingKO: false, playerPokeIdx: 0, enemyPoke: { currentHP: 10 }, isChamp: false };
  globalThis.resetPlayerCd = () => { resetCalled += 1; };
  globalThis.updateBattleUI = () => { uiCalled += 1; };
  globalThis.renderMoveButtons = () => {};
  globalThis.renderBattleTeamRow = () => {};
  const handled = resolveBattleStateAnomalies();
  assert.equal(handled, true);
  assert.equal(globalThis.battle.playerPokeIdx, 1);
  assert.ok(resetCalled >= 1);
  assert.ok(uiCalled >= 1);
  resetGlobals();
});

test('resolveBattleStateAnomalies triggers player faint resolver when active pokemon is KO', async () => {
  let playerFaints = 0;
  globalThis.G = { team: [{ currentHP: 0, id: 1 }, { currentHP: 25, id: 2 }] };
  globalThis.battle = { active: true, resolvingKO: false, paused: false, playerPokeIdx: 0, enemyPoke: { currentHP: 10 }, isChamp: false };
  globalThis.onPlayerPokeFaint = () => { playerFaints += 1; };
  const handled = resolveBattleStateAnomalies();
  assert.equal(handled, true);
  assert.equal(globalThis.battle.paused, true);
  assert.equal(globalThis.battle.resolvingKO, true);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(playerFaints, 1);
  assert.equal(globalThis.battle.resolvingKO, false);
  resetGlobals();
});

test('resolveBattleStateAnomalies ends battle when enemy is missing outside champion flow', () => {
  let ended = 0;
  globalThis.G = { team: [{ currentHP: 20, id: 1 }] };
  globalThis.battle = { active: true, resolvingKO: false, playerPokeIdx: 0, enemyPoke: null, isChamp: false };
  globalThis.endBattle = () => { ended += 1; };
  const handled = resolveBattleStateAnomalies();
  assert.equal(handled, true);
  assert.equal(ended, 1);
  resetGlobals();
});

test('resolveBattleStateAnomalies triggers enemy faint resolver once', async () => {
  let enemyFaints = 0;
  globalThis.G = { team: [{ currentHP: 20, id: 1 }] };
  globalThis.battle = { active: true, resolvingKO: false, paused: false, playerPokeIdx: 0, enemyPoke: { currentHP: 0 }, isChamp: false };
  globalThis.onEnemyFaint = () => { enemyFaints += 1; };
  const handled = resolveBattleStateAnomalies();
  assert.equal(handled, true);
  assert.equal(globalThis.battle.paused, true);
  assert.equal(globalThis.battle.resolvingKO, true);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(enemyFaints, 1);
  assert.equal(globalThis.battle.resolvingKO, false);
  resetGlobals();
});

