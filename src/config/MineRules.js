/**
 * @file MineRules.js
 * @brief Tunable rules for the grid mine.
 */
const HAMMER_OFFSETS = Object.freeze([
  Object.freeze([-1, -1]), Object.freeze([0, -1]), Object.freeze([1, -1]),
  Object.freeze([-1, 0]), Object.freeze([0, 0]), Object.freeze([1, 0]),
  Object.freeze([-1, 1]), Object.freeze([0, 1]), Object.freeze([1, 1])
]);

export const MineRules = Object.freeze({
  WIDTH: 10,
  HEIGHT: 8,
  INITIAL_ENERGY: 100,
  MAX_ENERGY: 100,
  ENERGY_REGEN_PER_SECOND: 2,
  MIN_TILE_DURABILITY: 1,
  MAX_TILE_DURABILITY: 4,
  MIN_ITEMS_PER_LAYER: 3,
  MAX_ITEMS_PER_LAYER: 5,
  PLACEMENT_ATTEMPTS: 30,
  DEFAULT_TOOL: 'chisel',
  LOCATION_ID: 'diglettscave',
  HOENN_REGION: 'hoenn',
  TOOLS: Object.freeze({
    chisel: Object.freeze({ energyCost: 5, power: 2, offsets: Object.freeze([Object.freeze([0, 0])]) }),
    hammer: Object.freeze({ energyCost: 12, power: 1, offsets: HAMMER_OFFSETS })
  })
});
