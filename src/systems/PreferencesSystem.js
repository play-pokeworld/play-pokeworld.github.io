/**
 * @file PreferencesSystem.js
 * @brief Persisted user preferences: colour theme, developer mode, audio buses
 * (C++ equivalent: class PreferencesSystem : public BaseSystem).
 * Pure state + persistence + events: the document itself is updated by AppShell.
 */

import { BaseSystem } from './BaseSystem.js';
import { EventBus } from '../core/EventBus.js';
import { LocalStore } from '../core/LocalStore.js';
import { StorageKeys } from '../config/StorageKeys.js';
import { UiThemes } from '../config/UiThemes.js';
import { ThemeChangedEvent } from '../core/events/ThemeChangedEvent.js';
import { DebugModeChangedEvent } from '../core/events/DebugModeChangedEvent.js';
import { AnimationPreferencesChangedEvent } from '../core/events/AnimationPreferencesChangedEvent.js';
import { AnimationPreferences, DEFAULT_ANIMATION_PREFERENCES } from '../config/AnimationPreferences.js';

/** Audio buses shown in the settings, with their default state. */
export const AUDIO_BUSES = Object.freeze(['music', 'sfx', 'cries']);
const DEFAULT_AUDIO = Object.freeze({
  music: Object.freeze({ on: true, volume: 70 }),
  sfx: Object.freeze({ on: true, volume: 80 }),
  cries: Object.freeze({ on: true, volume: 85 })
});

export class PreferencesSystem extends BaseSystem {
  /** @private @type {PreferencesSystem|null} */
  static _instance = null;

  /** @returns {PreferencesSystem} */
  static getInstance() {
    if (!PreferencesSystem._instance) {
      PreferencesSystem._instance = new PreferencesSystem();
    }
    return PreferencesSystem._instance;
  }

  constructor() {
    super('PreferencesSystem', 'System');
    LocalStore.migrateLegacyKeys();
  }

  /** @returns {string} Active UiThemes id */
  getTheme() {
    return UiThemes.normalize(LocalStore.getString(StorageKeys.THEME));
  }

  /** @param {string} themeId */
  setTheme(themeId) {
    const theme = UiThemes.normalize(themeId);
    LocalStore.setString(StorageKeys.THEME, theme);
    EventBus.getInstance().dispatch(new ThemeChangedEvent(theme));
  }

  /** @returns {boolean} */
  isDebugMode() {
    const raw = LocalStore.getString(StorageKeys.DEBUG_MODE);
    return raw === '1' || raw === 'true';
  }

  /** @param {boolean} enabled */
  setDebugMode(enabled) {
    LocalStore.setString(StorageKeys.DEBUG_MODE, enabled ? '1' : '0');
    EventBus.getInstance().dispatch(new DebugModeChangedEvent(!!enabled));
  }

  /**
   * @param {string} busId - One of AUDIO_BUSES
   * @returns {{on: boolean, volume: number}}
   */
  getAudioBus(busId) {
    const stored = LocalStore.getJson(StorageKeys.AUDIO_SETTINGS, {}) || {};
    const fallback = DEFAULT_AUDIO[busId] || { on: true, volume: 100 };
    const bus = stored[busId] || {};
    return {
      on: typeof bus.on === 'boolean' ? bus.on : fallback.on,
      volume: Number.isFinite(bus.volume) ? bus.volume : fallback.volume
    };
  }

  /**
   * @param {string} busId
   * @param {{on?: boolean, volume?: number}} patch
   */
  setAudioBus(busId, patch) {
    const stored = LocalStore.getJson(StorageKeys.AUDIO_SETTINGS, {}) || {};
    stored[busId] = { ...this.getAudioBus(busId), ...patch };
    LocalStore.setJson(StorageKeys.AUDIO_SETTINGS, stored);
  }

  /** @returns {Record<string, boolean>} Capture and visual-feedback preferences. */
  getAnimationPreferences() {
    const raw = LocalStore.getJson(StorageKeys.ANIMATION_SETTINGS, {});
    const stored = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    return Object.freeze(Object.fromEntries(
      Object.entries(DEFAULT_ANIMATION_PREFERENCES).map(([id, fallback]) => [
        id,
        typeof stored[id] === 'boolean' ? stored[id] : fallback
      ])
    ));
  }

  /** @param {string} preferenceId */
  getAnimationPreference(preferenceId) {
    const preferences = this.getAnimationPreferences();
    return Object.prototype.hasOwnProperty.call(preferences, preferenceId)
      ? preferences[preferenceId]
      : true;
  }

  /**
   * Persists one supported animation preference and notifies document/UI adapters.
   * @param {string} preferenceId
   * @param {boolean} enabled
   * @returns {boolean} Whether the stored value changed
   */
  setAnimationPreference(preferenceId, enabled) {
    if (!Object.values(AnimationPreferences).includes(preferenceId)) return false;
    const next = !!enabled;
    const current = this.getAnimationPreferences();
    if (current[preferenceId] === next) return false;

    const preferences = { ...current, [preferenceId]: next };
    LocalStore.setJson(StorageKeys.ANIMATION_SETTINGS, preferences);
    EventBus.getInstance().dispatch(new AnimationPreferencesChangedEvent(preferenceId, next, preferences));
    return true;
  }
}
