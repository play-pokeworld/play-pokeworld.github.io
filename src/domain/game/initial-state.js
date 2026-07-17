export function createInitialGameState() {
  return {
    location: 'pallet', region: 'kanto', team: [], inventory: {}, money: 2000,
    badges: [], defeatedChamps: {}, pokedex: {}, stepsLeft: 0,
    starter: false, starterKanto: false, starterJohto: false,
    regionStarter: { kanto: false, johto: false },
    collection: {}, teamSlotItems: [], evolvedSpecies: [], dupeCatches: {}, lang: 'fr',
    storyIdx: 0, storyProgress: 0, unlockedTalents: {}, activeQuests: [],
    repeatables: [], visitedMaps: {}, completedQuests: {}, wildWinsByLoc: {},
    playTimeMs: 0, saveMeta: {},
  };
}
export const gameState = createInitialGameState();
