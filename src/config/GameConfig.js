/**
 * @file GameConfig.js
 * @brief Global, non-localized game constants (C++ equivalent: namespace GameConfig { constexpr ... }).
 * Anything a designer may want to tweak without touching logic lives here.
 */

export const GameConfig = Object.freeze({
  /** Rework release number (boot log). Keep in sync with package.json and the delivered zip name. */
  VERSION: '1.14.28',

  /** Official community invite (same link as the original game: data/game-config.js). */
  DISCORD_URL: 'https://discord.gg/DXC48vtGV',

  /** Languages offered by the language switcher, in display order. */
  SUPPORTED_LANGUAGES: Object.freeze(['fr', 'en']),

  /** Trainer nickname constraints (starter modal, rename dialog). */
  TRAINER_NAME_MAX_LENGTH: 16,

  /** Horizontal scroll step of the save carousel: one card (330px) + gap (14px). */
  SAVE_CAROUSEL_SCROLL_STEP: 344,

  /** Minimum number of saves before the carousel arrows are shown. */
  SAVE_CAROUSEL_ARROWS_THRESHOLD: 3,

  /** File types accepted by the save importer. */
  SAVE_IMPORT_ACCEPT: '.json,application/json',

  /** Exported save file name pattern ({id} is replaced by the save id). */
  SAVE_EXPORT_FILENAME: 'pokeworld_save_{id}.json',

  /** Code typed in Settings → Advanced to unlock the developer mode (same as the original game). */
  DEBUG_ACCESS_CODE: 'PWDEBUG'
});
