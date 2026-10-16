// V7 · DBT-03 — L'ÉTAT INITIAL, une seule fois.
// Avant : trois copies divergentes (ici, save.js `createFreshGameState` en
// repli, classic-bridge.js `createInitialGameState`). save.js et le pont
// classique importent désormais ces deux fabriques ; le test
// tests/dbt03-initial-state.test.js vérifie que les trois points d'entrée
// produisent le même objet.
import { createRouteEventState } from '../world/route-events.js';

export function createInitialGameState() {
  return {
    location: 'pallet',
    region: 'kanto',
    team: [],
    inventory: {},
    money: 2000,
    badges: [],
    defeatedChamps: {},
    pokedex: {},
    stepsLeft: 0,
    starter: false,
    starterKanto: false,
    starterJohto: false,
    regionStarter: { kanto: false, johto: false },
    collection: {},
    teamSlotItems: [],
    evolvedSpecies: [],
    dupeCatches: {},
    // Wave 27: native language is French (static markup, dict fallbacks, items-helpers convention);
    // the player's stored choice overrides this at load/createFreshGameState.
    lang: 'fr',
    storyIdx: 0,
    storyProgress: 0,
    unlockedTalents: {},
    mineUnlocked: false,
    activeQuests: [],
    repeatables: [],
    visitedMaps: {},
    completedQuests: {},
    wildWinsByLoc: {},
    locStats: {},
    regionLeagueWon: {},
    playTimeMs: 0,
    saveMeta: {},
    tutorial: { enabled: true, completed: {}, dismissedTips: {}, rewards: {} },
    achievements: { unlockedTiers: {}, unlockedAt: {}, stats: {} },
    routeEvents: createRouteEventState(),
  };
}

export function createInitialBattleState() {
  return {
    active: false,
    enemy: null,
    enemyPoke: null,
    playerPokeIdx: 0,
    isChamp: false,
    champId: null,
    champPokeIdx: 0,
    turnLocked: false,
    escaped: false,
    chill: false,
    playerMods: { atk: 1, def: 1, spe: 1 },
    enemyMods: { atk: 1, def: 1, spe: 1 },
    log: [],
    sessionCatches: [],
    sessionItems: {},
    sessionWins: 0,
    sessionPlayerKOs: 0,
    sessionStartedAt: 0,
    sessionDamageByPokemon: {},
    pendingLeave: false,
    pendingSwitchIdx: null,
    weather: 'none',
    terrain: 'none',
    weatherTurns: 0,
    terrainTurns: 0,
  };
}
