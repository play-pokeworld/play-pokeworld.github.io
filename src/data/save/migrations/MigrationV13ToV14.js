/**
 * @file MigrationV13ToV14.js
 * @brief Save migration 13 -> 14: persistent PC filters and Pokémon favorite/lock flags.
 */
/** @param {*} rawPokemon @returns {Object} */
function migratePokemon(rawPokemon) {
  const source = rawPokemon && typeof rawPokemon === 'object' ? rawPokemon : {};
  const { fav, ...pokemon } = source;
  return {
    ...pokemon,
    favorite: source.favorite === true || fav === true,
    locked: source.locked === true
  };
}

/** @param {*} value @returns {Object[]} */
function migrateParty(value) {
  return Array.isArray(value) ? value.map(migratePokemon) : [];
}

/** @param {*} value @returns {Object} */
function migrateHatchery(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    ...source,
    slots: Array.isArray(source.slots)
      ? source.slots.map((slot) => slot?.kind === 'daycare' && slot.pokemon
        ? { ...slot, pokemon: migratePokemon(slot.pokemon) }
        : slot ?? null)
      : []
  };
}

export const MigrationV13ToV14 = Object.freeze({
  from: 13,
  to: 14,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
      ...source,
      version: 14,
      team: migrateParty(source.team),
      box: migrateParty(source.box),
      boxFilters: source.boxFilters && typeof source.boxFilters === 'object'
        ? { ...source.boxFilters }
        : {},
      ...(source.hatchery ? { hatchery: migrateHatchery(source.hatchery) } : {})
    };
  }
});
