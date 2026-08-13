/**
 * PokeEngine — Hand Engine
 * 
 * Central hub: creates and wires all subsystems
 * Manages the frame loop with fixed timestep
 * 
 * Usage:
 *   const engine = new PokeEngine({ container: '#game' });
 *   engine.start();
 *   engine.world.create(); // ECS world
 */
'use strict';

class PokeEngine {
  constructor(options = {}) {
    this.container = typeof options.container === 'string' 
      ? document.querySelector(options.container) 
      : (options.container || document.body);
    
    // Subsystems
    this.events = new window.PokeEventBus();
    this.world = new window.PokeECS();
    this.input = new window.PokeInput(this.container);
    this.timer = new window.PokeTimer();
    this.audio = new window.PokeAudio();
    
    // Rendering
    this.renderer = null; // Set externally via assign()
    
    // Frame loop
    this._running = false;
    this._lastTime = 0;
    this._frameId = null;
    this._fixedDt = 1000 / 60; // ~60 FPS
    this._accumulator = 0;
    this._fps = 0;
    this._frameCount = 0;
    this._fpsTimer = 0;
    
    // Plugins
    this._plugins = [];
    this._preUpdates = [];
    this._postUpdates = [];
    
    // Emit ready
    if (options.autostart !== false) {
      if (document.readyState === 'complete') this.start();
      else document.addEventListener('DOMContentLoaded', () => this.start());
    }
  }

  // ─── Plugin system ───
  use(plugin) {
    if (typeof plugin === 'function') {
      plugin(this);
    } else if (plugin && typeof plugin.install === 'function') {
      plugin.install(this);
    }
    this._plugins.push(plugin);
    return this;
  }

  onPreUpdate(fn) { this._preUpdates.push(fn); return this; }
  onPostUpdate(fn) { this._postUpdates.push(fn); return this; }

  assign(renderer) {
    this.renderer = renderer;
    renderer._engine = this;
    return this;
  }

  // ─── Frame loop ───
  start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._tick(this._lastTime);
    this.events.emit('engine:start');
    return this;
  }

  stop() {
    this._running = false;
    if (this._frameId) cancelAnimationFrame(this._frameId);
    this.events.emit('engine:stop');
    return this;
  }

  _tick(now) {
    if (!this._running) return;
    this._frameId = requestAnimationFrame((t) => this._tick(t));

    const dt = Math.min(now - this._lastTime, 100); // cap at 100ms
    this._lastTime = now;

    // FPS counter
    this._frameCount++;
    this._fpsTimer += dt;
    if (this._fpsTimer >= 1000) {
      this._fps = this._frameCount;
      this._frameCount = 0;
      this._fpsTimer -= 1000;
    }

    // Fixed timestep
    this._accumulator += dt;
    while (this._accumulator >= this._fixedDt) {
      this._update(this._fixedDt);
      this._accumulator -= this._fixedDt;
    }

    // Render
    if (this.renderer) this.renderer._render(this._accumulator / this._fixedDt);
  }

  _update(dt) {
    // Pre-update hooks
    for (const fn of this._preUpdates) fn(dt, this);

    // Timer update
    this.timer.update(dt);

    // ECS systems
    this.world.runAll();

    // Post-update hooks
    for (const fn of this._postUpdates) fn(dt, this);

    this.events.emit('engine:update', dt);
  }

  // ─── Stats ───
  getFPS() { return this._fps; }
  getECSStats() { return this.world.stats(); }

  // ─── Cleanup ───
  dispose() {
    this.stop();
    this.audio.dispose();
    this.timer.clearAll();
    this.events.clear();
    this._plugins.length = 0;
    this._preUpdates.length = 0;
    this._postUpdates.length = 0;
  }
}

// T2 (wave 38): ESM module — native class export; the engine surface
// (PokeEngine + poke.* namespace) stays kept on the global object for
// classic consumers not yet migrated.
export { PokeEngine };
export default PokeEngine;
if (typeof globalThis !== 'undefined') {
  globalThis.PokeEngine = PokeEngine;
  if (!globalThis.poke) globalThis.poke = {};
  globalThis.poke.Engine = PokeEngine;
}


