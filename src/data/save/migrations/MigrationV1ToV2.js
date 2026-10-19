/**
 * @file MigrationV1ToV2.js
 * @brief Save migration 1 -> 2 (rework v1.0-v1.2 -> v1.3) (C++: struct MigrationV1ToV2 : SaveMigration).
 *  - money moves from `player.money` to the wallet (`currencies.money`);
 *  - a Pokédex is created from the team when missing (every team member was caught);
 *  - `player.caughtCount` is dropped (derived from the Pokédex).
 */
export const MigrationV1ToV2 = Object.freeze({
  from: 1,
  to: 2,
  /**
   * @param {Object} raw
   * @returns {Object}
   */
  migrate(raw) {
    const { money, caughtCount, ...player } = raw.player || {};
    const currencies = { ...(raw.currencies || {}) };
    if (Number.isFinite(money) && currencies.money === undefined) currencies.money = money;
    let pokedex = raw.pokedex;
    if (!pokedex || typeof pokedex !== 'object') {
      pokedex = {};
      for (const pokemon of raw.team || []) {
        const species = String(pokemon?.species || '').toLowerCase();
        if (!species) continue;
        pokedex[species] = { seen: true, caught: true, shiny: !!pokemon.shiny || !!pokedex[species]?.shiny };
      }
    }
    return { ...raw, version: 2, player, currencies, pokedex };
  }
});
