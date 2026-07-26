export function createFrameScheduler(callback, options = {}) {
  if (typeof callback !== 'function') throw new TypeError('callback must be a function');
  const raf = options.requestAnimationFrameFn
    || globalThis.requestAnimationFrame
    || ((fn) => setTimeout(fn, 16));
  const caf = options.cancelAnimationFrameFn
    || globalThis.cancelAnimationFrame
    || clearTimeout;
  let scheduled = false;
  let handle = null;

  function run() {
    if (!scheduled) return;
    scheduled = false;
    handle = null;
    callback();
  }

  return {
    schedule() {
      if (scheduled) return;
      scheduled = true;
      handle = raf(run);
    },
    flush() {
      if (!scheduled) return;
      if (handle != null) caf(handle);
      run();
    },
    cancel() {
      if (handle != null) caf(handle);
      scheduled = false;
      handle = null;
    },
    pending() {
      return scheduled;
    },
  };
}
