import { createRouteEventState } from '../world/route-events.js';

export function createInitialGameState() {
  return {
    version: 3,
    lang: 'fr',
    region: 'kanto',
    money: 2000,
    badges: 0,
    team: [],
    collection: {},
    inventory: {},
    storyIdx: 0,
    routeEvents: createRouteEventState(),
  };
}

export function createInitialBattleState() {
  return {
    active: false,
    paused: false,
    resolvingKO: false,
    playerPokeIdx: 0,
    enemyPoke: null,
    isChamp: false,
    isTraining: false,
  };
}
