/**
 * @file TextFormatter.js
 * @brief Rich-text tokenizer (C++ equivalent: class TextFormatter / RichTextParser).
 * Turns a localized template into a flat list of typed segments; it never builds markup.
 * Rendering is done by UIText.setRichText(), so no HTML string ever reaches the DOM.
 *
 * Supported template syntax:
 *  - `{param}`            → value of params.param, inserted as plain text (never parsed)
 *  - `{money}`, `{pokeball}`, ... → inline icon from the symbol registry
 *  - `{badge:Boulder}`, `{pokemon:pikachu}` → parameterized inline icons
 *  - `<b>`, `<strong>`, `<i>`, `<em>` (with closing tags) and `<br>` → emphasis / line break
 * Any other tag is kept as literal text.
 */

import { NumberFormatRules } from '../config/NumberFormatRules.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { LocalizationManager } from '../localization/LocalizationManager.js';

/**
 * @typedef {Object} TextSegment
 * @property {'text'} type
 * @property {string} text
 * @property {boolean} bold
 * @property {boolean} italic
 */
/**
 * @typedef {Object} IconSegment
 * @property {'icon'} type
 * @property {string} src
 * @property {string} variant - 'currency' | 'ball' | 'badge' | 'pokemon' (maps to .pw-inline-icon--<variant>)
 */
/** @typedef {{type: 'break'}} BreakSegment */
/** @typedef {TextSegment|IconSegment|BreakSegment} RichSegment */

const TOKEN_PATTERN = /(\{[a-zA-Z0-9_]+(?::[a-zA-Z0-9_-]+)?\}|<\/?(?:b|strong|i|em)>|<br\s*\/?>)/g;

export class TextFormatter {
  /**
   * Symbol registry: token name → { src, variant }.
   * @private
   */
  static _symbols = {
    money: { src: AssetPaths.currency('money'), variant: 'currency' },
    pdollar: { src: AssetPaths.currency('money'), variant: 'currency' },
    dungeonToken: { src: AssetPaths.currency('dungeonToken'), variant: 'currency' },
    questPoint: { src: AssetPaths.currency('questPoint'), variant: 'currency' },
    diamond: { src: AssetPaths.currency('diamond'), variant: 'currency' },
    farmPoint: { src: AssetPaths.currency('farmPoint'), variant: 'currency' },
    battlePoint: { src: AssetPaths.currency('battlePoint'), variant: 'currency' },
    contestToken: { src: AssetPaths.currency('contestToken'), variant: 'currency' },
    pokeball: { src: AssetPaths.pokeball('Pokeball'), variant: 'ball' },
    greatball: { src: AssetPaths.pokeball('Greatball'), variant: 'ball' },
    ultraball: { src: AssetPaths.pokeball('Ultraball'), variant: 'ball' },
    masterball: { src: AssetPaths.pokeball('Masterball'), variant: 'ball' },
    timerball: { src: AssetPaths.pokeball('Timerball'), variant: 'ball' },
    duskball: { src: AssetPaths.pokeball('Duskball'), variant: 'ball' }
  };

  /**
   * Registers or overrides an inline symbol.
   * @param {string} tag
   * @param {string} src
   * @param {string} [variant='currency']
   */
  static registerSymbol(tag, src, variant = 'currency') {
    this._symbols[tag] = { src, variant };
  }

  /**
   * Resolves a `{token}` body to an icon segment, or null when unknown.
   * @param {string} body - Token without braces (e.g. "money", "badge:Boulder")
   * @returns {IconSegment|null}
   */
  static resolveSymbol(body) {
    const separator = body.indexOf(':');
    if (separator > 0) {
      const kind = body.slice(0, separator);
      const value = body.slice(separator + 1);
      if (kind === 'badge') return { type: 'icon', src: AssetPaths.badge(value), variant: 'badge' };
      if (kind === 'pokemon') return { type: 'icon', src: AssetPaths.pokemonSprite(value), variant: 'pokemon' };
      return null;
    }
    const symbol = this._symbols[body];
    return symbol ? { type: 'icon', src: symbol.src, variant: symbol.variant } : null;
  }

  /**
   * Tokenizes a template into renderable segments.
   * Example: TextFormatter.parse("Earned <b>{amount}</b> {money}", { amount: 500 })
   * @param {string} template
   * @param {Record<string, any>} [params={}]
   * @returns {RichSegment[]}
   */
  static parse(template, params = {}) {
    if (template == null || template === '') return [];
    /** @type {RichSegment[]} */
    const segments = [];
    let boldDepth = 0;
    let italicDepth = 0;

    const pushText = (text) => {
      if (!text) return;
      const last = segments[segments.length - 1];
      const bold = boldDepth > 0;
      const italic = italicDepth > 0;
      if (last && last.type === 'text' && last.bold === bold && last.italic === italic) {
        last.text += text;
      } else {
        segments.push({ type: 'text', text, bold, italic });
      }
    };

    for (const part of String(template).split(TOKEN_PATTERN)) {
      if (!part) continue;
      if (part.startsWith('{')) {
        const body = part.slice(1, -1);
        if (Object.prototype.hasOwnProperty.call(params, body)) {
          pushText(String(params[body]));
          continue;
        }
        const icon = this.resolveSymbol(body);
        if (icon) segments.push(icon);
        else pushText(part);
        continue;
      }
      if (part.startsWith('<')) {
        const tag = part.replace(/[<>/\s]/g, '').toLowerCase();
        const closing = part.startsWith('</');
        if (tag === 'br') segments.push({ type: 'break' });
        else if (tag === 'b' || tag === 'strong') boldDepth = Math.max(0, boldDepth + (closing ? -1 : 1));
        else italicDepth = Math.max(0, italicDepth + (closing ? -1 : 1));
        continue;
      }
      pushText(part);
    }
    return segments;
  }

  /**
   * Plain-text projection of a template (markup removed, icons dropped).
   * @param {string} template
   * @param {Record<string, any>} [params={}]
   * @returns {string}
   */
  static toPlainText(template, params = {}) {
    return this.parse(template, params)
      .map((segment) => (segment.type === 'text' ? segment.text : segment.type === 'break' ? '\n' : ''))
      .join('');
  }

  /**
   * Formats a number with the thousands separator of the active language.
   * @param {number} value
   * @returns {string}
   */
  static formatNumber(value) {
    const lang = LocalizationManager.getInstance().currentLang;
    return Number(value ?? 0).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US');
  }

  /** @param {number} value @returns {string} Main-style truncated compact label, independent of exact stored prices. */
  static formatCompactNumber(value) {
    const number=Number(value)||0,magnitude=Math.abs(number);
    if(!Number.isFinite(number)||magnitude<NumberFormatRules.BASE)return TextFormatter.formatNumber(number);
    const exponent=Math.min(Math.floor(Math.log(magnitude)/Math.log(NumberFormatRules.BASE)),NumberFormatRules.SUFFIXES.length-1);
    const scaled=number/NumberFormatRules.BASE**exponent;
    const precision=Math.abs(scaled)<NumberFormatRules.DECIMAL_THRESHOLD?NumberFormatRules.SMALL_DECIMALS:0;
    const factor=10**precision;
    return `${Math.trunc(scaled*factor)/factor}${NumberFormatRules.SUFFIXES[exponent]}`;
  }

  /** @param {number} milliseconds @returns {string} Whole-minute and seconds countdown (M:SS). */
  static formatMinutesSeconds(milliseconds) {
    const seconds = Math.ceil(Math.max(0, Number(milliseconds) || 0) / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
}
