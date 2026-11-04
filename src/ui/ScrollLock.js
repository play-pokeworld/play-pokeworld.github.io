/**
 * @file ScrollLock.js
 * @brief Reference-counted scroll lock of the game page while a modal is open.
 *
 * A modal or a full-screen panel covers the page, but the page under it stayed scrollable. On a
 * phone that means a swipe that starts outside the panel (or a swipe that reaches the end of the
 * panel's own list) drags the game behind the overlay: the player comes back to a dashboard that
 * has jumped somewhere else. The lock freezes `.pw-page` scrolling for as long as at least one
 * modal is open, whichever layer opened it, and the count keeps nested layers honest.
 */

let depth = 0;

/** Class put on `body`; the rule lives in layout/page-shell.css. */
const LOCK_CLASS = 'pw-scroll-locked';

/**
 * Only a touch layout needs the lock: there, a full-screen panel is a fixed overlay on top of a page
 * that must not move under the finger. On a desktop the page itself is the scrolling surface of the
 * dense windows (a Pokémon sheet taller than the screen is reached by scrolling the page), so
 * freezing it would make its own content unreachable. Same breakpoint as the stylesheets.
 */
const TOUCH_LAYOUT = '(max-width: 850px), (pointer: coarse)';

/** @returns {boolean} */
function locksThisLayout() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(TOUCH_LAYOUT).matches
    : false;
}

/** @returns {boolean} */
export function isPageScrollLocked() {
  return depth > 0;
}

/** Freezes the page behind the open layer. */
export function lockPageScroll() {
  if (!locksThisLayout()) return;
  depth += 1;
  if (depth === 1) document.body.classList.add(LOCK_CLASS);
}

/** Releases one lock; the page scrolls again when the last layer closes. */
export function unlockPageScroll() {
  depth = Math.max(0, depth - 1);
  if (depth === 0) document.body.classList.remove(LOCK_CLASS);
}

/** Drops every lock, whatever the state was (page changes, save reloads). */
export function resetPageScrollLock() {
  depth = 0;
  document.body.classList.remove(LOCK_CLASS);
}
