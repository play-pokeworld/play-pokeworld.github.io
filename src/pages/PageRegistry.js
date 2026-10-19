/**
 * @file PageRegistry.js
 * @brief Composition root of the page layer (C++ equivalent: void registerAllPages(PageManager&)).
 * This is the ONLY module allowed to import concrete page classes. Pages themselves only know
 * PageIds, which breaks every page-to-page import cycle.
 */

import { PageIds } from './PageIds.js';
import { SaveMenuPage } from './SaveMenuPage.js';
import { GamePage } from './GamePage.js';

/**
 * Registers a factory for every page id.
 * @param {import('../core/PageManager.js').PageManager} pageManager
 */
export function registerAllPages(pageManager) {
  pageManager.registerPage(PageIds.SAVE_MENU, (params) => new SaveMenuPage(params));
  pageManager.registerPage(PageIds.GAME, (params) => new GamePage(params));
}
