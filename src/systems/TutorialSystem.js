/**
 * @file TutorialSystem.js
 * @brief Guided tutorial progression and one-time reward settlement (DOM-free).
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { EventBus } from '../core/EventBus.js';
import { TutorialRules } from '../config/TutorialRules.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { grantItem } from './inventory/ItemGrant.js';
import { NotificationSystem } from './NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { BallRules } from '../config/BallRules.js';
import { ModalToggledEvent } from '../core/events/ModalToggledEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { PokemonDefeatedEvent } from '../core/events/PokemonDefeatedEvent.js';
import { PokemonCaughtEvent } from '../core/events/PokemonCaughtEvent.js';
import { BallFiltersCommitEvent } from '../core/events/BallFiltersCommitEvent.js';
import { ShopPurchaseCompletedEvent } from '../core/events/ShopPurchaseCompletedEvent.js';
import { PokedexEntryOpenedEvent } from '../core/events/PokedexEntryOpenedEvent.js';
import { DungeonEnteredEvent } from '../core/events/DungeonEnteredEvent.js';
import { TutorialProgressChangedEvent } from '../core/events/TutorialProgressChangedEvent.js';
import { t } from '../localization/LocalizationManager.js';

const MILESTONES = Object.freeze({
  POKEMON_SHEET: 'open_poke_sheet',
  BAG: 'open_bag',
  POKEDEX: 'open_pokedex',
  DUNGEON: 'dungeon_clear'
});

export class TutorialSystem extends BaseSystem {
  /** @private @type {TutorialSystem|null} */
  static _instance = null;

  /** @returns {TutorialSystem} */
  static getInstance() {
    if (!TutorialSystem._instance) TutorialSystem._instance = new TutorialSystem();
    return TutorialSystem._instance;
  }

  constructor() {
    super('TutorialSystem', 'System');
    /** @private @type {Array<[Function, Function]>} */
    this._subscriptions = [];
  }

  /** @override */
  init() {
    if (this._subscriptions.length) return;
    const bus = EventBus.getInstance();
    const bind = (eventClass, callback = (event) => this._handle(event)) => {
      bus.subscribe(eventClass, callback);
      this._subscriptions.push([eventClass, callback]);
    };
    bind(SaveCreatedEvent, (event) => this._handle(event, { persist: false }));
    bind(SaveLoadedEvent, (event) => this._handle(event));
    bind(PokemonDefeatedEvent, (event) => this._handle(event, { persist: false }));
    bind(PokemonCaughtEvent, (event) => this._handle(event, { persist: false }));
    bind(BallFiltersCommitEvent, (event) => this._handle(event, { persist: false }));
    bind(ShopPurchaseCompletedEvent, (event) => this._handle(event, { persist: false }));
    bind(ModalToggledEvent);
    bind(PokedexEntryOpenedEvent);
    bind(DungeonEnteredEvent, (event) => this._handle(event, { persist: false }));
  }

  /** @override */
  onDestroy() {
    const bus = EventBus.getInstance();
    for (const [eventClass, callback] of this._subscriptions) bus.unsubscribe(eventClass, callback);
    this._subscriptions = [];
    super.onDestroy();
  }

  /** @returns {boolean} */
  isTutorialEnabled() {
    return !!SaveSystem.getInstance().getCurrentSave()?.tutorial.enabled;
  }

  /** @returns {boolean} */
  setEnabled(enabled) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return false;
    const next = !!enabled;
    if (save.tutorial.enabled === next) return true;
    save.tutorial.enabled = next;
    if (next) this._handle(null, { persist: false });
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new TutorialProgressChangedEvent(null, save.tutorial.enabled));
    return true;
  }

  /**
   * Current card model for the tutorial window; null when disabled or complete.
   * @returns {Object|null}
   */
  getCardStatus() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !save.tutorial.enabled) return null;
    const steps = TutorialRules.STEPS;
    const stepIndex = steps.findIndex((entry) => !save.tutorial.isCompleted(entry.id));
    if (stepIndex < 0) return null;
    const step = steps[stepIndex];
    const progress = this._progressFor(step, save);
    const params = step.id === 'catch_first'
      ? { pct: ItemDB.getInstance().getBallRate('pokeball') }
      : {};
    const currencies = {};
    if (step.reward.money > 0) currencies.money = step.reward.money;
    if (step.reward.dungeonToken > 0) currencies.dungeonToken = step.reward.dungeonToken;
    return {
      ...step,
      index: stepIndex + 1,
      total: steps.length,
      progress,
      title: t(step.titleKey),
      description: t(step.descriptionKey, params),
      how: t(step.howKey),
      actionLabel: t(step.actionKey),
      rewardData: { currencies, items: { ...step.reward.items } },
      progressText: t('tutorial_step_progress_lbl', { cur: progress, max: step.target })
    };
  }

  /** @private */
  _handle(event, { persist = true } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !save.tutorial.enabled) return false;

    const milestone = this._milestoneFor(event, save);
    let changed = false;
    if (milestone) changed = save.tutorial.markCompleted(milestone) || changed;

    const completedNow = [];
    for (const step of TutorialRules.STEPS) {
      if (!save.tutorial.isCompleted(step.id) && this._isComplete(step, save)) {
        save.tutorial.markCompleted(step.id);
        completedNow.push(step);
        changed = true;
      }
      if (save.tutorial.isCompleted(step.id) && !save.tutorial.isRewardClaimed(step.id)) {
        this._payReward(step, save);
        changed = true;
      }
    }

    const allDone = TutorialRules.STEPS.every((step) => save.tutorial.isCompleted(step.id));
    if (allDone && save.tutorial.enabled) {
      save.tutorial.enabled = false;
      changed = true;
    }
    if (!changed) return false;

    if (persist) SaveSystem.getInstance().saveCurrent();
    const changedStep = completedNow.at(-1)?.id ?? milestone ?? null;
    EventBus.getInstance().dispatch(new TutorialProgressChangedEvent(changedStep, save.tutorial.enabled));
    return true;
  }

  /** @private */
  _milestoneFor(event, save) {
    if (event instanceof ModalToggledEvent && event.isOpen) {
      if (event.modalName === 'PokemonInfoModal') return MILESTONES.POKEMON_SHEET;
      if (event.modalName === 'BagPanel') return MILESTONES.BAG;
    }
    if (event instanceof PokedexEntryOpenedEvent && save.pokedex.isSeen(event.speciesId)) {
      return MILESTONES.POKEDEX;
    }
    if (event instanceof DungeonEnteredEvent) return MILESTONES.DUNGEON;
    return null;
  }

  /** @private @param {Object} step @param {import('../data/save/SaveData.js').SaveData} save */
  _progressFor(step, save) {
    switch (step.objective) {
      case 'route1_wins':
        return Math.min(step.target, save.statistics.wildWins.route1 || 0);
      case 'ball_filter':
        return save.ballFilters.getAll().some((filter) => filter.enabled && filter.ball !== BallRules.NO_BALL) ? 1 : 0;
      case 'first_catch':
        return save.statistics.caughtTotal > 0 ? 1 : 0;
      case 'buy_pokeball':
        return Math.min(step.target, save.statistics.purchases.pokeball || 0);
      case 'honor_ball':
        return save.inventory.has('honorball') ? 1 : 0;
      case 'pokemon_sheet':
      case 'bag':
      case 'pokedex_entry':
      case 'dungeon_entry':
        return save.tutorial.isCompleted(step.id) ? 1 : 0;
      case 'dungeon_token':
        return save.currencies.get('dungeonToken') > 0 ? 1 : 0;
      default:
        return 0;
    }
  }

  /** @private @param {Object} step @param {import('../data/save/SaveData.js').SaveData} save */
  _isComplete(step, save) {
    return this._progressFor(step, save) >= step.target;
  }

  /** @private @param {Object} step @param {import('../data/save/SaveData.js').SaveData} save */
  _payReward(step, save) {
    save.tutorial.markRewardClaimed(step.id);
    const hasReward = step.reward.money > 0 || step.reward.dungeonToken > 0 || Object.keys(step.reward.items).length > 0;
    if (step.reward.money > 0) save.currencies.add('money', step.reward.money);
    if (step.reward.dungeonToken > 0) save.currencies.add('dungeonToken', step.reward.dungeonToken);
    for (const [itemId, quantity] of Object.entries(step.reward.items)) grantItem(save, itemId, quantity);
    NotificationSystem.getInstance().notifyTemporary(
      t(hasReward ? 'tutorial_reward_received' : 'tutorial_step_completed'),
      { channel: NotificationChannels.GAMEPLAY, tone: NotificationTones.SUCCESS }
    );
  }
}
