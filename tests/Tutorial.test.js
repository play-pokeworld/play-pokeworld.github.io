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
import { t } from '../src/localization/LocalizationManager.js';
import { TutorialRules } from '../src/config/TutorialRules.js';
import { DashboardWindowFocusRequestedEvent } from '../src/core/events/DashboardWindowFocusRequestedEvent.js';

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

  test('the tutorial action only reveals a control: it never travels, opens a window or picks a ball', () => {
    const modalRequests = [];
    const focusRequests = [];
    const onModal = (event) => modalRequests.push(event);
    const onFocus = (event) => focusRequests.push(event);
    bus.subscribe(ModalOpenRequestedEvent, onModal);
    bus.subscribe(DashboardWindowFocusRequestedEvent, onFocus);
    try {
      for (const step of TutorialRules.STEPS) StoryPanel.prototype._performTutorialAction.call(null, { id: step.id });
    } finally {
      bus.unsubscribe(ModalOpenRequestedEvent, onModal);
      bus.unsubscribe(DashboardWindowFocusRequestedEvent, onFocus);
    }
    assert.equal(modalRequests.length, 0, 'no modal is opened for the player');
    // Only the mobile view switch (a navigation aid) may be requested, never a game action.
    for (const request of focusRequests) assert.ok(String(request.windowId).startsWith('win-'), 'window focus only');
  });


  test('the ball step names the capture row to fill and never sends the player to the settings', () => {
    const tutorial = TutorialSystem.getInstance();
    tutorial.init();
    try {
      const save = SaveSystem.getInstance().createNewSave('Tutorial ball wording', 'charmander');
      for (let index = 0; index < 5; index++) {
        save.statistics.recordWildWin('route1');
        bus.dispatch(new PokemonDefeatedEvent('pidgey', 3, 'route1', true));
      }
      const ballStep = tutorial.getCardStatus();
      assert.equal(ballStep.id, 'set_pokeball_filter');
      // The row name comes from the capture filter preset, so the text cannot drift from the window.
      assert.ok(ballStep.how.includes(t('ball_filter_new')), 'the step names the row the player has to fill');
      assert.ok(!ballStep.how.includes('{'), 'no empty placeholder is left on screen');
      assert.ok(!ballStep.title.includes('{'), 'no empty placeholder in the title');
      // The regression this test guards: the step used to answer "the gear, or the grey ball".
      assert.ok(!/réglage|settings/i.test(ballStep.how), 'the step never sends the player to the settings');
      assert.ok(ballStep.how.includes('\n'), 'the path is written on two lines (where to go, then what to click)');

      PokeballSystem.getInstance().setBall('new', 'pokeball');
      const catchStep = tutorial.getCardStatus();
      assert.equal(catchStep.id, 'catch_first');
      assert.ok(catchStep.description.includes('%'), 'the catch rate is interpolated');
      assert.ok(!catchStep.description.includes('{'), 'no empty placeholder in the objective');
      assert.ok(catchStep.how.includes(t('location.route1')), 'the objective names the place to stand on');
    } finally {
      tutorial.onDestroy();
    }
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
