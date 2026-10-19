/**
 * @file AppShell.js
 * @brief The only module allowed to touch document-level nodes (<html>, <body>)
 * (C++ equivalent: class AppShell, static — the application window).
 * It mirrors application state onto the document: language, colour theme,
 * developer mode flag and mobile layout flag.
 */

import { EventBus } from '../core/EventBus.js';
import { LanguageChangedEvent } from '../core/events/LanguageChangedEvent.js';
import { ThemeChangedEvent } from '../core/events/ThemeChangedEvent.js';
import { DebugModeChangedEvent } from '../core/events/DebugModeChangedEvent.js';
import { DEFAULT_UI_THEME } from '../config/UiThemes.js';

/** Class put on <body> while the developer mode is unlocked. */
const DEBUG_CLASS = 'debug-active';
/** Class put on <body> while the mobile layout is active. */
const MOBILE_CLASS = 'mobile-mode';
/** Class put on <body> while a dashboard window is dragged (no text selection, grabbing cursor). */
const DRAGGING_CLASS = 'pw-window-drag-active';

export class AppShell {
  /**
   * Applies the initial state and keeps the document in sync with future changes.
   * @param {{lang: string, theme: string, debug: boolean}} initialState
   */
  static bind(initialState) {
    AppShell.setLanguage(initialState.lang);
    AppShell.setTheme(initialState.theme);
    AppShell.setDebugMode(initialState.debug);

    const bus = EventBus.getInstance();
    bus.subscribe(LanguageChangedEvent, (event) => AppShell.setLanguage(event.lang));
    bus.subscribe(ThemeChangedEvent, (event) => AppShell.setTheme(event.themeId));
    bus.subscribe(DebugModeChangedEvent, (event) => AppShell.setDebugMode(event.enabled));
  }

  /** @param {string} lang */
  static setLanguage(lang) {
    if (typeof document === 'undefined' || !document.documentElement) return;
    document.documentElement.setAttribute('lang', lang);
  }

  /** @param {string} themeId - 'dark' removes the attribute (default palette) */
  static setTheme(themeId) {
    if (typeof document === 'undefined' || !document.documentElement) return;
    if (!themeId || themeId === DEFAULT_UI_THEME) {
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
