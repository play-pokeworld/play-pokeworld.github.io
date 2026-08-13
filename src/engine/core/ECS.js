/**
 * PokeEngine — EnTT-inspired High-Performance Entity Component System
 *
 * Architecture based on C++ EnTT Sparse Sets (Sparse Array + Packed Dense Array):
 *   - O(1) Component Addition (append to dense array, record sparse index)
 *   - O(1) Component Lookup (direct index via sparse array)
 *   - O(1) Swap-and-Pop Component Deletion (no array shifting)
 *   - O(1) Entity ID Recycling via Free-List
 *   - Cache-friendly linear query iteration over smallest dense component array
 *
 * @module engine/core/ECS
 */

export class SparseSet {
  constructor() {
    this.dense = [];  // Array of Entity IDs [eid0, eid1, ...]
    this.data = [];   // Array of Component objects [comp0, comp1, ...]
    this.sparse = []; // Sparse array where sparse[eid] === index in dense
  }

  has(eid) {
    const idx = this.sparse[eid];
    return idx !== undefined && idx < this.dense.length && this.dense[idx] === eid;
  }

  get(eid) {
    const idx = this.sparse[eid];
    if (idx !== undefined && idx < this.dense.length && this.dense[idx] === eid) {
      return this.data[idx];
    }
    return undefined;
  }

  add(eid, comp) {
    const idx = this.sparse[eid];
    if (idx !== undefined && idx < this.dense.length && this.dense[idx] === eid) {
      this.data[idx] = comp;
      return comp;
    }
    const newIdx = this.dense.length;
    this.dense.push(eid);
    this.data.push(comp);
    this.sparse[eid] = newIdx;
    return comp;
  }

  remove(eid) {
    const idx = this.sparse[eid];
    if (idx === undefined || idx >= this.dense.length || this.dense[idx] !== eid) {
      return false;
    }
    const lastIdx = this.dense.length - 1;
    const lastEid = this.dense[lastIdx];

    if (idx !== lastIdx) {
      // Swap-and-pop O(1) removal
      this.dense[idx] = lastEid;
      this.data[idx] = this.data[lastIdx];
      this.sparse[lastEid] = idx;
    }

    this.dense.pop();
    this.data.pop();
    this.sparse[eid] = undefined;
    return true;
  }

  clear() {
    this.dense.length = 0;
    this.data.length = 0;
    this.sparse.length = 0;
  }

  size() {
    return this.dense.length;
  }
}

export class ECSWorld {
  constructor() {
    this._nextId = 1;
    this._freeIds = [];               // Recycled entity IDs
    this._components = new Map();     // componentName -> SparseSet
    this._entities = new Set();       // Active entities set
    this._systems = new Map();        // name -> { signature, fn }
    this._componentNames = new Map(); // eid -> Set<componentName> (for fast cleanup)
  }

  // ─── Entity Lifecycle & O(1) Recycling ───
  create() {
    let id;
    if (this._freeIds.length > 0) {
      id = this._freeIds.pop();
    } else {
      id = this._nextId++;
    }
    this._entities.add(id);
    this._componentNames.set(id, new Set());
    return id;
  }

  destroy(eid) {
    if (!this._entities.has(eid)) return;
    const compNames = this._componentNames.get(eid);
    if (compNames) {
      for (const name of compNames) {
        const set = this._components.get(name);
        if (set) set.remove(eid);
      }
    }
    this._componentNames.delete(eid);
    this._entities.delete(eid);
    this._freeIds.push(eid); // Recycle ID
  }

  // ─── Component Storage (Sparse Sets) ───
  register(name) {
    if (!this._components.has(name)) {
      this._components.set(name, new SparseSet());
    }
  }

  add(eid, name, data) {
    if (!this._entities.has(eid)) return eid;
    this.register(name);
    this._components.get(name).add(eid, Object.assign({}, data));
    this._componentNames.get(eid).add(name);
    return eid;
  }

  get(eid, name) {
    const set = this._components.get(name);
    return set ? set.get(eid) : undefined;
  }

  has(eid, name) {
    const set = this._components.get(name);
    return set ? set.has(eid) : false;
  }

  remove(eid, name) {
    const set = this._components.get(name);
    if (set && set.remove(eid)) {
      this._componentNames.get(eid)?.delete(name);
      return true;
    }
    return false;
  }

  // ─── EnTT-style Multi-Component Query / View Iteration ───
  query(componentNames, callback) {
    if (!componentNames || componentNames.length === 0) return 0;
    const sets = [];
    let smallestSet = null;

    for (let i = 0; i < componentNames.length; i++) {
      const name = componentNames[i];
      const set = this._components.get(name);
      if (!set || set.size() === 0) return 0; // If any component set is empty, query matches 0
      sets.push(set);
      if (!smallestSet || set.size() < smallestSet.size()) {
        smallestSet = set;
      }
    }

    let count = 0;
    const dense = smallestSet.dense;
    const len = dense.length;

    for (let i = 0; i < len; i++) {
      const eid = dense[i];
      let match = true;
      for (let j = 0; j < sets.length; j++) {
        if (sets[j] !== smallestSet && !sets[j].has(eid)) {
          match = false;
          break;
        }
      }
      if (match) {
        const args = [eid];
        for (let j = 0; j < sets.length; j++) {
          args.push(sets[j].get(eid));
        }
        callback(...args);
        count++;
      }
    }
    return count;
  }

  // ─── Hierarchy / Scene Graph (Parent-Child Composition) ───
  addHierarchy(parentEid, childEid) {
    if (!this._entities.has(parentEid) || !this._entities.has(childEid)) return;
    const parentComp = this.get(parentEid, 'Hierarchy') || { parent: null, children: [] };
    const childComp = this.get(childEid, 'Hierarchy') || { parent: null, children: [] };
    if (childComp.parent && childComp.parent !== parentEid) {
      this.removeChild(childComp.parent, childEid);
    }
    childComp.parent = parentEid;
    if (!parentComp.children.includes(childEid)) {
      parentComp.children.push(childEid);
    }
    this.add(parentEid, 'Hierarchy', parentComp);
    this.add(childEid, 'Hierarchy', childComp);
  }

  removeChild(parentEid, childEid) {
    const parentComp = this.get(parentEid, 'Hierarchy');
    if (parentComp) {
      parentComp.children = parentComp.children.filter((id) => id !== childEid);
      this.add(parentEid, 'Hierarchy', parentComp);
    }
    const childComp = this.get(childEid, 'Hierarchy');
    if (childComp && childComp.parent === parentEid) {
      childComp.parent = null;
      this.add(childEid, 'Hierarchy', childComp);
    }
  }

  getChildren(eid) {
    const comp = this.get(eid, 'Hierarchy');
    return comp ? comp.children : [];
  }

  getParent(eid) {
    const comp = this.get(eid, 'Hierarchy');
    return comp ? comp.parent : null;
  }

  destroyRecursive(eid) {
    if (!this._entities.has(eid)) return;
    const children = [...this.getChildren(eid)];
    for (const childId of children) {
      this.destroyRecursive(childId);
    }
    const parentId = this.getParent(eid);
    if (parentId) {
      this.removeChild(parentId, eid);
    }
    this.destroy(eid);
  }

  // ─── Systems ───
  system(name, signature, fn) {
    this._systems.set(name, { signature: signature || [], fn: fn });
    return this;
  }

  run(name, ...args) {
    const sys = this._systems.get(name);
    if (!sys) return 0;
    if (!sys.signature || sys.signature.length === 0) {
      sys.fn(...args);
      return 1;
    }
    return this.query(sys.signature, (eid, ...comps) => {
      sys.fn(eid, ...comps, ...args);
    });
  }

  runAll(...args) {
    for (const [name] of this._systems) {
      this.run(name, ...args);
    }
  }

  // ─── Serialization ───
  export() {
    const data = {};
    for (const [name, set] of this._components) {
      data[name] = {};
      for (let i = 0; i < set.dense.length; i++) {
        const eid = set.dense[i];
        data[name][eid] = set.data[i];
      }
    }
    return data;
  }

  import(data) {
    for (const [name, entries] of Object.entries(data)) {
      this.register(name);
      for (const [eid, comp] of Object.entries(entries)) {
        this.add(Number(eid), name, comp);
      }
    }
  }

  // ─── Stats ───
  stats() {
    const compCounts = {};
    for (const [name, set] of this._components) {
      compCounts[name] = set.size();
    }
    return { entities: this._entities.size, components: compCounts, systems: this._systems.size };
  }
}

if (typeof window !== 'undefined') {
  window.PokeECS = ECSWorld;
  if (!window.poke) window.poke = {};
  window.poke.ECS = ECSWorld;
}

