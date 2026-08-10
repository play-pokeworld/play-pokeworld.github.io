/**
 * PokeEngine — Input Manager
 * Unified input: mouse, touch, keyboard, gamepad
 * Features: click, double-click, long-press, drag, key bindings
 */
'use strict';

class InputManager {
  constructor(root) {
    this.root = root || document;
    this._handlers = new Map();      // eventType -> [{ selector, fn, options }]
    this._keyBindings = new Map();   // key -> [fn]
    this._longPressTimers = new Map();
    this._dragState = null;
    this._pressedKeys = new Set();
    
    this._bindEvents();
  }

  // ─── Mouse / Touch click (unified) ───
  onClick(selector, fn, options) {
    this._addHandler('click', selector, fn, options);
  }
  onDblClick(selector, fn) {
    this._addHandler('dblclick', selector, fn);
  }
  onRightClick(selector, fn) {
    this._addHandler('contextmenu', selector, fn);
  }
  onHover(selector, fnEnter, fnLeave) {
    this._addHandler('mouseenter', selector, fnEnter);
    this._addHandler('mouseleave', selector, fnLeave);
  }
  onChange(selector, fn) {
    this._addHandler('change', selector, fn);
  }

  // ─── Long press (unified mouse+touch) ───
  onLongPress(selector, fn, duration) {
    duration = duration || 500;
    this._addHandler('pointerdown', selector, (e, el) => {
      const timer = setTimeout(() => { fn(e, el); }, duration);
      this._longPressTimers.set(el, timer);
    });
    this._addHandler('pointerup', selector, () => {
      const timer = this._longPressTimers.get(el);
      if (timer) clearTimeout(timer);
    });
    this._addHandler('pointerleave', selector, () => {
      const timer = this._longPressTimers.get(el);
      if (timer) clearTimeout(timer);
    });
  }

  // ─── Drag & Drop ───
  onDrag(selector, onStart, onMove, onEnd) {
    this._addHandler('pointerdown', selector, (e, el) => {
      this._dragState = { el: el, startX: e.clientX, startY: e.clientY, onStart, onMove, onEnd, moved: false };
      el.setPointerCapture(e.pointerId);
      if (onStart) onStart(e, el);
    });
  }

  // ─── Keyboard ───
  onKey(key, fn) {
    const k = key.toLowerCase();
    if (!this._keyBindings.has(k)) this._keyBindings.set(k, []);
    this._keyBindings.get(k).push(fn);
  }
  onKeyCombo(combo, fn) {
    // combo: 'Ctrl+S', 'Shift+HAS', etc.
    const parts = combo.toLowerCase().split('+');
    const mods = { ctrl: false, shift: false, alt: false };
    let key = '';
    for (const p of parts) {
      if (p === 'ctrl') mods.ctrl = true;
      else if (p === 'shift') mods.shift = true;
      else if (p === 'alt') mods.alt = true;
      else key = p;
    }
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === key &&
          e.ctrlKey === mods.ctrl &&
          e.shiftKey === mods.shift &&
          e.altKey === mods.alt) {
        fn(e);
      }
    });
  }

  // ─── Scroll ───
  onScroll(selector, fn) {
    this._addHandler('wheel', selector, (e, el) => {
      fn(e, el, e.deltaY < 0 ? 'up' : 'down');
    });
  }

  // ─── Internal ───
  _addHandler(eventType, selector, fn, options) {
    if (!this._handlers.has(eventType)) this._handlers.set(eventType, []);
    this._handlers.get(eventType).push({ selector, fn, options });
  }

  _bindEvents() {
    const eventTypes = ['click', 'dblclick', 'contextmenu', 'change', 'mouseenter', 'mouseleave', 'pointerdown', 'pointerup', 'pointermove', 'pointerleave', 'wheel'];
    for (const type of eventTypes) {
      this.root.addEventListener(type, (e) => this._dispatch(e), { passive: type !== 'wheel' });
    }

    // Keyboard
    document.addEventListener('keydown', (e) => {
      this._pressedKeys.add(e.key.toLowerCase());
      if (this._keyBindings.has(e.key.toLowerCase())) {
        for (const fn of this._keyBindings.get(e.key.toLowerCase())) fn(e);
      }
    });
    document.addEventListener('keyup', (e) => {
      this._pressedKeys.delete(e.key.toLowerCase());
    });

    // Drag handling
    document.addEventListener('pointermove', (e) => {
      if (!this._dragState) return;
      this._dragState.moved = true;
      if (this._dragState.onMove) this._dragState.onMove(e, this._dragState.el);
    });
    document.addEventListener('pointerup', (e) => {
      if (!this._dragState) return;
      if (this._dragState.onEnd) this._dragState.onEnd(e, this._dragState.el);
      this._dragState = null;
    });
  }

  _dispatch(e) {
    const handlers = this._handlers.get(e.type);
    if (!handlers) return;
    for (const h of handlers) {
      const target = e.target?.closest?.(h.selector);
      if (target) h.fn(e, target);
    }
  }

  // ─── Utility ───
  isKeyDown(key) { return this._pressedKeys.has(key.toLowerCase()); }
  getDragState() { return this._dragState; }
}

// T2 (wave 38): ESM module — native class export; the engine surface
// (PokeInput + poke.* namespace) stays kept on the global object for
// classic consumers not yet migrated.
export { InputManager };
export default InputManager;
if (typeof globalThis !== 'undefined') {
  globalThis.PokeInput = InputManager;
  if (!globalThis.poke) globalThis.poke = {};
  globalThis.poke.Input = InputManager;
}

