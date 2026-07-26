export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (typeof handler !== 'function') throw new TypeError('EventBus handler must be a function');
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    const bucket = this.listeners.get(event);
    bucket.add(handler);
    return () => this.off(event, handler);
  }

  once(event, handler) {
    const off = this.on(event, (...args) => {
      off();
      handler(...args);
    });
    return off;
  }

  off(event, handler) {
    const bucket = this.listeners.get(event);
    if (!bucket) return false;
    const deleted = bucket.delete(handler);
    if (bucket.size === 0) this.listeners.delete(event);
    return deleted;
  }

  emit(event, payload) {
    const bucket = this.listeners.get(event);
    if (!bucket) return 0;
    [...bucket].forEach((handler) => handler(payload));
    return bucket.size;
  }

  clear(event) {
    if (event === undefined) this.listeners.clear();
    else this.listeners.delete(event);
  }
}

export const eventBus = new EventBus();
