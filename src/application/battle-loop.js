/**
 * PokeWorld Application — ECS-driven battle loop.
 *
 * This module owns the application's REAL gameplay ECS world and wires the
 * `combat:tick` system (src/application/ecs-gameplay-systems.js) to the
 * shipped game:
 *
 *   - `runBattleTick()` is the single battle-loop entry point used by the
 *     game's real loop: the live battle timer (src/application/combat/battle-init.js)
 *     and the offline fast-forward engine (src/application/save/offline-engine.js)
 *     both call it — every tick therefore goes through `world.run('combat:tick')`.
 *   - The actual rule implementation lives in src/domain/battle/tick.js and
 *     reached strict behavioral parity with the retired classic loop
 *     (src/game/combat/battle-tick.js, now deleted): same damage, XP,
 *     capture and K.O. outcomes — replayed tick by tick by the offline
 *     fast-forward VM suites (passe28 / passe30 / passe32).
 *
 * The module also republishes the loop helpers on `window` with exactly the
 * same surface the retired classic file exposed, so the other classic game
 * modules (battle-switch, battle-team-ui, poke-modal, team…) keep resolving
 * them — now backed by the domain implementation.
 *
 * @module application/battle-loop
 */
import { ECSWorld } from '../engine/core/ECS.js';
import { ECSSystemsManager } from './ecs-gameplay-systems.js';
import { PokeTrace } from '../engine/runtime/trace.js';
import {
  getActivePlayerPoke,
  resolveBattleStateAnomalies,
  battleTick,
  doPlayerMove,
  doEnemyMove,
  triggerEntryTalents,
} from '../domain/battle/tick.js';

let gameplayWorld = null;
let gameplaySystems = null;
let battleLoopEid = null;

/**
 * The application's gameplay ECS world (lazily created singleton): the
 * gameplay systems registered on it (combat:tick, combat:attack,
 * combat:xp-reward, combat:switch, world:encounter, breeding:hatch) drive
 * the live game, and it carries exactly one `BattleLoop` entity marking the
 * real-time 1v1 loop.
 * @returns {{ world: ECSWorld, systems: ECSSystemsManager, loopEid: number }}
 */
export function getGameplayWorld() {
  if (!gameplayWorld) {
    gameplayWorld = new ECSWorld();
    gameplaySystems = new ECSSystemsManager(gameplayWorld);
    battleLoopEid = gameplayWorld.create();
    gameplayWorld.add(battleLoopEid, 'BattleLoop', { ticks: 0, paused: false });
  }
  return { world: gameplayWorld, systems: gameplaySystems, loopEid: battleLoopEid };
}

/**
 * Advance the real battle loop by one tick THROUGH the ECS world.
 * This is what the game's battle timer and the offline fast-forward call.
 * @returns {number} number of system executions (0 when the loop is paused).
 */
export function runBattleTick() {
  try { PokeTrace.count('tick', 'combat:tick'); } catch (_) {}
  const { world } = getGameplayWorld();
  return world.run('combat:tick', 100);
}

export {
  battleTick,
  doPlayerMove,
  doEnemyMove,
  triggerEntryTalents,
  getActivePlayerPoke,
  resolveBattleStateAnomalies,
};

if (typeof window !== 'undefined') {
  // Same public surface as the retired src/game/combat/battle-tick.js —
  // every entry now goes through the ECS world.
  window.runBattleTick = runBattleTick;
  window.battleTick = runBattleTick; // legacy alias, ECS-backed
  window.doPlayerMove = doPlayerMove;
  window.doEnemyMove = doEnemyMove;
  window.triggerEntryTalents = triggerEntryTalents;
  window.getActivePlayerPoke = getActivePlayerPoke;
  window.resolveBattleStateAnomalies = resolveBattleStateAnomalies;
  window.PokeGameplayWorld = getGameplayWorld;
}
