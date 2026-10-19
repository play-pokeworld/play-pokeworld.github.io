/**
 * @file BasePage.js
 * @brief Base class of every full-screen page (C++ equivalent: class BasePage : public UIElement).
 * A page is a UIElement mounted by the PageManager. Pages never import other pages:
 * navigation goes through Engine.getInstance().getPageManager().openPage(PageIds.X).
 */

import { UIElement } from '../ui/UIElement.js';
import { AppShell } from '../ui/AppShell.js';

export class BasePage extends UIElement {
  /**
   * @param {string} pageName - Object name, also used for the `pw-page--<name>` class
   * @param {Object} [params={}] - Parameters given to PageManager.openPage()
   * @param {Object} [options={}]
   * @param {string|null} [options.forcedTheme=null] - UiThemes id imposed while the page is shown
   *        (null = the player's theme)
   */
  constructor(pageName, params = {}, options = {}) {
    super({
      tagName: 'main',
      className: `pw-page pw-page--${pageName.toLowerCase()}`,
      name: pageName,
      tag: 'Page'
    });
    /** @protected @type {Object} */
    this._params = params;
    /** @private @type {string|null} */
    this._forcedTheme = options.forcedTheme || null;
  }

  /** @override */
  onEnter() {
    AppShell.forceTheme(this._forcedTheme);
    super.onEnter();
  }

  /** @override */
  onExit() {
    if (this._forcedTheme) AppShell.forceTheme(null);
    super.onExit();
  }

  /** @returns {Object} Parameters given to openPage() */
  getParams() {
    return this._params;
  }
}
