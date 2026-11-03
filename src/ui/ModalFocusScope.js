/**
 * @file ModalFocusScope.js
 * @brief Keyboard contract shared by every modal window (Escape, focus trap, focus restore, inert background).
 *
 * Audit v1.16.9 §2.1 measured that no modal answered to Escape, that Tab kept
 * walking the dashboard behind the window, that the focus was never given to
 * the dialog nor restored to the control that opened it, and that the
 * background was never hidden from assistive technologies. Fixing that in the
 * 29 `UIModal` subclasses one by one would have produced 29 copies, so the
 * whole contract lives here and both modal families delegate to it:
 *
 *   - `UIModal` (and `StaticModalPanel`, `ConfirmDialog`, `PromptDialog`…)
 *   - `UIFullscreenPanel` (bag, box, market, Pokédex, badges…)
 *
 * Rules implemented:
 *   1. `Escape` closes the TOP-MOST window (`onEscape`), and only that one.
 *      A widget nested inside a window that consumes Escape itself (context
 *      menu, sortable drag, drag-move) calls `event.preventDefault()`: the
 *      deferred close then aborts, so one Escape never closes two layers.
 *   2. `Tab` / `Shift+Tab` loop inside the top-most container.
 *   3. On open, the first focusable control of the window receives the focus
 *      (the window itself, with `tabindex="-1"`, when it has none).
 *   4. On close, the focus goes back to the element that had it before.
 *   5. While a window is open, every sibling of its ancestor chain is marked
 *      `inert` + `aria-hidden="true"`, and restored exactly as it was on close.
 */

/** Elements that can receive the keyboard focus, in tab order. */
const FOCUSABLE_SELECTOR = '[tabindex], button, a, input, select, textarea';

/** @param {Object} element @returns {boolean} */
function isFocusable(element) {
  if (!element || typeof element.focus !== 'function') return false;
  if (element.hasAttribute?.('disabled')) return false;
  const tabindex = element.getAttribute?.('tabindex');
  if (tabindex !== null && tabindex !== undefined) {
    const value = Number(tabindex);
    if (Number.isFinite(value) && value < 0) return false;
  }
  for (let node = element; node; node = node.parentNode) {
    if (node.hidden) return false;
    if (node.classList?.contains?.('is-hidden')) return false;
    if (node.getAttribute?.('aria-hidden') === 'true' && node !== element) return false;
  }
  return true;
}

export class ModalFocusScope {
  /** @private @type {Array<Object>} Open windows, oldest first */
  static _entries = [];
  /** @private @type {Map<Object, string|null>} Inert elements and their previous aria-hidden value */
  static _inerted = new Map();
  /** @private @type {Function|null} */
  static _keyHandler = null;

  /**
   * Registers an open window.
   * @param {Object} entry
   * @param {Object} entry.host - Outermost DOM node of the window (stays interactive)
   * @param {Object} entry.container - DOM node that traps the focus
   * @param {Function} entry.onEscape - Closes the window; called for the top-most entry only
   * @returns {Object} The stored entry (pass it to release())
   */
  static activate(entry) {
    if (typeof document === 'undefined' || !entry?.host) return entry;
    const stored = {
      host: entry.host,
      container: entry.container || entry.host,
      onEscape: entry.onEscape,
      previousFocus: document.activeElement || null
    };
    ModalFocusScope._entries.push(stored);
    ModalFocusScope._install();
    ModalFocusScope._syncBackground();
    ModalFocusScope._focusInitial(stored);
    return stored;
  }

  /**
   * Unregisters a window and restores the focus it stole.
   * @param {Object} entry
   */
  static release(entry) {
    const index = ModalFocusScope._entries.indexOf(entry);
    if (index === -1) return;
    ModalFocusScope._entries.splice(index, 1);
    if (!ModalFocusScope._entries.length) ModalFocusScope._uninstall();
    ModalFocusScope._syncBackground();
    const previous = entry.previousFocus;
    if (previous && typeof previous.focus === 'function' && previous.parentNode) {
      previous.focus();
    } else {
      const top = ModalFocusScope._top();
      if (top) ModalFocusScope._focusInitial(top);
    }
  }

  /** @returns {Object|null} The window that owns the keyboard right now */
  static _top() {
    return ModalFocusScope._entries[ModalFocusScope._entries.length - 1] || null;
  }

  /** @returns {boolean} True while at least one window is open */
  static isActive() {
    return ModalFocusScope._entries.length > 0;
  }

  /** @private */
  static _install() {
    if (ModalFocusScope._keyHandler || typeof document === 'undefined') return;
    ModalFocusScope._keyHandler = (event) => ModalFocusScope._handleKeyDown(event);
    document.addEventListener('keydown', ModalFocusScope._keyHandler, true);
  }

  /** @private */
  static _uninstall() {
    if (!ModalFocusScope._keyHandler || typeof document === 'undefined') return;
    document.removeEventListener('keydown', ModalFocusScope._keyHandler, true);
    ModalFocusScope._keyHandler = null;
  }

  /**
   * Escape + focus trap for the top-most window.
   * @private
   * @param {Object} event
   */
  static _handleKeyDown(event) {
    const top = ModalFocusScope._top();
    if (!top || !event) return;
    const key = event.key || event.keyCode;
    if (key === 'Escape' || key === 'Esc' || key === 27) {
      // A nested widget that consumed Escape itself has already called
      // preventDefault(); the deferred close then does nothing.
      if (event.defaultPrevented) return;
      // Deferred so that an inner widget listening on the same event can still
      // consume it (detail listeners run after this capture-phase handler).
      const target = event;
      setTimeout(() => {
        if (target.defaultPrevented) return;
        const current = ModalFocusScope._top();
        if (current !== top) return;
        if (typeof top.onEscape === 'function') top.onEscape();
      }, 0);
      return;
    }
    if (key === 'Tab' || key === 9) ModalFocusScope._trapTab(event, top);
  }

  /**
   * Keeps Tab inside `entry.container`.
   * @private
   * @param {Object} event
   * @param {Object} entry
   */
  static _trapTab(event, entry) {
    const focusables = ModalFocusScope._focusables(entry.container);
    if (!focusables.length) {
      event.preventDefault?.();
      return;
    }
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const index = focusables.indexOf(active);
    const backwards = !!event.shiftKey;
    event.preventDefault?.();
    if (index === -1) {
      focusables[backwards ? focusables.length - 1 : 0].focus();
      return;
    }
    const next = (index + (backwards ? -1 : 1) + focusables.length) % focusables.length;
    focusables[next].focus();
  }

  /**
   * Focusable descendants of a container, in DOM order.
   * The selector stays simple on purpose: the same code runs against the browser
   * DOM and against `tests/FakeDom.js` (which only supports tag/class/attribute).
   * @private
   * @param {Object} container
   * @returns {Array<Object>}
   */
  static _focusables(container) {
    if (!container || typeof container.querySelectorAll !== 'function') return [];
    // Array.from: a real NodeList has no filter() (tests/FakeDom.js returns an array).
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isFocusable);
  }

  /**
   * Gives the focus to the first control of a newly opened window.
   * @private
   * @param {Object} entry
   */
  static _focusInitial(entry) {
    const apply = () => {
      if (ModalFocusScope._top() !== entry) return;
      const [first] = ModalFocusScope._focusables(entry.container);
      if (first) {
        first.focus();
        return;
      }
      // No control: the window itself takes the focus so Escape/Tab still work
      // and screen readers announce the dialog instead of the dashboard.
      if (entry.container.getAttribute?.('tabindex') === null) entry.container.setAttribute?.('tabindex', '-1');
      entry.container.focus?.();
    };
    if (typeof setTimeout === 'function') setTimeout(apply, 0);
    else apply();
  }

  /**
   * Marks every node outside the open windows as inert, and restores the exact
   * previous state once the last window is closed.
   * @private
   */
  static _syncBackground() {
    if (typeof document === 'undefined' || !document.body) return;
    if (!ModalFocusScope._entries.length) {
      for (const [node, previous] of ModalFocusScope._inerted) {
        node.removeAttribute?.('inert');
        if (previous === null) node.removeAttribute?.('aria-hidden');
        else node.setAttribute?.('aria-hidden', previous);
      }
      ModalFocusScope._inerted.clear();
      return;
    }
    const keep = new Set();
    for (const entry of ModalFocusScope._entries) {
      for (let node = entry.host; node && node !== document.body; node = node.parentNode) keep.add(node);
    }
    const touched = new Set();
    for (const host of keep) {
      const parent = host.parentNode;
      if (!parent?.children) continue;
      for (const sibling of parent.children) {
        if (keep.has(sibling)) continue;
        if (String(sibling.tagName || '').toLowerCase() === 'script') continue;
        if (String(sibling.tagName || '').toLowerCase() === 'style') continue;
        touched.add(sibling);
      }
    }
    for (const [node, previous] of ModalFocusScope._inerted) {
      if (touched.has(node)) continue;
      node.removeAttribute?.('inert');
      if (previous === null) node.removeAttribute?.('aria-hidden');
      else node.setAttribute?.('aria-hidden', previous);
      ModalFocusScope._inerted.delete(node);
    }
    for (const node of touched) {
      if (ModalFocusScope._inerted.has(node)) continue;
      ModalFocusScope._inerted.set(node, node.getAttribute?.('aria-hidden') ?? null);
      node.setAttribute?.('inert', '');
      node.setAttribute?.('aria-hidden', 'true');
    }
  }

  /** Test hook: drops every state without touching the DOM. */
  static reset() {
    ModalFocusScope._entries = [];
    ModalFocusScope._inerted = new Map();
    ModalFocusScope._uninstall();
  }
}
