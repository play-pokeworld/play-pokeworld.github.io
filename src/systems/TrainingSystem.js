/**
 * @file TrainingSystem.js
 * @brief Kanto training-centre sessions against a type-matched six-Pokémon coaching team.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { TeamSystem } from './TeamSystem.js';
import { BoxSystem } from './BoxSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { EventBus } from '../core/EventBus.js';
import { BattleSession, BattleOutcomes } from './battle/BattleSession.js';
import { Random } from '../core/Random.js';
import { PokemonFactory } from '../data/pokemon/PokemonFactory.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { MoveDB } from '../data/battle/MoveDB.js';
import { MoveLearnset } from '../data/pokemon/MoveLearnset.js';
import { TrainingOpponentDB } from '../data/training/TrainingOpponentDB.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { LocationSystem } from './LocationSystem.js';
import { FeatureAccessSystem } from './FeatureAccessSystem.js';
import { BattleFoeKnockedOutEvent } from '../core/events/BattleFoeKnockedOutEvent.js';
import { TrainingSessionCompletedEvent } from '../core/events/TrainingSessionCompletedEvent.js';
import { TrainingBattleChangedEvent } from '../core/events/TrainingBattleChangedEvent.js';
import { TrainingResultChangedEvent } from '../core/events/TrainingResultChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { TrainingRules } from '../config/TrainingRules.js';
import { CONTENT_FEATURES } from '../config/ContentAccessRules.js';
import { MoveConfig } from '../config/MoveConfig.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { t } from '../localization/LocalizationManager.js';

export const TrainingResults = Object.freeze({
  READY: 'ready',
  NO_SAVE: 'no-save',
  WRONG_LOCATION: 'wrong-location',
  FEATURE_LOCKED: 'feature-locked',
  NEED_BADGE: 'need-badge',
  BATTLE_ACTIVE: 'battle-active',
  SESSION_ACTIVE: 'session-active',
  POKEMON_NOT_FOUND: 'pokemon-not-found',
  NO_MOVES: 'no-moves',
  UNKNOWN_MODE: 'unknown-mode',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
});

export class TrainingSystem extends BaseSystem {
  /** @private @type {TrainingSystem|null} */
  static _instance = null;

  /** @returns {TrainingSystem} */
  static getInstance() {
    if (!TrainingSystem._instance) TrainingSystem._instance = new TrainingSystem();
    return TrainingSystem._instance;
  }

  constructor() {
    super('TrainingSystem', 'System');
    /** @private @type {BattleSession|null} */
    this._session = null;
    /** @private @type {Object|null} */
    this._trainee = null;
    /** @private @type {string|null} */
    this._mode = null;
    /** @private @type {string|null} */
    this._locationId = null;
    /** @private @type {Object|null} */
    this._lastResult = null;
    /** @private @type {number} */
    this._elapsedSeconds = 0;
    /** @private @type {Random} */
    this._random = Random.default;
    /** @private @type {Function|null} */
    this._onSaveContextChanged = null;
  }

  /** @override */
  init() {
    if (this._onSaveContextChanged) return;
    this._onSaveContextChanged = () => this._resetSession(true);
    EventBus.getInstance().subscribe(SaveCreatedEvent, this._onSaveContextChanged);
    EventBus.getInstance().subscribe(SaveLoadedEvent, this._onSaveContextChanged);
  }

  /** @override */
  onDestroy() {
    if (this._onSaveContextChanged) {
      EventBus.getInstance().unsubscribe(SaveCreatedEvent, this._onSaveContextChanged);
      EventBus.getInstance().unsubscribe(SaveLoadedEvent, this._onSaveContextChanged);
    }
    this._onSaveContextChanged = null;
    this._resetSession(true);
    super.onDestroy();
  }

  /** @param {Random} random */
  setRandom(random) {
    this._random = random;
  }

  /** @returns {boolean} */
  isUnlocked() {
    return FeatureAccessSystem.getInstance().isFeatureUnlocked(CONTENT_FEATURES.TRAINING);
  }

  /** @returns {boolean} */
  canUseHere() {
    return this.isUnlocked() && LocationSystem.getInstance().getCurrentLocationId() === TrainingRules.LOCATION_ID;
  }

  /** @returns {boolean} */
  isActive() {
    return !!this._session;
  }

  /** @returns {Array<{uid:string,name:string,species:string,level:number,source:string}>} */
  getCandidates() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return [];
    return [
      ...save.team.map((pokemon) => ({ pokemon, source: 'team' })),
      ...save.box.map((pokemon) => ({ pokemon, source: 'box' }))
    ].filter(({ pokemon }) => pokemon.moves.length < MoveConfig.ACTIVE_SLOTS && this._availableMoves(pokemon).length > 0)
      .map(({ pokemon, source }) => ({
        uid: pokemon.uid,
        name: pokemon.getDisplayName(),
        species: pokemon.species,
        level: pokemon.level,
        source
      }));
  }

  /** @returns {Object|null} Defensive panel snapshot */
  getSnapshot() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!this._session || !this._trainee) {
      return { active: false, lastResult: this._lastResult ? { ...this._lastResult } : null };
    }
    const session = this._session;
    const foe = session.foe;
    const traineeCombatant = session.active;
    return {
      active: true,
      mode: this._mode,
      modeLabel: t(`training_mode_${this._mode}_title`),
      traineeUid: this._trainee.uid,
      traineeName: this._trainee.getDisplayName(),
      traineeSpecies: this._trainee.species,
      traineeLevel: this._trainee.level,
      traineeHp: traineeCombatant.hp,
      traineeMaxHp: traineeCombatant.maxHp,
      foeName: foe.name,
      foeSpecies: foe.pokemon.species,
      foeLevel: foe.pokemon.level,
      foeHp: foe.hp,
      foeMaxHp: foe.maxHp,
      opponentsDefeated: session.defeatedFoes.length,
      opponentCount: session.sentFoes.length + session.reserveCount,
      saveId: save?.id ?? null
    };
  }

  /**
   * Runs the standard move-discipline training session for a team or boxed Pokémon.
   * @param {string} pokemonUid
   * @param {string} [mode=TrainingRules.MODE_ID]
   * @returns {{result:string,opponentCount:number}}
   */
  startSession(pokemonUid, mode = TrainingRules.MODE_ID) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return this._failure(TrainingResults.NO_SAVE);
    if (!this.isUnlocked()) return this._failure(TrainingResults.FEATURE_LOCKED);
    if (!this.canUseHere()) return this._failure(TrainingResults.WRONG_LOCATION);
    if (!save.player.hasBadge(TrainingRules.REQUIRED_BADGE_ID)) return this._failure(TrainingResults.NEED_BADGE);
    if (this._session) return this._failure(TrainingResults.SESSION_ACTIVE);
    if (BattleSystem.getInstance().isActive()) return this._failure(TrainingResults.BATTLE_ACTIVE);
    if (mode !== TrainingRules.MODE_ID) return this._failure(TrainingResults.UNKNOWN_MODE);
    const trainee = [...save.team, ...save.box].find((pokemon) => pokemon.uid === pokemonUid);
    if (!trainee) return this._failure(TrainingResults.POKEMON_NOT_FOUND);
    const eligibleMoves = this._availableMoves(trainee);
    if (eligibleMoves.length === 0 || trainee.moves.length >= MoveConfig.ACTIVE_SLOTS) {
      return this._failure(TrainingResults.NO_MOVES);
    }
    const opponents = this._createOpponents(trainee);
    if (opponents.length !== TrainingRules.OPPONENT_COUNT) return this._failure(TrainingResults.NO_MOVES);
    trainee.healFull();
    const locationId = LocationSystem.getInstance().getCurrentLocationId();
    this._trainee = trainee;
    this._mode = mode;
    this._locationId = locationId;
    this._elapsedSeconds = 0;
    this._lastResult = null;
    this._session = new BattleSession({
      team: [trainee],
      foe: opponents[0],
      reserves: opponents.slice(1).map((pokemon) => ({ pokemon })),
      training: true,
      random: this._random,
      weather: LocationDB.getInstance().getById(locationId)?.weather ?? null,
      ownedQuantity: (itemId) => save.inventory.count(itemId),
      onFoeDefeated: (encounter) => EventBus.getInstance().dispatch(new BattleFoeKnockedOutEvent(
        encounter.pokemon.species,
        encounter.pokemon.level,
        locationId,
        { deferSave: true }
      ))
    });
    this._session.start();
    this._notify(t('training_session_started', { name: trainee.getDisplayName() }), NotificationTones.INFO);
    SaveSystem.getInstance().saveCurrent();
    this._dispatchBattleChanged();
    return { result: TrainingResults.READY, opponentCount: opponents.length };
  }

  /** @param {number} dt - Seconds since the previous engine frame */
  update(dt) {
    const session = this._session;
    if (!session) return;
    const elapsed = Number(dt);
    if (Number.isFinite(elapsed) && elapsed > 0) this._elapsedSeconds += elapsed;
    session.update(Math.max(0, Number.isFinite(elapsed) ? elapsed : 0));
    const hits = session.drainHits();
    const logEntries = session.log.drain();
    if (session.isOver()) {
      this._finishSession(session);
      return;
    }
    if (hits.length > 0 || logEntries.length > 0) this._dispatchBattleChanged();
    if (this._elapsedSeconds >= TrainingRules.MAX_SIMULATION_TICKS * TrainingRules.TICK_SECONDS) {
      session.outcome = BattleOutcomes.DEFEAT;
      this._finishSession(session, 'timeout');
    }
  }

  /** Stops a running training battle without recording a completed session. */
  cancelSession() {
    if (!this._session) return false;
    const trainee = this._trainee;
    trainee?.healFull();
    const result = {
      result: TrainingResults.CANCELLED,
      success: false,
      mode: null,
      pokemonUid: trainee?.uid ?? null,
      pokemonName: trainee?.getDisplayName?.() ?? '',
      rewardMove: null,
      opponentsDefeated: 0
    };
    this._lastResult = { ...result };
    this._resetSession();
    SaveSystem.getInstance().saveCurrent();
    this._dispatchTraineeRosterChanged(trainee);
    EventBus.getInstance().dispatch(new TrainingResultChangedEvent(result));
    this._dispatchBattleChanged();
    return true;
  }

  /** @private @param {BattleSession} session @param {string} [reason] */
  _finishSession(session, reason = null) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const trainee = this._trainee;
    if (!save || !trainee) {
      this._resetSession();
      this._dispatchBattleChanged();
      return;
    }
    const success = session.outcome === BattleOutcomes.VICTORY;
    const opponentsDefeated = session.defeatedFoes.length;
    let rewardMove = null;
    if (success) {
      const rewardOptions = this._availableMoves(trainee);
      if (rewardOptions.length > 0 && trainee.moves.length < MoveConfig.ACTIVE_SLOTS) {
        rewardMove = this._random.pick(rewardOptions) ?? null;
        if (rewardMove) trainee.moves.push(rewardMove);
      }
    }
    trainee.healFull();
    save.statistics.recordTrainingSession();
    const result = {
      result: TrainingResults.COMPLETED,
      success,
      mode: this._mode,
      pokemonUid: trainee.uid,
      pokemonName: trainee.getDisplayName(),
      rewardMove,
      opponentsDefeated,
      reason
    };
    this._lastResult = { ...result };
    this._resetSession();
    EventBus.getInstance().dispatch(new TrainingSessionCompletedEvent(1, { deferSave: true }));
    SaveSystem.getInstance().saveCurrent();
    this._dispatchTraineeRosterChanged(trainee);
    EventBus.getInstance().dispatch(new TrainingResultChangedEvent(result));
    this._dispatchBattleChanged();
    const text = success
      ? t('training_session_complete', {
        name: trainee.getDisplayName(),
        reward: rewardMove ? t(`move.${rewardMove}.name`) : t('training_reward_none')
      })
      : t('training_session_failed', { name: trainee.getDisplayName() });
    this._notify(text, success ? NotificationTones.SUCCESS : NotificationTones.WARNING);
  }

  /** @private @param {Object} trainee @returns {string[]} */
  _availableMoves(trainee) {
    const known = new Set(trainee.moves);
    return MoveLearnset.poolFor(trainee.getTypes()).filter((moveId) => MoveDB.getInstance().has(moveId) && !known.has(moveId));
  }

  /** @private @param {Object} trainee */
  _createOpponents(trainee) {
    const type = trainee.getTypes()[0] ?? 'normal';
    const pool = TrainingOpponentDB.getInstance().getSpeciesForType(type);
    if (pool.length < TrainingRules.OPPONENT_COUNT) return [];
    const baseLevel = Math.max(TrainingRules.MIN_OPPONENT_LEVEL, trainee.level + TrainingRules.MOVE_MODE_LEVEL_OFFSET);
    return pool.slice(0, TrainingRules.OPPONENT_COUNT).map((speciesId, index) => {
      if (!PokemonDB.getInstance().has(speciesId)) return null;
      const variation = TrainingRules.LEVEL_VARIATION[index % TrainingRules.LEVEL_VARIATION.length];
      const pokemon = PokemonFactory.create(speciesId, Math.max(TrainingRules.MIN_OPPONENT_LEVEL, baseLevel + variation), {
        random: this._random
      });
      if (pokemon) pokemon.nickname = t('training_coach_opponent', {
        number: index + 1,
        name: pokemon.getDisplayName()
      });
      return pokemon;
    }).filter(Boolean);
  }

  /** @private @param {Object|null} pokemon */
  _dispatchTraineeRosterChanged(pokemon) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save || !pokemon) return;
    if (save.team.some((entry) => entry.uid === pokemon.uid)) TeamSystem.getInstance().dispatchChanged();
    else if (save.box.some((entry) => entry.uid === pokemon.uid)) BoxSystem.getInstance().dispatchChanged();
  }

  /** @private */
  _dispatchBattleChanged() {
    EventBus.getInstance().dispatch(new TrainingBattleChangedEvent(this.getSnapshot()));
  }

  /** @private @param {string} result */
  _failure(result) {
    const key = result === TrainingResults.FEATURE_LOCKED ? 'content_feature_locked' :
      result === TrainingResults.WRONG_LOCATION ? 'training_location_required' :
        result === TrainingResults.NEED_BADGE ? 'training_badge_required' :
        result === TrainingResults.BATTLE_ACTIVE ? 'training_battle_active' :
          result === TrainingResults.SESSION_ACTIVE ? 'training_session_active' :
            result === TrainingResults.NO_MOVES ? 'training_no_moves' : 'training_action_unavailable';
    if (result !== TrainingResults.NO_SAVE && result !== TrainingResults.POKEMON_NOT_FOUND) {
      const params = result === TrainingResults.WRONG_LOCATION
        ? { location: t(`location.${TrainingRules.LOCATION_ID}`) }
        : result === TrainingResults.FEATURE_LOCKED
          ? { feature: t('training_center_title') }
          : {};
      this._notify(t(key, params), NotificationTones.WARNING);
    }
    return { result, opponentCount: 0 };
  }

  /** @private */
  _notify(text, tone) {
    NotificationSystem.getInstance().notifyTemporary(text, {
      channel: NotificationChannels.GAMEPLAY,
      tone
    });
  }

  /** @private @param {boolean} [clearResult=false] */
  _resetSession(clearResult = false) {
    this._session = null;
    this._trainee = null;
    this._mode = null;
    this._locationId = null;
    this._elapsedSeconds = 0;
    if (clearResult) this._lastResult = null;
  }
}
