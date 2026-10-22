/**
 * @file Tutorial.test.js
 * @brief Event-driven tutorial progression, rewards, persistence, and action parameters.
 */
import { describe, assert } from './TestRunner.js';
import { EventBus } from '../src/core/EventBus.js';
import { Random } from '../src/core/Random.js';
import { ModalIds } from '../src/config/ModalIds.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { PokemonFactory } from '../src/data/pokemon/PokemonFactory.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { PokeballSystem } from '../src/systems/PokeballSystem.js';
import { CatchSystem } from '../src/systems/CatchSystem.js';
import { ShopSystem, PurchaseResults } from '../src/systems/ShopSystem.js';
import { NotificationSystem } from '../src/systems/NotificationSystem.js';
import { TutorialSystem } from '../src/systems/TutorialSystem.js';
import { StoryPanel } from '../src/panels/StoryPanel.js';
import { PokemonDefeatedEvent } from '../src/core/events/PokemonDefeatedEvent.js';
import { ModalToggledEvent } from '../src/core/events/ModalToggledEvent.js';
import { PokedexEntryOpenedEvent } from '../src/core/events/PokedexEntryOpenedEvent.js';
import { DungeonEnteredEvent } from '../src/core/events/DungeonEnteredEvent.js';
import { ModalOpenRequestedEvent } from '../src/core/events/ModalOpenRequestedEvent.js';
import { NotificationDispatchedEvent } from '../src/core/events/NotificationDispatchedEvent.js';

const bus = EventBus.getInstance();

describe('Guided tutorial', (test) => {
  test('all ten steps advance from real gameplay events, pay once, and survive a save round trip', () => {
    const tutorial = TutorialSystem.getInstance();
    const catcher = CatchSystem.getInstance();
    const notificationSystem = NotificationSystem.getInstance();
    const temporaryNotificationIds = [];
    const onNotification = (event) => {
      if (event.notificationType === 'temporary') temporaryNotificationIds.push(event.id);
    };
    bus.subscribe(NotificationDispatchedEvent, onNotification);
    tutorial.init();

    try {
      const saves = SaveSystem.getInstance();
      const save = saves.createNewSave('Tutorial QA', 'charmander');
      const startMoney = save.currencies.get('money');
      assert.equal(tutorial.getCardStatus().id, 'route1_battles');
      assert.equal(tutorial.getCardStatus().progress, 0);

      for (let win = 1; win <= 5; win++) {
        save.statistics.recordWildWin('route1');
        bus.dispatch(new PokemonDefeatedEvent('pidgey', 3, 'route1', true));
        if (win === 3) assert.equal(tutorial.getCardStatus().progress, 3);
      }
      assert.ok(save.tutorial.isCompleted('route1_battles'));
      assert.ok(save.tutorial.isRewardClaimed('route1_battles'));
      assert.equal(save.currencies.get('money'), startMoney + 300);
      assert.equal(save.inventory.count('occa_berry'), 1);
      bus.dispatch(new PokemonDefeatedEvent('pidgey', 3, 'route1', true));
      assert.equal(save.currencies.get('money'), startMoney + 300, 'a completed reward is not paid twice');
      assert.equal(tutorial.getCardStatus().id, 'set_pokeball_filter');

      const ballsBeforeFilterReward = save.inventory.count('pokeball');
      assert.ok(PokeballSystem.getInstance().setBall('new', 'pokeball'));
      assert.ok(save.tutorial.isCompleted('set_pokeball_filter'));
      assert.equal(save.inventory.count('pokeball'), ballsBeforeFilterReward + 25, 'the filter step grants its stated 25-ball reward');

      const foe = PokemonFactory.create('pidgey', 3);
      const log = { add() {} };
      catcher.setRandom(Random.sequence([0]));
      const capture = catcher.attemptDetailed({
        save,
        session: { foe: { pokemon: foe }, field: { weather: null }, foeTurns: 0, playerAttacks: 0, log },
        locationId: 'route1'
      });
      catcher.setRandom(Random.default);
      assert.ok(capture.caught, 'the first capture completes through the normal catch system');
      assert.ok(save.tutorial.isCompleted('catch_first'));
      assert.ok(save.tutorial.isCompleted('dungeon_intro'), 'the capture tokens advance the dungeon-token step');
      assert.equal(tutorial.getCardStatus().id, 'buy_pokeballs');

      assert.equal(ShopSystem.getInstance().buy('pokeball', 1, 'pallet'), PurchaseResults.OK);
      assert.ok(save.tutorial.isCompleted('buy_pokeballs'));
      assert.equal(tutorial.getCardStatus().id, 'honor_ball_intro');
      save.currencies.add('money', 5000);
      assert.equal(ShopSystem.getInstance().buy('pokeball', 10, 'pallet'), PurchaseResults.OK);
      assert.ok(save.inventory.count('honorball') > 0);
      assert.ok(save.tutorial.isCompleted('honor_ball_intro'));
      assert.equal(tutorial.getCardStatus().id, 'open_poke_sheet');

      bus.dispatch(new ModalToggledEvent('PokemonInfoModal', true));
      assert.ok(save.tutorial.isCompleted('open_poke_sheet'));
      assert.equal(tutorial.getCardStatus().id, 'open_bag');
      bus.dispatch(new ModalToggledEvent('BagPanel', true));
      assert.ok(save.tutorial.isCompleted('open_bag'));
      assert.equal(tutorial.getCardStatus().id, 'open_pokedex');
      bus.dispatch(new PokedexEntryOpenedEvent('pidgey'));
      assert.ok(save.tutorial.isCompleted('open_pokedex'));
      assert.equal(tutorial.getCardStatus().id, 'dungeon_clear');

      bus.dispatch(new DungeonEnteredEvent('viridianforest', 100, 10));
      assert.ok(TutorialSystem.getInstance().getCardStatus() === null);
      assert.equal(save.tutorial.enabled, false, 'the final milestone closes the guided card');
      assert.equal(save.tutorial.completed.length, 10);
      assert.equal(save.tutorial.rewardsClaimed.length, 10);
      const restored = SaveData.fromJson(JSON.parse(JSON.stringify(save.serialize())));
      assert.deepEqual(restored.tutorial.serialize(), save.tutorial.serialize());
    } finally {
      catcher.setRandom(Random.default);
      tutorial.onDestroy();
      bus.unsubscribe(NotificationDispatchedEvent, onNotification);
      for (const id of temporaryNotificationIds) notificationSystem.dismiss(id);
    }
  });

  test('the visible tutorial card refreshes when objective progress changes before completion', () => {
    const tutorial = TutorialSystem.getInstance();
    tutorial.init();
    let panel = null;
    try {
      const save = SaveSystem.getInstance().createNewSave('Tutorial visual progress', 'charmander');
      panel = new StoryPanel('left');
      const dom = panel.getDomElement();
      assert.ok(dom.textContent.includes('0/5'), 'the first card starts at zero');
      save.statistics.recordWildWin('route1');
      bus.dispatch(new PokemonDefeatedEvent('pidgey', 3, 'route1', true));
      assert.ok(dom.textContent.includes('1/5'), 'partial progress is visible immediately, before the step completes');
    } finally {
      panel?.destroy();
      tutorial.onDestroy();
    }
  });

  test('the Pokémon-sheet action forwards the team index expected by its modal', () => {
    const requests = [];
    const onRequest = (event) => requests.push(event);
    bus.subscribe(ModalOpenRequestedEvent, onRequest);
    try {
      StoryPanel.prototype._performTutorialAction.call(null, { action: 'pokemon_sheet' });
    } finally {
      bus.unsubscribe(ModalOpenRequestedEvent, onRequest);
    }
    assert.equal(requests.length, 1);
    assert.equal(requests[0].modalId, ModalIds.POKEMON_INFO);
    assert.deepEqual(requests[0].params, { teamIndex: 0 });
  });

  test('disabling the tutorial suppresses progression and persists its preference', () => {
    const tutorial = TutorialSystem.getInstance();
    tutorial.init();
    try {
      const save = SaveSystem.getInstance().createNewSave('Tutorial disabled', 'bulbasaur');
      assert.ok(tutorial.setEnabled(false));
      save.statistics.recordWildWin('route1');
      for (let index = 0; index < 5; index++) {
        bus.dispatch(new PokemonDefeatedEvent('pidgey', 3, 'route1', true));
      }
      assert.equal(save.tutorial.isCompleted('route1_battles'), false);
      const restored = SaveData.fromJson(JSON.parse(JSON.stringify(save.serialize())));
      assert.equal(restored.tutorial.enabled, false);
    } finally {
      tutorial.onDestroy();
    }
  });
});
