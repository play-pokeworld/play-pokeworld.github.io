/**
 * @file PlayerDefaults.js
 * @brief Default values of a brand new trainer profile (C++ equivalent: namespace PlayerDefaults { constexpr ... }).
 * Pure data, no localized text: display strings are always resolved through t().
 */

import { DEFAULT_TRAINER_NAME } from './AssetPaths.js';

export const PlayerDefaults = Object.freeze({
  /** Nickname used when the player leaves the field empty (a proper noun, identical in every language). */
  TRAINER_NAME: 'Red',
  /** Portrait file stem in assets/images/trainers/. */
  TRAINER_SPRITE: DEFAULT_TRAINER_NAME,
  STARTING_MONEY: 500,
  TOTAL_BADGES: 8,
  REGION: 'kanto',
  /** LocationDB id of the starting town. */
  LOCATION_ID: 'pallet',
  /** Level of the starter Pokemon. */
  STARTER_LEVEL: 5,
  /** Number of Kanto species (Pokedex completion denominator). */
  KANTO_DEX_SIZE: 151,
  /** Maximum party size. */
  TEAM_SIZE: 6
});
