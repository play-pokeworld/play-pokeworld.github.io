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

export function resolveBattleStateAnomalies() {
  const G = globalThis.G;
  const battle = globalThis.battle;
  if (!battle || !battle.active || battle.resolvingKO) return false;
  if (!Number.isFinite(battle.pCd) && typeof globalThis.resetPlayerCd === 'function') globalThis.resetPlayerCd();
  if (!Number.isFinite(battle.eCd) && typeof globalThis.resetEnemyCd === 'function') globalThis.resetEnemyCd();
  const p = getActivePlayerPoke();
  const e = battle.enemyPoke;
  const nextAlive = (G && G.team) ? G.team.findIndex(pk => pk && pk.currentHP > 0) : -1;

  if (!p) {
    if (nextAlive >= 0) {
      battle.playerPokeIdx = nextAlive;
      if (typeof globalThis.resetPlayerCd === 'function') globalThis.resetPlayerCd();
      if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
      if (typeof globalThis.renderMoveButtons === 'function') globalThis.renderMoveButtons();
      if (typeof globalThis.renderBattleTeamRow === 'function') globalThis.renderBattleTeamRow();
      return true;
    }
    if (typeof globalThis.endBattle === 'function') globalThis.endBattle();
    return true;
  }

  if (!e) {
    if (battle.isChamp && Array.isArray(battle.champTeam) && battle.champPokeIdx < battle.champTeam.length) {
      battle.enemyPoke = battle.champTeam[battle.champPokeIdx];
      if (typeof globalThis.resetEnemyCd === 'function') globalThis.resetEnemyCd();
      if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
      if (typeof globalThis.renderEnemyMoveBars === 'function') globalThis.renderEnemyMoveBars();
      if (typeof globalThis.renderBattleTeamRow === 'function') globalThis.renderBattleTeamRow();
      return true;
    }
    if (typeof globalThis.endBattle === 'function') globalThis.endBattle();
    return true;
  }

  if (e.currentHP <= 0) {
    battle.resolvingKO = true;
    battle.paused = true;
    Promise.resolve(typeof globalThis.onEnemyFaint === 'function' ? globalThis.onEnemyFaint() : null)
      .finally(() => { if (globalThis.battle) globalThis.battle.resolvingKO = false; });
    return true;
  }
  if (p.currentHP <= 0) {
    battle.resolvingKO = true;
    battle.paused = true;
    Promise.resolve(typeof globalThis.onPlayerPokeFaint === 'function' ? globalThis.onPlayerPokeFaint() : null)
      .finally(() => { if (globalThis.battle) globalThis.battle.resolvingKO = false; });
    return true;
  }
  return false;
}

export function battleTick() {
  const battle = globalThis.battle;
  if (!battle || !battle.active || battle.paused || battle.resolvingKO) return;
  if (resolveBattleStateAnomalies()) return;
  const dt = 100 * (battle.speed || 1);
  battle.pCd -= dt;
  battle.eCd -= dt;

  if (typeof globalThis.updateMoveBars === 'function') globalThis.updateMoveBars();

  if (battle.pCd <= 0) {
    doPlayerMove();
  }
  if (!battle || !battle.active || battle.paused || battle.resolvingKO) return;
  if (resolveBattleStateAnomalies()) return;
  if (battle.eCd <= 0) {
    doEnemyMove();
  }
}

export function doPlayerMove() {
  const battle = globalThis.battle;
  const p = getActivePlayerPoke();
  const e = battle ? battle.enemyPoke : null;
  if (!p || !e || p.currentHP <= 0 || e.currentHP <= 0) {
    resolveBattleStateAnomalies();
    if (typeof globalThis.resetPlayerCd === 'function') globalThis.resetPlayerCd();
    return;
  }
  if (!Array.isArray(p.moves) || !p.moves.length) {
    if (typeof globalThis.resetPlayerCd === 'function') globalThis.resetPlayerCd();
    return;
  }

  if (typeof globalThis.applyEndOfTurnStatus === 'function') globalThis.applyEndOfTurnStatus(p);
  if (p.currentHP <= 0) {
    if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
    resolveBattleStateAnomalies();
    return;
  }

  if (typeof globalThis.handleStatusBeforeMove === 'function' && globalThis.handleStatusBeforeMove(p, 'player')) {
    const mv = p.moves[battle.pMoveIdx % p.moves.length];
    if (!mv || !mv.id) {
      if (typeof globalThis.resetPlayerCd === 'function') globalThis.resetPlayerCd();
      if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
      return;
    }
    battle.pMoveIdx = (battle.pMoveIdx + 1) % p.moves.length;
    if (typeof globalThis.flashMoveFiring === 'function') globalThis.flashMoveFiring(mv.id, 'player');
    if (typeof globalThis.executeAttack === 'function') globalThis.executeAttack(p, e, mv.id, 'player');
  }
  if (typeof globalThis.resetPlayerCd === 'function') globalThis.resetPlayerCd();
  if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
  resolveBattleStateAnomalies();
}

export function doEnemyMove() {
  const battle = globalThis.battle;
  const p = getActivePlayerPoke();
  const e = battle ? battle.enemyPoke : null;
  if (!p || !e || p.currentHP <= 0 || e.currentHP <= 0) {
    resolveBattleStateAnomalies();
    if (typeof globalThis.resetEnemyCd === 'function') globalThis.resetEnemyCd();
    return;
  }
  if (!Array.isArray(e.moves) || !e.moves.length) {
    if (typeof globalThis.resetEnemyCd === 'function') globalThis.resetEnemyCd();
    return;
  }

  if (typeof globalThis.applyEndOfTurnStatus === 'function') globalThis.applyEndOfTurnStatus(e);
  if (e.currentHP <= 0) {
    if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
    resolveBattleStateAnomalies();
    return;
  }

  if (typeof globalThis.handleStatusBeforeMove === 'function' && globalThis.handleStatusBeforeMove(e, 'enemy')) {
    const mv = e.moves[battle.eMoveIdx % e.moves.length];
    if (!mv || !mv.id) {
      if (typeof globalThis.resetEnemyCd === 'function') globalThis.resetEnemyCd();
      if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
      return;
    }
    battle.eMoveIdx = (battle.eMoveIdx + 1) % e.moves.length;
    if (typeof globalThis.flashMoveFiring === 'function') globalThis.flashMoveFiring(mv.id, 'enemy');
    if (typeof globalThis.executeAttack === 'function') globalThis.executeAttack(e, p, mv.id, 'enemy');
  }
  if (typeof globalThis.resetEnemyCd === 'function') globalThis.resetEnemyCd();
  if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
  resolveBattleStateAnomalies();
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
  window.resolveBattleStateAnomalies = resolveBattleStateAnomalies;
}

