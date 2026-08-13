/**
 * PokeEngine — World
 *
 * Typed ECS world: extends the EnTT-style sparse-set storage (ECSWorld)
 * with first-class Component instances and Entity handles. Legacy
 * stringly-typed storage (world.add(eid, 'Name', plainObject)) stays fully
 * operational for the migrated gameplay systems; typed components are stored
 * by reference so their prototype methods and lifecycle hooks work.
 *
 * @module engine/core/World
 */
import { ECSWorld } from './ECS.js';
import { Component } from './Component.js';
import { Entity } from './Entity.js';

export class World extends ECSWorld {
  constructor() {
    super();
    /** @type {Map<number, Entity>} Live entity handles by raw id. */
    this._handles = new Map();
  }

  /**
   * Create an entity and attach the given component instances.
   * @param {string} [name] Debug name.
   * @param {Component[]} [components]
   * @returns {Entity}
   */
  spawn(name = '', components = []) {
    const eid = this.create();
    const entity = new Entity(this, eid, name);
    this._handles.set(eid, entity);
    for (const component of components) this.attach(entity, component);
    return entity;
  }

  /**
   * Resolve a raw entity id to its handle (null if destroyed or unknown).
   * @param {number} eid
   * @returns {Entity|null}
   */
  entity(eid) {
    return this._handles.get(eid) || null;
  }

  /** @returns {Entity[]} All live entity handles. */
  entities() {
    return [...this._handles.values()];
  }

  /**
   * Attach a typed component instance to an entity (reference storage).
   * @template {Component} T
   * @param {Entity} entity
   * @param {T} component
   * @returns {T}
   */
  attach(entity, component) {
    if (!(component instanceof Component)) {
      throw new TypeError('[engine] World.attach expects a Component instance');
    }
    const type = component.type;
    this.register(type);
    this._components.get(type).add(entity.id, component);
    this._componentNames.get(entity.id)?.add(type);
    component.entity = entity;
    component.onAttach(entity);
    return component;
  }

  /**
   * @param {Entity} entity
   * @param {Function} ComponentClass Component class (uses static `type`).
   * @returns {Component|undefined}
   */
  getComponent(entity, ComponentClass) {
    const set = this._components.get(ComponentClass.type);
    return set ? set.get(entity.id) : undefined;
  }

  /**
   * @param {Entity} entity
   * @param {Function} ComponentClass
   * @returns {boolean}
   */
  hasComponent(entity, ComponentClass) {
    const set = this._components.get(ComponentClass.type);
    return set ? set.has(entity.id) : false;
  }

  /**
   * @param {Entity} entity
   * @param {Function} ComponentClass
   * @returns {boolean}
   */
  removeComponent(entity, ComponentClass) {
    const component = this.getComponent(entity, ComponentClass);
    if (!component) return false;
    component.onDetach(entity);
    this.remove(entity.id, ComponentClass.type);
    component._finalize();
    return true;
  }

  /**
   * Destroy a single entity: all typed components are finalized (lifecycle
   * honored), legacy plain records removed, handle unregistered.
   * @param {number} eid
   */
  destroy(eid) {
    const compNames = this._componentNames.get(eid);
    if (compNames) {
      for (const name of compNames) {
        const set = this._components.get(name);
        const record = set ? set.get(eid) : undefined;
        if (record instanceof Component) record._finalize();
      }
    }
    super.destroy(eid);
    this._handles.delete(eid);
  }

  /**
   * Destroy an entity and its entire hierarchy (recursive lifecycle).
   * @param {number} eid
   */
  destroyEntityTree(eid) {
    this.destroyRecursive(eid);
  }

  /** @returns {number} Live entity count. */
  get entityCount() {
    return this._handles.size;
  }
}

