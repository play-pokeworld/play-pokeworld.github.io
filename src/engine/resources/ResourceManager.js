/**
 * PokeEngine — Resource Manager
 * Lazy-load, cache, and release sprites/images with reference counting
 */
'use strict';

class ResourceManager {
  constructor() {
    this._cache = new Map();   // url -> { img, refs, size, loaded }
    this._maxCache = 200;
    this._pending = new Map();
    this._enabled = true;
  }

  /**
   * Load an image, return promise
   */
  loadImage(url) {
    if (!url) return Promise.reject('No URL');
    
    // Check cache
    if (this._cache.has(url)) {
      this._cache.get(url).refs++;
      return Promise.resolve(this._cache.get(url).img);
    }

    // Check pending
    if (this._pending.has(url)) return this._pending.get(url);

    // Load
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this._cache.set(url, { img, refs: 1, loaded: true });
        this._pending.delete(url);
        this._ensureCache();
        resolve(img);
      };
      img.onerror = () => {
        this._pending.delete(url);
        reject(new Error('Failed to load: ' + url));
      };
      img.src = url;
    });

    this._pending.set(url, promise);
    return promise;
  }

  /**
   * Preload multiple images
   */
  preload(urls) {
    return Promise.all(urls.map(u => this.loadImage(u).catch(() => null)));
  }

  /**
   * Release a resource (decrease ref count)
   */
  release(url) {
    const entry = this._cache.get(url);
    if (!entry) return;
    entry.refs--;
    if (entry.refs <= 0) {
      // Don't eagerly unload, just mark as releasable
      entry.releasable = true;
    }
  }

  /**
   * Force garbage collect unreferenced resources
   */
  gc() {
    for (const [url] of this._cache) {
      if (entry.releasable && entry.refs <= 0) {
        URL.revokeObjectURL(url);
        this._cache.delete(url);
      }
    }
  }

  /**
   * Check if URL is loaded
   */
  isLoaded(url) {
    return this._cache.has(url) && this._cache.get(url).loaded;
  }

  /**
   * Get cached image (synchronous if loaded)
   */
  get(url) {
    return this._cache.get(url)?.img || null;
  }

  /**
   * Clear all cached resources
   */
  clear() {
    for (const [url] of this._cache) {
      URL.revokeObjectURL(url);
    }
    this._cache.clear();
    this._pending.clear();
  }

  get stats() {
    return { cached: this._cache.size, pending: this._pending.size, max: this._maxCache };
  }

  _ensureCache() {
    if (this._cache.size > this._maxCache) this.gc();
  }

  /** 
   * Batch preload pokemon sprites for a region
   */
  static preloadPokemonRegion(ids, variant = 'front') {
    const dirs = { front:'front', back:'front', frontShiny:'frontShiny', backShiny:'frontShiny' };
    const dir = dirs[variant] || 'front';
      return ids.map(id => (typeof getPokemonSpriteUrl === 'function' ? getPokemonSpriteUrl(id, variant.includes('Shiny')) : ((typeof window !== 'undefined' && typeof window.getPokemonSpriteUrl === 'function') ? window.getPokemonSpriteUrl(id, variant.includes('Shiny')) : `src/assets/images/pokemon/${dir}/${id}.png`)));
  }
}

// T2 (wave 38): ESM module — native class export; the engine surface
// (PokeResourceManager + poke.* namespace) stays kept on the global object for
// classic consumers not yet migrated.
export { ResourceManager };
export default ResourceManager;
if (typeof globalThis !== 'undefined') {
  globalThis.PokeResourceManager = ResourceManager;
  if (!globalThis.poke) globalThis.poke = {};
  globalThis.poke.ResourceManager = ResourceManager;
}


