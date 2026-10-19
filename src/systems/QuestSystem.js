/**
 * @file QuestSystem.js
 * @brief Quest runtime (C++: class QuestSystem : public BaseSystem). No DOM access.
 *
 * Definitions come from QuestDB, player state is the QuestProgressData of the active save.
 *  - The current main quest of the player's region is always active (QuestDB main chain +
 *    QuestProgressData.mainStep), like the original syncActiveMain().
 *  - Side and repeatable quests are activated with accept().
 *  - Game events are routed to the objectives of the active quests: QuestSystem subscribes to
 *    every event class listed in an objective `EVENTS`, then asks each matching objective for
 *    `progressFor(event)` (counters) or `stateProgress()` (states). Quests of another region
 *    do not progress (original advanceQuests); repeatable quests progress everywhere.
 *  - claim() grants the rewards (quest points, items, Pokémon) and moves the chain forward.
 * Emits QuestActivatedEvent, QuestProgressedEvent, QuestCompletedEvent, QuestClaimedEvent and
 * QuestEncounterRequestedEvent. The save is written once per handled event.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { TeamSystem } from './TeamSystem.js';
import { QuestContext } from './quests/QuestContext.js';
import { grantItem } from './inventory/ItemGrant.js';
import { EventBus } from '../core/EventBus.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { QuestActivatedEvent } from '../core/events/QuestActivatedEvent.js';
import { QuestProgressedEvent } from '../core/events/QuestProgressedEvent.js';
import { QuestCompletedEvent } from '../core/events/QuestCompletedEvent.js';
import { QuestClaimedEvent } from '../core/events/QuestClaimedEvent.js';
import { QuestEncounterRequestedEvent } from '../core/events/QuestEncounterRequestedEvent.js';
import { QuestDB } from '../data/quests/QuestDB.js';
import { QuestCategories } from '../data/quests/QuestCategories.js';
import { ObjectiveRegistry } from '../data/quests/objectives/ObjectiveRegistry.js';
import { PokemonFactory } from '../data/pokemon/PokemonFactory.js';
import { QuestRules } from '../config/QuestRules.js';
import { PlayerDefaults } from '../config/PlayerDefaults.js';

/**
 * @typedef {Object} QuestStatus
 * @property {Readonly<Object>} quest  - QuestDB definition
 * @property {import('../data/quests/objectives/QuestObjective.js').QuestObjective} objective
 * @property {number} progress
 * @property {number} count
 * @property {boolean} complete
 */

export class QuestSystem extends BaseSystem {
  /** @private @type {QuestSystem|null} */
  static _instance = null;

  /** @returns {QuestSystem} */
  static getInstance() {
    if (!QuestSystem._instance) QuestSystem._instance = new QuestSystem();
    return QuestSystem._instance;
  }

  constructor() {
    super('QuestSystem', 'System');
    /** @private @type {Map<string, import('../data/quests/objectives/QuestObjective.js').QuestObjective>} */
    this._objectives = new Map();
    /** @private @type {Array<[Function, Function]>} */
    this._subscriptions = [];
  }

  /** @override */
  init() {
    if (this._subscriptions.length > 0) return;
    const bus = EventBus.getInstance();
    const onGameEvent = (event) => this.handleEvent(event);
    for (const eventClass of ObjectiveRegistry.allEvents()) {
      bus.subscribe(eventClass, onGameEvent);
      this._subscriptions.push([eventClass, onGameEvent]);
    }
    // The active main quest follows the player's region.
    const onSync = () => {
      if (this.syncMainQuest()) SaveSystem.getInstance().saveCurrent();
    };
    for (const eventClass of [SaveCreatedEvent, SaveLoadedEvent, LocationChangedEvent]) {
      bus.subscribe(eventClass, onSync);
      this._subscriptions.push([eventClass, onSync]);
    }
  }

  /** @override */
  onDestroy() {
    const bus = EventBus.getInstance();
    for (const [eventClass, callback] of this._subscriptions) bus.unsubscribe(eventClass, callback);
    this._subscriptions = [];
    super.onDestroy();
  }

  // --- Queries ---------------------------------------------------------------------------------

  /**
   * @param {string} key
   * @returns {QuestStatus|null} null when the quest is not active
   */
  getStatus(key) {
    const save = this._save();
    const quest = QuestDB.getInstance().getById(key);
    if (!save || !quest || !save.quests.isActive(key)) return null;
    const objective = this._objectiveOf(quest);
    const progress = Math.min(objective.count, save.quests.getProgress(key));
    return { quest, objective, progress, count: objective.count, complete: progress >= objective.count };
  }

  /** @returns {QuestStatus[]} Every active quest, main quest first */
  getActiveQuests() {
    const save = this._save();
    if (!save) return [];
    const order = Object.values(QuestCategories);
    return save.quests.getActiveKeys()
      .map((key) => this.getStatus(key))
      .filter(Boolean)
      .sort((a, b) => order.indexOf(a.quest.category) - order.indexOf(b.quest.category));
  }

  /** @returns {QuestStatus|null} Current main quest of the player's region */
  getMainQuest() {
    const save = this._save();
    if (!save) return null;
    const region = save.player.region || PlayerDefaults.REGION;
    const quest = QuestDB.getInstance().getMainQuest(region, save.quests.getMainStep(region));
    return quest ? this.getStatus(quest.key) : null;
  }

  /**
   * @param {string} key
   * @returns {boolean} The quest can be accepted now (side / repeatable)
   */
  isAvailable(key) {
    const save = this._save();
    const quests = QuestDB.getInstance();
    const quest = quests.getById(key);
    if (!save || !quest || quest.locked || save.quests.isActive(key)) return false;
    if (quest.category === QuestCategories.REPEATABLE) {
      const activeRepeatables = save.quests.getActiveKeys().filter((activeKey) => quests.getById(activeKey)?.category === QuestCategories.REPEATABLE);
      return activeRepeatables.length < QuestRules.REPEATABLE_SLOTS;
    }
    if (quest.category !== QuestCategories.SIDE || save.quests.isCompleted(key)) return false;
    const previous = quests.getPreviousChainStep(quest);
    if (previous && !save.quests.isCompleted(previous.key)) return false;
    const context = new QuestContext(save);
    if ((quest.requires?.caught || []).some((species) => !context.hasCaught(species))) return false;
    if (quest.requires?.league && !context.hasWonLeague(quest.requires.league)) return false;
    return true;
  }

  // --- Commands --------------------------------------------------------------------------------

  /**
   * Activates the current main quest of the player's region (and only that main quest).
   * @returns {boolean} true when the active quests changed
   */
  syncMainQuest() {
    const save = this._save();
    if (!save) return false;
    let changed = false;
    const quests = QuestDB.getInstance();
    const region = save.player.region || PlayerDefaults.REGION;
    const current = quests.getMainQuest(region, save.quests.getMainStep(region));
    for (const key of save.quests.getActiveKeys()) {
      if (quests.getById(key)?.category === QuestCategories.MAIN && key !== current?.key) {
        save.quests.deactivate(key);
        changed = true;
      }
    }
    if (current && !save.quests.isActive(current.key)) {
      this._activate(save, current);
      changed = true;
    }
    return changed;
  }

  /**
   * @param {string} key - Side or repeatable quest
   * @returns {boolean}
   */
  accept(key) {
    if (!this.isAvailable(key)) return false;
    const save = this._save();
    this._activate(save, QuestDB.getInstance().getById(key));
    SaveSystem.getInstance().saveCurrent();
    return true;
  }

  /**
   * Routes a game event to the objectives of the active quests.
   * @param {import('../core/BaseEvent.js').BaseEvent} event
   */
  handleEvent(event) {
    const save = this._save();
    if (!save) return;
    const context = new QuestContext(save);
    const completed = [];
    let changed = false;
    for (const key of save.quests.getActiveKeys()) {
      const quest = QuestDB.getInstance().getById(key);
      if (!quest) continue;
      const objective = this._objectiveOf(quest);
      if (!objective.constructor.EVENTS.includes(event.constructor)) continue;
      if (quest.category !== QuestCategories.REPEATABLE && quest.region && quest.region !== context.region) continue;
      const before = save.quests.getProgress(key);
      if (before >= objective.count) continue;
      const after = Math.min(objective.count, objective.isStateBased()
        ? Math.max(before, objective.stateProgress(context))
        : before + objective.progressFor(event, context));
      if (after === before) continue;
      save.quests.setProgress(key, after);
      changed = true;
      EventBus.getInstance().dispatch(new QuestProgressedEvent(key, after, objective.count));
      if (after >= objective.count) completed.push(quest);
    }
    for (const quest of completed) {
      EventBus.getInstance().dispatch(new QuestCompletedEvent(quest.key));
      if (quest.category === QuestCategories.MAIN && this._objectiveOf(quest).constructor.AUTO_CLAIM) this.claim(quest.key);
    }
    if (changed) SaveSystem.getInstance().saveCurrent();
  }

  /**
   * Grants the rewards of a completed quest. When the reward Pokémon must be met in battle first
   * (main quests and legendary chain ends, original startLegendaryEncounter), the claim only
   * dispatches QuestEncounterRequestedEvent; the battle system claims again with
   * `{ encounterWon: true }` once the Pokémon is caught (it then joins the team through the capture).
   * @param {string} key
   * @param {{encounterWon?: boolean}} [options]
   * @returns {boolean} true when the quest has been claimed
   */
  claim(key, { encounterWon = false } = {}) {
    const save = this._save();
    const status = this.getStatus(key);
    if (!save || !status?.complete) return false;
    const { quest } = status;
    const pokemon = quest.rewards.pokemon;
    const needsEncounter = !!pokemon && (quest.category === QuestCategories.MAIN || !!quest.encounter);
    if (needsEncounter && !encounterWon) {
      EventBus.getInstance().dispatch(new QuestEncounterRequestedEvent(key, pokemon, quest.encounter?.location ?? null));
      return false;
    }
    // No PC boxes yet: a gift Pokémon needs a free team slot, the claim waits otherwise.
    const giftPokemon = !!pokemon && !needsEncounter;
    if (giftPokemon && !TeamSystem.getInstance().hasFreeSlot()) return false;
    if (quest.rewards.questPoints > 0) save.currencies.add(QuestRules.REWARD_CURRENCY, quest.rewards.questPoints);
    for (const [itemId, quantity] of Object.entries(quest.rewards.items)) grantItem(save, itemId, quantity);
    if (giftPokemon) {
      TeamSystem.getInstance().addPokemon(PokemonFactory.create(pokemon.species, pokemon.level, { shiny: !!pokemon.shiny }));
    }
    save.quests.deactivate(key);
    if (quest.category === QuestCategories.MAIN) {
      save.quests.setMainStep(quest.region, save.quests.getMainStep(quest.region) + 1);
      this.syncMainQuest();
    } else if (quest.category === QuestCategories.SIDE) {
      save.quests.markCompleted(key);
    } else {
      save.quests.repeatablesCompleted++;
    }
    EventBus.getInstance().dispatch(new QuestClaimedEvent(key));
    SaveSystem.getInstance().saveCurrent();
    return true;
  }

  // --- Internals -------------------------------------------------------------------------------

  /**
   * @private
   * @param {import('../data/save/SaveData.js').SaveData} save
   * @param {Readonly<Object>} quest
   */
  _activate(save, quest) {
    save.quests.activate(quest.key);
    const objective = this._objectiveOf(quest);
    // A state objective may already be met (badge owned before the quest started).
    if (objective.isStateBased()) {
      save.quests.setProgress(quest.key, Math.min(objective.count, objective.stateProgress(new QuestContext(save))));
    }
    EventBus.getInstance().dispatch(new QuestActivatedEvent(quest.key));
  }

  /**
   * @private
   * @param {Readonly<Object>} quest
   * @returns {import('../data/quests/objectives/QuestObjective.js').QuestObjective}
   */
  _objectiveOf(quest) {
    if (!this._objectives.has(quest.key)) this._objectives.set(quest.key, ObjectiveRegistry.create(quest));
    return this._objectives.get(quest.key);
  }

  /** @private @returns {import('../data/save/SaveData.js').SaveData|null} */
  _save() {
    return SaveSystem.getInstance().getCurrentSave();
  }
}
