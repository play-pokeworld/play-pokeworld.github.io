/**
 * PokeGame — Initialization
 *
 * Boot sequence: Loads all DBs, bridges legacy, starts engine.
 * Run AFTER legacy scripts are loaded.
 */
(function() {
'use strict';

window.PokeInit = {
  _done: false,

  /**
   * Initialize all game systems
   * Call this once after DOM + legacy scripts are ready
   */
  init() {
    if (this._done) return;
    this._done = true;
    
    console.log('[PokeInit] Starting game initialization...');
    
    // 1. Init Game Config
    // Config.js is loaded separately, window.GAME is ready
    
    // 2. Init Databses
    this._initDatabases();
    
    // 3. Init Item Engine
    this._initItemEngine();
    
    // 4. Init PokeGame (Engine + Renderer bridge)
    this._initEngine();
    
    // 5. Bridge legacy globals
    this._bridgeLegacy();
    
    console.log('[PokeInit] ✓ Game ready!');
  },

  _initDatabases() {
    // PokemonDB
    const pkmnDB = new window.PokemonDB();
    pkmnDB.init();
    window.PokeData = window.PokeData || {};
    window.PokeData.pokemon = pkmnDB;
    
    // MoveDB
    const moveDB = new window.MoveDB();
    moveDB.init();
    window.PokeData.moves = moveDB;
    
    // AbilityDB
    const abilityDB = new window.AbilityDB();
    abilityDB.init();
    window.PokeData.abilities = abilityDB;
    
    console.log('[PokeInit] Databases initialized');
  },

  _initItemEngine() {
    // ItemEngine is loaded separately
    if (window.ItemEngine) {
      console.log('[PokeInit] ItemEngine ready');
    }
  },

  _initEngine() {
    try {
      const game = new window.PokeGame();
      game.init();
      window.PokeGameInstance = game;
      console.log('[PokeInit] Engine started');
    } catch(e) {
      console.warn('[PokeInit] Engine init deferred:', e.message);
    }
  },

  _bridgeLegacy() {
    // Passe 3 : ne PLUS ré-encapsuler window.openItemInfo avec ItemInfoPanel
    // (overlay hétérogène). Le openItemInfo unifié de items-helpers.js
    // (pwBuildInfoPanel + #poke-modal) est conservé tel quel.
    
    // Expose getItemSource in legacy
    if (!window.getItemSource) {
      window.getItemSource = function(key, lang) {
        const db = window.ItemDB?.[key];
        if (!db) return '';
        lang = lang || window.G?.lang || 'fr';
        if (lang === 'en') return '📍 Found in: ' + (db.source || db.shop || 'various');
        return (typeof t==='function'?t('where_to_find'):'📍 Where to find: ') + (db.source || db.shop || 'divers endroits');
      };
    }
    
    console.log('[PokeInit] Legacy bridges installed');
  },
};

// Auto-init when DOM ready
if (document.readyState === 'complete') {
  window.PokeInit.init();
} else {
  document.addEventListener('DOMContentLoaded', () => window.PokeInit.init());
}
})();

