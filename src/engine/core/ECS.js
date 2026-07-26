/**
 * PokeEngine — Entity Component System
 * 
 * ECS pattern: Entities are just IDs, Components are pure data.
 * Systems iterate entities with matching component signatures.
 * 
 * Usage:
 *   const eid = world.create();
 *   world.add(eid, 'Transform', { x:0, y:0, w:64, h:64 });
 *   world.add(eid, 'Clickable', { onClick: handleClick });
 *   world.system('render', ['Transform','Sprite'], (eid, t, s) => draw(s, t));
 */
(function() {
'use strict';

class ECSWorld {
  constructor() {
    this._nextId = 1;
    this._components = new Map();   // name -> Map<eid, data>
    this._entities = new Set();
    this._systems = new Map();      // name -> { signature, fn }
    this._componentNames = new Map(); // eid -> Set<componentName>
  }

  // ─── Entity ───
  create() {
    const id = this._nextId++;
    this._entities.add(id);
    this._componentNames.set(id, new Set());
    return id;
  }

  destroy(eid) {
    if (!this._entities.has(eid)) return;
    for (const [name, compMap] of this._components) {
      compMap.delete(eid);
    }
    this._componentNames.delete(eid);
    this._entities.delete(eid);
  }

  // ─── Components ───
  register(name) {
    if (!this._components.has(name)) {
      this._components.set(name, new Map());
    }
  }

  add(eid, name, data) {
    this.register(name);
    this._components.get(name).set(eid, Object.assign({}, data));
    this._componentNames.get(eid).add(name);
    return eid;
  }

  get(eid, name) {
    const compMap = this._components.get(name);
    return compMap ? compMap.get(eid) : undefined;
  }

  has(eid, name) {
    return this._componentNames.get(eid)?.has(name) ?? false;
  }

  update(eid, name, data) {
    const compMap = this._components.get(name);
    if (!compMap || !compMap.has(eid)) return false;
    Object.assign(compMap.get(eid), data);
    return true;
  }

  remove(eid, name) {
    const compMap = this._components.get(name);
    if (compMap) compMap.delete(eid);
    this._componentNames.get(eid)?.delete(name);
  }

  // ─── Queries ───
  query(...componentNames) {
    const result = [];
    for (const eid of this._entities) {
      const hasAll = componentNames.every(n => this.has(eid, n));
      if (hasAll) {
        result.push([eid, ...componentNames.map(n => this.get(eid, n))]);
      }
    }
    return result;
  }

  // ─── Systems ───
  system(name, signature, fn) {
    this._systems.set(name, { signature, fn });
  }

  run(name) {
    const sys = this._systems.get(name);
    if (!sys) return;
    for (const eid of this._entities) {
      const hasAll = sys.signature.every(n => this.has(eid, n));
      if (hasAll) {
        sys.fn(eid, ...sys.signature.map(n => this.get(eid, n)));
      }
    }
  }

  runAll() {
    for (const [name] of this._systems) this.run(name);
  }

  // ─── Serialization ───
  export() {
    const data = {};
    for (const [name, compMap] of this._components) {
      data[name] = Object.fromEntries(compMap);
    }
    return data;
  }

  import(data) {
    for (const [name, entries] of Object.entries(data)) {
      this.register(name);
      for (const [eid, comp] of Object.entries(entries)) {
        this._components.get(name).set(Number(eid), comp);
        this._entities.add(Number(eid));
        this._componentNames.get(Number(eid))?.add(name);
      }
    }
  }

  // ─── Stats ───
  stats() {
    const compCounts = {};
    for (const [name, compMap] of this._components) {
      compCounts[name] = compMap.size;
    }
    return { entities: this._entities.size, components: compCounts, systems: this._systems.size };
  }
}

window.PokeECS = ECSWorld;
if (!window.poke) window.poke = {};
window.poke.ECS = ECSWorld;
})();
