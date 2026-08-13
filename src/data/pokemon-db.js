/**
 * PokeGame — Pokemon Database
 *
 * Single source for ALL Pokemon data.
 * Data is loaded from JSON, not hardcoded.
 * Provides lookup by ID, name, type, region.
 */
export class PokemonDB {
  constructor() {
    this._byId = new Map();     // id -> pokemon data
    this._byName = new Map();   // name -> pokemon data
    this._byRegion = new Map(); // region -> [ids]
    this._ready = false;
  }

  /**
   * Initialize from existing PD (PD)
   */
  init() {
    const pd = window.PD || {};
    const keys = Object.keys(pd);
    
    for (const id of keys) {
      const entry = pd[id];
      if (!entry) continue;
      
      // entry format: [name, type1, type2, hp, atk, def, spa, spd, spe]
      const numId = Number(id);
      const pokemon = {
        id: numId,
        name: typeof entry === 'object' && entry.name ? entry.name : (Array.isArray(entry) ? entry[0] : `Pokémon #${id}`),
        types: typeof entry === 'object' && entry.type ? entry.type : 
               (Array.isArray(entry) ? [entry[1], entry[2]].filter(Boolean) : ['Normal']),
        bst: {
          hp: Array.isArray(entry) ? (entry[3] || 0) : 0,
          atk: Array.isArray(entry) ? (entry[4] || 0) : 0,
          def: Array.isArray(entry) ? (entry[5] || 0) : 0,
          spa: Array.isArray(entry) ? (entry[6] || 0) : 0,
          sdef: Array.isArray(entry) ? (entry[7] || 0) : 0,
          spe: Array.isArray(entry) ? (entry[8] || 0) : 0,
        },
      };
      
      this._byId.set(numId, pokemon);
      this._byName.set(pokemon.name.toLowerCase(), pokemon);
      
      // Region classification
      const region = numId <= 151 ? 'kanto' : numId <= 251 ? 'johto' : 'other';
      if (!this._byRegion.has(region)) this._byRegion.set(region, []);
      this._byRegion.get(region).push(numId);
    }
    
    this._ready = true;
    console.debug(`[PokemonDB] Loaded ${this._byId.size} Pokémon`);
  }

  getById(id) { return this._byId.get(Number(id)) || null; }
  getByName(name) { return this._byName.get(name.toLowerCase()) || null; }
  getByRegion(region) { return this._byRegion.get(region) || []; }
  
  getAll() { return Array.from(this._byId.values()); }
  getIds() { return Array.from(this._byId.keys()); }
  
  getStats(id) { return this.getById(id)?.bst || null; }
  getTypes(id) { return this.getById(id)?.types || []; }
  getName(id) { return this.getById(id)?.name || `#${id}`; }

  get isReady() { return this._ready; }
  get count() { return this._byId.size; }
}

// Wave 36 (T2 slice): real ES module — the IIFE wrapper is gone; canonical
// guarded globalThis shim keeps the identical runtime surface until T2-C.
if (typeof globalThis !== 'undefined') {
  globalThis.PokemonDB = PokemonDB;
  globalThis.PokePokemonDB = PokemonDB;
  if (!globalThis.poke) globalThis.poke = {};
  globalThis.poke.PokemonDB = PokemonDB;
}


