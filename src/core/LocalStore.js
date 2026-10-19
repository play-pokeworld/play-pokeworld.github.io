/**
 * @file LocalStore.js
 * @brief Exception-safe wrapper around window.localStorage (C++ equivalent: class LocalStore, static).
 * Private browsing or a full quota must never crash the game: every accessor swallows
 * storage errors and returns the provided fallback instead.
 */

import { LEGACY_STORAGE_KEYS } from '../config/StorageKeys.js';

export class LocalStore {
  /**
   * @param {string} key
   * @param {string|null} [fallback=null]
   * @returns {string|null}
   */
  static getString(key, fallback = null) {
    try {
      const value = globalThis.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  /**
   * @param {string} key
   * @param {string} value
   * @returns {boolean} false when the write failed
   */
  static setString(key, value) {
    try {
      globalThis.localStorage.setItem(key, String(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * @param {string} key
   * @param {any} [fallback=null]
   * @returns {any}
   */
  static getJson(key, fallback = null) {
    const raw = LocalStore.getString(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  /**
   * @param {string} key
   * @param {any} value
   * @returns {boolean}
   */
  static setJson(key, value) {
    return LocalStore.setString(key, JSON.stringify(value));
  }

  /** @param {string} key */
  static remove(key) {
    try {
      globalThis.localStorage.removeItem(key);
    } catch (_) {
      // Storage unavailable: nothing to remove.
    }
  }

  /**
   * Lists every stored key (used by the save migration).
   * @returns {string[]}
   */
  static keys() {
    try {
      const out = [];
      for (let i = 0; i < globalThis.localStorage.length; i++) {
        out.push(globalThis.localStorage.key(i));
      }
      return out.filter((k) => k !== null);
    } catch (_) {
      return [];
    }
  }

  /**
   * Moves values written under legacy key names to their current key.
   * A value already present under the current key always wins.
   */
  static migrateLegacyKeys() {
    for (const [legacyKey, currentKey] of Object.entries(LEGACY_STORAGE_KEYS)) {
      const legacyValue = LocalStore.getString(legacyKey);
      if (legacyValue === null) continue;
      if (LocalStore.getString(currentKey) === null) {
        LocalStore.setString(currentKey, legacyValue);
      }
      LocalStore.remove(legacyKey);
    }
  }
}
