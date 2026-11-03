/**
 * @file DungeonKeyboard.js
 * @brief Arrow keys move the trainer inside a dungeon run, wherever the focus is.
 *
 * Audit 1.16.12 §2: the board carried its own `keydown` listener on a `tabindex="0"` grid, but the
 * expedition panel rebuilds that grid on every move (`DungeonRunChangedEvent`). The listener and
 * the focus died with the old node, so the second arrow press scrolled the page instead of moving,
 * and the first one only worked when the player had clicked the board first.
 *
 * Contract:
 *   - the arrows are handled at document level while a run is active: no focus requirement, so a
 *     re-render can never break movement again;
 *   - `preventDefault()` is called for the four arrows whenever a run is active, so Up/Down never
 *     scroll the dashboard during an expedition. Outside a run the arrows keep their native
 *     behaviour (scrolling a list, moving inside a text field);
 *   - the keys are ignored while a modal is open above the game, while a text field has the focus,
 *     and while an encounter battle is running (the run is paused, the board must not move).
 */
import { DungeonSystem } from '../systems/DungeonSystem.js';
import { BattleSystem } from '../systems/BattleSystem.js';
import { ModalFocusScope } from './ModalFocusScope.js';

/** Keyboard key → dungeon direction. */
export const DUNGEON_KEYS = Object.freeze({
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right'
});

/** @type {boolean} */
let _installed = false;

/** @param {EventTarget|null} target @returns {boolean} */
function _isTextEntry(target) {
  const node = /** @type {HTMLElement|null} */ (target);
  if (!node || !node.tagName) return false;
  const tag = String(node.tagName).toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  return node.isContentEditable === true;
}

/**
 * Handles one keydown. Exported so the behaviour is testable without a real document.
 * @param {KeyboardEvent} event
 * @returns {boolean} true when the key was consumed
 */
export function handleDungeonKeydown(event) {
  if (!event || !DUNGEON_KEYS[event.key]) return false;
  const dungeon = DungeonSystem.getInstance();
  if (!dungeon.getRun()?.active) return false;
  if (_isTextEntry(event.target)) return false;
  if (ModalFocusScope.isActive()) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  // A running expedition owns the arrows: this is what stops the page from scrolling.
  event.preventDefault();
  if (typeof event.repeat === 'boolean' && event.repeat) return true;
  if (BattleSystem.getInstance().isActive()) return true;
  dungeon.move(DUNGEON_KEYS[event.key]);
  return true;
}

/**
 * Installs the document listener once. Safe without a DOM (tests, harness).
 * @returns {boolean} true when the listener is active
 */
export function installDungeonKeyboard() {
  if (_installed || typeof document === 'undefined') return _installed;
  document.addEventListener('keydown', handleDungeonKeydown);
  _installed = true;
  return true;
}

/** Removes the listener (tests, page teardown). */
export function uninstallDungeonKeyboard() {
  if (typeof document === 'undefined' || !_installed) return false;
  document.removeEventListener('keydown', handleDungeonKeydown);
  _installed = false;
  return true;
}
