/**
 * PokeEngine — Entity
 *
 * Typed handle over a raw World entity id. Entities own components
 * (class instances) and form a hierarchy (parent/children) that the World
 * stores as dedicated 'Hierarchy' records. An Entity adds no data of its
 * own: every piece of state lives in components.
 *
 * @module engine/core/Entity
 */
import { Component } from './Component.js';

export class Entity {
  /**
   * @param {import('./World.js').World} world Owning world.
   * @param {number} id Raw entity id allocated by the world.
   * @param {string} [name] Human-readable debug name.
   */
  constructor(world, id, name = '') {
    /** @type {import('./World.js').World} */
    this.world = world;
    /** @type {number} */
    this.id = id;
    /** @type {string} */
    this.name = name || `entity-${id}`;
    /** @type {import('./Scene.js').Scene|null} Scene containing this entity (set by Scene.spawn). */
    this.scene = null;
    /** @type {boolean} Inactive entities are skipped by systems and rendering. */
    this.active = true;
  }

  /**
   * Attach a component instance. The component type (static `type` getter)
   * is the storage key; attaching twice replaces the previous instance.
   * @template {Component} T
   * @param {T} component Component instance to attach.
   * @returns {T} The same instance (fluent).
   */
  addComponent(component) {
    if (!(component instanceof Component)) {
      throw new TypeError('[engine] Entity.addComponent expects a Component instance');
    }
    return this.world.attach(this, component);
  }

  /**
   * Fetch a component by class.
   * @template {Component} T
   * @param {new (...args: any[]) => T} ComponentClass
   * @returns {T|undefined}
   */
  get(ComponentClass) {
    return this.world.getComponent(this, ComponentClass);
  }

  /**
   * Check component presence by class.
   * @param {Function} ComponentClass
   * @returns {boolean}
   */
  has(ComponentClass) {
    return this.world.hasComponent(this, ComponentClass);
  }

  /**
   * Detach and dispose a component by class.
   * @param {Function} ComponentClass
   * @returns {boolean}
   */
  removeComponent(ComponentClass) {
    return this.world.removeComponent(this, ComponentClass);
  }

  /**
   * Hierarchy: make `child` a child of this entity.
   * @param {Entity} child
   */
  addChild(child) {
    this.world.addHierarchy(this.id, child.id);
  }

  /**
   * @returns {Entity[]} Child entity handles (handles survive only while registered).
   */
  get children() {
    return this.world.getChildren(this.id).map((eid) => this.world.entity(eid)).filter(Boolean);
  }

  /** @returns {Entity|null} */
  get parent() {
    const pid = this.world.getParent(this.id);
    return pid ? this.world.entity(pid) : null;
  }

  /** Destroy this entity (components disposed, children destroyed recursively). */
  destroy() {
    if (this.scene && this.scene.rootEntity === this) {
      // A scene root is disposed by the scene itself; guard against double free.
      this.scene = null;
    }
    this.world.destroyEntityTree(this.id);
  }
}
