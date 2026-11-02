/**
 * @file LocalizedText.js
 * @brief A translated string that remembers how it was built (key + params, or composed parts).
 *
 * Why: a view built once keeps its text nodes forever. Until now every `t()` returned a plain
 * string, so the value captured at build time stayed in the old language until the view was
 * destroyed and rebuilt. A LocalizedText keeps its *recipe* (the key and its parameters, never a
 * translated value), so the same string can be resolved again in the active language at any time
 * (`LocalizationManager.resolve`) — the UI layer only has to ask for it again, without any
 * per-interface code (see `src/ui/LocalizedTextBinder.js`).
 *
 * It is a String subclass, so every existing call site keeps working: `t('key')` is still usable
 * as a string (`length`, `split`, `replace`, template literals, attribute values…). Only an
 * identity comparison (`===`) against a *primitive* would fail; the code base never compares
 * translated text, it compares ids.
 *
 * Rules:
 *  - Every player-visible text comes from `t()` (single key) or `compose()` (several parts).
 *  - A translated value is never stored in data, never concatenated with `+` or a template
 *    literal: use `t('key', { param })` or `compose(...)` so the key survives.
 */

export class LocalizedText extends String {
  /**
   * @param {string} value - Text resolved for the language active at creation time
   * @param {Object} [source]
   * @param {string|null} [source.key=null]        - Translation key (null for composed / literal text)
   * @param {Record<string, any>|null} [source.params=null] - Interpolation parameters (may contain LocalizedText)
   * @param {Array<any>|null} [source.parts=null]  - Composed parts (LocalizedText / primitive)
   * @param {boolean} [source.missing=false]       - True when the key exists in no language
   */
  constructor(value, source = {}) {
    super(value);
    /** @type {string|null} Translation key, or null for a composed text. */
    this.key = source.key ?? null;
    /** @type {Record<string, any>|null} Parameters of the key (values may be LocalizedText). */
    this.params = source.params ?? null;
    /** @type {Array<any>|null} Ordered parts of a composed text. */
    this.parts = source.parts ?? null;
    /** @type {boolean} True when the key is defined in no language: the key itself is displayed. */
    this.missing = source.missing === true;
  }

  /**
   * Snapshot of the text resolved at creation time.
   * @returns {string}
   */
  toText() {
    return String(this);
  }
}

/**
 * @param {any} value
 * @returns {value is LocalizedText}
 */
export function isLocalizedText(value) {
  return value instanceof LocalizedText;
}

/**
 * True when a value carries displayable text.
 * A LocalizedText is a String object, so `typeof value === 'string'` is not enough to validate a
 * field that a system hands over to a view (dialog labels, footer labels, notification messages).
 * @param {any} value
 * @returns {boolean}
 */
export function hasText(value) {
  return value !== null && value !== undefined && String(value).length > 0;
}
