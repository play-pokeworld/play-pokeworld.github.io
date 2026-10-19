/**
 * @file SaveSchema.js
 * @brief Version of the save format written by SaveData.serialize() (C++: namespace SaveSchema).
 * Bump VERSION whenever the serialized shape changes and add the matching migration to
 * data/save/migrations/SaveMigrator.js (models only read the current shape).
 *
 * History:
 *   0 — export of the original game (`{ G: {...} }`).
 *   1 — v1.0 to v1.2 rework saves (no `version` field).
 *   2 — v1.3: `version` field, `pokedex` entries; `player.caughtCount` is derived (no longer stored).
 *   3 — v1.4: PokemonData v2 (uid, total exp, talent, IVs / EVs, no derived values), badge ids,
 *       inventory, quests, statistics; no saveId / slotId.
 *   4 — v1.5: Poké Ball filters (`ballFilters`), PC box (`box`), statistics.duplicateCatches.
 */

export const SaveSchema = Object.freeze({
  VERSION: 4
});
