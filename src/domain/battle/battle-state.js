export function createInitialBattleState() {
  return {
    active: false, enemy: null, enemyPoke: null, playerPokeIdx: 0,
    isChamp: false, champId: null, champPokeIdx: 0,
    turnLocked: false, escaped: false, chill: false,
    playerMods: { atk: 1, def: 1, spe: 1 },
    enemyMods: { atk: 1, def: 1, spe: 1 },
    log: [], sessionCatches: [], sessionItems: {},
    pendingLeave: false, pendingSwitchIdx: null,
  };
}
export const battleState = createInitialBattleState();
