/**
 * @file UiThemes.js
 * @brief Colour themes offered in the settings (C++ equivalent: enum class UiTheme).
 * Each id maps to a `[data-theme="<id>"]` block in design-system.css ('dark' is the default,
 * attribute-less palette) and to the `theme_<id>` localization key.
 */

export const UI_THEMES = Object.freeze([
  'dark', 'light', 'gameboy', 'fire', 'ocean', 'forest', 'sakura', 'midnight', 'desert', 'contrast'
]);

export const DEFAULT_UI_THEME = 'dark';

export class UiThemes {
  /**
   * @param {string} themeId
   * @returns {string} A valid theme id
   */
  static normalize(themeId) {
    return UI_THEMES.includes(themeId) ? themeId : DEFAULT_UI_THEME;
  }

  /**
   * @param {string} themeId
   * @returns {string} Localization key of the theme name
   */
  static labelKey(themeId) {
    return `theme_${UiThemes.normalize(themeId)}`;
  }
}
