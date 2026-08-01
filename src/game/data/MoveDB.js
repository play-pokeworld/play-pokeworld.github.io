/**
 * PokeGame — Moves Database
 *
 * Unified access to ALL move data.
 * Moves are defined in legacy/data/moves.js, this provides typed querying.
 */
(function() {
'use strict';

class MoveDB {
  constructor() {
    this._byId = new Map();
    this._byType = new Map();
    this._ready = false;
  }

  init() {
    const moves = window.MOVES || {};
    
    for (const [id, move] of Object.entries(moves)) {
      if (!move || typeof move !== 'object') continue;
      
      const m = {
        id,
        name: move.name || id,
        type: move.type || 'Normal',
        category: move.category || (move.power > 0 ? (move.special ? 'special' : 'physical') : 'status'),
        power: move.power || 0,
        accuracy: move.accuracy ?? 100,
        pp: move.pp || 0,
        priority: move.priority || 0,
        crit: move.crit || false,
        effect: move.eff || null,
        effectChance: move.effPct || move.effChance || 0,
        healing: move.heal || 0,
        recoil: move.recoil || 0,
        drain: move.drain || false,
        recharge: move.recharge || false,
        multiHit: move.multihit || null,
        trap: move.trap || false,
        charge: move.charge || false,
        fixed: move.fixed || 0,
        selfBuff: move.self || null,
        targetBuff: move.target || null,
      };
      
      this._byId.set(id, m);
      
      // Index by type
      if (!this._byType.has(m.type)) this._byType.set(m.type, []);
      this._byType.get(m.type).push(id);
    }
    
    this._ready = true;
    console.log(`[MoveDB] Loaded ${this._byId.size} moves`);
  }

  get(id) { return this._byId.get(id) || null; }
  getByType(type) { return this._byType.get(type) || []; }
  getAll() { return Array.from(this._byId.values()); }
  
  getPower(id) { return this.get(id)?.power || 0; }
  getType(id) { return this.get(id)?.type || 'Normal'; }
  getCategory(id) { return this.get(id)?.category || 'status'; }
  getAccuracy(id) { return this.get(id)?.accuracy ?? 100; }

  get isReady() { return this._ready; }
  get count() { return this._byId.size; }
}

window.MoveDB = MoveDB;
window.PokeMoveDB = MoveDB;
if (!window.poke) window.poke = {};
window.poke.MoveDB = MoveDB;
})();

