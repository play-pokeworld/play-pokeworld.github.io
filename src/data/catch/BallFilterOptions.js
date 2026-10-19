/**
 * @file BallFilterOptions.js
 * @brief Options of a Poké Ball filter (C++: enum class BallFilterOption).
 * Stored options (BallFilterData.options):
 *   caught       — the species is owned, any colour (true) / not owned (false);
 *   shiny        — the encounter is shiny;
 *   caughtShiny  — the species is already owned as a shiny;
 *   type         — one of the 18 types (TypeChart);
 *   encounter    — EncounterKinds value.
 * Editor toggles (original FILTER_OPTION_DEFS): `new` and `caught` both drive the stored
 * `caught` option; `caughtShiny` also sets `caught: true`.
 */
export const BallFilterOptions = Object.freeze({
  NEW: 'new',
  CAUGHT: 'caught',
  SHINY: 'shiny',
  CAUGHT_SHINY: 'caughtShiny',
  TYPE: 'type',
  ENCOUNTER: 'encounter'
});

/** Boolean editor toggles, in the original editor order, with their label keys. */
export const BALL_FILTER_TOGGLES = Object.freeze([
  Object.freeze({ key: BallFilterOptions.NEW, labelKey: 'ball_opt_not_caught' }),
  Object.freeze({ key: BallFilterOptions.CAUGHT, labelKey: 'ball_opt_caught' }),
  Object.freeze({ key: BallFilterOptions.SHINY, labelKey: 'ball_opt_shiny' }),
  Object.freeze({ key: BallFilterOptions.CAUGHT_SHINY, labelKey: 'ball_opt_caught_shiny' })
]);

/** Value options, in the original editor order, with their label keys. */
export const BALL_FILTER_VALUES = Object.freeze([
  Object.freeze({ key: BallFilterOptions.TYPE, labelKey: 'ball_opt_type' }),
  Object.freeze({ key: BallFilterOptions.ENCOUNTER, labelKey: 'ball_opt_encounter' })
]);

/** Types offered by the `type` option, in the original FILTER_TYPES order. */
export const BALL_FILTER_TYPES = Object.freeze([
  'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dark', 'dragon', 'steel', 'fairy'
]);
