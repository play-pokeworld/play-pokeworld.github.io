(function () {
  const scripts = [
  // ─── Localisation ───
  "src/localization/fr/ui.js",
  "src/localization/fr/economy.js",
  "src/localization/fr/combat.js",
  "src/localization/fr/stats.js",
  "src/localization/fr/pokedex.js",
  "src/localization/fr/pokemon-names.js",
  "src/localization/fr/locations.js",
  "src/localization/fr/items.js",
  "src/localization/fr/move-descs.js",
  "src/localization/fr/types.js",
  "src/localization/fr/talents.js",
  "src/localization/fr/shops.js",
  "src/localization/fr/base.js",
  "src/localization/fr/champions.js",
  "src/localization/fr/lore.js",
  "src/localization/fr/quests.js",
  "src/localization/fr/npc.js",
  "src/localization/fr/messages.js",
  "src/localization/en/ui.js",
  "src/localization/en/economy.js",
  "src/localization/en/combat.js",
  "src/localization/en/stats.js",
  "src/localization/en/pokedex.js",
  "src/localization/en/move-names.js",
  "src/localization/en/locations.js",
  "src/localization/en/items.js",
  "src/localization/en/types.js",
  "src/localization/en/talents.js",
  "src/localization/en/pokemon-names.js",
  "src/localization/en/shops.js",
  "src/localization/en/base.js",
  "src/localization/en/champions.js",
  "src/localization/en/lore.js",
  "src/localization/en/quests.js",
  "src/localization/en/npc.js",
  "src/localization/en/messages.js",
  "src/localization/data.js",
  "src/localization/i18n.js",

  // ─── Engine Core ───
  "src/engine/core/ECS.js",
  "src/engine/core/Input.js",
  "src/engine/core/Timer.js",
  "src/engine/core/Audio.js",
  "src/engine/core/Engine.js",
  "src/engine/events/EventBus.js",
  "src/engine/renderer/Sprite.js",
  "src/engine/renderer/Text.js",
  "src/engine/renderer/Badge.js",
  "src/engine/renderer/ProgressBar.js",
  "src/engine/renderer/Button.js",
  "src/engine/renderer/List.js",
  "src/engine/renderer/Panel.js",
  "src/engine/renderer/Renderer.js",
  "src/engine/renderer/InjectStyles.js",
  "src/engine/renderer/LegacyOverrides.js",
  "src/engine/data/ResourceManager.js",
  "src/engine/data/Localization.js",
  "src/engine/data/poke-core.js",
  "src/engine/data/badge-helper.js",
  "src/engine/item-engine.js",
  "src/engine/item-database.js",
  "src/engine/styles.js",
  "src/engine/Game.js",
  "src/engine/Config.js",
  "src/engine/Icons.js",
  "src/engine/PokemonDB.js",
  "src/engine/MoveDB.js",
  "src/engine/AbilityDB.js",
  "src/engine/init.js",
  "src/engine/renderer/InfoPanel.js",

  // ─── Core ───
  "src/game/core/event-bus.js",
  "src/game/core/state.js",
  "src/game/core/util.js",
  "src/game/core/pokemon-factory.js",

  // ─── Data ───
  "src/data/ui-icons.js",
  "src/data/moves.js",
  "src/data/sprites.js",
  "src/data/trainer-sprites-data.js",
  "src/data/items-data.js",
  "src/data/base-layouts-data.js",
  "src/data/base-items-data.js",
  "src/data/base-manifest-2d-data.js",
  "src/data/items-helpers.js",
  "src/data/ctcs-shop-data.js",
  "src/data/talents-data.js",
  "src/data/talents-full.js",
  "src/data/poke-talents.js",
  "src/data/pokedex-flavor.js",
  "src/data/pd-data.js",
  "src/data/poke-talents-data.js",
  "src/data/story-quests.js",
  "src/data/story-quests-hoenn.js",
  "src/data/locations-data.js",
  "src/data/locations-johto.js",
  "src/data/locations-hoenn.js",
  "src/data/shops-data.js",
  "src/data/shops-hoenn.js",
  "src/data/story-lore.js",
  "src/data/route-drops.js",
  "src/data/game-helpers.js",
  "src/data/unlock-logic.js",
  "src/data/champions-data.js",
  "src/data/official-teams-data.js",
  "src/data/official-teams-hoenn.js",
  "src/data/atoll-sets-data.js",
  "src/data/quest-data.js",
  "src/data/side-quests-data.js",
  "src/data/repeatable-quests-data.js",
  "src/data/npc-data.js",
  "src/data/map-images.js",

  // ─── Game - Display ───
  "src/game/display/sprite-helpers.js",
  "src/game/display/shortcuts.js",

  // ─── Game - World ───
  "src/game/world/atoll-core.js",
  "src/game/world/world.js",
  "src/game/world/collection.js",
  "src/game/world/puzzle-explorations.js",
  "src/game/world/team.js",

  // ─── Game - Quests ───
  "src/game/quests/quest-core.js",
  "src/game/quests/quest-ui.js",

  // ─── Game - Economy ───
  "src/game/economy/mine.js",
  "src/game/economy/mine-ui.js",
  "src/game/economy/inventory.js",
  "src/game/economy/inventory-actions.js",
  "src/game/economy/shop.js",
  "src/game/economy/market.js",
  "src/game/economy/pokedex.js",

  // ─── Game - Combat ───
  "src/game/combat/battle-init.js",
  "src/game/combat/battle-encounter.js",
  "src/game/combat/battle-tick.js",
  "src/game/combat/battle-attack.js",
  "src/game/combat/battle-status.js",
  "src/game/combat/battle-ui.js",
  "src/game/combat/battle-team-ui.js",
  "src/game/combat/battle-flow.js",
  "src/game/combat/battle-switch.js",
  "src/game/combat/battle-summary.js",
  "src/game/combat/progression.js",
  "src/game/combat/catch.js",
  "src/game/combat/training.js",
  "src/game/combat/move-learning.js",

  // ─── Game - Breeding ───
  "src/game/breeding/hatchery.js",
  "src/game/breeding/hatchery-ui.js",

  // ─── Game - Automation ───
  "src/game/automation/automation.js",

  // ─── Game - Boxes ───
  "src/game/boxes/box-selector.js",

  // ─── Game - Save ───
  "src/game/save/save.js",
  "src/game/base/base-core.js",
  "src/game/base/base-visit.js",
  "src/game/base/base-exchange.js",
  "src/game/base/base-editor.js",
  "src/game/base/base-debug.js",
  "src/game/base/base-npc-editor.js",
  "src/game/base/base-dialog.js",
  "src/game/base/base-view2d.js",
  "src/game/base/base-window.js",

  "src/game/save/save-extras.js",
  "src/game/save/settings.js",
  "src/game/save/offline-engine.js",

  // ─── Game - Display (suite) ───
  "src/game/display/map-logic.js",
  "src/game/display/map-render.js",
  "src/game/display/region.js",
  "src/game/display/dashboard.js",
  "src/game/display/win-drag.js",
  "src/game/display/tabs.js",
  "src/game/display/team-ui.js",
  "src/game/display/team-manage.js",
  "src/game/display/location-info.js",
  "src/game/display/exploration.js",
  "src/game/display/box-ui.js",
  "src/game/display/poke-modal.js",
  "src/game/display/box-modal.js",
  "src/game/display/starter.js",
  "src/game/display/map-help.js",
  "src/game/display/fullscreen-panel.js",
  "src/game/display/preset-manager.js",
  "src/game/display/tutorial.js",
  "src/game/display/bootstrap.js",
  "src/game/ui/Components.js",
  ];
  function loadScript(index) {
    if (index >= scripts.length) return;
    const script = document.createElement('script');
    script.src = scripts[index];
    script.async = false;
    script.onload = function () { loadScript(index + 1); };
    script.onerror = function () { console.error('[PokeWorld] Failed to load:', scripts[index]); loadScript(index + 1); };
    document.head.appendChild(script);
  }
  loadScript(0);
})();

