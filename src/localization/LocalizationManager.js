/**
 * @file LocalizationManager.js
 * @brief Centralized i18n service (C++ equivalent: class LocalizationManager : public BaseObject, singleton).
 * Builds one flat lookup table per language from LOCALE_CATALOG and resolves keys with
 * `{param}` interpolation. Code never carries display text: every string goes through t().
 *
 * t() returns a `LocalizedText`: a string that also remembers its key and parameters, so the same
 * text can be resolved again in another language without rebuilding the view
 * (`src/ui/LocalizedTextBinder.js` refreshes the whole live DOM on every language change).
 * Text made of several pieces must be built with `compose()` or with a key + params, never by
 * concatenation, otherwise the translation key is lost and the text freezes in one language.
 */

import { BaseObject } from '../core/BaseObject.js';
import { EventBus } from '../core/EventBus.js';
import { LanguageChangedEvent } from '../core/events/LanguageChangedEvent.js';
import { LocalStore } from '../core/LocalStore.js';
import { StorageKeys } from '../config/StorageKeys.js';
import { GameConfig } from '../config/GameConfig.js';
import { LOCALE_CATALOG, FALLBACK_LANGUAGE } from './LocaleCatalog.js';
import { LocalizedText, isLocalizedText } from './LocalizedText.js';

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
   * Every live view refreshes itself through `LanguageChangedEvent` (see `AppShell`).
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
   * Replaces `{name}` placeholders with their value resolved in the active language.
   * A parameter may itself be a LocalizedText (a Pokémon name, an item name…).
   * @private
   * @param {string} template
   * @param {Record<string, any>|null} params
   * @returns {string}
   */
  _interpolate(template, params) {
    if (!params || typeof params !== 'object') return template;
    let out = template;
    for (const [name, value] of Object.entries(params)) {
      const replacement = this.resolve(value);
      out = out.split(`{${name}}`).join(replacement);
    }
    return out;
  }

  /**
   * Resolves any value to the text displayed in the active language.
   * A LocalizedText is resolved from its key (or from its parts), recursively.
   * @param {any} value
   * @returns {string}
   */
  resolve(value) {
    if (value === null || value === undefined) return '';
    if (!isLocalizedText(value)) return String(value);

    if (value.parts) return value.parts.map((part) => this.resolve(part)).join('');
    if (!value.key) return String(value);

    const raw = this._lookup(value.key);
    if (raw === undefined) return value.key;
    return this._interpolate(raw, value.params);
  }

  /**
   * Translates a key with optional `{param}` interpolation.
   * A missing key resolves to the key itself, so the gap is visible on screen and in tests.
   * @param {string} key
   * @param {Object|null} [params=null]
   * @returns {LocalizedText} String-like token keeping the key for later re-resolution
   */
  t(key, params = null) {
    if (!key) return new LocalizedText('', {});
    const lookupKey = String(key);
    const raw = this._lookup(lookupKey);
    const missing = raw === undefined;
    const text = missing ? lookupKey : this._interpolate(raw, params);
    return new LocalizedText(text, { key: lookupKey, params, missing });
  }

  /**
   * Resolved plain string for a key: the value is never bound, never kept, never compared as a token.
   * Use it for stable identities read from a table (an NPC id, a slug) — never to display text.
   * @param {string} key
   * @param {Object|null} [params=null]
   * @returns {string}
   */
  text(key, params = null) {
    return this.resolve(this.t(key, params));
  }

  /**
   * Translates a key, or falls back to a value when the key is defined in no language.
   * Replaces the fragile `t(key) === key ? fallback : t(key)` test: the returned text keeps its key,
   * so the fallback also follows a language change.
   * @param {string} key
   * @param {any} [fallback=null] - Localized text or plain value; defaults to the key itself
   * @param {Object|null} [params=null]
   * @returns {LocalizedText}
   */
  tOr(key, fallback = null, params = null) {
    if (this.has(key)) return this.t(key, params);
    if (isLocalizedText(fallback)) return fallback;
    return new LocalizedText(fallback === null || fallback === undefined ? String(key) : String(fallback), {});
  }

  /**
   * Joins several texts with a separator, keeping the key of every part.
   * Replaces `items.join(', ')`, which would freeze the list in the language of the call.
   * @param {string|import('./LocalizedText.js').LocalizedText} separator - Key, text or literal
   * @param {Array<any>} items
   * @returns {LocalizedText}
   */
  join(separator, items) {
    const list = Array.isArray(items) ? items : [];
    const parts = [];
    list.forEach((item, index) => {
      if (index > 0) parts.push(separator);
      parts.push(item);
    });
    return this.compose(...parts);
  }

  /**
   * Builds one text from several parts (translated tokens, separators, numbers).
   * Use it instead of a template literal or a concatenation, so every part keeps its key.
   * @param {...any} parts
   * @returns {LocalizedText}
   */
  compose(...parts) {
    const list = parts.length === 1 && Array.isArray(parts[0]) ? parts[0] : parts;
    return new LocalizedText(list.map((part) => this.resolve(part)).join(''), { parts: list });
  }
}

/** Global convenience accessor (C++: inline free function). */
export const t = (key, params) => LocalizationManager.getInstance().t(key, params);

/**
 * Free function mirroring `LocalizationManager.compose`.
 * @param {...any} parts
 * @returns {LocalizedText}
 */
export const compose = (...parts) => LocalizationManager.getInstance().compose(...parts);

/**
 * Free function mirroring `LocalizationManager.tOr`.
 * @param {string} key @param {any} [fallback] @param {Object|null} [params]
 * @returns {LocalizedText}
 */
export const tOr = (key, fallback = null, params = null) => LocalizationManager.getInstance().tOr(key, fallback, params);

/**
 * Tagged template that keeps the translation of every part.
 * Use it instead of a plain template literal as soon as one part comes from t():
 *   lt`${t('quest_numbered_title', { index })} — ${t('quests.main.1.title')}`
 * A plain template literal joins the *current* values and loses their keys, so the text would stay
 * in the language it was built in (see docs/PHASE_v1.16.1.md).
 * @param {TemplateStringsArray} strings
 * @param {...any} values
 * @returns {LocalizedText}
 */
export const lt = (strings, ...values) => {
  const parts = [];
  for (let index = 0; index < strings.length; index++) {
    parts.push(strings[index]);
    if (index < values.length) parts.push(values[index]);
  }
  return LocalizationManager.getInstance().compose(parts);
};

/** Free function mirroring `LocalizationManager.join`. @param {any} separator @param {Array<any>} items */
export const joinLocalized = (separator, items) => LocalizationManager.getInstance().join(separator, items);

/** @param {any} value @returns {string} Text of the value in the active language. */
export const resolveText = (value) => LocalizationManager.getInstance().resolve(value);
