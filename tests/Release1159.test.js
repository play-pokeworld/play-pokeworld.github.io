/**
 * @file Release1159.test.js
 * @brief Comprehensive test suite for v1.15.9:
 *   1. Stone alias registration and RouteDrops canonical items (valid items, valid image paths, ItemDB aliases).
 *   2. SpeciesSourceCatalog obtainment sources (Black Market, dynamic Roaming route, Legend Fragments, Quests).
 *   3. PokedexDetailModal evolution formatting & tab switching without modal re-rendering.
 *   4. PokedexPanel legacy inline detail removal and clean Pokédex detail navigation.
 */

import { describe, assert } from './TestRunner.js';
import { ItemDB } from '../src/data/items/ItemDB.js';
import { ROUTE_DROPS } from '../src/data/world/RouteDrops.js';
import { SpeciesSourceCatalog } from '../src/data/pokemon/SpeciesSourceCatalog.js';
import { RoamingSystem } from '../src/systems/RoamingSystem.js';
import { PokedexDetailModal } from '../src/panels/PokedexDetailModal.js';
import { PokedexPanel } from '../src/panels/fullscreen/PokedexPanel.js';
import { LocationPanel } from '../src/panels/LocationPanel.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { PokemonDB } from '../src/data/pokemon/PokemonDB.js';
import { ExperienceCurve } from '../src/data/pokemon/ExperienceCurve.js';
import { EventBus } from '../src/core/EventBus.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../src/config/ModalIds.js';

describe('Release 1.15.9 - Evolution Formatting, Pokédex Sources, Route Drops & Tab Continuity', (test) => {

  test('RouteDrops uses canonical item IDs and ItemDB resolves stone aliases', () => {
    const itemDb = ItemDB.getInstance();

    // 1. Check stone aliases resolution in ItemDB
    const fireStone = itemDb.getById('fire_stone');
    assert.ok(fireStone, 'fire_stone alias resolves');
    assert.equal(fireStone.id, 'firestone', 'fire_stone resolves to firestone definition');
    assert.equal(itemDb.getById('water_stone')?.id, 'waterstone', 'water_stone resolves to waterstone');
    assert.equal(itemDb.getById('thunder_stone')?.id, 'thunderstone', 'thunder_stone resolves to thunderstone');
    assert.equal(itemDb.getById('leaf_stone')?.id, 'leafstone', 'leaf_stone resolves to leafstone');
    assert.equal(itemDb.getById('moon_stone')?.id, 'moonstone', 'moon_stone resolves to moonstone');
    assert.equal(itemDb.getById('sun_stone')?.id, 'sunstone', 'sun_stone resolves to sunstone');

    // 2. Check all items in ROUTE_DROPS exist in ItemDB
    for (const [routeId, dropPool] of Object.entries(ROUTE_DROPS)) {
      for (const itemId of dropPool) {
        assert.ok(itemDb.has(itemId), `Item ${itemId} on route ${routeId} exists in ItemDB`);
        const imgPath = itemDb.getImagePath(itemId);
        assert.ok(imgPath && !imgPath.includes('undefined'), `Item ${itemId} has valid image path: ${imgPath}`);
      }
    }

    // 3. Location drops grid renders correctly
    const dropsComponent = LocationPanel._dropsGrid('route1');
    assert.ok(dropsComponent, 'LocationPanel._dropsGrid returns container for route1');
    const dom = dropsComponent.getDomElement();
    assert.ok(dom.classList.contains('pw-loc-drops-section'), 'renders pw-loc-drops-section');
    assert.ok(dom.querySelector('.pw-loc-drop-grid'), 'renders pw-loc-drop-grid');
    assert.ok(dom.querySelector('.pw-item-sprite'), 'renders drop item sprite');
  });

  test('SpeciesSourceCatalog lists Black Market, dynamic Roaming route, quests, and Legend Fragments', () => {
    // 1. Black Market source
    const eeveeSources = SpeciesSourceCatalog.getFormattedSources('eevee');
    assert.ok(eeveeSources.some((s) => s.includes('Marché Noir') || s.includes('Black Market')), 'Eevee lists Black Market source');
    assert.ok(eeveeSources.some((s) => s.includes('Quête') || s.includes('Quest')), 'Eevee lists Celadon Mansion quest');

    // 2. Dynamic Roaming Route calculation
    const now = Date.UTC(2026, 9, 26, 14, 0, 0); // fixed timestamp
    const articunoRoute = RoamingSystem.getRouteForSpecies('articuno', now);
    assert.ok(articunoRoute, 'RoamingSystem computes route for Articuno');
    assert.equal(typeof articunoRoute.locationId, 'string', 'Route has valid locationId');

    const articunoSources = SpeciesSourceCatalog.getFormattedSources('articuno', now);
    assert.ok(articunoSources.some((s) => s.includes('errant') || s.includes('Roaming')), 'Articuno lists roaming source');
    assert.ok(articunoSources.some((s) => s.includes('Pont Pépite') || s.includes('route24')), 'Articuno sources mention current active roaming route');
    assert.ok(articunoSources.some((s) => s.includes('Atoll de Combat') || s.includes('Battle Atoll')), 'Articuno lists Battle Atoll Legend Fragment summon');

    // 3. Mewtwo sources (Cerulean Cave wild + Quest + Legend Fragments)
    const mewtwoSources = SpeciesSourceCatalog.getFormattedSources('mewtwo');
    assert.ok(mewtwoSources.some((s) => s.includes('Caverne Azurée') || s.includes('Cerulean Cave')), 'Mewtwo lists Cerulean Cave encounter');
    assert.ok(mewtwoSources.some((s) => s.includes('Clone Ultime') || s.includes('Ultimate Clone')), 'Mewtwo lists Cerulean Cave quest');
    assert.ok(mewtwoSources.some((s) => s.includes('Atoll de Combat') || s.includes('Battle Atoll')), 'Mewtwo lists Battle Atoll Legend Fragment summon');
  });

  test('PokedexDetailModal evolution formatting has no raw HTML and move tabs switch without full re-render', () => {
    const modal = new PokedexDetailModal();
    try {
      modal.open({ speciesId: 'ivysaur' });
      const dom = modal.getDomElement();

      // Check evolution section
      const evoRows = dom.querySelectorAll('.pw-pokedex-evo-row');
      assert.ok(evoRows.length >= 2, 'Ivysaur shows both pre-evolution and forward evolution');

      for (const row of evoRows) {
        const text = row.textContent;
        // Verify no raw HTML tags leaked into text
        assert.ok(!text.includes('<b>') && !text.includes('</b>'), 'No raw <b> tags in evolution text');
        assert.ok(!text.includes('</span>'), 'No raw </span> tags in evolution text');
        assert.ok(text.includes('➔') || text.includes('→'), 'Evolution arrow is present');
      }

      // Check move tabs switching without full modal re-render
      const tabButtons = dom.querySelectorAll('.pw-move-tab');
      assert.equal(tabButtons.length, 3, 'Renders 3 move tabs (level, tm, training)');

      const movesContainer = dom.querySelector('.pw-pokedex-moves-content');
      assert.ok(movesContainer, 'Moves content container exists');

      // Click TM tab (index 1)
      tabButtons[1].click();
      assert.ok(modal._activeMoveTab === 'tm', 'Switched active move tab to tm');
      const tmGrid = dom.querySelector('.pw-dex-tms-grid');
      assert.ok(tmGrid, 'TM grid rendered smoothly inside moves content container');

      // Click Training tab (index 2)
      tabButtons[2].click();
      assert.equal(modal._activeMoveTab, 'training', 'Switched active move tab to training');

      // Click Level tab (index 0)
      tabButtons[0].click();
      assert.equal(modal._activeMoveTab, 'level', 'Switched active move tab back to level');
      const movesTable = dom.querySelector('.pw-dex-moves-table');
      assert.ok(movesTable, 'Level-up moves table restored smoothly');
    } finally {
      modal.destroy();
    }
  });

  test('PokedexPanel legacy inline detail block is removed and clicking species opens PokedexDetailModal', () => {
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = saves.createNewSave('DexTrainer9', 'charmander');
    saves.setCurrentSave(save);

    const panel = new PokedexPanel();
    let requestedModal = null;
    let requestedParams = null;

    const unsubscribe = EventBus.getInstance().subscribe(ModalOpenRequestedEvent, (event) => {
      requestedModal = event.modalId;
      requestedParams = event.params;
    });

    try {
      panel.open();
      const dom = panel.getDomElement();

      // Ensure no legacy pw-pokedex-detail block is rendered in PokedexPanel
      const legacyDetail = dom.querySelector('.pw-pokedex-detail');
      assert.equal(legacyDetail, null, 'No legacy inline pw-pokedex-detail element exists in PokedexPanel');

      // Grid is present
      const grid = dom.querySelector('.pw-pokedex-grid');
      assert.ok(grid, 'Pokedex grid is rendered');

      // Click on seen species (charmander)
      const charmanderTile = dom.querySelector('[data-focus-key="dex-charmander"]');
      assert.ok(charmanderTile, 'Charmander tile is present in grid');
      charmanderTile.click();

      // Verify that PokedexDetailModal open event was dispatched
      assert.equal(requestedModal, ModalIds.POKEDEX_DETAIL, 'Dispatched ModalOpenRequestedEvent for POKEDEX_DETAIL');
      assert.equal(requestedParams?.speciesId, 'charmander', 'Species ID passed is charmander');

      // Re-verify that still no legacy pw-pokedex-detail block exists after selection
      assert.equal(dom.querySelector('.pw-pokedex-detail'), null, 'Still no inline pw-pokedex-detail after clicking species');
    } finally {
      unsubscribe();
      panel.destroy();
      saves.setCurrentSave(previous);
    }
  });

  test('BattleSystem._giveExp handles level-up evolution without crashing (this._save fix)', () => {
    const saves = SaveSystem.getInstance();
    const previous = saves.getCurrentSave();
    const save = saves.createNewSave('EvoCombatTrainer', 'bulbasaur');
    saves.setCurrentSave(save);

    const battler = BattleSystem.getInstance();
    const bulbasaur = save.team[0];
    bulbasaur.level = 15;
    bulbasaur.exp = 0;

    // Start a battle session so _session and log are active
    const started = battler.startBattle('route1');
    assert.ok(started, 'Wild battle started');

    try {
      // Simulate gaining enough EXP to level up Bulbasaur from Lv 15 to Lv 16 (evolution level for Bulbasaur -> Ivysaur)
      const expNeeded = (ExperienceCurve.levelStart(16) - bulbasaur.exp) + 50;
      battler._giveExp(bulbasaur, expNeeded);

      assert.equal(bulbasaur.species, 'ivysaur', 'Bulbasaur evolved to Ivysaur during battle');
      assert.ok(save.pokedex.isCaught('ivysaur'), 'Ivysaur is marked as caught in Pokédex');
    } finally {
      battler.endBattle(false);
      saves.setCurrentSave(previous);
    }
  });

});
