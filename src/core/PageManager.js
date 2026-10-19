/**
 * @file PageManager.js
 * @brief Owns the active page and drives its lifecycle (C++ equivalent: class PageManager : public BaseObject).
 * Navigation is id-based: `openPage(PageIds.GAME)`. Factories are registered once at boot by
 * src/pages/PageRegistry.js, so no page ever imports another page.
 */

import { BaseObject } from './BaseObject.js';
import { EventBus } from './EventBus.js';
import { PageChangeEvent } from './events/PageChangeEvent.js';
import { BasePage } from '../pages/BasePage.js';
import { t } from '../localization/LocalizationManager.js';

export class PageManager extends BaseObject {
  /**
   * @param {HTMLElement} rootContainer
   */
  constructor(rootContainer) {
    super('PageManager', 'Core');
    /** @private @type {HTMLElement} */
    this._container = rootContainer;
    /** @private @type {BasePage|null} */
    this._currentPage = null;
    /** @private @type {string} */
    this._currentPageId = '';
    /** @private @type {Map<string, function(Object): BasePage>} */
    this._factories = new Map();
  }

  /**
   * Registers the factory building a page.
   * @param {string} pageId - A PageIds value
   * @param {function(Object): BasePage} factory - Receives the navigation params
   */
  registerPage(pageId, factory) {
    if (typeof factory !== 'function') {
      throw new TypeError(t('debug_page_factory_invalid', { id: pageId }));
    }
    this._factories.set(pageId, factory);
  }

  /**
   * @param {string} pageId
   * @returns {boolean}
   */
  hasPage(pageId) {
    return this._factories.has(pageId);
  }

  /** @returns {BasePage|null} */
  getCurrentPage() {
    return this._currentPage;
  }

  /** @returns {string} Id of the active page ('' before the first navigation) */
  getCurrentPageId() {
    return this._currentPageId;
  }

  /**
   * Builds the page registered under `pageId` and makes it the active page.
   * @param {string} pageId - A PageIds value
   * @param {Object} [params={}] - Navigation parameters forwarded to the page factory
   * @returns {BasePage}
   */
  openPage(pageId, params = {}) {
    const factory = this._factories.get(pageId);
    if (!factory) {
      throw new Error(t('debug_page_unknown', { id: pageId }));
    }
    const page = factory(params);
    this._switchPage(pageId, page, params);
    return page;
  }

  /**
   * Strict lifecycle: onExit() -> destroy() -> mount -> onEnter() -> PageChangeEvent.
   * @private
   * @param {string} pageId
   * @param {BasePage} newPage
   * @param {Object} params
   */
  _switchPage(pageId, newPage, params) {
    if (!(newPage instanceof BasePage)) {
      throw new TypeError(t('debug_page_invalid'));
    }
    const previousPageId = this._currentPageId;

    if (this._currentPage) {
      this._currentPage.onExit();
      this._currentPage.destroy();
      this._currentPage = null;
    }

    this._container.textContent = '';
    this._currentPage = newPage;
    this._currentPageId = pageId;
    this._container.appendChild(newPage.getDomElement());
    newPage.onEnter();

    EventBus.getInstance().dispatch(new PageChangeEvent(previousPageId, pageId, params));
  }

  /**
   * Frame tick update
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (this._currentPage && this._currentPage.isVisible()) {
      this._currentPage.onUpdate(dt);
    }
  }
}
