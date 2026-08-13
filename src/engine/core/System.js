/**
 * PokeEngine — System (abstract base class)
 *
 * A System iterates entities carrying a given component signature every
 * frame (Scene.update → system._run). Systems never store entity state
 * between frames: state lives in components only.
 *
 * Two execution modes:
 *   - signature mode: `components` returns Component classes; process() is
 *     invoked once per matching entity with (entity, components, dt).
 *   - global mode: `components` returns []; globalUpdate(dt) runs once.
 *
 * @module engine/core/System
 */
export class System {
  /** Unique name used for registration/debugging. */
  static get systemName() {
    return 'System';
  }

  constructor() {
    if (new.target === System) {
      throw new TypeError('[engine] System is abstract: extend it');
    }
    /** @type {import('./World.js').World|null} Bound by Scene.addSystem. */
    this.world = null;
    /** @type {boolean} Disabled systems are skipped. */
    this.enabled = true;
  }

  /**
   * Component signature: classes whose `type` names must all be present on
   * an entity for process() to run. Empty array → global mode.
   * @returns {Function[]}
   */
  get components() {
    return [];
  }

  /**
   * Per-entity processing (signature mode).
   * @param {import('./Entity.js').Entity} _entity
   * @param {Component[]} _components Components in signature order.
   * @param {number} _dt Delta time in milliseconds.
   */
  process(_entity, _components, _dt) {}

  /** Once-per-frame hook used in global mode. @param {number} _dt */
  globalUpdate(_dt) {}

  /**
   * Execute the system for this frame. Bound world required.
   * @param {number} dt
   * @returns {number} Number of executions (matched entities or 1 in global mode).
   * @internal
   */
  _run(dt) {
    if (!this.world || !this.enabled) return 0;
    const signature = this.components.map((cls) => cls.type);
    if (signature.length === 0) {
      this.globalUpdate(dt);
      return 1;
    }
    return this.world.query(signature, (eid, ...components) => {
      const entity = this.world.entity(eid);
      if (!entity || !entity.active) return;
      if (components.some((c) => c && c.enabled === false)) return;
      this.process(entity, components, dt);
    });
  }
}

