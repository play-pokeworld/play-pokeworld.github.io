/**
 * @file TutorialHighlight.js
 * @brief Puts a pulsing halo on the control the current tutorial step asks the player to use.
 *
 * Audit 1.16.12 §1: the halo existed in CSS (`.pw-tuto-target`, design-system) but nothing ever
 * applied it, so the player was told "open the Poké Balls window" without seeing where it is.
 *
 * Contract:
 *   - the mapping step → target lives here, in the UI layer: `TutorialRules` stays DOM-free;
 *   - each entry is a list of selectors tried in order, the first one that matches wins. That
 *     fallback is the actual fix: a panel that is not mounted yet (collapsed window, mobile view,
 *     battle screen) simply hands over to its container, so a step is never left without a halo;
 *   - the halo is re-applied through a `MutationObserver`, not a timer: windows are re-rendered
 *     on many events, and a rebuilt node would silently lose its class.
 *
 * The class itself (pulse, reduced-motion fallback, SVG variant) is styled by
 * `assets/css/design-system/pass-22.css`.
 */
import { EventBus } from '../core/EventBus.js';
import { TutorialProgressChangedEvent } from '../core/events/TutorialProgressChangedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { TutorialSystem } from '../systems/TutorialSystem.js';
import { TutorialRules } from '../config/TutorialRules.js';
import { LocationSystem } from '../systems/LocationSystem.js';
import { DashboardWindowFocusRequestedEvent } from '../core/events/DashboardWindowFocusRequestedEvent.js';
import { t } from '../localization/LocalizationManager.js';
import { SHORTCUTS } from '../config/Shortcuts.js';

export const TUTORIAL_TARGET_CLASS = 'pw-tuto-target';

/**
 * Localized names of the windows a reveal can point at: the button reads « Afficher <nom> » and must
 * use the very title the player sees on that window.
 */
const WINDOW_NAME_KEYS = Object.freeze({
  'win-pokeballs': 'panel_pokeballs_title',
  'win-currency': 'panel_currency_title',
  'win-team': 'win_team',
  'win-shortcuts': 'shortcuts_tab',
  'win-tabs': 'win_tabs',
  'win-map': 'map_title'
});

/** Label of the action tile a travel step expects inside the Location window. */
const TILE_NAME_KEYS = Object.freeze({ battle: 'explore_btn', shop: 'tab_shop' });

/** @param {Readonly<Object>|null} step @returns {Readonly<Object>|null} */
function _stepById(stepId) {
  return TutorialRules.STEPS.find((entry) => entry.id === stepId) || null;
}

/** @param {string} windowId @param {string[]} selectors @returns {string[]} */
function _withWindowFallback(windowId, selectors) {
  return [...selectors, `#${windowId}`];
}

/**
 * Turns a step's reveal descriptor into the controls to point at **and** the label of the card's
 * action button, resolved against the live state: the tutorial shows the map node while the player
 * is elsewhere, then the action tile of the place itself once they are there.
 * @param {string|null} stepId
 * @returns {{selectors: string[], label: string}}
 */
export function tutorialReveal(stepId) {
  const step = _stepById(stepId);
  if (!step) return { selectors: [], label: '' };
  const reveal = step.reveal;
  if (reveal.kind === 'travel') {
    const place = t(`location.${reveal.locationId}`);
    const here = LocationSystem.getInstance().getCurrentLocationId() === reveal.locationId;
    if (!here) {
      return {
        selectors: [
          `#win-map .loc-node[data-node-id="${reveal.locationId}"]`,
          `#win-map [data-node-id="${reveal.locationId}"]`,
          '#win-map'
        ],
        label: t('tutorial_show_place', { place })
      };
    }
    const name = reveal.tile === 'dungeon' ? null : t(TILE_NAME_KEYS[reveal.tile]);
    return {
      selectors: [`#win-tabs [data-tutorial="${reveal.tile}"]`, '#win-tabs'],
      label: name ? t('tutorial_show_action', { action: name }) : t('tutorial_show_dungeon')
    };
  }
  if (reveal.kind === 'shortcut') {
    // The label is the button's own caption, read from the shortcut table: one source for the two.
    const shortcut = SHORTCUTS.find((entry) => entry.id === reveal.shortcutId);
    const name = shortcut ? t(shortcut.labelKey) : reveal.shortcutId;
    return {
      selectors: [`.shortcut-action-btn[data-panel="${reveal.shortcutId}"]`, '#win-shortcuts'],
      label: t('tutorial_show_action', { action: name })
    };
  }
  // A dashboard window, optionally narrowed to one control inside it.
  const selectors = [];
  if (reveal.control === 'ball_row' && reveal.arg) {
    selectors.push(`#${reveal.windowId} [data-filter="${reveal.arg}"] [data-tutorial="ball-slot"]`);
    selectors.push(`#${reveal.windowId} [data-tutorial="ball-slot"]`);
  } else if (reveal.control === 'team_card') {
    selectors.push(`#${reveal.windowId} .pw-poke-card[data-index="0"]`);
  }
  return {
    selectors: _withWindowFallback(reveal.windowId, selectors),
    label: t('tutorial_show_action', { action: t(WINDOW_NAME_KEYS[reveal.windowId] || 'win_tabs') })
  };
}

/** @type {MutationObserver|null} */
let _observer = null;
/** @type {boolean} */
let _scheduled = false;
/** @type {boolean} */
let _applying = false;

/** @returns {string[]} Selectors of a step, most precise first (empty for an unknown step) */
export function tutorialTargetSelectors(stepId) {
  return tutorialReveal(stepId).selectors;
}

/** @param {Element} node @returns {boolean} */
function _isAttached(node) {
  return !!(node && node.isConnected !== false && document.body.contains(node));
}

/**
 * A target must be *painted*, not merely present. The team card's info button is hidden by
 * `@media (hover: hover)` on desktop (the card itself is the click target there) and would
 * otherwise carry a halo nobody can see — the exact bug reported on the "Pokémon sheet" step.
 * @param {Element} node
 * @returns {boolean}
 */
function _isVisible(node) {
  if (!_isAttached(node)) return false;
  if (typeof node.getClientRects !== 'function') return true; // test double without layout
  return node.getClientRects().length > 0;
}

/**
 * Resolves the nodes to highlight for the current step, with selector fallback.
 * @param {string|null} stepId
 * @returns {Element[]}
 */
export function resolveTutorialTargets(stepId) {
  if (!stepId || typeof document === 'undefined') return [];
  for (const selector of tutorialTargetSelectors(stepId)) {
    let nodes = [];
    try {
      nodes = Array.from(document.querySelectorAll(selector));
    } catch (_) {
      nodes = [];
    }
    const visible = nodes.filter(_isVisible);
    if (visible.length) return visible;
  }
  return [];
}

/** Removes the halo everywhere. @returns {number} number of nodes cleared */
export function clearTutorialHighlight() {
  if (typeof document === 'undefined') return 0;
  const previous = Array.from(document.querySelectorAll(`.${TUTORIAL_TARGET_CLASS}`));
  for (const node of previous) node.classList.remove(TUTORIAL_TARGET_CLASS);
  return previous.length;
}

/**
 * Applies the halo of the tutorial's current step (and only that one).
 * @param {Object|null} [status] - Tutorial card status; read from the system when omitted
 * @returns {number} number of highlighted nodes
 */
export function applyTutorialHighlight(status) {
  if (typeof document === 'undefined' || !document.body) return 0;
  const current = status === undefined ? TutorialSystem.getInstance().getCardStatus() : status;
  const wanted = current ? resolveTutorialTargets(current.id) : [];
  const wantedSet = new Set(wanted);
  // Minimal diff: untouched nodes keep their animation running instead of restarting it.
  for (const node of Array.from(document.querySelectorAll(`.${TUTORIAL_TARGET_CLASS}`))) {
    if (!wantedSet.has(node)) node.classList.remove(TUTORIAL_TARGET_CLASS);
  }
  for (const node of wanted) node.classList.add(TUTORIAL_TARGET_CLASS);
  return wanted.length;
}

/**
 * The card's action button: it *shows* the control of the current step and never plays the step.
 * The tutorial used to travel to the place and open the windows for the player, which teaches
 * nothing: now it brings the highlighted control into view (and, on mobile, the view that holds it)
 * so the player clicks it themselves.
 * @param {string|null} stepId
 * @returns {boolean} true when something was pointed at
 */
export function revealTutorialStep(stepId) {
  if (typeof document === 'undefined' || !document.body) return false;
  const nodes = resolveTutorialTargets(stepId);
  if (nodes.length === 0) return false;
  const node = nodes[0];
  const windowElement = node.closest ? node.closest('[id^="win-"]') : null;
  // Mobile only: the dashboard windows live behind the bottom bar, so the view holding the control
  // has to be shown. On desktop the event is ignored (every window is already on screen).
  if (windowElement && windowElement.id) {
    EventBus.getInstance().dispatch(new DashboardWindowFocusRequestedEvent(windowElement.id));
  }
  if (typeof node.scrollIntoView === 'function') {
    node.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }
  applyTutorialHighlight({ id: stepId });
  return true;
}

/** Coalesces bursts of DOM mutations into one re-application per frame. @private */
function _schedule() {
  if (_scheduled) return;
  _scheduled = true;
  const run = () => {
    if (!_scheduled) return;
    _scheduled = false;
    if (_applying) return;
    _applying = true;
    try {
      applyTutorialHighlight();
    } finally {
      _applying = false;
    }
  };
  // Do not depend on a single scheduler: a frame callback may never come (hidden tab, harness),
  // the timer guarantees the halo is applied anyway.
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
  setTimeout(run, 32);
}

/**
 * Starts keeping the halo in sync. Idempotent; safe without a DOM (tests, harness).
 * @returns {boolean} true when the highlight is now installed
 */
export function installTutorialHighlight() {
  if (typeof document === 'undefined' || !document.body) return false;
  const bus = EventBus.getInstance();
  if (!installTutorialHighlight._bound) {
    installTutorialHighlight._bound = true;
    bus.subscribe(TutorialProgressChangedEvent, () => _schedule());
    bus.subscribe(SaveLoadedEvent, () => _schedule());
    bus.subscribe(SaveDeletedEvent, () => {
      clearTutorialHighlight();
      _schedule();
    });
  }
  if (!_observer && typeof MutationObserver === 'function') {
    _observer = new MutationObserver(() => {
      if (_applying) return;
      _schedule();
    });
    _observer.observe(document.body, { childList: true, subtree: true });
  }
  _schedule();
  return true;
}

/** Stops the highlight (tests, page teardown). */
export function uninstallTutorialHighlight() {
  if (_observer) _observer.disconnect();
  _observer = null;
  _scheduled = false;
  clearTutorialHighlight();
}
