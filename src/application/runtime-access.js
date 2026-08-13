export function getGameState() {
  return globalThis.PokeWorldApp?.state || globalThis.G || null;
}

export function getBattleState() {
  return globalThis.PokeWorldApp?.battle || globalThis.battle || null;
}


