/**
 * @file BattleSystem.js
 * @brief Automatic wild battles (C++ equivalent: class BattleSystem : public BaseSystem).
 * Bridges the save / event bus and the pure battle engine (systems/battle/BattleSession):
 *   - startBattle() draws a wild Pokémon from the location encounter table;
 *   - QuestEncounterRequestedEvent starts the final encounter of a quest;
 *   - startTrainerBattle() runs a battle prepared by TrainerSystem (a trainer context: foe queue,
 *     opening lines, settlement in context.onVictory());
 *   - update(dt) advances the session, translates its log (BattleLogFormatter) and reports
 *     the hits (BattleAttackEvent) and states (BattleStateChangedEvent);
 *   - at the end: statistics, PokemonDefeatedEvent, experience and money (RewardRules),
 *     automatic catch (CatchSystem: Poké Ball filters, PC box, quest claim), full heal of the team
 *     (original restoreTeamAfterBattle), one save write, BattleEndedEvent.
 */

import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { LocationSystem } from './LocationSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { QuestSystem } from './QuestSystem.js';
import { CatchSystem } from './CatchSystem.js';
import { EventBus } from '../core/EventBus.js';
import { Random } from '../core/Random.js';
import { PokemonFactory } from '../data/pokemon/PokemonFactory.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { QuestDB } from '../data/quests/QuestDB.js';
import { QuestCategories } from '../data/quests/QuestCategories.js';
import { QuestCatchKinds } from '../data/catch/QuestCatchKinds.js';
import { HeldEffectKinds } from '../data/items/HeldEffectKinds.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { BattleSession, BattleOutcomes } from './battle/BattleSession.js';
import { BattleLogFormatter } from './battle/BattleLogFormatter.js';
import { RewardRules } from './battle/RewardRules.js';
import { EncounterRules } from './battle/EncounterRules.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleStateChangedEvent } from '../core/events/BattleStateChangedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { BattleAttackEvent } from '../core/events/BattleAttackEvent.js';
import { PokemonDefeatedEvent } from '../core/events/PokemonDefeatedEvent.js';
import { QuestEncounterRequestedEvent } from '../core/events/QuestEncounterRequestedEvent.js';
import { t } from '../localization/LocalizationManager.js';

/** Lines kept in the battle log. */
const LOG_MAX_LINES = 200;

export class BattleSystem extends BaseSystem {
  /** @private @type {BattleSystem|null} */
  static _instance = null;

  /** @returns {BattleSystem} */
  static getInstance() {
    if (!BattleSystem._instance) {
      BattleSystem._instance = new BattleSystem();
    }
    return BattleSystem._instance;
  }

  constructor() {
    super('BattleSystem', 'System');
    /** @private @type {BattleSession|null} */ this._session = null;
    /** @private @type {string|null} */ this._locationId = null;
    /** @private @type {string|null} Quest whose final encounter is running */ this._questKey = null;
    /** @private @type {Object|null} TrainerBattleContext of the running trainer battle */ this._trainer = null;
    /** @private @type {string[]} */ this._log = [];
    /** @private @type {Random} */ this._random = Random.default;
    /** @private @type {Function|null} */ this._onEncounter = null;
  }

  /** @override */
  init() {
    if (this._onEncounter) return;
    this._onEncounter = (event) => this._startQuestEncounter(event);
    EventBus.getInstance().subscribe(QuestEncounterRequestedEvent, this._onEncounter);
  }

  /** @override */
  onDestroy() {
    if (this._onEncounter) EventBus.getInstance().unsubscribe(QuestEncounterRequestedEvent, this._onEncounter);
    this._onEncounter = null;
    super.onDestroy();
  }

  // --- Queries ---

  /** @returns {boolean} */
  isActive() {
    return !!this._session;
  }

  /** @returns {import('../data/pokemon/PokemonData.js').PokemonData|null} */
  getCurrentFoe() {
    return this._session?.foe.pokemon ?? null;
  }

  /** @returns {import('../data/pokemon/PokemonData.js').PokemonData|null} Active Pokémon of the player */
  getPlayerPokemon() {
    return this._session?.active.pokemon ?? null;
  }

  /**
   * Read-only view of the fighters (statuses, stat modifiers, field) for the battle views.
   * @returns {{player: import('./battle/BattleCombatant.js').BattleCombatant, foe: import('./battle/BattleCombatant.js').BattleCombatant, field: import('./battle/BattleField.js').BattleField}|null}
   */
  getCombatState() {
    const session = this._session;
    return session ? { player: session.active, foe: session.foe, field: session.field } : null;
  }

  /** @returns {string[]} Localized battle log lines */
  getLog() {
    return [...this._log];
  }

  // --- Commands ---

  /**
   * Random source of the next battles (tests use Random.sequence).
   * @param {Random} random
   */
  setRandom(random) {
    this._random = random;
  }

  /**
   * Starts a wild battle at a location.
   * @param {string} [locationId] - Defaults to the player position
   * @returns {boolean} False when no battle can start (no team, no wild Pokémon, battle running)
   */
  startBattle(locationId = LocationSystem.getInstance().getCurrentLocationId()) {
    if (this.isActive()) return false;
    const team = SaveSystem.getInstance().getCurrentSave()?.team ?? [];
    const foe = EncounterRules.drawWild(LocationDB.getInstance().getEncounters(locationId), team, this._random);
    if (!foe) {
      this._warn('battle_no_wild_here');
      return false;
    }
    return this._begin(foe, locationId, null, 'battle_log.wild_appeared');
  }

  /**
   * Starts a trainer battle prepared by TrainerSystem.
   * @param {import('./trainers/TrainerBattleContext.js').TrainerBattleContext} context
   * @param {string} [locationId] - Defaults to the player position
   * @returns {boolean} False when no battle can start
   */
  startTrainerBattle(context, locationId = LocationSystem.getInstance().getCurrentLocationId()) {
    if (this.isActive() || !context.foes.length) return false;
    const [first, ...reserves] = context.foes;
    this._trainer = context;
    const started = this._begin(first.pokemon, locationId, null, context.openingLines, reserves);
    if (!started) this._trainer = null;
    return started;
  }

  /** @returns {boolean} true while a trainer battle runs */
  isTrainerBattle() {
    return !!this._trainer;
  }

  /**
   * Stops the current battle (player leaves): no reward, the team is healed.
   * @param {boolean} [victory=false]
   * @param {number} [exp=0]
   * @param {number} [money=0]
   */
  endBattle(victory = false, exp = 0, money = 0) {
    if (!this.isActive()) return;
    for (const pokemon of SaveSystem.getInstance().getCurrentSave()?.team ?? []) pokemon.healFull();
    this._session = null;
    this._questKey = null;
    this._trainer = null;
    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new BattleEndedEvent(victory, exp, money));
  }

  /**
   * @override
   * @param {number} dt - Seconds since the last frame
   */
  update(dt) {
    const session = this._session;
    if (!session) return;
    session.update(dt);
    const hits = session.drainHits();
    for (const hit of hits) EventBus.getInstance().dispatch(new BattleAttackEvent(hit));
    const changed = this._flushLog() || hits.length > 0;
    if (changed) EventBus.getInstance().dispatch(new BattleStateChangedEvent(session.active.pokemon, session.foe.pokemon));
    if (session.isOver()) this._finish(session);
  }

  // --- Internals ---

  /**
   * @private
   * @param {import('../data/pokemon/PokemonData.js').PokemonData} foe
   * @param {string} locationId
   * @param {string|null} questKey
   * @param {string|Array<{key: string, params: Object}>} intro - Battle log key of the first line
   *   (the foe name is its parameter), or the ready-made opening lines of a trainer battle
   * @param {Array<{pokemon: Object, intro?: Object}>} [reserves=[]] - Foes sent after `foe`
   * @returns {boolean}
   */
  _begin(foe, locationId, questKey, intro, reserves = []) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const team = save?.team ?? [];
    if (!team.some((pokemon) => !pokemon.isFainted())) {
      this._warn('battle_no_team');
      return false;
    }
    this._locationId = locationId;
    this._questKey = questKey;
    this._session = new BattleSession({
      team,
      foe,
      random: this._random,
      weather: LocationDB.getInstance().getById(locationId)?.weather ?? null,
      ownedQuantity: (itemId) => save.inventory.count(itemId),
      reserves
    });
    this._log = [];
    const lines = typeof intro === 'string' ? [{ key: intro, params: { name: foe.getDisplayName() } }] : intro;
    for (const line of lines) this._session.log.add(line.key, line.params);
    if (reserves.length || typeof intro !== 'string') this._session.log.add('battle_log.trainer_sends', { name: foe.getDisplayName() });
    this._session.start();
    this._flushLog();
    save.pokedex.markSeen(foe.species);
    NotificationSystem.getInstance().notifyTemporary(this._log[0], { channel: NotificationChannels.BATTLE, tone: NotificationTones.WARNING });
    EventBus.getInstance().dispatch(new BattleStartedEvent(this._session.active.pokemon, foe));
    return true;
  }

  /**
   * @private
   * @param {QuestEncounterRequestedEvent} event
   */
  _startQuestEncounter(event) {
    if (this.isActive() || !PokemonDB.getInstance().has(event.pokemon.species)) return;
    const foe = PokemonFactory.create(event.pokemon.species, event.pokemon.level, { shiny: !!event.pokemon.shiny });
    const locationId = event.locationId ?? LocationSystem.getInstance().getCurrentLocationId();
    this._begin(foe, locationId, event.questKey, 'battle_log.quest_encounter');
  }

  /**
   * @private
   * @returns {boolean} true when new lines were added
   */
  _flushLog() {
    const entries = this._session?.log.drain() ?? [];
    for (const entry of entries) this._log.push(BattleLogFormatter.format(entry));
    if (this._log.length > LOG_MAX_LINES) this._log.splice(0, this._log.length - LOG_MAX_LINES);
    return entries.length > 0;
  }

  /**
   * @private
   * @param {BattleSession} session
   */
  _finish(session) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const foe = session.foe.pokemon;
    let exp = 0;
    let money = 0;
    const victory = session.outcome === BattleOutcomes.VICTORY;
    for (const sent of session.sentFoes) save?.pokedex.markSeen(sent.species);
    if (victory && save && this._trainer) {
      ({ exp, money } = this._settleTrainer(save, session));
    } else if (victory && save) {
      const wild = !this._questKey;
      if (wild) save.statistics.recordWildWin(this._locationId);
      EventBus.getInstance().dispatch(new PokemonDefeatedEvent(foe.species, foe.level, this._locationId, wild));
      exp = this._grantExperience(save, foe);
      money = RewardRules.wildMoney(LocationDB.getInstance().getById(this._locationId));
      save.currencies.add('money', money);
      session.log.add('battle_log.money', { money });
      this._tryCatch(save, session);
      NotificationSystem.getInstance().notifyTemporary(
        t('notif_enemy_defeated', { name: foe.getDisplayName(), exp, money }),
        { channel: NotificationChannels.BATTLE }
      );
    } else {
      session.log.add('battle_log.defeat');
      NotificationSystem.getInstance().notifyTemporary(t('battle_lost_recover'), { channel: NotificationChannels.BATTLE, tone: NotificationTones.DANGER });
    }
    this._flushLog();
    this.endBattle(victory, exp, money);
  }

  /**
   * Trainer win: the context applies badges / rewards, then the fixed experience share.
   * @private
   * @returns {{exp: number, money: number}}
   */
  _settleTrainer(save, session) {
    const result = this._trainer.onVictory({ save, session, locationId: this._locationId });
    if (result.expShare > 0) this._grantFixedExperience(save, result.expShare);
    NotificationSystem.getInstance().notifyTemporary(
      t('notif_trainer_defeated', { trainer: t(`trainer.${this._trainer.league?.id ?? this._trainer.id}.name`) }),
      { channel: NotificationChannels.BATTLE, tone: NotificationTones.ACCENT }
    );
    return { exp: result.expShare, money: result.money };
  }

  /**
   * Same experience for every living member (original champion win).
   * @private
   * @param {import('../data/save/SaveData.js').SaveData} save
   * @param {number} share
   */
  _grantFixedExperience(save, share) {
    for (const member of save.team.filter((pokemon) => !pokemon.isFainted())) this._giveExp(member, share);
  }

  /**
   * @private
   * @param {import('../data/pokemon/PokemonData.js').PokemonData} member
   * @param {number} share
   */
  _giveExp(member, share) {
    const log = this._session.log;
    const levels = member.addExp(share);
    log.add('battle_log.exp_gained', { name: member.getDisplayName(), exp: share });
    if (levels > 0) {
      log.add('battle_log.level_up', { name: member.getDisplayName(), level: member.level });
      NotificationSystem.getInstance().notifyTemporary(
        t('notif_level_up', { name: member.getDisplayName(), level: member.level }),
        { channel: NotificationChannels.GAMEPLAY, tone: NotificationTones.ACCENT }
      );
    }
  }

  /**
   * Original gainXP: every living member gets its scaled share.
   * @private
   * @returns {number} Highest share (reported by BattleEndedEvent)
   */
  _grantExperience(save, foe) {
    const log = this._session.log;
    const baseShare = RewardRules.baseShare(foe.getSpecies(), foe.level);
    let best = 0;
    for (const member of save.team.filter((pokemon) => !pokemon.isFainted())) {
      const luckyEgg = this._heldKind(member) === HeldEffectKinds.EXP;
      const share = RewardRules.memberExp(baseShare, member.level, foe.level, luckyEgg);
      best = Math.max(best, share);
      if (share > 0) this._giveExp(member, share);
    }
    if (best === 0) log.add('battle_log.exp_none');
    return best;
  }

  /**
   * Automatic catch (CatchSystem). The final encounter of a quest is claimed only once its
   * Pokémon is caught; otherwise it stays available (the ball is the only cost).
   * @private
   */
  _tryCatch(save, session) {
    const quest = this._questKey ? QuestDB.getInstance().getById(this._questKey) : null;
    let questKind = QuestCatchKinds.NONE;
    if (quest) questKind = quest.category === QuestCategories.MAIN ? QuestCatchKinds.GIFT : QuestCatchKinds.LEGENDARY;
    const caught = CatchSystem.getInstance().attempt({ save, session, locationId: this._locationId, questKind });
    if (caught && this._questKey) QuestSystem.getInstance().claim(this._questKey, { encounterWon: true });
  }

  /** @private @returns {string|null} HeldEffectKinds value of the held item */
  _heldKind(pokemon) {
    return pokemon.heldItem ? ItemDB.getInstance().getById(pokemon.heldItem)?.effect?.kind ?? null : null;
  }

  /** @private */
  _warn(key) {
    NotificationSystem.getInstance().notifyTemporary(t(key), { channel: NotificationChannels.BATTLE, tone: NotificationTones.WARNING });
  }
}
