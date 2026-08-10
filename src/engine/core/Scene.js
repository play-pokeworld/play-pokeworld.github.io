/**
 * PokeEngine — Scene
 *
 * Real Scene class: the engine-level unit of a "screen" or "state"
 * (menu, panel, world view, battle...). A Scene owns:
 *   - its own World (entities/components registry),
 *   - an ordered list of Systems executed every update tick,
 *   - a root Entity anchoring the scene hierarchy,
 *   - a strict lifecycle: load → enter → update/render* → exit → dispose.
 *
 * The scene is rendering-technology agnostic: mounting is delegated to
 * subclasses (see UIScene in the UI design system). The engine only
 * guarantees lifecycle semantics and event emission (bus injected).
 *
 * Events emitted on the injected bus (if any):
 *   scene:load, scene:enter, scene:exit, scene:dispose  { name }
 *
 * @module engine/core/Scene
 */
import { World } from './World.js';
import { System } from './System.js';

export class Scene {
  /**
   * @param {Object} [options]
   * @param {string} [options.name] Stable scene name (defaults to class name).
   * @param {World} [options.world] Custom world (a fresh one is created by default).
   * @param {{emit: Function}} [options.bus] Optional event bus (dependency injection).
   */
  constructor(options = {}) {
    /** @type {string} */
    this.name = options.name || this.constructor.name;
    /** @type {World} */
    this.world = options.world || new World();
    /** @type {{emit: Function}|null} */
    this.bus = options.bus || null;
    /** @type {System[]} Systems executed in registration order each update. */
    this._systems = [];
    /** @type {import('./Entity.js').Entity|null} Root entity of the scene hierarchy. */
    this.rootEntity = null;
    /** @type {boolean} */
    this.loaded = false;
    /** @type {boolean} True between enter() and exit(). */
    this.active = false;
    /** @type {boolean} */
    this._disposed = false;
  }

  // ─── Entity spawning ─────────────────────────────────────────────────────

  /**
   * Spawn an entity inside this scene (hung under the root by default).
   * @param {string} [name]
   * @param {Component[]} [components]
   * @param {import('./Entity.js').Entity|null} [parent] Parent entity (root by default).
   * @returns {import('./Entity.js').Entity}
   */
  spawn(name = '', components = [], parent = undefined) {
    const entity = this.world.spawn(name, components);
    entity.scene = this;
    const effectiveParent = parent === undefined ? this.rootEntity : parent;
    if (effectiveParent && entity !== effectiveParent) {
      this.world.addHierarchy(effectiveParent.id, entity.id);
    }
    return entity;
  }

  // ─── Systems ──────────────────────────────────────────────────────────────

  /**
   * @template {System} T
   * @param {T} system
   * @returns {T}
   */
  addSystem(system) {
    if (!(system instanceof System)) {
      throw new TypeError('[engine] Scene.addSystem expects a System instance');
    }
    system.world = this.world;
    this._systems.push(system);
    return system;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  /** Load once: create root entity + invoke user hook. */
  load() {
    if (this.loaded) return;
    this.loaded = true;
    this.rootEntity = this.spawn(`${this.name}:root`, [], null);
    this.onLoad();
    this._emit('scene:load');
  }

  /** Activate the scene (idempotent). */
  enter() {
    if (this._disposed) throw new Error(`[engine] Scene "${this.name}" was disposed`);
    this.load();
    if (this.active) return;
    this.active = true;
    this.onEnter();
    this._emit('scene:enter');
  }

  /**
   * Frame tick: run every system, then the user update hook.
   * @param {number} dt Delta time (ms).
   */
  update(dt) {
    if (!this.active || this._disposed) return;
    for (const system of this._systems) system._run(dt);
    this.onUpdate(dt);
  }

  /** Deactivate the scene (entities and data stay resident). */
  exit() {
    if (!this.active) return;
    this.active = false;
    this.onExit();
    this._emit('scene:exit');
  }

  /** Terminal cleanup: exit, dispose the whole entity tree, drop systems. */
  dispose() {
    if (this._disposed) return;
    this.exit();
    this._disposed = true;
    this.onDispose();
    if (this.rootEntity) {
      this.world.destroyRecursive(this.rootEntity.id);
      this.rootEntity = null;
    }
    for (const system of this._systems) system.world = null;
    this._systems.length = 0;
    this.loaded = false;
    this._emit('scene:dispose');
  }

  // ─── User hooks (overridable) ────────────────────────────────────────────

  /** Called once, before the first enter(). Build entities/systems here. */
  onLoad() {}

  /** Called every time the scene becomes active. */
  onEnter() {}

  /** @param {number} _dt Called every update while active, after systems. */
  onUpdate(_dt) {}

  /** Called every time the scene is deactivated. */
  onExit() {}

  /** Called once at final disposal. */
  onDispose() {}

  // ─── Internals ────────────────────────────────────────────────────────────

  _emit(event) {
    if (this.bus && typeof this.bus.emit === 'function') {
      this.bus.emit(event, { name: this.name });
    }
  }
}
