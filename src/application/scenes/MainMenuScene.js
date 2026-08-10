/**
 * PokeWorld — MainMenuScene (1 of the game's 2 scenes)
 *
 * The save-selection scene: shown while no game session is active (save
 * card / starter choice overlays). It owns the menu layer and hands the
 * player off to the GameScene through the SceneManager when a session
 * starts. Everything else in the game (bag, box, quests...) is NOT a
 * scene: those are views/windows opened over the GameScene.
 *
 * The scene reconciles the menu layer on enter (wave 23): it tracks the
 * REAL overlay element that is visible (the starter modal or the
 * #save-menu-screen with its `is-open` class), restores the truthful body
 * classes, and — as a safety net — re-renders the save menu when it is
 * entered while no session exists and no overlay is displayed. The legacy
 * markup rendering itself stays in save.js / starter.js; this scene only
 * manages the menu layer's DOM state and emits truthful lifecycle events
 * (scene:enter/scene:exit).
 *
 * @module application/scenes/MainMenuScene
 */
import { Scene } from '../../engine/core/Scene.js';

/** @returns {boolean} True while the starter overlay is actually shown. */
function starterOpen() {
  if (typeof document === 'undefined') return false;
  const starter = document.getElementById('starter-modal');
  return !!(starter && (
    (starter.classList && starter.classList.contains('open'))
    || (starter.style && starter.style.display === 'flex')
  ));
}

/** @returns {boolean} True while the save menu screen owns the display. */
function saveMenuOpen() {
  if (typeof document === 'undefined') return false;
  const saveMenu = document.getElementById('save-menu-screen');
  return !!(saveMenu && saveMenu.classList && saveMenu.classList.contains('is-open'));
}

export class MainMenuScene extends Scene {
  constructor(options = {}) {
    super({ name: options.name || 'MainMenuScene', bus: options.bus });
  }

  onEnter() {
    if (typeof document === 'undefined') return;
    const started = (typeof window !== 'undefined') && !!window.PokeWorldGameStarted;
    // The menu overlay of this scene is whichever layer is actually shown.
    this._menuOverlay = starterOpen()
      ? document.getElementById('starter-modal')
      : (saveMenuOpen()
        ? document.getElementById('save-menu-screen')
        : (document.getElementById('save-menu-screen') || document.getElementById('starter-modal') || null));
    if (started) return; // starter re-pick mid-session: the session classes stay.
    const body = document.body;
    if (!starterOpen() && !saveMenuOpen()
        && typeof window !== 'undefined' && typeof window.renderSaveMenu === 'function') {
      // Safety net: menu scene active with nothing displayed — re-open the
      // save menu (renderSaveMenu itself restores the body classes and
      // re-syncs the scenes, which is a no-op since this scene is current).
      try { window.renderSaveMenu(); } catch (_) { /* PokeUI not ready yet: boot retries on its own tick. */ }
    } else if (body && body.classList) {
      body.classList.add('save-menu-active');
      body.classList.remove('game-started');
    }
  }

  /** @returns {boolean} True while a save/starter overlay is visible. */
  get menuVisible() {
    const el = this._menuOverlay;
    if (!el) return false;
    if (el.id === 'save-menu-screen') {
      return !!(el.classList && el.classList.contains('is-open'));
    }
    return !!((el.classList && el.classList.contains('open'))
      || (el.style && el.style.display === 'flex'));
  }
}
