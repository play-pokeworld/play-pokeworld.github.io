/**
 * @file MigrationV7ToV8.js
 * @brief Save migration 7 -> 8: persist dungeon expeditions and their clear counts.
 */

export const MigrationV7ToV8 = Object.freeze({
  from: 7,
  to: 8,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const source = raw.dungeons && typeof raw.dungeons === 'object' ? raw.dungeons : {};
    const legacy = raw.G && typeof raw.G === 'object' ? raw.G : {};
    return {
      ...raw,
      version: 8,
      dungeons: {
        exploredTotal: source.exploredTotal ?? source.dungeonsExplored ?? raw.dungeonsExplored ?? legacy.dungeonsExplored ?? 0,
        clears: source.clears ?? source.dungeonClears ?? raw.dungeonClears ?? legacy.dungeonClears ?? {},
        run: source.run ?? source.dungeonRun ?? raw.dungeonRun ?? legacy.dungeonRun ?? null,
        lastRun: source.lastRun ?? null
      }
    };
  }
});
