/**
 * PokeEngine — EventBus
 * Typed event system with wildcard, once, and async support
 */
// Wave 41 — native ESM module (IIFE removed, wave-38 template): native export;
// the engine surface (globalThis.PokeEventBus + poke.* namespace) is
// kept for classic consumers and the T2-C bridge.
class EventBus {
    constructor() {
      this._listeners = new Map();
      this._wildcard = null;
    }
    on(event, fn, ctx) {
      if (event === '*') { this._wildcard = { fn, ctx }; return this; }
      if (!this._listeners.has(event)) this._listeners.set(event, []);
      this._listeners.get(event).push({ fn, ctx, once: false });
      return this;
    }
    once(event, fn, ctx) {
      if (!this._listeners.has(event)) this._listeners.set(event, []);
      this._listeners.get(event).push({ fn, ctx, once: true });
      return this;
    }
    off(event, fn) {
      const list = this._listeners.get(event);
      if (!list) return this;
      this._listeners.set(event, list.filter(l => l.fn !== fn));
      return this;
    }
    emit(event, ...args) {
      try { if (typeof PokeTrace !== 'undefined' && PokeTrace) PokeTrace.count('event', String(event)); } catch (_) {}
      if (this._wildcard) this._wildcard.fn.call(this._wildcard.ctx, event, ...args);
      const list = this._listeners.get(event);
      if (!list) return this;
      const dead = [];
      for (const l of list) {
        l.fn.call(l.ctx || null, ...args);
        if (l.once) dead.push(l);
      }
      if (dead.length) this._listeners.set(event, list.filter(l => !dead.includes(l)));
      return this;
    }
    async emitAsync(event, ...args) {
      if (this._wildcard) await this._wildcard.fn.call(this._wildcard.ctx, event, ...args);
      const list = this._listeners.get(event);
      if (!list) return this;
      for (const l of list) await l.fn.call(l.ctx || null, ...args);
      return this;
    }
    clear(event) {
      if (event) this._listeners.delete(event);
      else this._listeners.clear();
      return this;
    }
  }
if (typeof globalThis !== 'undefined') globalThis.PokeEventBus = EventBus;
if (typeof window !== 'undefined') { if (!window.poke) window.poke = {}; window.poke.EventBus = EventBus; }

export { EventBus };
export default EventBus;
