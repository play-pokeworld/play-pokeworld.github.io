/**
 * PokeEngine — Timer Manager
 * setTimeout/setInterval with pause, resume, speed scaling
 */
(function() {
'use strict';

class TimerManager {
  constructor() {
    this._timers = new Map();
    this._paused = false;
    this._globalSpeed = 1;
  }

  /**
   * Create a repeating timer
   * @param {string} name - unique identifier
   * @param {function} callback - fn(deltaMs, elapsedMs)
   * @param {number} intervalMs - interval in milliseconds
   * @param {object} options - { autostart: true, maxCalls: 0 (infinite) }
   * @returns {number} timerId
   */
  setInterval(name, callback, intervalMs, options = {}) {
    this.clear(name);
    const timer = {
      name, callback, interval: intervalMs, elapsed: 0,
      calls: 0, maxCalls: options.maxCalls || 0,
      lastUpdate: performance.now(),
      running: options.autostart !== false,
      id: performance.now() + Math.random()
    };
    this._timers.set(name, timer);
    return timer.id;
  }

  setTimeout(name, callback, delayMs) {
    return this.setInterval(name, (dt, elapsed) => {
      if (elapsed >= delayMs) { callback(); this.clear(name); }
    }, 16, { maxCalls: Math.ceil(delayMs / 16) + 1 });
  }

  /**
   * Update all timers — call from main loop
   * @param {number} dt - delta time in ms (already speed-adjusted)
   */
  update(dt) {
    if (this._paused) return;
    const adjustedDt = dt * this._globalSpeed;
    const now = performance.now();
    
    for (const [name, timer] of this._timers) {
      if (!timer.running) continue;
      timer.elapsed += adjustedDt;
      const localDt = now - timer.lastUpdate;
      timer.lastUpdate = now;
      
      timer.callback(localDt * this._globalSpeed, timer.elapsed);
      timer.calls++;
      
      if (timer.maxCalls > 0 && timer.calls >= timer.maxCalls) {
        this.clear(name);
      }
    }
  }

  pause(name) {
    if (name) { const t = this._timers.get(name); if (t) t.running = false; }
    else this._paused = true;
  }

  resume(name) {
    if (name) { const t = this._timers.get(name); if (t) { t.running = true; t.lastUpdate = performance.now(); } }
    else this._paused = false;
  }

  clear(name) {
    this._timers.delete(name);
  }

  clearAll() {
    this._timers.clear();
  }

  setSpeed(speed) {
    this._globalSpeed = Math.max(0.1, speed);
  }

  getSpeed() { return this._globalSpeed; }
  isPaused(name) { return name ? !this._timers.get(name)?.running : this._paused; }
  getElapsed(name) { return this._timers.get(name)?.elapsed || 0; }
  count() { return this._timers.size; }

  /**
   * RAF-based frame loop
   * @param {function} frameCallback - fn(dt)
   * @returns {function} stop function
   */
  static frameLoop(frameCallback) {
    let running = true;
    let last = performance.now();
    function tick(now) {
      if (!running) return;
      const dt = Math.min(now - last, 50); // cap at 50ms
      last = now;
      frameCallback(dt);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return () => { running = false; };
  }
}

window.PokeTimer = TimerManager;
if (!window.poke) window.poke = {};
window.poke.Timer = TimerManager;
})();

