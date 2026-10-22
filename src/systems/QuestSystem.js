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
 * QuestEncounterRequestedEvent. Events normally save quest progress here; an operation that owns
 * a broader transaction may set `deferSave` and persist the complete mutation once itself.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { TeamSystem } from './TeamSystem.js';
import { QuestContext } from './quests/QuestContext.js';
import { grantItem } from './inventory/ItemGrant.js';
import { EventBus } from '../core/EventBus.js';
import { Random } from '../core/Random.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { NpcTalkedEvent } from '../core/events/NpcTalkedEvent.js';
import { RepeatableBoardChangedEvent } from '../core/events/RepeatableBoardChangedEvent.js';
import { QuestActivatedEvent } from '../core/events/QuestActivatedEvent.js';
import { QuestProgressedEvent } from '../core/events/QuestProgressedEvent.js';
import { QuestCompletedEvent } from '../core/events/QuestCompletedEvent.js';
import { QuestClaimedEvent } from '../core/events/QuestClaimedEvent.js';
import { QuestEncounterRequestedEvent } from '../core/events/QuestEncounterRequestedEvent.js';
import { LocalQuestBattleRequestedEvent } from '../core/events/LocalQuestBattleRequestedEvent.js';
import { QuestDB } from '../data/quests/QuestDB.js';
import { NpcQuestDirectory } from '../data/quests/NpcQuestDirectory.js';
import { QuestCategories } from '../data/quests/QuestCategories.js';
import { ObjectiveTypes } from '../data/quests/ObjectiveTypes.js';
import { ObjectiveRegistry } from '../data/quests/objectives/ObjectiveRegistry.js';
import { PokemonFactory } from '../data/pokemon/PokemonFactory.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { QuestRules } from '../config/QuestRules.js';
import { BonusSystem } from './BonusSystem.js';
import { BonusTypes } from '../config/BonusRules.js';
import { PlayerDefaults } from '../config/PlayerDefaults.js';
import { NotificationSystem } from './NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { t } from '../localization/LocalizationManager.js';

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
    /** @private @type {Random} */
    this._random = Random.default;
  }

  /** @param {Random} random */
  setRandom(random) {
    if (random && typeof random.pick === 'function') this._random = random;
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
    // Main quest follows current region; repeatable access is backfilled only from stored legacy board state.
    const onSync = (event) => {
      const mainChanged = this.syncMainQuest();
      const accessChanged = this._syncRepeatableUnlock();
      if ((mainChanged || accessChanged) && event?.deferSave !== true) SaveSystem.getInstance().saveCurrent();
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

  /**
   * Returns the story/side offer associated with one stable NPC identity.
   * This is a read-only view model for NPC UI; quest state stays in QuestProgressData.
   * @param {string} npcId
   * @returns {{main:Object|null,side:Object|null,repeatableBoard:boolean,repeatableUnlocked:boolean}|null}
   */
  getNpcQuestState(npcId) {
    const save = this._save();
    const link = NpcQuestDirectory.get(npcId);
    if (!save || !link) return null;
    const quests = QuestDB.getInstance();
    const region = save.player.region || PlayerDefaults.REGION;
    let main = null;
    if (link.mainQuestKey) {
      const quest = quests.getById(link.mainQuestKey);
      if (quest?.category === QuestCategories.MAIN && quest.region === region) {
        const chain = quests.getMainChain(region);
        const index = chain.findIndex((entry) => entry.key === quest.key);
        const step = save.quests.getMainStep(region);
        const activeStatus = this.getStatus(quest.key);
        if (activeStatus) {
          main = { ...activeStatus, state: activeStatus.complete ? 'ready' : 'active' };
        } else if (index >= 0 && step > index) {
          const objective = this._objectiveOf(quest);
          main = { quest, objective, progress: objective.count, count: objective.count, complete: true, state: 'completed' };
        }
      }
    }

    let side = null;
    if (link.sideQuestKey) {
      const linkedQuest = quests.getById(link.sideQuestKey);
      let quest = linkedQuest;
      if (linkedQuest?.chain) {
        const chain = quests.getByCategory(QuestCategories.SIDE)
          .filter((entry) => entry.chain?.id === linkedQuest.chain.id && entry.chain.step >= linkedQuest.chain.step)
          .sort((left, right) => left.chain.step - right.chain.step);
        quest = chain.find((entry) => !save.quests.isCompleted(entry.key)) || linkedQuest;
      }
      if (quest?.category === QuestCategories.SIDE) {
        const activeStatus = this.getStatus(quest.key);
        if (activeStatus) {
          side = { ...activeStatus, state: activeStatus.complete ? 'ready' : 'active' };
        } else {
          const objective = this._objectiveOf(quest);
          const count = objective.count;
          if (save.quests.isCompleted(quest.key)) {
            side = { quest, objective, progress: count, count, complete: true, state: 'completed' };
          } else if (this.isAvailable(quest.key)) {
            side = { quest, objective, progress: 0, count, complete: false, state: 'offer' };
          } else {
            side = { quest, objective, progress: 0, count, complete: false, state: 'locked' };
          }
        }
      }
    }

    return {
      main,
      side,
      repeatableBoard: link.repeatableBoard === true,
      repeatableUnlocked: link.repeatableBoard === true && this.isRepeatableUnlocked()
    };
  }

  /**
   * Active local defeat quest served by a temporary NPC in a place without normal wild encounters.
   * The eligibility condition and location-group match follow the original location battle flow.
   * @param {string} locationId
   * @returns {{quest:Readonly<Object>,progress:number,count:number,remaining:number}|null}
   */
  getLocalDefeatBattleState(locationId) {
    const save = this._save();
    const locations = LocationDB.getInstance();
    const location = locations.getById(locationId);
    if (!save || !location) return null;
    const group = locations.getGroup(locationId);
    const hasGroupEncounters = locations.getAll().some((candidate) =>
      locations.getGroup(candidate.id) === group && locations.getEncounters(candidate.id).length > 0
    );
    if (hasGroupEncounters) return null;
    for (const key of save.quests.getActiveKeys()) {
      const quest = QuestDB.getInstance().getById(key);
      if (!quest || quest.objective?.type !== ObjectiveTypes.KILL) continue;
      const currentRegion = save.player.region || PlayerDefaults.REGION;
      if (quest.category !== QuestCategories.REPEATABLE && quest.region && quest.region !== currentRegion) continue;
      const questLocation = quest.objective.location || quest.location;
      if (!questLocation || LocationDB.getInstance().getGroup(questLocation) !== group) continue;
      const status = this.getStatus(key);
      if (!status || status.complete) continue;
      return {
        quest,
        progress: status.progress,
        count: status.count,
        remaining: Math.max(0, status.count - status.progress)
      };
    }
    return null;
  }

  /**
   * Requests the local battle after its temporary NPC dialogue has closed.
   * @param {string} locationId
   * @param {string} questKey
   * @returns {boolean} true when the request passes the active quest and location checks
   */
  requestLocalDefeatBattle(locationId, questKey) {
    const save = this._save();
    if (!save || save.player.location !== locationId) return false;
    const state = this.getLocalDefeatBattleState(locationId);
    if (!state || state.quest.key !== questKey) return false;
    EventBus.getInstance().dispatch(new LocalQuestBattleRequestedEvent(locationId, questKey));
    return true;
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

  /** @returns {boolean} Whether the player can use the repeatable board */
  isRepeatableUnlocked() {
    return !!this._save()?.quests.isRepeatableUnlocked();
  }

  /** @returns {number} Milliseconds remaining before the free reroll */
  getRepeatableRerollRemainingMs() {
    const savedAt = this._save()?.quests.getRepeatableLastRollAt() || 0;
    return Math.max(0, savedAt + QuestRules.REPEATABLE_REROLL_MS - Date.now());
  }

  /**
   * Read-only view model data for the repeatable board; text and rendering stay in the UI layer.
   * @returns {{unlocked:boolean,region:string,activeCount:number,slotCount:number,slotUpgrades:number,
   *   rerollRemainingMs:number,offers:Array<{quest:Readonly<Object>,active:boolean,canAccept:boolean}>,activeQuests:QuestStatus[]}}
   */
  getRepeatableBoardState() {
    const save = this._save();
    const region = save?.player.region || PlayerDefaults.REGION;
    if (!save) {
      return {
        unlocked: false,
        region,
        activeCount: 0,
        slotCount: QuestRules.REPEATABLE_SLOTS,
        slotUpgrades: 0,
        rerollRemainingMs: 0,
        offers: [],
        activeQuests: []
      };
    }
    const activeQuests = this.getActiveQuests().filter((status) => status.quest.category === QuestCategories.REPEATABLE);
    const activeKeys = new Set(activeQuests.map((status) => status.quest.key));
    const offers = save.quests.getRepeatableChoices()
      .slice(0, QuestRules.REPEATABLE_OFFER_COUNT)
      .map((id) => QuestDB.getInstance().getById(QuestDB.keyOf(QuestCategories.REPEATABLE, id)))
      .filter((quest) => quest && this._isRepeatableAvailableInRegion(quest, region))
      .map((quest) => ({
        quest,
        active: activeKeys.has(quest.key),
        canAccept: !activeKeys.has(quest.key) && this._canAcceptRepeatable(save)
      }));
    return {
      unlocked: save.quests.isRepeatableUnlocked(),
      region,
      activeCount: activeQuests.length,
      slotCount: save.quests.getRepeatableSlotCount(),
      slotUpgrades: save.quests.getRepeatableSlotUpgrades(),
      rerollRemainingMs: this.getRepeatableRerollRemainingMs(),
      offers,
      activeQuests
    };
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
      return this._isRepeatableOfferAvailable(save, quest);
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
   * @param {string} key - Side quest, or a currently offered repeatable
   * @returns {boolean}
   */
  accept(key) {
    const save = this._save();
    const quest = QuestDB.getInstance().getById(key);
    if (!save || !quest) return false;
    if (quest.category === QuestCategories.REPEATABLE) {
      this.ensureRepeatableChoices();
      const index = save.quests.getRepeatableChoices().indexOf(quest.id);
      return index >= 0 && this.acceptRepeatableOffer(index);
    }
    if (!this.isAvailable(key)) return false;
    this._activate(save, quest);
    SaveSystem.getInstance().saveCurrent();
    return true;
  }

  /**
   * Ensures the persisted offers are valid for the current region and fills vacant display slots.
   * The initial board roll starts the same ten-minute cooldown as the original game.
   * @returns {Readonly<Object>[]} Current eligible offer definitions
   */
  ensureRepeatableChoices() {
    const save = this._save();
    if (!save || !save.quests.isRepeatableUnlocked()) return [];
    const previous = save.quests.getRepeatableChoices();
    const wasEmpty = previous.length === 0;
    const region = save.player.region || PlayerDefaults.REGION;
    const choices = previous
      .map((value) => this._normalizeRepeatableChoiceId(value))
      .filter((id, index, all) => id && all.indexOf(id) === index && this._isRepeatableAvailableInRegion(
        QuestDB.getInstance().getById(QuestDB.keyOf(QuestCategories.REPEATABLE, id)), region
      ))
      .slice(0, QuestRules.REPEATABLE_OFFER_COUNT);
    let changed = save.quests.setRepeatableChoices(choices);
    while (choices.length < QuestRules.REPEATABLE_OFFER_COUNT) {
      const next = this._pickRepeatableChoice(save, choices);
      if (!next) break;
      choices.push(next.id);
      changed = save.quests.setRepeatableChoices(choices) || changed;
    }
    if (wasEmpty) changed = save.quests.setRepeatableLastRollAt(Date.now()) || changed;
    if (changed) {
      SaveSystem.getInstance().saveCurrent();
      EventBus.getInstance().dispatch(new RepeatableBoardChangedEvent('choices-ensured'));
    }
    return choices
      .map((id) => QuestDB.getInstance().getById(QuestDB.keyOf(QuestCategories.REPEATABLE, id)))
      .filter(Boolean);
  }

  /** @returns {boolean} true when the offers were rerolled */
  rerollRepeatableChoices() {
    const save = this._save();
    if (!save || !save.quests.isRepeatableUnlocked()) return false;
    const current = save.quests.getRepeatableChoices();
    const remaining = this.getRepeatableRerollRemainingMs();
    if (remaining > 0 && current.length > 0) {
      this._notifyRepeatable('repeatable_reroll_wait', {
        time: TextFormatter.formatMinutesSeconds(remaining)
      }, NotificationChannels.GAMEPLAY, NotificationTones.INFO);
      return false;
    }
    const choices = [];
    save.quests.setRepeatableChoices([]);
    for (let index = 0; index < QuestRules.REPEATABLE_OFFER_COUNT; index++) {
      const next = this._pickRepeatableChoice(save, choices);
      if (!next) break;
      choices.push(next.id);
    }
    save.quests.setRepeatableChoices(choices);
    save.quests.setRepeatableLastRollAt(Date.now());
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new RepeatableBoardChangedEvent('rerolled'));
    return true;
  }

  /** @param {number} index @returns {boolean} true when an offered quest was accepted */
  acceptRepeatableOffer(index) {
    const save = this._save();
    if (!save || !save.quests.isRepeatableUnlocked() || !Number.isInteger(index) || index < 0) return false;
    this.ensureRepeatableChoices();
    const choices = save.quests.getRepeatableChoices();
    const id = choices[index];
    const quest = id && QuestDB.getInstance().getById(QuestDB.keyOf(QuestCategories.REPEATABLE, id));
    if (!quest || !this.isAvailable(quest.key)) return false;

    const nextChoices = [...choices];
    nextChoices.splice(index, 1);
    const replacement = this._pickRepeatableChoice(save, [...nextChoices, quest.id]);
    if (replacement) nextChoices.splice(index, 0, replacement.id);
    save.quests.setRepeatableChoices(nextChoices);
    this._activate(save, quest);
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new RepeatableBoardChangedEvent('offer-accepted'));
    return true;
  }

  /** @returns {boolean} true when a slot was purchased */
  upgradeRepeatableSlots() {
    const save = this._save();
    if (!save || !save.quests.isRepeatableUnlocked()) return false;
    const level = save.quests.getRepeatableSlotUpgrades();
    const cost = QuestRules.REPEATABLE_SLOT_UPGRADE_COSTS[level];
    if (!cost) {
      this._notifyRepeatable('repeatable_slots_max', {}, NotificationChannels.GAMEPLAY, NotificationTones.INFO);
      return false;
    }
    if (save.currencies.get('money') < cost) {
      this._notifyRepeatable('n.pas_assez_dargent', {}, NotificationChannels.ECONOMY, NotificationTones.DANGER);
      return false;
    }
    save.currencies.add('money', -cost);
    save.quests.setRepeatableSlotUpgrades(level + 1);
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new RepeatableBoardChangedEvent('slot-upgraded'));
    this._notifyRepeatable('repeatable_slot_upgraded', {
      count: save.quests.getRepeatableSlotCount()
    }, NotificationChannels.ECONOMY, NotificationTones.SUCCESS);
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
    let changed = event instanceof NpcTalkedEvent &&
      event.locationId === QuestRules.REPEATABLE_UNLOCK_LOCATION &&
      event.npcId === QuestRules.REPEATABLE_UNLOCK_NPC_ID
      ? this._setRepeatableUnlocked({ notify: true })
      : false;
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
    let claimed = false;
    for (const quest of completed) {
      EventBus.getInstance().dispatch(new QuestCompletedEvent(quest.key));
      if (quest.category === QuestCategories.MAIN && this._objectiveOf(quest).constructor.AUTO_CLAIM) {
        claimed = this.claim(quest.key, { deferSave: event.deferSave === true }) || claimed;
      }
    }
    if (changed && event.deferSave !== true && !claimed) SaveSystem.getInstance().saveCurrent();
  }

  /**
   * Grants the rewards of a completed quest. When the reward Pokémon must be met in battle first
   * (main quests and legendary chain ends, original startLegendaryEncounter), the claim only
   * dispatches QuestEncounterRequestedEvent; the battle system claims again with
   * `{ encounterWon: true }` once the Pokémon is caught (it then joins the team through the capture).
   * @param {string} key
   * @param {{encounterWon?: boolean, deferSave?: boolean}} [options]
   * @returns {boolean} true when the quest has been claimed
   */
  claim(key, { encounterWon = false, deferSave = false } = {}) {
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
    // Gift Pokémon still wait for a free party slot; this claim flow does not route them to the PC box.
    const giftPokemon = !!pokemon && !needsEncounter;
    if (giftPokemon && !TeamSystem.getInstance().hasFreeSlot()) return false;
    const currencyRewards = quest.rewards.currencies || {};
    for (const [currencyId, quantity] of Object.entries(currencyRewards)) {
      if (quantity > 0) {
        const amount = currencyId === BonusTypes.MONEY
          ? BonusSystem.getInstance().applyMultiplier(quantity, BonusTypes.MONEY)
          : quantity;
        save.currencies.add(currencyId, amount);
      }
    }
    // Legacy quest data is normalized by QuestDB, but keep this fallback for older in-memory fixtures.
    if (!Object.prototype.hasOwnProperty.call(currencyRewards, QuestRules.REWARD_CURRENCY) && quest.rewards.questPoints > 0) {
      save.currencies.add(QuestRules.REWARD_CURRENCY, quest.rewards.questPoints);
    }
    for (const [itemId, quantity] of Object.entries(quest.rewards.items)) grantItem(save, itemId, quantity, { deferSave: true });
    if (giftPokemon) {
      TeamSystem.getInstance().addPokemon(
        PokemonFactory.create(pokemon.species, pokemon.level, { shiny: !!pokemon.shiny }),
        { deferSave: true }
      );
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
    // Quest rewards and progress belong to one claim transaction; listeners refresh their views,
    // while this method (or its enclosing battle) performs the single persistence write.
    EventBus.getInstance().dispatch(new QuestClaimedEvent(key, { deferSave: true }));
    if (!deferSave) SaveSystem.getInstance().saveCurrent();
    return true;
  }

  // --- Internals -------------------------------------------------------------------------------

  /** @private @param {import('../data/save/SaveData.js').SaveData} save */
  _canAcceptRepeatable(save) {
    const activeCount = save.quests.getActiveKeys().filter((key) =>
      QuestDB.getInstance().getById(key)?.category === QuestCategories.REPEATABLE
    ).length;
    return save.quests.isRepeatableUnlocked() && activeCount < save.quests.getRepeatableSlotCount();
  }

  /** @private @param {import('../data/save/SaveData.js').SaveData} save @param {Readonly<Object>} quest */
  _isRepeatableOfferAvailable(save, quest) {
    if (!quest || quest.category !== QuestCategories.REPEATABLE || quest.locked ||
        save.quests.isActive(quest.key) || !this._canAcceptRepeatable(save)) return false;
    const region = save.player.region || PlayerDefaults.REGION;
    if (!this._isRepeatableAvailableInRegion(quest, region)) return false;
    return save.quests.getRepeatableChoices().some((id) => this._normalizeRepeatableChoiceId(id) === quest.id);
  }

  /** @private @param {Readonly<Object>|null} quest @param {string} region */
  _isRepeatableAvailableInRegion(quest, region) {
    if (!quest || quest.category !== QuestCategories.REPEATABLE) return false;
    if (quest.region && quest.region !== region) return false;
    if (!quest.location) return true;
    return LocationDB.getInstance().getById(quest.location)?.region === region;
  }

  /** @private @param {*} value @returns {string|null} */
  _normalizeRepeatableChoiceId(value) {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const id = String(value).trim().replace(/^repeatable[._]/, '').replace(/^r_/, '');
    return id && QuestDB.getInstance().getById(QuestDB.keyOf(QuestCategories.REPEATABLE, id)) ? id : null;
  }

  /** @private @param {import('../data/save/SaveData.js').SaveData} save @param {string[]} extraExcluded */
  _pickRepeatableChoice(save, extraExcluded = []) {
    const region = save.player.region || PlayerDefaults.REGION;
    const activeIds = new Set(save.quests.getActiveKeys()
      .filter((key) => QuestDB.getInstance().getById(key)?.category === QuestCategories.REPEATABLE)
      .map((key) => key.slice(`${QuestCategories.REPEATABLE}.`.length)));
    const currentIds = new Set(save.quests.getRepeatableChoices()
      .map((id) => this._normalizeRepeatableChoiceId(id)).filter(Boolean));
    const excluded = new Set(extraExcluded
      .map((id) => this._normalizeRepeatableChoiceId(id)).filter(Boolean));
    const pool = QuestDB.getInstance().getByCategory(QuestCategories.REPEATABLE)
      .filter((quest) => this._isRepeatableAvailableInRegion(quest, region) &&
        !activeIds.has(quest.id) && !currentIds.has(quest.id) && !excluded.has(quest.id));
    const fallback = pool.length ? pool : QuestDB.getInstance().getByCategory(QuestCategories.REPEATABLE)
      .filter((quest) => this._isRepeatableAvailableInRegion(quest, region) &&
        !activeIds.has(quest.id) && !excluded.has(quest.id));
    return this._random.pick(fallback) || null;
  }

  /**
   * Unlocks the board after talking to the original Cerulean NPC.
   * @returns {boolean} Whether a new unlock was granted
   */
  unlockRepeatables() {
    return this._setRepeatableUnlocked({ notify: true, persist: true });
  }

  /** @private @param {{notify?:boolean,persist?:boolean}} [options] */
  _setRepeatableUnlocked({ notify = false, persist = false } = {}) {
    const save = this._save();
    if (!save || !save.quests.setRepeatableUnlocked(true)) return false;
    if (persist) SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new RepeatableBoardChangedEvent('unlocked'));
    if (notify) this._notifyRepeatable(
      'repeatable_quests_unlocked', {}, NotificationChannels.ACHIEVEMENT, NotificationTones.SUCCESS
    );
    return true;
  }

  /** @private @param {{notify?:boolean}} [options] */
  _syncRepeatableUnlock({ notify = false } = {}) {
    const save = this._save();
    if (!save || save.quests.isRepeatableUnlocked()) return false;
    const activeRepeatable = save.quests.getActiveKeys().some((key) =>
      QuestDB.getInstance().getById(key)?.category === QuestCategories.REPEATABLE
    );
    const hasLegacyProgress = activeRepeatable || save.quests.repeatablesCompleted > 0 ||
      save.quests.getRepeatableChoices().length > 0 || save.quests.getRepeatableSlotUpgrades() > 0 ||
      save.quests.getRepeatableLastRollAt() > 0;
    if (!hasLegacyProgress) return false;
    save.quests.setRepeatableUnlocked(true);
    EventBus.getInstance().dispatch(new RepeatableBoardChangedEvent('unlocked'));
    if (notify) this._notifyRepeatable(
      'repeatable_quests_unlocked', {}, NotificationChannels.ACHIEVEMENT, NotificationTones.SUCCESS
    );
    return true;
  }

  /** @private @param {string} key @param {Object} params @param {string} channel @param {string} tone */
  _notifyRepeatable(key, params, channel, tone) {
    NotificationSystem.getInstance().notifyTemporary(t(key, params), { channel, tone });
  }

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
