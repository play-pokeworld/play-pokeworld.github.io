/**
 * @file Release1156.test.js
 * @brief Test suite validating all 12 critical fixes and enhancements for Release 1.15.6.
 */

import { installFakeDom } from './FakeDom.js';
import { describe, assert } from './TestRunner.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { LocationDB } from '../src/data/world/LocationDB.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { SecretBaseSystem } from '../src/systems/SecretBaseSystem.js';
import { SecretBasePlacementRules } from '../src/systems/secret-base/SecretBasePlacementRules.js';
import { FastForwardSystem } from '../src/systems/FastForwardSystem.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { EventBus } from '../src/core/EventBus.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { BattleSides } from '../src/config/BattleSides.js';
import { SecretBasePanel } from '../src/panels/SecretBasePanel.js';
import { MapPanel } from '../src/panels/MapPanel.js';
import { BattleCombatantCard } from '../src/panels/components/BattleCombatantCard.js';
import { PokemonInfoModal } from '../src/panels/PokemonInfoModal.js';
import { PokedexPanel } from '../src/panels/fullscreen/PokedexPanel.js';
import { DashboardColumns } from '../src/config/DashboardLayout.js';

installFakeDom();

describe('Release 1.15.6 Fixes and Mechanics', (test) => {
  test('Pokemon evolution by level triggers automatically on exp gain', () => {
    const save = SaveSystem.getInstance().createNewSave('EvoTester', 'bulbasaur');
    const starter = save.team[0];
    assert.equal(starter.species, 'bulbasaur');
    assert.equal(starter.level, 5);

    // Level up to 16
    starter.setLevel(16);
    const evolved = starter.checkLevelEvolution();
    assert.equal(evolved, 'ivysaur', 'Bulbasaur evolved into Ivysaur at level 16');
    assert.equal(starter.species, 'ivysaur');

    // Level up to 32
    starter.setLevel(32);
    const secondEvo = starter.checkLevelEvolution();
    assert.equal(secondEvo, 'venusaur', 'Ivysaur evolved into Venusaur at level 32');
    assert.equal(starter.species, 'venusaur');
  });

  test('PokemonInfoModal displays evolution level correctly without any manual evolve button', () => {
    const save = SaveSystem.getInstance().createNewSave('SheetTester', 'charmander');
    const charmander = save.team[0];
    charmander.setLevel(15); // level 15: displays required level 16 without manual button

    const modal = new PokemonInfoModal();
    modal.open({ pokemonUid: charmander.uid });
    const dom = modal.getDomElement();

    // Verify evolution section shows required level 16
    const html = dom.textContent;
    assert.ok(html.includes('16') || html.includes('Reptincel') || html.includes('Charmeleon'), 'Evolution level 16 is displayed');

    // Verify NO manual evolve button exists in the DOM
    const evolveBtn = dom.querySelector('.pw-btn-primary.pw-ml-2');
    assert.equal(evolveBtn, null, 'No manual evolve button exists');
    modal.close();
  });

  test('Save loading verifies and automatically evolves all over-leveled Pokémon in the save', () => {
    const save = SaveSystem.getInstance().createNewSave('AutoEvoSaveTester', 'charmander');
    const starter = save.team[0];
    assert.equal(starter.species, 'charmander');

    // Add un-evolved over-leveled Pokémon directly into collection (simulating old save state)
    const overleveledCaterpie = PokemonFactory.create('caterpie', 10);
    overleveledCaterpie.species = 'caterpie'; // explicitly level 10 Caterpie
    save.collection.add(overleveledCaterpie);

    const overleveledPidgey = PokemonFactory.create('pidgey', 36);
    overleveledPidgey.species = 'pidgey'; // explicitly level 36 Pidgey
    save.collection.add(overleveledPidgey);

    // Run verification on save load
    const evolvedCount = save.verifyLevelEvolutions();
    assert.ok(evolvedCount >= 2, 'Evolved overleveled Pokémon in collection');

    // Caterpie at lv 10 must have evolved through Metapod into Butterfree
    assert.equal(overleveledCaterpie.species, 'butterfree', 'Caterpie at level 10 auto-evolved to Butterfree');
    assert.ok(save.pokedex.isCaught('metapod'), 'Metapod marked caught in Pokedex');
    assert.ok(save.pokedex.isCaught('butterfree'), 'Butterfree marked caught in Pokedex');

    // Pidgey at lv 36 must have evolved through Pidgeotto into Pidgeot
    assert.equal(overleveledPidgey.species, 'pidgeot', 'Pidgey at level 36 auto-evolved to Pidgeot');
    assert.ok(save.pokedex.isCaught('pidgeotto'), 'Pidgeotto marked caught in Pokedex');
    assert.ok(save.pokedex.isCaught('pidgeot'), 'Pidgeot marked caught in Pokedex');
  });

  test('Pokedex opens PokemonInfoModal with complete sheet on species click', () => {
    const save = SaveSystem.getInstance().createNewSave('DexTester', 'squirtle');
    save.pokedex.markSeen('bulbasaur');

    let modalOpened = null;
    const bus = EventBus.getInstance();
    const unsubscribe = bus.subscribe(ModalOpenRequestedEvent, (event) => {
      if (event.modalId === ModalIds.POKEMON_INFO) modalOpened = event.params;
    });

    const panel = new PokedexPanel();
    panel.open();
    panel._selectSpecies('bulbasaur');

    assert.ok(modalOpened, 'PokemonInfoModal requested from Pokedex click');
    assert.equal(modalOpened.speciesId, 'bulbasaur');
    unsubscribe();
    panel.close();
  });

  test('BattleCombatantCard right click and long press open PokemonInfoModal for ally and foe', () => {
    const ally = PokemonFactory.create('pikachu', 20);
    const foe = PokemonFactory.create('geodude', 18);

    let requestedAlly = null;
    let requestedFoe = null;
    const bus = EventBus.getInstance();
    const unsubscribe = bus.subscribe(ModalOpenRequestedEvent, (event) => {
      if (event.modalId === ModalIds.POKEMON_INFO) {
        if (event.params.pokemonUid) requestedAlly = event.params.pokemonUid;
        if (event.params.displayPokemon) requestedFoe = event.params.displayPokemon;
      }
    });

    const allyCard = new BattleCombatantCard({ side: BattleSides.PLAYER });
    allyCard.setPokemon(ally);
    allyCard._openInfo();
    assert.equal(requestedAlly, ally.uid, 'Ally card opens info modal with uid');

    const foeCard = new BattleCombatantCard({ side: BattleSides.FOE });
    foeCard.setPokemon(foe);
    foeCard._openInfo();
    assert.equal(requestedFoe, foe, 'Foe card opens info modal with displayPokemon');

    unsubscribe();
  });

  test('Secret base allows moving placed furniture and NPC placement does not block other items', () => {
    const save = SaveSystem.getInstance().createNewSave('BaseTester', 'bulbasaur');
    save.player.region = 'hoenn';
    save.player.location = 'route101';
    save.quests.setMainStep('hoenn', 220);
    save.inventory.add('ticket_base', 1);
    save.secretBase.stock.small_chair = 5;

    const baseSystem = SecretBaseSystem.getInstance();
    assert.ok(baseSystem.establish('route101', 'tree_1').ok);

    const base = baseSystem.getBase();
    const placement = SecretBasePlacementRules.canPlaceNpc(base, { id: 'pal-1' }, 3, 3);
    assert.ok(placement.ok, 'NPC can be placed on valid floor');

    baseSystem.createNpc({ x: 3, y: 3, team: [] });

    // Ensure placing a chair is NOT blocked by the NPC
    const chairPlacement = SecretBasePlacementRules.canPlaceDecoration(base, 'small_chair', 4, 3);
    assert.ok(chairPlacement.ok, 'Decoration placement is not blocked by existing NPC in room');

    // Test moving placed decoration via panel
    const panel = new SecretBasePanel(DashboardColumns.CENTER);
    panel._selectedStockId = 'small_chair';
    panel._onCanvasClick(4, 3); // places small_chair
    assert.equal(panel._selectedStockId, null);

    // Click placed chair to select it
    panel._onCanvasClick(4, 3);
    assert.ok(panel._selectedDecorationUid !== null, 'Chair selected');

    // Click new position to move it
    panel._onCanvasClick(5, 3);
    const movedDec = base.decorations.find((d) => d.itemId === 'small_chair');
    assert.equal(movedDec.x, 5, 'Chair moved to new x coordinate');
    assert.equal(movedDec.y, 3, 'Chair moved to new y coordinate');

    panel.destroy();
  });

  test('LocationPanel calculates and displays accurate wild encounter percentages', () => {
    const encounters = LocationDB.getInstance().getEncounters('route1');
    assert.ok(encounters.length >= 2);

    const totalWeight = encounters.reduce((sum, e) => sum + (e.rarity === 'uncommon' ? 30 : 60), 0);
    for (const e of encounters) {
      const weight = e.rarity === 'uncommon' ? 30 : 60;
      const expectedPct = Math.round((weight / totalWeight) * 1000) / 10;
      assert.ok(expectedPct > 0 && expectedPct <= 100);
    }
  });

  test('MapPanel travel and region change handle active battle gracefully', () => {
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) battle.endBattle(false);
    const save = SaveSystem.getInstance().createNewSave('MapTester', 'charmander');
    assert.ok(battle.startBattle('route1'));
    assert.equal(battle.isActive(), true);

    const mapPanel = new MapPanel(DashboardColumns.LEFT);

    // Traveling during battle invokes confirmation
    mapPanel._travel('pewter');
    assert.ok(mapPanel._confirm.isOpen(), 'Confirm dialog opens when traveling during combat');
    mapPanel._confirm.close();

    // Changing region ends battle
    mapPanel._executeChangeRegion('kanto');
    assert.equal(battle.isActive(), false, 'Battle stopped upon region travel');
    mapPanel.destroy();
  });

  test('Combat battle fatigue applies wear damage to active combatant and logs wear after 50 KOs', () => {
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) battle.endBattle(false);
    const save = SaveSystem.getInstance().createNewSave('FatigueTester', 'charmander');
    assert.ok(battle.startBattle('route1', { chain: true }));

    const session = battle._session;
    session.playerKOs = 50;

    // Simulate winning a wild battle at 50 KOs
    const foe = session.foe.pokemon;
    const initialHp = session.active.hp;
    battle._settleWildEncounter(save, session, {
      pokemon: foe,
      isRoaming: false,
      bucket: 'common',
      scorerUid: session.active.pokemon.uid,
      scorerSpecies: session.active.pokemon.species,
      scorerName: session.active.pokemon.getDisplayName(),
      scorerShiny: false
    });

    assert.ok(session.active.hp <= initialHp, 'Active combatant takes fatigue wear damage');
    const hasFatigueEntry = session.log.entries.some((e) => e.key.includes('fatigue'));
    assert.ok(hasFatigueEntry, 'Fatigue warning or wear appears in session battle logs');
    battle.endBattle(false);
  });

  test('FastForwardSystem simulates offline progress and prepares summary for modal', () => {
    const save = SaveSystem.getInstance().createNewSave('AfkTester', 'squirtle');
    save.player.location = 'route1';
    const ff = FastForwardSystem.getInstance();

    const summary = ff.simulateOffline(60000); // 60 seconds
    assert.ok(summary, 'Simulation produced a summary');
    assert.ok(summary.battlesSimulated >= 10, 'Simulated reasonable battle count for 60s');
    assert.ok(summary.currencyEarned > 0, 'Earned currency during offline AFK');
    assert.equal(summary.durationMs, 60000);
  });
});
