export function getActivePlayerPoke() {
  const battle = globalThis.battle || {};
  const G = globalThis.G || {};
  if (battle.isTraining && battle.trainee) return battle.trainee;
  const team = Array.isArray(G.team) ? G.team : [];
  return team[battle.playerPokeIdx || 0] || null;
}

function nextAliveIndex(team) {
  return team.findIndex((poke) => poke && Number(poke.currentHP ?? poke.hp ?? 1) > 0);
}

function afterMicrotask(fn) {
  Promise.resolve().then(() => Promise.resolve().then(fn));
}

export function resolveBattleStateAnomalies() {
  const battle = globalThis.battle;
  const G = globalThis.G;
  if (!battle || !battle.active || battle.resolvingKO) return false;
  const team = Array.isArray(G?.team) ? G.team : [];
  const active = getActivePlayerPoke();

  if (!active && team.length) {
    const idx = nextAliveIndex(team);
    if (idx >= 0) {
      battle.playerPokeIdx = idx;
      globalThis.resetPlayerCd?.();
      globalThis.updateBattleUI?.();
      globalThis.renderMoveButtons?.();
      globalThis.renderBattleTeamRow?.();
      return true;
    }
  }

  if (!battle.enemyPoke && !battle.isChamp) {
    globalThis.endBattle?.();
    return true;
  }

  if (active && Number(active.currentHP ?? active.hp ?? 1) <= 0) {
    battle.paused = true;
    battle.resolvingKO = true;
    afterMicrotask(() => {
      try { globalThis.onPlayerPokeFaint?.(); }
      finally { battle.resolvingKO = false; }
    });
    return true;
  }

  if (battle.enemyPoke && Number(battle.enemyPoke.currentHP ?? battle.enemyPoke.hp ?? 1) <= 0) {
    battle.paused = true;
    battle.resolvingKO = true;
    afterMicrotask(() => {
      try { globalThis.onEnemyFaint?.(); }
      finally { battle.resolvingKO = false; }
    });
    return true;
  }

  return false;
}

