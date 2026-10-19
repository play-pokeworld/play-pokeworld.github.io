/**
 * @file BasePage.js
 * @brief Base class of every full-screen page (C++ equivalent: class BasePage : public UIElement).
 * A page is a UIElement mounted by the PageManager. Pages never import other pages:
 * navigation goes through Engine.getInstance().getPageManager().openPage(PageIds.X).
 */

import { UIElement } from '../ui/UIElement.js';

export class BasePage extends UIElement {
  /**
   * @param {string} pageName - Object name, also used for the `pw-page--<name>` class
   * @param {Object} [params={}] - Parameters given to PageManager.openPage()
   */
  constructor(pageName, params = {}) {
    super({
      tagName: 'main',
      className: `pw-page pw-page--${pageName.toLowerCase()}`,
      name: pageName,
      tag: 'Page'
    });
    /** @protected @type {Object} */
    this._params = params;
  }

  /** @returns {Object} Parameters given to openPage() */
  getParams() {
    return this._params;
  }
}
