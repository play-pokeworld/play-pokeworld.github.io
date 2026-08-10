/**
 * PokeWorld — Scenes orchestration (the game's only 2 scenes)
 *
 *   MainMenuScene : save selection / starter choice (no active session)
 *   GameScene     : the game itself; every other display is a view/window
 *                   layered above it (never a scene)
 *
 * The SceneManager instance is exposed as window.PokeScenes for classic
 * scripts and debugging. Scene truth is derived from the live session
 * state (wave 23):
 *
 *   menuOpen = starterOpen || (!sessionStarted && saveMenuOpen)
 *
 * The starter overlay is shown AFTER the session state exists (the save is
 * created first, the starter mandatory pick opens over it), so it forces
 * the menu scene on its own. The save menu only owns the screen while no
 * session has started.
 *
 * Scene transitions are driven EXPLICITLY: save.js / starter.js call
 * window.PokeScenes.sync() at the exact moments the session state flips
 * (menu render, save activation, starter show/pick). The former eventBus
 * wiring ('starter:chosen', 'save:loaded', 'save:created',
 * 'game:bootstrap-done') listened to events that NO emitter ever fired —
 * dead wiring, removed.
 *
 * Transitions use SceneManager.replace() (NOT switchTo): the two scenes
 * are resident singletons re-entered across menu ⇄ game round trips
 * (deleteSave returns to the menu mid-session), and switchTo would
 * dispose them on the first switch.
 *
 * @module application/scenes
 */
import { SceneManager } from '../../engine/core/SceneManager.js';
import { eventBus } from '../../core/event-bus.js';
import { MainMenuScene } from './MainMenuScene.js';
import { GameScene } from './GameScene.js';

export const sceneManager = new SceneManager({ bus: eventBus });
export const mainMenuScene = new MainMenuScene({ bus: eventBus });
export const gameScene = new GameScene({ bus: eventBus });

/** @returns {boolean} True while the starter overlay is actually shown. */
function isStarterOpen() {
  const starter = document.getElementById('starter-modal');
  return !!(starter && (
    (starter.classList && starter.classList.contains('open'))
    || (starter.style && starter.style.display === 'flex')
  ));
}

/** @returns {boolean} True while the save menu screen owns the display. */
function isSaveMenuOpen() {
  // REAL id: #save-menu-screen with class `is-open` (the former lookup of
  // a never-existing `#save-menu-modal` made the sync permanently blind —
  // the boot scene was always GameScene, even with the menu displayed).
  const saveMenu = document.getElementById('save-menu-screen');
  return !!(saveMenu && saveMenu.classList && saveMenu.classList.contains('is-open'));
}

/**
 * Reflect the current session state into the scene stack.
 * Called on boot and explicitly after every save/starter transition.
 */
export function syncSceneWithSession() {
  if (typeof document === 'undefined') return;
  const started = (typeof window !== 'undefined') && !!window.PokeWorldGameStarted;
  const menuOpen = isStarterOpen() || (!started && isSaveMenuOpen());
  if (menuOpen) {
    if (sceneManager.current !== mainMenuScene) sceneManager.replace(mainMenuScene);
  } else if (sceneManager.current !== gameScene) {
    sceneManager.replace(gameScene);
  }
}

if (typeof window !== 'undefined') {
  window.PokeScenes = {
    manager: sceneManager,
    mainMenu: mainMenuScene,
    game: gameScene,
    sync: syncSceneWithSession,
  };
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    syncSceneWithSession();
  } else {
    document.addEventListener('DOMContentLoaded', syncSceneWithSession);
  }
}
