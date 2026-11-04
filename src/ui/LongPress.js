/**
 * @file LongPress.js
 * @brief One shared "press and hold" gesture for every surface that also answers a right click.
 *
 * The game exposes secondary actions on a right click (open a Pokémon sheet, an item sheet, the
 * save-card menu…). A finger has no right button, so the same action is bound to a long press.
 * Before this file every component copied its own 25-line `touchstart` / `touchmove` timer block,
 * with three defects repeated everywhere:
 *   - the tolerance was zero, so one pixel of finger drift cancelled the press;
 *   - the click that the browser fires after the release was not swallowed, so the row's primary
 *     action ran on top of the secondary one (using an item right after opening its sheet);
 *   - the native long-press callout / text selection was left enabled, which stole the gesture.
 * Pointer events are used instead of `touch*`: one code path for finger, pen and mouse, and the
 * browser's own scroll verdict (`pointercancel`) is honoured, so a vertical swipe on a scrollable
 * list is never mistaken for a long press.
 */

/** Milliseconds a finger must rest before the secondary action runs. */
export const LONG_PRESS_DELAY = 500;
/** Pixels of drift still treated as "the finger has not moved" (finger jitter on a real phone). */
export const LONG_PRESS_TOLERANCE = 12;
/** Milliseconds during which the click following the release is swallowed. */
export const LONG_PRESS_CLICK_GUARD = 900;

/**
 * Binds the gesture to an element.
 * @param {HTMLElement} element
 * @param {(event: PointerEvent) => void} handler - Runs once per successful long press.
 * @param {{delay?: number, tolerance?: number}} [options={}]
 * @returns {() => void} Detaches every listener.
 */
export function attachLongPress(element, handler, options = {}) {
  const delay = Number.isFinite(options.delay) ? options.delay : LONG_PRESS_DELAY;
  const tolerance = Number.isFinite(options.tolerance) ? options.tolerance : LONG_PRESS_TOLERANCE;

  /** @type {ReturnType<typeof setTimeout>|null} */
  let timer = null;
  let startX = 0;
  let startY = 0;
  /** @type {number|null} */
  let pointerId = null;
  /** Timestamp until which the element's click is swallowed (0 = nothing to swallow). */
  let guardUntil = 0;

  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const onPointerDown = (event) => {
    // Mouse and pen keep the native right click: the gesture is a finger-only fallback.
    if (event.pointerType === 'mouse') return;
    if (event.button !== undefined && event.button !== 0) return;
    // A new touch starts a new gesture: whatever click the previous one owed is no longer ours.
    guardUntil = 0;
    clear();
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    timer = setTimeout(() => {
      timer = null;
      guardUntil = Date.now() + LONG_PRESS_CLICK_GUARD;
      handler(event);
    }, delay);
  };

  const onPointerMove = (event) => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    if (Math.abs(event.clientX - startX) > tolerance || Math.abs(event.clientY - startY) > tolerance) {
      clear();
      pointerId = null;
    }
  };

  const onPointerEnd = (event) => {
    if (pointerId !== null && event.pointerId !== pointerId) return;
    pointerId = null;
    clear();
  };

  /** Swallows the click of the gesture that already ran the secondary action. */
  const onClickCapture = (event) => {
    if (!guardUntil || Date.now() > guardUntil) return;
    guardUntil = 0;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  /** While the secondary action just ran, the native callout must not open on top of it. */
  const onContextMenu = (event) => {
    if (!guardUntil || Date.now() > guardUntil) return;
    event.preventDefault();
    event.stopPropagation();
  };

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerEnd);
  element.addEventListener('pointercancel', onPointerEnd);
  element.addEventListener('pointerleave', onPointerEnd);
  element.addEventListener('click', onClickCapture, true);
  element.addEventListener('contextmenu', onContextMenu, true);
  element.classList.add('pw-long-press');

  return () => {
    clear();
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerup', onPointerEnd);
    element.removeEventListener('pointercancel', onPointerEnd);
    element.removeEventListener('pointerleave', onPointerEnd);
    element.removeEventListener('click', onClickCapture, true);
    element.removeEventListener('contextmenu', onContextMenu, true);
    element.classList.remove('pw-long-press');
  };
}
