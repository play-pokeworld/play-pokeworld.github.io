export const SEMANTIC_EVENTS = {
  SELECT: 'input:select',
  DRAG_START: 'input:drag-start',
  DRAG_MOVE: 'input:drag-move',
  DRAG_END: 'input:drag-end',
  CANCEL: 'input:cancel',
  CONFIRM: 'input:confirm',
  PANEL_OPEN: 'ui:panel-open',
  PANEL_CLOSE: 'ui:panel-close',
  LONG_PRESS: 'input:long-press',
};

export class EventBus {
  constructor() {
    this.listeners = new Map();
    this.wildcards = new Set();
  }

  on(event, handler, ctx = null) {
    if (typeof handler !== 'function') throw new TypeError('EventBus handler must be a function');
    if (event === '*') {
      const entry = { handler, ctx };
      this.wildcards.add(entry);
      return () => this.wildcards.delete(entry);
    }
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const bucket = this.listeners.get(event);
    const entry = { handler, ctx };
    bucket.add(entry);
    return () => this.off(event, handler);
  }

  once(event, handler, ctx = null) {
    const off = this.on(event, (...args) => {
      off();
      handler.call(ctx, ...args);
    }, ctx);
    return off;
  }

  off(event, handler) {
    if (event === '*') {
      for (const entry of this.wildcards) {
        if (entry.handler === handler) {
          this.wildcards.delete(entry);
          return true;
        }
      }
      return false;
    }
    const bucket = this.listeners.get(event);
    if (!bucket) return false;
    let deleted = false;
    for (const entry of bucket) {
      if (entry.handler === handler) {
        bucket.delete(entry);
        deleted = true;
        break;
      }
    }
    if (bucket.size === 0) this.listeners.delete(event);
    return deleted;
  }

  emit(event, ...args) {
    let count = 0;
    for (const w of [...this.wildcards]) {
      w.handler.call(w.ctx, event, ...args);
      count++;
    }
    const bucket = this.listeners.get(event);
    if (!bucket) return count;
    [...bucket].forEach((entry) => {
      entry.handler.call(entry.ctx, ...args);
      count++;
    });
    return bucket.size;
  }

  async emitAsync(event, ...args) {
    for (const w of [...this.wildcards]) {
      await w.handler.call(w.ctx, event, ...args);
    }
    const bucket = this.listeners.get(event);
    if (!bucket) return 0;
    for (const entry of [...bucket]) {
      await entry.handler.call(entry.ctx, ...args);
    }
    return bucket.size;
  }

  clear(event) {
    if (event === undefined) {
      this.listeners.clear();
      this.wildcards.clear();
    } else {
      this.listeners.delete(event);
    }
  }
}

export const eventBus = new EventBus();

// ─── Central touch/input primitives (wave 32, section 5) ────────────────
// DOM-touching touch logic lives EXACTLY HERE. Game/UI code must never
// sniff 'ontouchstart' or wire raw touchstart listeners: it calls these
// helpers instead (exposed to classic scripts via the legacy bridge).

/** True when the primary pointer is a touch screen. */
export function isTouchDevice() {
  if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return true;
  return (typeof window !== 'undefined') && ('ontouchstart' in window);
}

/**
 * Attach a cancellable long-press gesture to an element. The gesture fires
 * `SEMANTIC_EVENTS.LONG_PRESS` through the bus AND invokes `handler` after
 * `delayMs` of uninterrupted contact; releasing or sliding off cancels.
 *
 * @param {Element} el
 * @param {Function} handler
 * @param {number} [delayMs=500]
 * @param {object} [payload] Extra payload merged into the bus event.
 */
export function attachLongPress(el, handler, delayMs = 500, payload = {}) {
  if (!el || typeof handler !== 'function') return;
  let timer = null;
  el.addEventListener('touchstart', (e) => {
    timer = setTimeout(() => {
      e.preventDefault();
      const longPress = { element: el, originalEvent: e, ...payload };
      handler(longPress);
      eventBus.emit(SEMANTIC_EVENTS.LONG_PRESS, longPress);
    }, delayMs);
  });
  el.addEventListener('touchend', () => { if (timer !== null) clearTimeout(timer); });
  el.addEventListener('touchmove', () => { if (timer !== null) clearTimeout(timer); });
}

/** Classic-script façade (window.PokeWorldEventBus mirrors this). */
export const inputHelpers = { isTouchDevice, attachLongPress };



