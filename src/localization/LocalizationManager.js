/**
 * @file LocalizationManager.js
 * @brief Centralized i18n service (C++ equivalent: class LocalizationManager : public BaseObject, singleton).
 * Builds one flat lookup table per language from LOCALE_CATALOG and resolves keys with
 * `{param}` interpolation. Code never carries display text: every string goes through t().
 */

import { BaseObject } from '../core/BaseObject.js';
import { EventBus } from '../core/EventBus.js';
import { LanguageChangedEvent } from '../core/events/LanguageChangedEvent.js';
import { LocalStore } from '../core/LocalStore.js';
import { StorageKeys } from '../config/StorageKeys.js';
import { GameConfig } from '../config/GameConfig.js';
import { LOCALE_CATALOG, FALLBACK_LANGUAGE } from './LocaleCatalog.js';

export class LocalizationManager extends BaseObject {
  /** @private @type {LocalizationManager|null} */
  static _instance = null;

  /** @returns {LocalizationManager} */
  static getInstance() {
    if (!LocalizationManager._instance) {
      LocalizationManager._instance = new LocalizationManager();
    }
    return LocalizationManager._instance;
  }

  constructor() {
    super('LocalizationManager', 'Core');

    LocalStore.migrateLegacyKeys();
    const stored = LocalStore.getString(StorageKeys.LANGUAGE);
    /** @private @type {string} */
    this._currentLang = GameConfig.SUPPORTED_LANGUAGES.includes(stored) ? stored : FALLBACK_LANGUAGE;

    /** @private @type {Record<string, Record<string, string>>} */
    this._tables = {};

    /** @private @type {string[]} Keys defined twice in the same language (diagnostics). */
    this._collisions = [];

    for (const [lang, domains] of Object.entries(LOCALE_CATALOG)) {
      this._tables[lang] = {};
      for (const domain of domains) {
        this._mergeDomain(lang, domain.source, domain.prefix || '');
      }
    }
  }

  /**
   * Flattens one translation module into the language table.
   * Nested objects produce dotted keys, arrays produce indexed keys, null entries are skipped.
   * A key defined twice keeps its first value and is reported in getCollisions().
   * @private
   * @param {string} lang
   * @param {Object|Array} source
   * @param {string} prefix
   */
  _mergeDomain(lang, source, prefix) {
    if (!source || typeof source !== 'object') return;
    const table = this._tables[lang];

    for (const [key, value] of Object.entries(source)) {
      if (value === null || value === undefined) continue;
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object') {
        this._mergeDomain(lang, value, fullKey);
      } else if (Object.prototype.hasOwnProperty.call(table, fullKey)) {
        this._collisions.push(`${lang}:${fullKey}`);
      } else {
        table[fullKey] = String(value);
      }
    }
  }

  /** @returns {string} Active language code */
  get currentLang() {
    return this._currentLang;
  }

  /** @returns {string[]} */
  getCollisions() {
    return [...this._collisions];
  }

  /**
   * Changes the active language, persists it and notifies listeners.
   * @param {string} lang
   */
  setLanguage(lang) {
    if (!GameConfig.SUPPORTED_LANGUAGES.includes(lang) || this._currentLang === lang) return;
    this._currentLang = lang;
    LocalStore.setString(StorageKeys.LANGUAGE, lang);
    EventBus.getInstance().dispatch(new LanguageChangedEvent(lang));
  }

  /**
   * True when the key exists in the active or the fallback language.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this._lookup(key) !== undefined;
  }

  /**
   * @private
   * @param {string} key
   * @returns {string|undefined}
   */
  _lookup(key) {
    const active = this._tables[this._currentLang];
    if (active && active[key] !== undefined) return active[key];
    const fallback = this._tables[FALLBACK_LANGUAGE];
    return fallback ? fallback[key] : undefined;
  }

  /**
   * Translates a key with optional `{param}` interpolation.
   * A missing key returns the key itself so the gap is visible on screen and in tests.
   * @param {string} key
   * @param {Object|null} [params=null]
   * @returns {string}
   */
  t(key, params = null) {
    if (!key) return '';
    let str = this._lookup(key);
    if (str === undefined) return key;

    if (params && typeof params === 'object') {
      for (const [name, value] of Object.entries(params)) {
        str = str.split(`{${name}}`).join(value == null ? '' : String(value));
      }
    }
    return str;
  }
}

/** Global convenience accessor (C++: inline free function). */
export const t = (key, params) => LocalizationManager.getInstance().t(key, params);
