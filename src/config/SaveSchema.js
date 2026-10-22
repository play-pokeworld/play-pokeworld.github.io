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
 *   5 — v1.7: twenty UID-based team presets and the active preset id.
 *   6 — intermediate development schema (not a package release): progressive currency visibility
 *       and capture counts by location.
 *   7 — v1.9: guided tutorial completion and one-time reward guards.
 *   8 — v1.9: persistent dungeon expeditions, maps and clear counts.
 *   9 — v1.9: persistent Kanto hatchery and mine state, plus training-session statistics.
 *  10 — v1.9.1: sticky unlocked locations, feature access and champion/starter milestones.
 *  11 — v1.9.1: repeatable board unlock, persisted offers, reroll timestamp and slot upgrades.
 *  12 — v1.10: league titles separated from Gym badges; legacy feature unlocks repaired.
 *  13 — v1.11: per-Pokémon TM/HM move unlocks.
 *  14 — v1.12: persisted PC filters and per-Pokémon favorite/collection-lock flags.
 *  15 — development: persistent secret-base layout, stock, NPCs, visit record and flag progress.
 *  16 — v1.14.17: one owned-Pokémon `collection`; `team` and daycare slots store uids; `box` removed
 *       (the PC box is the view of the whole collection).
 */

export const SaveSchema = Object.freeze({
  VERSION: 16
});
