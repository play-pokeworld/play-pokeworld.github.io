/**
 * PokeWorld — GameScene (1 of the game's 2 scenes)
 *
 * The game itself: world, dashboard, battle center and the window layer.
 * Every player-facing display other than the save-selection menu is a
 * UIView (window/panel) opened ON TOP of this scene — never a scene.
 *
 * The scene owns the view registry: classic adapters will progressively
 * route their windows through openView()/closeView() as the migration
 * advances, keeping ONE entity world per open view and a single stack of
 * open windows for consistent z-ordering and lifecycle.
 *
 * @module application/scenes/GameScene
 */
import { Scene } from '../../engine/core/Scene.js';

export class GameScene extends Scene {
  constructor(options = {}) {
    super({ name: options.name || 'GameScene', bus: options.bus });
    /** @type {Map<string, import('../../ui/views/UIView.js').UIView>} Open views by name. */
    this._openViews = new Map();
  }

  /**
   * Open (or re-focus) a view above the game scene. The view mounts into
   * the provided host element and enters the ECS update loop of the scene.
   * @param {string} name Registry key (e.g. 'bag', 'dictionary').
   * @param {import('../../ui/views/UIView.js').UIView} view
   * @param {Element} [host] Host element (browser runtime only).
   * @returns {import('../../ui/views/UIView.js').UIView}
   */
  openView(name, view, host = null) {
    const existing = this._openViews.get(name);
    if (existing && existing !== view) existing.dispose();
    this._openViews.set(name, view);
    if (host) view.mount(host);
    else view.enter();
    return view;
  }

  /**
   * Close a view by name (kept resident for fast re-open) or dispose it.
   * @param {string} name
   * @param {boolean} [dispose=false]
   */
  closeView(name, dispose = false) {
    const view = this._openViews.get(name);
    if (!view) return;
    if (dispose) {
      view.dispose();
      this._openViews.delete(name);
    } else {
      view.exit();
    }
  }

  /** @returns {Map<string, import('../../ui/views/UIView.js').UIView>} */
  get openViews() {
    return new Map(this._openViews);
  }

  onEnter() {
    // Wave 23: entering the game scene with a live session means the menu
    // layer MUST be gone — this reconciles the DOM truthfully (the save
    // screen is class-driven: #save-menu-screen.is-open).
    if (typeof document === 'undefined') return;
    const started = (typeof window !== 'undefined') && !!window.PokeWorldGameStarted;
    if (!started) return;
    const saveMenu = document.getElementById('save-menu-screen');
    if (saveMenu && saveMenu.classList) saveMenu.classList.remove('is-open');
    const body = document.body;
    if (body && body.classList) {
      body.classList.remove('save-menu-active');
      body.classList.add('game-started');
    }
  }

  onUpdate(dt) {
    for (const view of this._openViews.values()) {
      if (view.open) view.update(dt);
    }
  }

  onDispose() {
    for (const view of this._openViews.values()) view.dispose();
    this._openViews.clear();
  }
}

