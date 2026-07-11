// ============================================================================
// MODULE LOADER — loads all game scripts in strict dependency order.
// Used by index.html (the modular dev build). Requires a local web server.
// Run: python3 -m http.server 8000 then open http://localhost:8000/
// ============================================================================
(function(){
  var V = '?v=' + Date.now();
  var CSS = [
    "src/assets/css/style.css" + V,
  ];
 var SCRIPTS = [
"src/scripts/core/state.js" + V,
"src/scripts/core/event-bus.js" + V,
"src/scripts/core/util.js" + V,
"src/localization/fr/ui.js" + V,
"src/localization/fr/economy.js" + V,
"src/localization/fr/combat.js" + V,
"src/localization/fr/stats.js" + V,
"src/localization/fr/pokedex.js" + V,
"src/localization/fr/pokemon-names.js" + V,
"src/localization/fr/locations.js" + V,
"src/localization/fr/items.js" + V,
"src/localization/fr/talents.js" + V,
"src/localization/fr/shops.js" + V,
"src/localization/fr/champions.js" + V,
"src/localization/fr/lore.js" + V,
"src/localization/fr/quests.js" + V,
"src/localization/fr/npc.js" + V,
"src/localization/fr/messages.js" + V,
"src/localization/en/ui.js" + V,
"src/localization/en/economy.js" + V,
"src/localization/en/combat.js" + V,
"src/localization/en/stats.js" + V,
"src/localization/en/pokedex.js" + V,
"src/localization/en/move-names.js" + V,
"src/localization/en/locations.js" + V,
"src/localization/en/items.js" + V,
"src/localization/en/talents.js" + V,
"src/localization/en/shops.js" + V,
"src/localization/en/champions.js" + V,
"src/localization/en/lore.js" + V,
"src/localization/en/quests.js" + V,
"src/localization/en/npc.js" + V,
"src/localization/en/messages.js" + V,
"src/localization/data.js" + V,
"src/localization/i18n.js" + V,
"src/scripts/core/pokemon-factory.js" + V,
"src/scripts/data/ui-icons.js" + V,
"src/scripts/data/moves.js" + V,
"src/scripts/data/sprites.js" + V,
"src/scripts/data/items-data.js" + V,
"src/scripts/data/items-helpers.js" + V,
"src/scripts/data/talents-data.js" + V,
"src/scripts/data/talents-full.js" + V,
"src/scripts/data/pokemon-talents.js" + V,
"src/scripts/data/poke-talents.js" + V,
"src/scripts/data/story-quests.js" + V,
"src/scripts/data/locations-data.js" + V,
"src/scripts/data/locations-johto.js" + V,
"src/scripts/data/shops-data.js" + V,
"src/scripts/data/story-lore.js" + V,
"src/scripts/data/route-drops.js" + V,
"src/scripts/data/game-helpers.js" + V,
"src/scripts/data/unlock-logic.js" + V,
"src/scripts/data/champions-data.js" + V,
"src/scripts/data/quest-data.js" + V,
"src/scripts/data/side-quests-data.js" + V,
"src/scripts/data/repeatable-quests-data.js" + V,
"src/scripts/data/npc-data.js" + V,
"src/scripts/display/sprite-helpers.js" + V,
"src/scripts/gameplay/world/world.js" + V,
"src/scripts/gameplay/world/collection.js" + V,
"src/scripts/gameplay/world/team.js" + V,
"src/scripts/gameplay/quests/quest-core.js" + V,
"src/scripts/gameplay/quests/quest-ui.js" + V,
"src/scripts/gameplay/economy/mine.js" + V,
"src/scripts/gameplay/economy/mine-ui.js" + V,
"src/scripts/gameplay/economy/inventory.js" + V,
"src/scripts/gameplay/economy/inventory-actions.js" + V,
"src/scripts/gameplay/economy/shop.js" + V,
"src/scripts/gameplay/economy/market.js" + V,
"src/scripts/gameplay/economy/pokedex.js" + V,
"src/scripts/gameplay/combat/battle-init.js" + V,
"src/scripts/gameplay/combat/battle-encounter.js" + V,
"src/scripts/gameplay/combat/battle-tick.js" + V,
"src/scripts/gameplay/combat/battle-attack.js" + V,
"src/scripts/gameplay/combat/battle-status.js" + V,
"src/scripts/gameplay/combat/battle-ui.js" + V,
"src/scripts/gameplay/combat/battle-team-ui.js" + V,
"src/scripts/gameplay/combat/battle-flow.js" + V,
"src/scripts/gameplay/combat/battle-switch.js" + V,
"src/scripts/gameplay/combat/battle-summary.js" + V,
"src/scripts/gameplay/combat/progression.js" + V,
"src/scripts/gameplay/combat/catch.js" + V,
"src/scripts/gameplay/combat/training.js" + V,
"src/scripts/gameplay/combat/move-learning.js" + V,
"src/scripts/gameplay/breeding/hatchery.js" + V,
"src/scripts/gameplay/breeding/hatchery-ui.js" + V,
"src/scripts/gameplay/automation/automation.js" + V,
"src/scripts/gameplay/boxes/box-selector.js" + V,
"src/scripts/gameplay/save/save.js" + V,
"src/scripts/gameplay/save/save-extras.js" + V,
"src/scripts/gameplay/save/settings.js" + V,
"src/scripts/data/map-images.js" + V,
"src/scripts/display/map-logic.js" + V,
"src/scripts/display/map-render.js" + V,
"src/scripts/display/region.js" + V,
"src/scripts/display/dashboard.js" + V,
"src/scripts/display/win-drag.js" + V,
"src/scripts/display/tabs.js" + V,
"src/scripts/display/team-ui.js" + V,
"src/scripts/display/team-manage.js" + V,
"src/scripts/display/location-info.js" + V,
"src/scripts/display/exploration.js" + V,
"src/scripts/display/box-ui.js" + V,
"src/scripts/display/poke-modal.js" + V,
"src/scripts/display/box-modal.js" + V,
"src/scripts/display/starter.js" + V,
"src/scripts/display/map-help.js" + V,
"src/scripts/display/shortcuts.js" + V,
"src/scripts/display/fullscreen-panel.js" + V,
"src/scripts/display/bootstrap.js" + V
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
