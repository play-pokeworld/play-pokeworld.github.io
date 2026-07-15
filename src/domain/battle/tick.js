/**
 * Domain: Battle tick logic
 * Pure battle progression without direct DOM manipulation (except via injected callbacks)
 * Extracted from src/legacy/scripts/gameplay/combat/battle-tick.js
 * No gameplay values changed.
 */
import { clamp } from '../../core/random.js';

export function getActivePlayerPoke() {
  const G = globalThis.G;
  const battle = globalThis.battle;
  if (battle && battle.isTraining && battle.trainee) {
    return battle.trainee;
  }
  return (G && G.team && battle) ? (G.team[battle.playerPokeIdx || 0] || null) : null;
}

export function battleTick() {
  const battle = globalThis.battle;
  if (!battle || !battle.active || battle.paused) return;
  const dt = 100 * (battle.speed || 1);
  battle.pCd -= dt;
  battle.eCd -= dt;

  if (typeof globalThis.updateMoveBars === 'function') globalThis.updateMoveBars();

  if (battle.pCd <= 0) {
    doPlayerMove();
  }
  if (!battle || !battle.active || battle.paused) return;
  if (battle.eCd <= 0) {
    doEnemyMove();
  }
}

export function doPlayerMove() {
  const G = globalThis.G;
  const battle = globalThis.battle;
  const p = getActivePlayerPoke();
  const e = battle ? battle.enemyPoke : null;
  if (!p || !e || p.currentHP <= 0 || e.currentHP <= 0) {
    if (typeof globalThis.resetPlayerCd === 'function') globalThis.resetPlayerCd();
    return;
  }

  if (typeof globalThis.applyEndOfTurnStatus === 'function') globalThis.applyEndOfTurnStatus(p);
  if (p.currentHP <= 0) {
    if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
    if (typeof globalThis.onPlayerPokeFaint === 'function') globalThis.onPlayerPokeFaint();
    return;
  }

  if (typeof globalThis.handleStatusBeforeMove === 'function' && globalThis.handleStatusBeforeMove(p, 'player')) {
    const mv = p.moves[battle.pMoveIdx % p.moves.length];
    battle.pMoveIdx = (battle.pMoveIdx + 1) % p.moves.length;
    if (typeof globalThis.flashMoveFiring === 'function') globalThis.flashMoveFiring(mv.id, 'player');
    if (typeof globalThis.executeAttack === 'function') globalThis.executeAttack(p, e, mv.id, 'player');
  }
  if (typeof globalThis.resetPlayerCd === 'function') globalThis.resetPlayerCd();
  if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();

  if (e.currentHP <= 0) {
    if (typeof globalThis.onEnemyFaint === 'function') globalThis.onEnemyFaint();
  } else if (p.currentHP <= 0) {
    if (typeof globalThis.onPlayerPokeFaint === 'function') globalThis.onPlayerPokeFaint();
  }
}

export function doEnemyMove() {
  const battle = globalThis.battle;
  const p = getActivePlayerPoke();
  const e = battle ? battle.enemyPoke : null;
  if (!p || !e || p.currentHP <= 0 || e.currentHP <= 0) {
    if (typeof globalThis.resetEnemyCd === 'function') globalThis.resetEnemyCd();
    return;
  }

  if (typeof globalThis.applyEndOfTurnStatus === 'function') globalThis.applyEndOfTurnStatus(e);
  if (e.currentHP <= 0) {
    if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
    if (typeof globalThis.onEnemyFaint === 'function') globalThis.onEnemyFaint();
    return;
  }

  if (typeof globalThis.handleStatusBeforeMove === 'function' && globalThis.handleStatusBeforeMove(e, 'enemy')) {
    const mv = e.moves[battle.eMoveIdx % e.moves.length];
    battle.eMoveIdx = (battle.eMoveIdx + 1) % e.moves.length;
    if (typeof globalThis.flashMoveFiring === 'function') globalThis.flashMoveFiring(mv.id, 'enemy');
    if (typeof globalThis.executeAttack === 'function') globalThis.executeAttack(e, p, mv.id, 'enemy');
  }
  if (typeof globalThis.resetEnemyCd === 'function') globalThis.resetEnemyCd();
  if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();

  if (p.currentHP <= 0) {
    if (typeof globalThis.onPlayerPokeFaint === 'function') globalThis.onPlayerPokeFaint();
  } else if (e.currentHP <= 0) {
    if (typeof globalThis.onEnemyFaint === 'function') globalThis.onEnemyFaint();
  }
}

export function triggerEntryTalents(side) {
  const battle = globalThis.battle;
  if (!battle || !battle.active) return;
  const p = getActivePlayerPoke();
  const e = battle.enemyPoke;
  if (!p || !e) return;
  const tr = globalThis.tr || ((k, o) => k);
  const addBattleLog = globalThis.addBattleLog || (() => {});

  if (side === 'player' || side === 'both') {
    if (p.talent === 'intimidate') {
      battle.enemyMods.atk = Math.max(0.25, battle.enemyMods.atk * 0.75);
      addBattleLog(tr('talent_intimidate_player', { name: e.name }));
    } else if (p.talent === 'regenerator') {
      p.currentHP = Math.min(p.maxHP, p.currentHP + Math.floor(p.maxHP * 0.25));
      addBattleLog(tr('talent_regenerator_player', { name: p.name }));
    }
  }
  if (side === 'enemy' || side === 'both') {
    if (e.talent === 'intimidate') {
      battle.playerMods.atk = Math.max(0.25, battle.playerMods.atk * 0.75);
      addBattleLog(tr('talent_intimidate_enemy', { name: p.name }));
    } else if (e.talent === 'regenerator') {
      e.currentHP = Math.min(e.maxHP, e.currentHP + Math.floor(e.maxHP * 0.25));
    }
  }
  if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
}

// Expose to global for compatibility with remaining legacy code
if (typeof window !== 'undefined') {
  window.battleTick = battleTick;
  window.doPlayerMove = doPlayerMove;
  window.doEnemyMove = doEnemyMove;
  window.triggerEntryTalents = triggerEntryTalents;
  window.getActivePlayerPoke = getActivePlayerPoke;
}
