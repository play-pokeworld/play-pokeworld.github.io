/**
 * @file AppShell.js
 * @brief The only module allowed to touch document-level nodes (<html>, <body>)
 * (C++ equivalent: class AppShell, static — the application window).
 * It mirrors application state onto the document: language, colour theme,
 * developer mode flag and mobile layout flag.
 *
 * Theme: the player's preferred theme (settings) can be overridden by the active page
 * (`forceTheme`, e.g. the save menu is always dark); the preference is kept and comes
 * back when the override is released.
 */

import { EventBus } from '../core/EventBus.js';
import { LanguageChangedEvent } from '../core/events/LanguageChangedEvent.js';
import { ThemeChangedEvent } from '../core/events/ThemeChangedEvent.js';
import { DebugModeChangedEvent } from '../core/events/DebugModeChangedEvent.js';
import { AnimationPreferencesChangedEvent } from '../core/events/AnimationPreferencesChangedEvent.js';
import { AnimationPreferences } from '../config/AnimationPreferences.js';
import { DEFAULT_UI_THEME } from '../config/UiThemes.js';

/** Class put on <body> while the developer mode is unlocked. */
const DEBUG_CLASS = 'debug-active';
/** Class put on <body> when optional capture motion is disabled. */
const CAPTURE_ANIMATIONS_OFF_CLASS = 'pw-capture-animations-off';
/** Class put on <body> when optional feedback animations are disabled. */
const UI_ANIMATIONS_OFF_CLASS = 'pw-ui-animations-off';
/** Class put on <body> while the mobile layout is active. */
const MOBILE_CLASS = 'mobile-mode';
/** Class put on <body> while a dashboard window is dragged (no text selection, grabbing cursor). */
const DRAGGING_CLASS = 'pw-window-drag-active';

export class AppShell {
  /** @private Theme chosen in the settings. */
  static _preferredTheme = DEFAULT_UI_THEME;
  /** @private Theme imposed by the active page, or null. */
  static _forcedTheme = null;

  /**
   * Applies the initial state and keeps the document in sync with future changes.
   * @param {{lang: string, theme: string, debug: boolean, animationPreferences?: Record<string, boolean>}} initialState
   */
  static bind(initialState) {
    AppShell.setLanguage(initialState.lang);
    AppShell.setTheme(initialState.theme);
    AppShell.setDebugMode(initialState.debug);
    AppShell.setAnimationPreferences(initialState.animationPreferences || {});

    const bus = EventBus.getInstance();
    bus.subscribe(LanguageChangedEvent, (event) => AppShell.setLanguage(event.lang));
    bus.subscribe(ThemeChangedEvent, (event) => AppShell.setTheme(event.themeId));
    bus.subscribe(DebugModeChangedEvent, (event) => AppShell.setDebugMode(event.enabled));
    bus.subscribe(AnimationPreferencesChangedEvent, (event) => AppShell.setAnimationPreferences(event.preferences));
  }

  /** @param {string} lang */
  static setLanguage(lang) {
    if (typeof document === 'undefined' || !document.documentElement) return;
    document.documentElement.setAttribute('lang', lang);
  }

  /**
   * Preferred theme of the player (applied unless a page forces another one).
   * @param {string} themeId
   */
  static setTheme(themeId) {
    AppShell._preferredTheme = themeId || DEFAULT_UI_THEME;
    AppShell._applyTheme();
  }

  /**
   * Imposes a theme while a page is displayed (null releases it).
   * @param {string|null} themeId
   */
  static forceTheme(themeId) {
    AppShell._forcedTheme = themeId || null;
    AppShell._applyTheme();
  }

  /** @returns {string} Theme currently displayed */
  static getDisplayedTheme() {
    return AppShell._forcedTheme || AppShell._preferredTheme;
  }

  /** @private 'dark' removes the attribute (default palette) */
  static _applyTheme() {
    if (typeof document === 'undefined' || !document.documentElement) return;
    const themeId = AppShell.getDisplayedTheme();
    if (themeId === DEFAULT_UI_THEME) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeId);
    }
  }

  /** @param {boolean} enabled */
  static setDebugMode(enabled) {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.classList.toggle(DEBUG_CLASS, !!enabled);
  }

  /** @param {Record<string, boolean>} preferences */
  static setAnimationPreferences(preferences = {}) {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.classList.toggle(
      CAPTURE_ANIMATIONS_OFF_CLASS,
      preferences[AnimationPreferences.CAPTURE] === false
    );
    document.body.classList.toggle(
      UI_ANIMATIONS_OFF_CLASS,
      preferences[AnimationPreferences.UI_FEEDBACK] === false
    );
  }

  /** @param {boolean} enabled */
  static setMobileMode(enabled) {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.classList.toggle(MOBILE_CLASS, !!enabled);
  }

  /** @returns {boolean} */
  static isMobileMode() {
    return typeof document !== 'undefined' && !!document.body && document.body.classList.contains(MOBILE_CLASS);
  }

  /**
   * Sets the landscape of the current location (read by the CSS from body[data-bg]).
   * @param {string} sceneId - LocationBackgrounds scene
   */
  static setSceneBackground(sceneId) {
    if (typeof document === 'undefined' || !document.body) return;
    if (document.body.dataset.bg !== sceneId) document.body.dataset.bg = sceneId;
  }

  /** @param {boolean} enabled */
  static setWindowDragActive(enabled) {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.classList.toggle(DRAGGING_CLASS, !!enabled);
  }

  /**
   * Mounts a floating overlay layer (toast stack, drag ghost...) at the end of <body>.
   * @param {import('./UIElement.js').UIElement} element
   */
  static mountOverlay(element) {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.appendChild(element.getDomElement());
  }

  /**
   * Subscribes to viewport resizes.
   * @param {Function} callback - (viewportWidth: number) => void
   * @returns {Function} Unsubscribe handle
   */
  static onViewportResize(callback) {
    if (typeof window === 'undefined') return () => {};
    const handler = () => callback(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }

  /** @returns {number} Viewport width in px */
  static viewportWidth() {
    return typeof window !== 'undefined' ? window.innerWidth : 0;
  }
}
