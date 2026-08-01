import { createInitialBattleState, createInitialGameState } from '../domain/game/initial-state.js';

export function createGameSession() {
  return {
    gameState: createInitialGameState(),
    battleState: createInitialBattleState(),
  };
}

export function resetGameSession(session) {
  if (!session || typeof session !== 'object') throw new TypeError('session object is required');
  session.gameState = createInitialGameState();
  session.battleState = createInitialBattleState();
  return session;
}

