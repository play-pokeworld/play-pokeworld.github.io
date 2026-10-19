/**
 * @file PageIds.js
 * @brief Identifiers of every navigable page (C++ equivalent: enum class PageId).
 * Pages never import each other: they navigate with
 *   Engine.getInstance().getPageManager().openPage(PageIds.GAME)
 */

export const PageIds = Object.freeze({
  SAVE_MENU: 'saveMenu',
  GAME: 'game'
});
