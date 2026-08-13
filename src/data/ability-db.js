/**
 * PokeGame — Abilities / Talents Database
 */
export class AbilityDB {
  constructor() {
    this._byId = new Map();
    this._byType = new Map();
    this._byRarity = new Map();
    this._ready = false;
  }

  init() {
    const talents = window.TALENTS || window.ABILITIES || {};
    
    for (const [id, talent] of Object.entries(talents)) {
      if (!talent || typeof talent !== 'object') continue;
      
      const a = {
        id,
        name: talent.name || id,
        types: talent.types || talent.type || [],
        rarity: talent.rarity || 1,
        description: talent.desc || talent.info || '',
        battleEffect: talent.battleEffect || null,
        fieldEffect: talent.fieldEffect || null,
      };
      
      this._byId.set(id, a);
      
      for (const t of a.types) {
        if (!this._byType.has(t)) this._byType.set(t, []);
        this._byType.get(t).push(id);
      }
      
      if (!this._byRarity.has(a.rarity)) this._byRarity.set(a.rarity, []);
      this._byRarity.get(a.rarity).push(id);
    }
    
    this._ready = true;
    console.debug(`[AbilityDB] Loaded ${this._byId.size} abilities`);
  }

  get(id) { return this._byId.get(id) || null; }
  getByType(type) { return this._byType.get(type) || []; }
  getByRarity(rarity) { return this._byRarity.get(rarity) || []; }
  getAll() { return Array.from(this._byId.values()); }
  
  get isReady() { return this._ready; }
  get count() { return this._byId.size; }
}

// Wave 36 (T2 slice): real ES module — the IIFE wrapper is gone; canonical
// guarded globalThis shim keeps the identical runtime surface until T2-C.
if (typeof globalThis !== 'undefined') {
  globalThis.AbilityDB = AbilityDB;
  globalThis.PokeAbilityDB = AbilityDB;
  globalThis.poke = globalThis.poke || {};
  globalThis.poke.AbilityDB = AbilityDB;
}


