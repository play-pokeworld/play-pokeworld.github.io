/**
 * PokeGame — Game Entry Point
 * 
 * Initializes engine + game subsystems for legacy and modern usage.
 * Bridges new engine to existing legacy code.
 */
(function() {
'use strict';

class PokeGame {
  constructor(options = {}) {
    this._initialized = false;
    this.engine = null;
  }

  /**
   * Initialize the game engine with all subsystems
   */
  init(container) {
    if (this._initialized) return;
    this._initialized = true;

    // ─── Create Engine ───
    this.engine = new window.PokeEngine({
      container: container || document.getElementById('main-dashboard') || document.body,
      autostart: false
    });

    // ─── Create Renderer ───
    const renderer = new window.PokeRenderer({
      container: container || document.getElementById('main-dashboard') || document.body
    });
    this.engine.assign(renderer);

    // ─── Register ECS Systems ───
    renderer.registerSystem(this.engine.world);

    // ─── Init Localization ───
    this._initLocalization();

    // ─── Bridge legacy globals ───
    this._bridgeLegacy();

    // ─── Start Engine ───
    this.engine.start();

    console.log('[PokeGame] Engine initialized:', this.engine.getECSStats());
    return this;
  }

  _initLocalization() {
    // Register FR/EN data from existing globals
    if (window.L_fr_items) window.L.register('fr', { items: window.L_fr_items });
    if (window.L_en_items) window.L.register('en', { items: window.L_en_items });
    if (window.L_fr_talents) window.L.register('fr', { talents: window.L_fr_talents });
    if (window.L_en_talents) window.L.register('en', { talents: window.L_en_talents });
    if (window.L_fr_moves) window.L.register('fr', { moves: window.L_fr_moves });
    if (window.L_en_moves) window.L.register('en', { moves: window.L_en_moves });
    
    // Set from G.lang
    if (window.G?.lang) window.L.set(window.G.lang);
  }

  _bridgeLegacy() {
    // Passe 3 : les ponts legacy vers ItemInfoPanel/MoveInfoPanel ont été
    // supprimés. Tous les panneaux d'info (objet/attaque/talent) passent
    // désormais par le système unifié pwBuildInfoPanel + #poke-modal,
    // avec retour contextuel vers le menu d'origine.
  }
}

window.PokeGame = PokeGame;
if (!window.poke) window.poke = {};
window.poke.Game = PokeGame;
})();
