/**
 * @file TeamPresetRules.js
 * @brief Limits and stable ids for the saved team presets.
 */

const PRESET_IDS = Object.freeze(Array.from({ length: 20 }, (_, index) => `preset${index + 1}`));

export const TeamPresetRules = Object.freeze({
  /** Number of persistent team slots. */
  COUNT: PRESET_IDS.length,
  /** Maximum saved name length. */
  NAME_MAX_LENGTH: 24,
  /** Maximum number of Pokémon in one saved party. */
  MAX_MEMBERS: 6,
  SELECTION_PREFIX:'preset-pokemon-',
  /** Default selected slot for a new or migrated save. */
  DEFAULT_ACTIVE_ID: PRESET_IDS[0],
  /** Stable slot ids in display order. */
  PRESET_IDS,
  /** Localization keys used only for the first three empty default names. */
  DEFAULT_NAME_KEYS: Object.freeze({
    preset1: 'preset_adventure',
    preset2: 'preset_boss',
    preset3: 'preset_training'
  })
});
