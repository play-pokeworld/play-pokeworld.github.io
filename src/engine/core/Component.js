/**
 * PokeEngine — Component (abstract base class)
 *
 * Real, typed base class for every ECS component of the engine.
 * A component is a class instance (never an anonymous data bag): it carries
 * its own state, exposes its registry name through the static `type` getter
 * and receives lifecycle callbacks from the World it is attached to.
 *
 * Lifecycle contract (invoked by World):
 *   - onAttach(entity)  : called right after the component is registered
 *   - onUpdate(dt)      : called by systems during the frame loop
 *   - onDetach(entity)  : called right before the component is unregistered
 *   - onDispose()       : terminal cleanup (entity destruction)
 *
 * Subclasses MUST override `static get type()` with a unique, stable name
 * (sparse-set storage key). Subclasses MUST NOT perform DOM or game work in
 * their constructor: use onAttach() instead.
 *
 * @module engine/core/Component
 */
export class Component {
  /**
   * Unique registry name of the component (storage key inside the World).
   * @returns {string}
   */
  static get type() {
    return 'Component';
  }

  constructor() {
    if (new.target === Component) {
      throw new TypeError('[engine] Component is abstract: extend it and override static get type()');
    }
    /** @type {import('./Entity.js').Entity|null} Back-reference set by World.attach() */
    this.entity = null;
    /** @type {boolean} Disabled components are skipped by systems. */
    this.enabled = true;
  }

  /** @returns {string} Registry name of this component instance. */
  get type() {
    return this.constructor.type;
  }

  /** @returns {import('./Scene.js').Scene|null} Scene owning the entity chain, if any. */
  get scene() {
    return this.entity ? this.entity.scene : null;
  }

  /** @returns {import('./World.js').World|null} World owning this component. */
  get world() {
    return this.entity ? this.entity.world : null;
  }

  /**
   * Convenience: fetch another component on the same entity by class.
   * @template T
   * @param {new (...args: any[]) => T} ComponentClass
   * @returns {T|undefined}
   */
  sibling(ComponentClass) {
    return this.entity ? this.entity.get(ComponentClass) : undefined;
  }

  // ─── Lifecycle hooks (overridable) ───────────────────────────────────────

  /** @param {import('./Entity.js').Entity} _entity Entity the component was attached to. */
  onAttach(_entity) {}

  /** @param {number} _dt Frame delta time in milliseconds. */
  onUpdate(_dt) {}

  /** @param {import('./Entity.js').Entity} _entity Entity the component is detached from. */
  onDetach(_entity) {}

  /** Terminal cleanup hook invoked on entity destruction. */
  onDispose() {}

  /**
   * Internal finalizer called by World.destroy(). Never override — override
   * onDispose() instead.
   * @internal
   */
  _finalize() {
    this.onDispose();
    this.entity = null;
    this.enabled = false;
  }
}
