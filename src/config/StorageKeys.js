/**
 * @file StorageKeys.js
 * @brief Every localStorage key used by the game (C++ equivalent: namespace StorageKeys { constexpr ... }).
 * Never write a raw key string anywhere else: import it from here.
 */

export const StorageKeys = Object.freeze({
  /** Active UI language ('fr' | 'en'). */
  LANGUAGE: 'pw_lang',
  /** Active colour theme id (see UiThemes). */
  THEME: 'pw_theme',
  /** '1' when the developer mode is unlocked. */
  DEBUG_MODE: 'pw_debug_mode',
  /** JSON array of enabled notification channels. */
  NOTIFICATION_CHANNELS: 'pw_notif_channels',
  /** JSON object describing the dashboard column layout. */
  DASHBOARD_COLUMNS: 'pokeworld_cols_v13',
  /** JSON object of the audio buses (music / sfx / cries). */
  AUDIO_SETTINGS: 'pw_audio',

  /** Save library index (JSON array of save summaries). */
  SAVE_LIBRARY: 'pokeworld_saves_v1',
  /** Id of the save loaded in the current session. */
  ACTIVE_SAVE_ID: 'pokeworld_active_save_id',
  /** Mirror of the active save (original game compatibility). */
  ACTIVE_SAVE: 'pokeworld_save',
  /** Prefix of every save slot payload (followed by the save id). */
  SAVE_SLOT_PREFIX: 'pokeworld_save_slot_',
  /** Prefix used by the first rework prototype (read-only migration). */
  LEGACY_SAVE_SLOT_PREFIX: 'pw_clean_save_slot_'
});

/**
 * Keys written by older builds. They are read once, migrated to their
 * StorageKeys equivalent, then deleted (see LocalStore.migrateLegacyKeys()).
 */
export const LEGACY_STORAGE_KEYS = Object.freeze({
  pokeworld_lang: StorageKeys.LANGUAGE,
  pokeworld_theme: StorageKeys.THEME,
  pokeworld_debug: StorageKeys.DEBUG_MODE
});
