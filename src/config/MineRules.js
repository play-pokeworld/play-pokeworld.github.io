/**
 * @file MineRules.js
 * @brief Tunable rules for the grid mine.
 */
const HAMMER_OFFSETS = Object.freeze([
  Object.freeze([-1, -1]),
  Object.freeze([0, -1]),
  Object.freeze([1, -1]),
  Object.freeze([-1, 0]),
  Object.freeze([0, 0]),
  Object.freeze([1, 0]),
  Object.freeze([-1, 1]),
  Object.freeze([0, 1]),
  Object.freeze([1, 1]),
]);

export const MineRules = Object.freeze({
  WIDTH: 10,
  HEIGHT: 8,
  INITIAL_ENERGY: 100,
  MAX_ENERGY: 100,
  ENERGY_REGEN_PER_SECOND: 2,
  ENERGY_PER_WILD_WIN: 5,
  MIN_TILE_DURABILITY: 1,
  MAX_TILE_DURABILITY: 4,
  MIN_ITEMS_PER_LAYER: 3,
  MAX_ITEMS_PER_LAYER: 5,
  PLACEMENT_ATTEMPTS: 30,
  DEFAULT_TOOL: 'chisel',
  LOCATION_ID: 'diglettscave',
  HOENN_REGION: 'hoenn',
  ENERGY_UPGRADE_COSTS: Object.freeze([100, 250, 500, 1000]),
  ENERGY_UPGRADE_STEP: 25,
  AUTOMATION_COST: 1000,
  AUTOMATION_FEE: 1,
  AUTOMATION_INTERVAL: 1.2,
  MANUAL_SURVEY_COOLDOWN_MS: 10 * 60 * 1000,
  CURRENCY_ID: 'diamond',
  TOOLS: Object.freeze({
    chisel: Object.freeze({
      energyCost: 5,
      power: 2,
      offsets: Object.freeze([Object.freeze([0, 0])]),
    }),
    hammer: Object.freeze({
      energyCost: 12,
      power: 1,
      cost: 0,
      offsets: HAMMER_OFFSETS,
    }),
    pickaxe: Object.freeze({
      energyCost: 12,
      power: 3,
      cost: 400,
      offsets: Object.freeze([
        Object.freeze([0, 0]),
        Object.freeze([-1, 0]),
        Object.freeze([1, 0]),
        Object.freeze([0, -1]),
        Object.freeze([0, 1]),
      ]),
    }),
    drill: Object.freeze({
      energyCost: 20,
      power: 4,
      cost: 800,
      offsets: Object.freeze([
        Object.freeze([-2, 0]),
        Object.freeze([-1, 0]),
        Object.freeze([0, 0]),
        Object.freeze([1, 0]),
        Object.freeze([2, 0]),
      ]),
    }),
    dynamite: Object.freeze({
      energyCost: 35,
      power: 5,
      cost: 1200,
      offsets: HAMMER_OFFSETS,
    }),
  }),
});
