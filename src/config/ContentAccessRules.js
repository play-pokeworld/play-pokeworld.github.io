/**
 * @file ContentAccessRules.js
 * @brief Data-only rules for world progression and feature access.
 *
 * Location badges, connections, groups and win counts remain owned by LocationDB. This file only
 * declares the original game's exceptional gates which are not represented in the generated tables.
 */
export const LOCATION_ACCESS_GATES = Object.freeze({
  route12: Object.freeze({ questKey: 'main.27', itemId: 'pokeflute' }),
  route16: Object.freeze({ questKey: 'main.27', itemId: 'pokeflute' }),
  ceruleancave: Object.freeze({ championTitle: true }),
  mtsilver: Object.freeze({ championTitle: true }),
  tohjofalls: Object.freeze({ championTitle: true }),
  route1: Object.freeze({ starterRegion: 'kanto' }),
  jroute29: Object.freeze({ starterRegion: 'johto' }),
  route101: Object.freeze({ starterRegion: 'hoenn' }),
  mirage_island: Object.freeze({ rotationWindow: 0 })
});

/** Region entry shown when that region is the active story region. */
export const REGION_START_LOCATIONS = Object.freeze({
  kanto: 'pallet',
  johto: 'newbark',
  hoenn: 'littleroot'
});

/** Feature identifiers persisted by ContentAccessData. */
export const CONTENT_FEATURES = Object.freeze({
  HATCHERY: 'hatchery',
  MINE: 'mine',
  TRAINING: 'training'
});

/** Legacy game used a twelve-hour rotating window for Mirage Island. */
export const MIRAGE_ROTATION_WINDOW_MS = 12 * 60 * 60 * 1000;
