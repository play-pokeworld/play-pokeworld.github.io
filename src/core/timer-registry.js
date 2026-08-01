export function createTimerRegistry(options = {}) {
  const setIntervalFn = options.setIntervalFn || globalThis.setInterval;
  const clearIntervalFn = options.clearIntervalFn || globalThis.clearInterval;
  const timers = new Map();

  return {
    set(name, callback, interval) {
      if (timers.has(name)) clearIntervalFn(timers.get(name));
      const id = setIntervalFn(callback, interval);
      timers.set(name, id);
      return id;
    },
    stop(name) {
      if (!timers.has(name)) return false;
      clearIntervalFn(timers.get(name));
      timers.delete(name);
      return true;
    },
    stopAll() {
      for (const id of timers.values()) clearIntervalFn(id);
      timers.clear();
    },
    size() {
      return timers.size;
    },
    has(name) {
      return timers.has(name);
    },
  };
}

