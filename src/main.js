import { initUpdateSystem } from "./application/update-system.js";
// PokeWorld — Single ES Module Entry Point (src/hand.js)

// Wave 32 (section 3 — lazy loading): secondary dashboard screens are no
// longer statically imported. Each group registers a dynamic import() loader
// at the exact position the module used to occupy in this list (the loader
// ORDER among deferred screens is therefore unchanged), and the boot
// continuation at the bottom of this file streams them in sequentially right
// after the first paint. The path strings stay in this file on purpose:
// the test suite asserts loader presence/order textually.
const __pwDeferredScreens = [];
import "./version.js";
import "./ui/components/window-chrome.js";
// Engine input system (action registry + dispatcher) + engine runtime classic
// bridge (absorbed with the legacy bridge in wave T2).
import "./engine/input/action-registry.js";
import "./engine/input/action-dispatcher.js";
import "./engine/runtime/classic-bridge.js";
import * as PokeECS from "./engine/core/ECS.js";
import * as _PokeECSUI from "./application/ecs-ui-manager.js";
import * as _PokeECSSystems from "./application/ecs-gameplay-systems.js";
import * as PokeUI from "./ui/index.js";
import * as PokeEngineECS from "./engine/index.js";
import { SPRITE_SIZES } from "./core/design-tokens.js";
import { inputHelpers } from "./core/event-bus.js";
// Wave 42 — convergence of the (removed) templates layer: the card is a
// DS component (ui/components), the two modals are real ECS views
// (ui/views). The PokeUITemplates namespace keeps exactly the same shape
// (window.PokeUITemplates + window.{PokemonCardTemplate,UnifiedPokemonSelectorModal,
// UnifiedTeamEditorModal} unchanged below).
import { PokemonCardTemplate } from "./ui/components/pokemon-card-element.js";
import { UnifiedPokemonSelectorModal, UnifiedTeamEditorModal } from "./ui/views/index.js";
const PokeUITemplates = { PokemonCardTemplate, UnifiedPokemonSelectorModal, UnifiedTeamEditorModal };
import * as PokeFactory from "./domain/pokemon/pokemon-factory.js";
import * as PokeBridge from "./application/ecs-gameplay-bridge.js";
import * as PokeRuntime from "./application/runtime.js";
import { PokeTrace } from "./engine/runtime/trace.js";
// Language fragments are NOT statically imported (wave 32 lazy loading):
// index.html dynamically imports ONLY the active language pack
// (src/localization/fr-pack.js or en-pack.js) BEFORE this module graph
// starts, so data.js merges a complete dictionary at evaluation time —
// identical boot semantics to the former static imports, without carrying
// the second language on the startup path.
import "./localization/data.js";
import "./localization/i18n.js";
import "./engine/core/ECS.js";
import "./engine/core/Input.js";
import "./engine/core/Timer.js";
import "./engine/core/Audio.js";
import "./engine/core/Engine.js";
import "./engine/events/EventBus.js";
import "./engine/resources/ResourceManager.js";
import "./localization/localization-manager.js";
import "./data/poke-core.js";
import "./ui/game/badge-helper.js";
import "./application/economy/item-engine.js";
import "./data/item-database.js";
import "./data/game-config.js";
import "./data/game-icons.js";
import "./data/pokemon-db.js";
import "./data/move-db.js";
import "./data/ability-db.js";
import "./application/game-state.js";
import "./core/game-utils.js";
import "./application/pokemon-factory.js";
import "./data/ui-icons.js";
import "./data/moves.js";
import "./data/sprites.js";
import "./data/trainer-sprites-data.js";
import "./data/items-data.js";
import "./data/base-layouts-data.js";
import "./data/base-items-data.js";
import "./data/base-manifest-2d-data.js";
import "./data/items-helpers.js";
import "./data/ctcs-shop-data.js";
import "./data/talents-data.js";
import "./data/talents-full.js";
import "./data/poke-talents.js";
import "./data/pokedex-flavor.js";
import "./data/pd-data.js";
import "./data/poke-talents-data.js";
import "./data/story-quests.js";
import "./data/story-quests-hoenn.js";
import "./data/locations-data.js";
import "./data/locations-johto.js";
import "./data/locations-hoenn.js";
import "./data/shops-data.js";
import "./data/shops-hoenn.js";
import "./data/story-lore.js";
import "./data/route-drops.js";
import "./data/game-helpers.js";
import "./data/champions-data.js";
import "./data/official-teams-data.js";
import "./data/official-teams-hoenn.js";
import "./data/quest-data.js";
import "./data/side-quests-data.js";
import "./data/repeatable-quests-data.js";
import "./data/npc-data.js";
import "./data/map-images.js";
import "./ui/game/sprite-helpers.js";
import "./ui/game/shortcuts.js";
// Atoll battle island — deferred (world: opened via its own window/panel).
__pwDeferredScreens.push('./data/atoll-sets-data.js', () => import('./data/atoll-sets-data.js'));
__pwDeferredScreens.push('./application/world/atoll-core.js', () => import('./application/world/atoll-core.js'));
import "./application/world/roaming.js";
import "./ui/game/header-window.js";
import "./application/world/collection.js";
import "./application/world/puzzle-explorations.js";
import "./application/world/team.js";
import "./application/quests/quest-core.js";
import "./ui/game/quest-ui.js";
// Mine — deferred (tab content, rendered after load / on open).
__pwDeferredScreens.push('./application/economy/mine.js', () => import('./application/economy/mine.js'));
__pwDeferredScreens.push('./ui/game/mine-ui.js', () => import('./ui/game/mine-ui.js'));
import "./ui/game/inventory.js";
import "./application/economy/inventory-actions.js";
import "./ui/game/shop-panel.js";
// Pokemon market + item shop + treasure sales are ECS-driven
// (world.run('economy:market')) — src/application/market-system.js replaces
// the retired src/game/economy/market.js (deleted, wave 33 §1.3); the market
// PANEL is pure UI (src/ui/game/market-panel.js).
import "./ui/game/market-panel.js";
import "./application/market-system.js";
// Pokedex / dictionary — deferred (tab content, rendered after load / on open).
__pwDeferredScreens.push('./ui/game/pokedex.js', () => import('./ui/game/pokedex.js'));
import "./application/combat/battle-init.js";
import "./application/combat/battle-encounter.js";
// The whole gameplay runtime is ECS-driven through ONE aggregate entry
// (src/application/gameplay-bundle.js): combat:tick (replaces the retired
// src/game/combat/battle-tick.js), world:encounter (§1.1), breeding:hatch
// (§1.2), economy:market (§1.3) — plus the gameplay ports bootstrap.
import "./application/gameplay-bundle.js";
import "./application/combat/battle-attack.js";
import "./application/combat/battle-status.js";
import "./ui/game/battle-ui.js";
import "./ui/game/battle-team-ui.js";
import "./application/combat/battle-flow.js";
import "./application/combat/battle-switch.js";
import "./ui/game/battle-summary.js";
import "./application/combat/progression.js";
import "./application/combat/catch.js";
// Training workshop — deferred (persistent dashboard window, repainted after load).
__pwDeferredScreens.push('./application/combat/training.js', () => import('./application/combat/training.js'));
import "./ui/game/move-learning.js";
// Hatchery window — deferred (persistent dashboard window, repainted by the
// deferred-screens continuation once loaded).
__pwDeferredScreens.push('./application/breeding/hatchery.js', () => import('./application/breeding/hatchery.js'));
__pwDeferredScreens.push('./ui/game/hatchery-ui.js', () => import('./ui/game/hatchery-ui.js'));
import "./application/automation/automation.js";
import "./ui/game/box-selector.js";
import "./application/save/save.js";
// Secret base (editor + 2D view + visit/exchange) — deferred (persistent
// dashboard window, repainted after load; editor opens on demand).
__pwDeferredScreens.push('./application/base/base-core.js', () => import('./application/base/base-core.js'));
__pwDeferredScreens.push('./ui/game/base/base-visit.js', () => import('./ui/game/base/base-visit.js'));
__pwDeferredScreens.push('./ui/game/base/base-exchange.js', () => import('./ui/game/base/base-exchange.js'));
__pwDeferredScreens.push('./ui/game/base/base-editor.js', () => import('./ui/game/base/base-editor.js'));
__pwDeferredScreens.push('./ui/game/base/base-debug.js', () => import('./ui/game/base/base-debug.js'));
__pwDeferredScreens.push('./ui/game/base/base-npc-editor.js', () => import('./ui/game/base/base-npc-editor.js'));
__pwDeferredScreens.push('./ui/game/base/base-dialog.js', () => import('./ui/game/base/base-dialog.js'));
__pwDeferredScreens.push('./ui/game/base/base-view2d.js', () => import('./ui/game/base/base-view2d.js'));
__pwDeferredScreens.push('./ui/game/base/base-window.js', () => import('./ui/game/base/base-window.js'));
import "./application/save/save-extras.js";
import "./application/save/settings.js";
import "./application/save/offline-engine.js";
import "./ui/game/map-logic.js";
import "./ui/game/map-render.js";
import "./ui/game/region.js";
import "./ui/game/dashboard.js";
import "./ui/game/win-drag.js";
import "./ui/game/tabs.js";
import "./ui/game/team-ui.js";
import "./ui/game/team-manage.js";
import "./ui/game/location-info.js";
import "./application/world/exploration-actions.js";
import "./ui/game/box-ui.js";
import "./ui/game/poke-modal.js";
import "./ui/game/starter.js";
import "./ui/game/map-help.js";
import "./ui/game/fullscreen-panel.js";
import "./ui/game/preset-manager.js";
import "./ui/game/tutorial.js";
import "./application/bootstrap-timers.js";
import "./ui/game/legacy-components.js";
import "./application/scenes/index.js";

if (typeof window !== 'undefined') {
  window.PokeRuntime = PokeRuntime;
  window.PokeECS = PokeECS.ECSWorld;
  window.PokeUI = PokeUI;
  window.PokeUITemplates = PokeUITemplates;
  window.PokemonCardTemplate = PokeUITemplates.PokemonCardTemplate;
  window.UnifiedPokemonSelectorModal = PokeUITemplates.UnifiedPokemonSelectorModal;
  window.UnifiedTeamEditorModal = PokeUITemplates.UnifiedTeamEditorModal;
  // Real ECS engine API (Scene, Components, World, Systems) for classic scripts.
  window.PokeEngineECS = PokeEngineECS;
  // Canonical sprite size tokens (classic sprite helpers clamp to these).
  window.PW_SPRITE_SIZES = SPRITE_SIZES;
  // Central touch/input helpers (src/core/event-bus.js) for classic scripts:
  // long-press gestures and touch detection flow through the event bus.
  window.PokeWorldInput = inputHelpers;
  if (window.PokeWorldEventBus) window.PokeWorldEventBus.input = inputHelpers;
}

export { PokeRuntime, PokeECS, PokeUI, PokeUITemplates, PokeFactory, PokeBridge };

// ─── Wave 32 (section 3) — boot continuation: background second language ──
// and deferred secondary screens. Everything below runs AFTER the first
// paint: the startup chunk only carries the active language and the
// boot-critical screens.

const __pwActiveLangNow = (typeof window !== 'undefined' && window.__pwActiveLang) || 'fr';
const __pwLoadedLanguages = new Set([__pwActiveLangNow]);

function __pwRefreshLocalization() {
  try { if (typeof window.__pwLocalizeRemerge === 'function') window.__pwLocalizeRemerge(); } catch (_) {}
  try { if (window.L && typeof window.L._captureLegacyData === 'function') window.L._captureLegacyData(); } catch (_) {}
}

/**
 * Ensure the given language pack is loaded (used by setLanguage when the
 * player switches before the background stream completed).
 * @param {string} lang 'fr' | 'en'
 * @returns {Promise<void>}
 */
window.__pwEnsureLanguage = function __pwEnsureLanguage(lang) {
  const code = lang === 'en' ? 'en' : 'fr';
  if (__pwLoadedLanguages.has(code)) return Promise.resolve();
  return (code === 'en'
    ? import('./localization/en-pack.js')
    : import('./localization/fr-pack.js')
  ).then(() => {
    __pwLoadedLanguages.add(code);
    __pwRefreshLocalization();
  });
};

/** Stream the inactive language in the background (no await anywhere). */
function __pwLoadOtherLanguage() {
  const other = __pwActiveLangNow === 'en' ? 'fr' : 'en';
  window.__pwEnsureLanguage(other).catch((err) => {
    console.warn('[i18n] background language pack failed to load:', err);
  });
}

/** Load every deferred secondary screen, in their historical graph order. */
async function __pwLoadDeferredScreens() {
  for (let i = 0; i < __pwDeferredScreens.length; i += 2) {
    const label = __pwDeferredScreens[i];
    const loader = __pwDeferredScreens[i + 1];
    try {
      await loader();
    } catch (err) {
      console.warn('[screens] deferred module failed to load:', label, err);
    }
  }
  // Repaint the pieces boot had to render before those modules existed
  // (persistent dashboard windows + whichever tab is currently shown).
  try { if (typeof window.renderDashboardColumns === 'function') window.renderDashboardColumns(); } catch (_) {}
  try { if (typeof window.renderHatcheryWindow === 'function') window.renderHatcheryWindow(); } catch (_) {}
  try { if (typeof window.renderTrainingWindow === 'function') window.renderTrainingWindow(); } catch (_) {}
  try { if (typeof window.renderMineWindow === 'function') window.renderMineWindow(); } catch (_) {}
  try { if (typeof window.renderHatcheryBadge === 'function') window.renderHatcheryBadge(); } catch (_) {}
  // Automation tickers bootstrap could not start while the modules were
  // missing (mirrors src/application/bootstrap-timers.js, guarded identically).
  try {
    if (typeof window.startMineAutomationTicker === 'function'
      && window.G && window.G.mine && window.G.mine.automation && window.G.mine.automation.enabled) {
      window.startMineAutomationTicker();
    }
  } catch (_) {}
  try { if (typeof window.startTrainingSlotTicker === 'function') window.startTrainingSlotTicker(); } catch (_) {}
  try { initUpdateSystem(); } catch (_) {}
  window.__pwScreensReady = true;
  document.dispatchEvent(new CustomEvent('pw:screensReady'));
  try { PokeTrace.hit('boot', 'screens:ready'); } catch (_) {}
}

window.__pwBootContinuation = new Promise((resolve) => {
  const run = () => {
    // Let the first paint breathe, then stream everything in.
    setTimeout(() => {
      try { PokeTrace.hit('boot', 'stream:start'); } catch (_) {}
      __pwLoadOtherLanguage();
      __pwLoadDeferredScreens().then(() => { try { PokeTrace.hit('boot', 'stream:done'); } catch (_) {} resolve(); }, resolve);
    }, 250);
  };
  if (document.readyState === 'complete' || document.readyState === 'interactive') run();
  else window.addEventListener('DOMContentLoaded', run, { once: true });
});

// Note: the single canonical engine lives under src/engine/ (ECS core). The
// legacy engine copies formerly duplicated under src/game/ have been removed;
// every module above is imported exactly once from its canonical location.
// The legacy pw-bundle.js safety net (file:// fallback + its racy 50 ms
// timer) was removed in wave 32: the file:// case is now detected
// explicitly in index.html instead (see .gitignore: the bundle is a build
// artefact, never committed).
