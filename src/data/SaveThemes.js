/**
 * @file SaveThemes.js
 * @brief Catalogue of save-card background themes (C++ equivalent: enum class SaveTheme + helpers).
 * Each id maps to a `.save-bg-<id>` CSS class and to the `save_bg_<id>` localization key (same keys as the original game).
 */

/** Ordered list of valid theme ids. */
export const SAVE_THEMES = Object.freeze([
  'classic',
  'goldsilver',
  'emerald',
  'diamondpearl',
  'blackwhite',
  'xy',
  'forest'
]);

/** Legacy colour names stored by older saves, mapped to a current theme. */
const THEME_ALIASES = Object.freeze({
  blue: 'classic',
  red: 'classic',
  green: 'emerald',
  purple: 'xy',
  gold: 'goldsilver',
  silver: 'goldsilver'
});

export class SaveThemes {
  /** Theme used when a stored value is missing or unknown. */
  static DEFAULT = SAVE_THEMES[0];

  /**
   * Normalizes any stored value to a valid theme id.
   * @param {string} rawTheme
   * @returns {string}
   */
  static normalize(rawTheme) {
    const key = String(rawTheme || SAVE_THEMES[0]).toLowerCase().replace(/[^a-z0-9_-]+/g, '');
    const mapped = THEME_ALIASES[key] || key;
    return SAVE_THEMES.includes(mapped) ? mapped : SAVE_THEMES[0];
  }

  /**
   * @param {string} themeId
   * @returns {string} Localization key of the theme display name
   */
  static labelKey(themeId) {
    return `save_bg_${SaveThemes.normalize(themeId)}`;
  }

  /** @returns {string} A random theme id (new saves get a random card style). */
  static random() {
    return SAVE_THEMES[Math.floor(Math.random() * SAVE_THEMES.length)];
  }
}
