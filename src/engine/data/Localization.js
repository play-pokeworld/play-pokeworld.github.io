/**
 * PokeEngine — Localization Manager
 *
 * Template-based with {placeholders}, auto-fallback, cached lookups.
 * Auto-imports all legacy I18N data on construction.
 *
 * Usage:
 *   L.set('fr');          // switch to French
 *   L.t('shortcut_bag');  // "Sac"
 *   L.tr('welcome', {name: 'Alice'}); // "Bienvenue Alice"
 */
(function() {
'use strict';

class Localization {
  constructor() {
    this._lang = 'fr';
    this._fallbackLang = 'en';
    this._data = {};       // lang -> { key: value }
    this._cache = new Map();
    this._loaded = false;

    // Auto-import all legacy I18N data that was already loaded
    this._captureLegacyData();
  }

  // ─── Auto-import from legacy I18N ───
  _captureLegacyData() {
    const i18n = window.I18N;
    if (!i18n) return;

    for (const lang of ['fr', 'en']) {
      const langData = i18n[lang];
      if (!langData) continue;

      // langData contains BOTH flat keys AND nested objects (items, quests, etc.)
      // We need to flatten nested objects while keeping flat keys as-is.
      const flat = {};
      for (const [key, val] of Object.entries(langData)) {
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          // Nested namespace: flatten with key prefix
          this._flatten(val, key, flat);
        } else if (typeof val === 'string') {
          // Flat key
          flat[key] = val;
        }
      }
      this._data[lang] = flat;
    }
    this._loaded = true;
  }

  set(lang) {
    if (lang === this._lang && this._loaded) return;
    this._lang = lang || 'fr';
    this._cache.clear();
    if (window.G) window.G.lang = this._lang;
    document.documentElement.lang = this._lang === 'fr' ? 'fr' : 'en';
    document.dispatchEvent(new CustomEvent('poke:languageChanged', { detail: { lang: this._lang } }));
    return this;
  }

  get lang() { return this._lang; }

  register(lang, data) {
    if (!this._data[lang]) this._data[lang] = {};
    this._flatten(data, '', this._data[lang]);
    this._loaded = true;
    this.clearCache();
    return this;
  }

  _flatten(obj, prefix, result) {
    for (const [key, val] of Object.entries(obj)) {
      const path = prefix ? prefix + '.' + key : key;
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        this._flatten(val, path, result);
      } else {
        result[path] = String(val);
      }
    }
  }

  t(key, ...args) {
    const cacheKey = this._lang + ':' + key;
    if (this._cache.has(cacheKey)) {
      const val = this._cache.get(cacheKey);
      return args.length ? this._interpolate(val, args[0]) : val;
    }

    let val = this._get(key, this._lang);
    if (val === undefined) val = this._get(key, this._fallbackLang);
    if (val === undefined) val = key;

    this._cache.set(cacheKey, val);
    return args.length ? this._interpolate(val, args[0]) : val;
  }

  tr(key, vars) {
    return this._interpolate(this.t(key), vars || {});
  }

  _get(key, lang) {
    const data = this._data[lang];
    if (!data) return undefined;
    // Direct flat lookup (most common)
    if (data[key] !== undefined) return data[key];
    // Dot-notation traversal for any remaining nested structures
    let current = data;
    const parts = key.split('.');
    for (const part of parts) {
      if (current[part] === undefined) return undefined;
      current = current[part];
    }
    return typeof current === 'string' ? current : undefined;
  }

  _interpolate(str, vars) {
    if (!vars || !str) return str || '';
    return str.replace(/\{(\w+)\}/g, (_, key) => vars[key] !== undefined ? vars[key] : '{' + key + '}');
  }

  has(key) {
    return this._get(key, this._lang) !== undefined;
  }

  clearCache() {
    this._cache.clear();
  }
}

window.PokeLocalization = Localization;
// Legacy compatibility
if (!window.L) window.L = new Localization();
window.L_set = (lang) => window.L.set(lang);
window.t = (key, ...args) => window.L.t(key, ...args);
window.tr = (key, vars) => window.L.tr(key, vars);

if (!window.poke) window.poke = {};
window.poke.Localization = Localization;
})();
