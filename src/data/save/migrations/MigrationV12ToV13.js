/**
 * @file MigrationV12ToV13.js
 * @brief Save migration 12 -> 13: persist per-Pokémon TM/HM move unlocks.
 */

/** @param {*} rawPokemon @returns {Object} */
function migratePokemon(rawPokemon) {
  const source = rawPokemon && typeof rawPokemon === 'object' ? rawPokemon : {};
  const legacy = Array.isArray(source.unlockedMoves)
    ? source.unlockedMoves
    : Array.isArray(source.trainingUnlockedMoves)
      ? source.trainingUnlockedMoves
      : [];
  const unlockedMoves = [];
  for (const entry of legacy) {
    const rawId = typeof entry === 'string' ? entry : entry?.id;
    const id = typeof rawId === 'string' ? rawId.trim() : '';
    if (id && !unlockedMoves.includes(id)) unlockedMoves.push(id);
  }
  const { trainingUnlockedMoves, ...pokemon } = source;
  return { ...pokemon, unlockedMoves };
}

/** @param {*} value @returns {Object[]} */
function migrateParty(value) {
  return Array.isArray(value) ? value.map(migratePokemon) : [];
}

export const MigrationV12ToV13 = Object.freeze({
  from: 12,
  to: 13,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
      ...source,
      version: 13,
      team: migrateParty(source.team),
      box: migrateParty(source.box)
    };
  }
});
