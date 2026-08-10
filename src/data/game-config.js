/**
 * PokeGame — Game Configuration & Constants
 *
 * Central file: ALL game constants in one place.
 * No hardcoded values anywhere else in the game code.
 * Use STYLES for visual, GAME for gameplay, DATA for thresholds.
 */
'use strict';

export const GAME = {

  // ─── Inventory ───
  MAX_ITEM_STACK: 25,
  MAX_TEAM_SIZE: 6,
  MAX_BOXES: 12,
  MAX_BOX_SIZE: 30,

  // ─── Battle ───
  BATTLE: {
    BASE_SPEED: 1,
    SPEED_STEPS: [1, 2, 3, 10],
    DEFAULT_CD: 1000,       // ms
    STATUS_CHANCE: 10,      // % base
    CRIT_MULTIPLIER: 1.5,
    SUPER_EFFECTIVE: 2.0,
    NOT_VERY_EFFECTIVE: 0.5,
    IMMUNE: 0,
    STAB: 1.5,
  },

  // ─── Evolution ───
  EVOLUTION: {
    LEVEL_1: 30,
    LEVEL_2: 50,
    LEVEL_3: 70,
    TRADE: 'trade',
    STONE: 'stone',
    ITEM: 'item',
    HAPPINESS: 'happiness',
  },

  // ─── Mining ───
  MINE: {
    WIDTH: 10,
    HEIGHT: 8,
    ENERGY_MAX: 100,
    ENERGY_REGEN: 1,  // per second
  },

  // ─── Hatchery ───
  HATCHERY: {
    SLOTS: 4,
    BASE_TIME: 60000,  // ms for 1 cycle
    MAX_CYCLES: 20,
  },

  // ─── Experience ───
  EXP: {
    BASE: 100,
    SCALE: 1.5,  // multiplier per level
    SHARED_PCT: 0.5,  // not-participating pokemon get 50%
  },

  // ─── Starter ───
  KANTO_STARTERS: [1, 4, 7],    // Bulbasaur, Charmander, Squirtle
  JOHTO_STARTERS: [152, 155, 158], // Chikorita, Cyndaquil, Totodile
  HOENN_STARTERS: [252, 255, 258], // Treecko, Torchic, Mudkip

  // ─── Money ───
  STARTING_MONEY: 2000,
  MAX_MONEY: 9999999,

  // ─── Pokemon ───
  MAX_LEVEL: 100,
  SHINY_CHANCE: 1/4096,
  POKEMON_PER_REGION: { kanto: 151, johto: 100, hoenn: 135 },

  // ─── Regions ───
  REGIONS: {
    kanto: { name: 'Kanto', start: 1, end: 151, badges: 8 },
    johto: { name: 'Johto', start: 152, end: 251, badges: 8 },
    hoenn: { name: 'Hoenn', start: 252, end: 386, badges: 8 },
  },

  // ─── Misc ───
  SAVE_KEY: 'pokeworld_save',
  SAVE_VERSION: 3,
  AFK_TIMEOUT: 600000,  // 10 min
};

// T2 (wave 38): ESM module — native export; the classic surface is
// kept on the global object for the registries (data.js) and the VM harnesses.
if (typeof globalThis !== 'undefined') globalThis.GAME = GAME;
