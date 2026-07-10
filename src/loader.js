// ============================================================================
// MODULE LOADER — loads all game scripts in strict dependency order.
// Used by index.html (the modular dev build). Requires a local web server.
// Run:  python3 -m http.server 8000   then open http://localhost:8000/
// ============================================================================
(function(){
  var CSS = [
    "src/assets/css/style.css"
  ];
  var SCRIPTS = [
    "src/scripts/core/state.js",
    "src/scripts/core/event-bus.js",
    "src/scripts/core/util.js",
    "src/localization/fr/ui.js",
    "src/localization/fr/economy.js",
    "src/localization/fr/combat.js",
    "src/localization/fr/stats.js",
    "src/localization/fr/pokedex.js",
    "src/localization/fr/pokemon-names.js",
    "src/localization/fr/locations.js",
    "src/localization/fr/items.js",
    "src/localization/fr/talents.js",
    "src/localization/fr/shops.js",
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
    "src/localization/en/talents.js",
    "src/localization/en/shops.js",
    "src/localization/en/champions.js",
    "src/localization/en/lore.js",
    "src/localization/en/quests.js",
    "src/localization/en/npc.js",
    "src/localization/en/messages.js",
    "src/localization/data.js",
    "src/localization/i18n.js",
    "src/scripts/core/pokemon-factory.js",
    "src/scripts/data/moves.js",
    "src/scripts/data/sprites.js",
    "src/scripts/data/items-data.js",
    "src/scripts/data/items-helpers.js",
    "src/scripts/data/talents-data.js",
    "src/scripts/data/poke-talents.js",
    "src/scripts/data/story-quests.js",
    "src/scripts/data/locations-data.js",
    "src/scripts/data/locations-johto.js",
    "src/scripts/data/shops-data.js",
    "src/scripts/data/story-lore.js",
    "src/scripts/data/route-drops.js",
    "src/scripts/data/game-helpers.js",
    "src/scripts/data/unlock-logic.js",
    "src/scripts/data/champions-data.js",
    "src/scripts/data/quest-data.js",
    "src/scripts/data/side-quests-data.js",
    "src/scripts/data/repeatable-quests-data.js",
    "src/scripts/data/npc-data.js",
    "src/scripts/display/sprite-helpers.js",
    "src/scripts/gameplay/world/world.js",
    "src/scripts/gameplay/world/collection.js",
    "src/scripts/gameplay/world/team.js",
    "src/scripts/gameplay/quests/quest-core.js",
    "src/scripts/gameplay/quests/quest-ui.js",
    "src/scripts/gameplay/economy/mine.js",
    "src/scripts/gameplay/economy/mine-ui.js",
    "src/scripts/gameplay/economy/inventory.js",
    "src/scripts/gameplay/economy/inventory-actions.js",
    "src/scripts/gameplay/economy/shop.js",
    "src/scripts/gameplay/economy/market.js",
    "src/scripts/gameplay/economy/pokedex.js",
    "src/scripts/gameplay/combat/battle-init.js",
    "src/scripts/gameplay/combat/battle-encounter.js",
    "src/scripts/gameplay/combat/battle-tick.js",
    "src/scripts/gameplay/combat/battle-attack.js",
    "src/scripts/gameplay/combat/battle-status.js",
    "src/scripts/gameplay/combat/battle-ui.js",
    "src/scripts/gameplay/combat/battle-team-ui.js",
    "src/scripts/gameplay/combat/battle-flow.js",
    "src/scripts/gameplay/combat/battle-switch.js",
    "src/scripts/gameplay/combat/battle-summary.js",
    "src/scripts/gameplay/combat/progression.js",
    "src/scripts/gameplay/combat/catch.js",
    "src/scripts/gameplay/combat/training.js",
    "src/scripts/gameplay/combat/move-learning.js",
    "src/scripts/gameplay/breeding/hatchery.js",
    "src/scripts/gameplay/breeding/hatchery-ui.js",
    "src/scripts/gameplay/automation/automation.js",
    "src/scripts/gameplay/boxes/box-selector.js",
    "src/scripts/gameplay/save/save.js",
    "src/scripts/gameplay/save/save-extras.js",
    "src/scripts/gameplay/save/settings.js",
    "src/scripts/data/map-images.js",
    "src/scripts/display/map-logic.js",
    "src/scripts/display/map-render.js",
    "src/scripts/display/region.js",
    "src/scripts/display/dashboard.js",
    "src/scripts/display/win-drag.js",
    "src/scripts/display/tabs.js",
    "src/scripts/display/team-ui.js",
    "src/scripts/display/team-manage.js",
    "src/scripts/display/location-info.js",
    "src/scripts/display/exploration.js",
    "src/scripts/display/box-ui.js",
    "src/scripts/display/poke-modal.js",
    "src/scripts/display/box-modal.js",
    "src/scripts/display/starter.js",
    "src/scripts/display/map-help.js",
    "src/scripts/display/shortcuts.js",
    "src/scripts/display/fullscreen-panel.js",
    "src/scripts/display/bootstrap.js"
  ];
  function loadCSS(href){
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
  }
  function loadJS(src, cb){
    var s = document.createElement('script');
    s.src = src; s.async = false;
    s.onload = cb;
    s.onerror = function(){ console.error('Failed to load: ' + src); };
    document.head.appendChild(s);
  }
  function loadSequential(i){
    if(i >= SCRIPTS.length){ console.log('PokéWorld: all ' + SCRIPTS.length + ' modules loaded'); return; }
    loadJS(SCRIPTS[i], function(){ loadSequential(i+1); });
  }
  CSS.forEach(loadCSS);
  loadSequential(0);
})();

