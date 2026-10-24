/**
 * @file DebugAndBoxItemUse.test.js
 * @brief Verifies BoxPanel consecutive item usage (Rare Candy, vitamins) and DebugWidget functionality.
 */

import { describe, assert } from './TestRunner.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { BoxSystem } from '../src/systems/BoxSystem.js';
import { TeamSystem } from '../src/systems/TeamSystem.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { PreferencesSystem } from '../src/systems/PreferencesSystem.js';
import { SecretBaseSystem } from '../src/systems/SecretBaseSystem.js';
import { EventBus } from '../src/core/EventBus.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { AppShell } from '../src/ui/AppShell.js';
import { BagPanel } from '../src/panels/fullscreen/BagPanel.js';
import { BoxPanel } from '../src/panels/fullscreen/BoxPanel.js';
import { DebugWidget } from '../src/panels/components/DebugWidget.js';
import { setRoster } from './RosterFixtures.js';

const saves = SaveSystem.getInstance();

describe('PC Box item usage and DebugWidget', (test) => {
  test('BagPanel redirects Rare Candy and vitamins to BoxPanel in item use mode', () => {
    const save = saves.createNewSave('Bag redirection test', 'pikachu');
    save.inventory.add('rarecandy', 5, { deferSave: true });
    save.inventory.add('protein', 3, { deferSave: true });
    saves.setCurrentSave(save);

    const bag = new BagPanel();
    let requestedModal = null;
    let requestedParams = null;
    const unsubscribe = EventBus.getInstance().subscribe(ModalOpenRequestedEvent, (event) => {
      requestedModal = event.modalId;
      requestedParams = event.params;
    });

    try {
      bag.open();
      assert.ok(bag.isOpen());

      bag._handleItemClick('rarecandy');
      assert.equal(requestedModal, ModalIds.BOX);
      assert.deepEqual(requestedParams, { itemUseId: 'rarecandy' });
      assert.equal(bag.isOpen(), false, 'BagPanel closes when opening the PC Box for item use');

      requestedModal = null;
      requestedParams = null;
      bag.open();
      bag._handleItemClick('protein');
      assert.equal(requestedModal, ModalIds.BOX);
      assert.deepEqual(requestedParams, { itemUseId: 'protein' });
    } finally {
      unsubscribe();
      if (bag.isOpen()) bag.close();
      bag.destroy();
    }
  });

  test('BoxPanel stays open across consecutive uses while items remain, then closes and returns to Bag', () => {
    const save = saves.createNewSave('Consecutive Candy test', 'pikachu');
    const pikachu = PokemonFactory.create('pikachu', 10);
    setRoster(save, [pikachu]);
    save.inventory.add('rarecandy', 3, { deferSave: true });
    saves.setCurrentSave(save);

    const box = new BoxPanel();
    let modalRequests = [];
    const unsubscribe = EventBus.getInstance().subscribe(ModalOpenRequestedEvent, (event) => {
      modalRequests.push({ id: event.modalId, params: event.params });
    });

    try {
      box.open({ itemUseId: 'rarecandy' });
      assert.ok(box.isOpen(), 'BoxPanel opens in item use mode');
      assert.ok(box.getTitle().includes('3'), 'Title indicates 3 remaining candies');

      // First use: Pikachu 10 -> 11, candies 3 -> 2
      box._handleItemUse(pikachu.uid);
      assert.equal(pikachu.level, 11);
      assert.equal(save.inventory.count('rarecandy'), 2);
      assert.ok(box.isOpen(), 'BoxPanel MUST stay open while candies remain');
      assert.ok(box.getTitle().includes('2'), 'Title updates to 2 remaining candies');

      // Second use: Pikachu 11 -> 12, candies 2 -> 1
      box._handleItemUse(pikachu.uid);
      assert.equal(pikachu.level, 12);
      assert.equal(save.inventory.count('rarecandy'), 1);
      assert.ok(box.isOpen(), 'BoxPanel still stays open with 1 candy left');
      assert.ok(box.getTitle().includes('1'));

      // Third use: Pikachu 12 -> 13, candies 1 -> 0
      modalRequests = [];
      box._handleItemUse(pikachu.uid);
      assert.equal(pikachu.level, 13);
      assert.equal(save.inventory.count('rarecandy'), 0);
      assert.equal(box.isOpen(), false, 'BoxPanel closes when all items are exhausted');
      assert.ok(modalRequests.some((req) => req.id === ModalIds.BAG), 'Returns to the bag after last item used');
    } finally {
      unsubscribe();
      if (box.isOpen()) box.close();
      box.destroy();
    }
  });

  test('BoxPanel closing via cancel or close button returns to BagPanel', () => {
    const save = saves.createNewSave('Cancel item use test', 'pikachu');
    const pikachu = PokemonFactory.create('pikachu', 10);
    setRoster(save, [pikachu]);
    save.inventory.add('rarecandy', 5, { deferSave: true });
    saves.setCurrentSave(save);

    const box = new BoxPanel();
    let modalRequests = [];
    const unsubscribe = EventBus.getInstance().subscribe(ModalOpenRequestedEvent, (event) => {
      modalRequests.push({ id: event.modalId, params: event.params });
    });

    try {
      box.open({ itemUseId: 'rarecandy' });
      assert.ok(box.isOpen());

      box.close();
      assert.equal(box.isOpen(), false);
      assert.ok(modalRequests.some((req) => req.id === ModalIds.BAG), 'Closing item use mode returns to Bag');
    } finally {
      unsubscribe();
      if (box.isOpen()) box.close();
      box.destroy();
    }
  });

  test('BoxPanel does not consume items on ineligible Pokémon and remains open', () => {
    const save = saves.createNewSave('Ineligible test', 'pikachu');
    const pikachu = PokemonFactory.create('pikachu', 100);
    setRoster(save, [pikachu]);
    save.inventory.add('rarecandy', 2, { deferSave: true });
    saves.setCurrentSave(save);

    const box = new BoxPanel();
    try {
      box.open({ itemUseId: 'rarecandy' });
      box._handleItemUse(pikachu.uid);
      assert.equal(pikachu.level, 100);
      assert.equal(save.inventory.count('rarecandy'), 2, 'No candy consumed for level 100 Pokémon');
      assert.ok(box.isOpen(), 'BoxPanel remains open so another Pokémon can be selected');
    } finally {
      if (box.isOpen()) box.close();
      box.destroy();
    }
  });

  test('DebugWidget renders drawer, toggle button, and executes all 13 debug actions', () => {
    const save = saves.createNewSave('Debug widget test', 'pikachu');
    const pikachu = PokemonFactory.create('pikachu', 20);
    setRoster(save, [pikachu]);
    saves.setCurrentSave(save);

    PreferencesSystem.getInstance().setDebugMode(true);
    AppShell.setDebugMode(true);
    assert.ok(document.body.classList.contains('debug-active'), 'body has debug-active');
    assert.ok(document.body.classList.contains('pw-debug-on'), 'body has pw-debug-on');

    const widget = new DebugWidget();
    const dom = widget.getDomElement();
    assert.equal(dom.id, 'debug-widget');
    assert.ok(dom.classList.contains('pw-static-066'));

    const drawer = widget._drawer.getDomElement();
    assert.equal(drawer.id, 'debug-drawer');
    assert.equal(drawer.classList.contains('open'), false);

    // Toggle button opens drawer
    const toggleBtn = dom.querySelector('#debug-widget-toggle') || dom.querySelector('#debug-toggle-btn');
    assert.ok(toggleBtn);
    toggleBtn.click();
    assert.ok(drawer.classList.contains('open'), 'drawer is open after toggle click');
    toggleBtn.click();
    assert.equal(drawer.classList.contains('open'), false, 'drawer is closed after second toggle click');

    // 1. Give money
    const moneyBefore = save.currencies.get('money');
    widget._giveMoney();
    assert.equal(save.currencies.get('money'), moneyBefore + 50000);
    assert.equal(save.currencies.get('dungeonToken'), 50000);
    assert.equal(save.currencies.get('questPoint'), 50000);
    assert.equal(save.currencies.get('diamond'), 50000);

    // 2. Give candies
    const candiesBefore = save.inventory.count('rarecandy');
    widget._giveCandies();
    assert.equal(save.inventory.count('rarecandy'), candiesBefore + 10);

    // 3. Unlock 8 badges
    widget._unlockBadges();
    assert.equal(save.player.badges.length, 8);
    assert.ok(save.player.hasBadge('brock'));
    assert.ok(save.player.hasBadge('giovanni'));

    // 4. Fill mine energy
    save.mine.energy = 5;
    widget._fillMine();
    assert.equal(save.mine.energy, 100);

    // 5. Secret base grant all
    save.player.region = 'hoenn';
    save.player.location = 'route101';
    save.quests.setMainStep('hoenn', 100);
    const baseSys = SecretBaseSystem.getInstance();
    baseSys.establish('route101', 'tree_1');
    widget._baseGrantAll();
    assert.ok(Object.keys(save.secretBase.stock).length > 0, 'stock has decorations');

    // 6. Base add NPC
    widget._baseAddNpc();
    assert.ok(save.secretBase.npcs.length > 0, 'NPC friend added to base');

    // 7. Give CT/CS
    widget._giveCtCs();
    assert.ok(save.inventory.count('ct24_thunderbolt') >= 1);
    assert.ok(save.inventory.count('cs01_cut') >= 1);

    // 8. AFK skip 30 min
    save.mine.energy = 10;
    widget._afkSkip();
    assert.equal(save.mine.energy, 40);

    // 9. Give all items
    widget._giveAllItems();
    assert.ok(save.inventory.count('nugget') >= 1);
    assert.ok(save.inventory.count('pokeball') >= 1);

    // 10. Show all items
    let openedModal = null;
    let openedParams = null;
    const unsub = EventBus.getInstance().subscribe(ModalOpenRequestedEvent, (event) => {
      openedModal = event.modalId;
      openedParams = event.params;
    });
    widget._showAllItems();
    assert.equal(openedModal, ModalIds.DICTIONARY);
    assert.equal(openedParams?.debugShowAll, true);
    unsub();

    // 11. Toggle x10 battle speed
    const battle = BattleSystem.getInstance();
    assert.equal(battle.getSpeedMultiplier(), 1);
    widget._toggleSpeedX10();
    assert.equal(battle.getSpeedMultiplier(), 10);
    assert.equal(widget._x10StateSpan.getText(), 'ON');
    widget._toggleSpeedX10();
    assert.equal(battle.getSpeedMultiplier(), 1);
    assert.equal(widget._x10StateSpan.getText(), 'OFF');

    // 12. Cycle daytime
    widget._cycleDaytime(); // dawn
    assert.equal(document.documentElement.getAttribute('data-daytime'), 'dawn');
    assert.equal(widget._daytimeStateSpan.getText(), 'DAWN');
    widget._cycleDaytime(); // day
    assert.equal(document.documentElement.getAttribute('data-daytime'), 'day');
    widget._cycleDaytime(); // dusk
    assert.equal(document.documentElement.getAttribute('data-daytime'), 'dusk');
    widget._cycleDaytime(); // night
    assert.equal(document.documentElement.getAttribute('data-daytime'), 'night');
    widget._cycleDaytime(); // auto
    assert.equal(document.documentElement.getAttribute('data-daytime'), null);
    assert.equal(widget._daytimeStateSpan.getText(), 'AUTO');

    // 13. Dedup box
    widget._cleanBoxDuplicates();

    widget.destroy();
    AppShell.setDebugMode(false);
  });
});
