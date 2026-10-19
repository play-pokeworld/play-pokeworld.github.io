/**
 * @file TrainerSystem.js
 * @brief Gym, league and quest trainer challenges (C++ equivalent: class TrainerSystem : public BaseSystem).
 * DOM-free. Decides whether a challenge is locked, a first challenge or a rematch (original
 * location-info.js + startChampBattle / startQuestTrainerBattle), builds the foe teams and hands a
 * TrainerBattleContext to BattleSystem. The settlement (badge, money, quest points, experience)
 * lives in the context.
 *
 * Champion ids: a location `champion` / a `badge` quest objective is a gym trainer id (TrainerDB)
 * or a league id (LeagueDB); a `boss` quest objective is any trainer id.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { BattleSystem } from './BattleSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { TrainerDB } from '../data/trainers/TrainerDB.js';
import { LeagueDB } from '../data/trainers/LeagueDB.js';
import { TrainerKinds } from '../data/trainers/TrainerKinds.js';
import { QuestDB } from '../data/quests/QuestDB.js';
import { ObjectiveTypes } from '../data/quests/ObjectiveTypes.js';
import { ChallengeStates } from './trainers/ChallengeStates.js';
import { BadgeRules } from './trainers/BadgeRules.js';
import { TrainerTeamRules } from './trainers/TrainerTeamRules.js';
import { TrainerTeamFactory } from './trainers/TrainerTeamFactory.js';
import { TrainerBattleContext } from './trainers/TrainerBattleContext.js';
import { Random } from '../core/Random.js';
import { t } from '../localization/LocalizationManager.js';

/**
 * @typedef {Object} ChallengeInfo
 * @property {string} id - Trainer or league id
 * @property {boolean} league
 * @property {string} region
 * @property {string} state - ChallengeStates value
 * @property {number} badgesRequired
 * @property {number} regionBadges - Gym badges of the region owned by the player
 * @property {string|null} sprite - Trainer sprite file stem
 */

export class TrainerSystem extends BaseSystem {
  /** @private @type {TrainerSystem|null} */
  static _instance = null;

  /** @returns {TrainerSystem} */
  static getInstance() {
    if (!TrainerSystem._instance) TrainerSystem._instance = new TrainerSystem();
    return TrainerSystem._instance;
  }

  constructor() {
    super('TrainerSystem', 'System');
    /** @private @type {Random} */
    this._random = Random.default;
  }

  /** @param {Random} random - Random source of the built teams (tests) */
  setRandom(random) {
    this._random = random;
  }

  // --- Queries ---

  /**
   * @param {string} championId - Gym trainer id or league id
   * @returns {ChallengeInfo|null} null for an unknown id
   */
  getChallenge(championId) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const league = LeagueDB.getInstance().getById(championId);
    const trainer = league ? null : TrainerDB.getInstance().getById(championId);
    const owner = league ?? trainer;
    if (!owner) return null;
    const regionBadges = BadgeRules.regionCount(save?.player, owner.region);
    let state = this._beaten(save, owner, !!league) ? ChallengeStates.REMATCH : ChallengeStates.CHALLENGE;
    if (owner.badgesRequired > regionBadges) state = ChallengeStates.LOCKED;
    return {
      id: owner.id,
      league: !!league,
      region: owner.region,
      state,
      badgesRequired: owner.badgesRequired,
      regionBadges,
      sprite: owner.sprite
    };
  }

  /**
   * Trainer a quest asks to beat (boss objective) or champion whose badge it asks for.
   * @param {string} questKey
   * @returns {string|null}
   */
  getQuestOpponent(questKey) {
    const objective = QuestDB.getInstance().getById(questKey)?.objective;
    if (objective?.type === ObjectiveTypes.BOSS) return objective.trainer ?? null;
    if (objective?.type === ObjectiveTypes.BADGE) return objective.badge ?? null;
    return null;
  }

  // --- Commands ---

  /**
   * "Challenge!" button of a quest card (original startQuestTrainerBattle). A click that finds a
   * battle running only closes it: the quest battle starts on the next, explicit click.
   * @param {string} questKey - Quest with a boss or badge objective
   * @returns {boolean} true when the quest battle started
   */
  challengeQuest(questKey) {
    const opponent = this.getQuestOpponent(questKey);
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!opponent || !save) return false;
    const battles = BattleSystem.getInstance();
    if (battles.isActive()) {
      battles.endBattle();
      this._notify(t('quest_battle_stop_current'), NotificationTones.INFO);
      return false;
    }
    if (save.team.length === 0) {
      this._notify(t('no_pokemon_in_team'), NotificationTones.DANGER);
      return false;
    }
    return this.challenge(opponent, { questKey });
  }

  /**
   * Starts the battle against a gym leader, a league or a quest trainer.
   * @param {string} championId
   * @param {{questKey?: string|null, locationId?: string}} [options]
   * @returns {boolean} true when the battle started
   */
  challenge(championId, { questKey = null, locationId } = {}) {
    const save = SaveSystem.getInstance().getCurrentSave();
    const info = this.getChallenge(championId);
    if (!save || !info) return false;
    if (BattleSystem.getInstance().isActive()) {
      this._notify(t('trainer_battle_running'), NotificationTones.WARNING);
      return false;
    }
    if (info.state === ChallengeStates.LOCKED) {
      this._notify(t('trainer_need_badges', { need: info.badgesRequired, trainer: t(`trainer.${info.id}.name`) }), NotificationTones.DANGER);
      return false;
    }
    const context = this._buildContext(save, info, questKey);
    return BattleSystem.getInstance().startTrainerBattle(context, locationId);
  }

  // --- Internals ---

  /** @private */
  _buildContext(save, info, questKey) {
    const league = info.league ? LeagueDB.getInstance().getById(info.id) : null;
    const trainerDb = TrainerDB.getInstance();
    const trainers = league ? league.trainers.map((id) => trainerDb.getById(id)).filter(Boolean) : [trainerDb.getById(info.id)];
    const rematch = info.state === ChallengeStates.REMATCH;
    const inTeam = (species) => save.team.some((pokemon) => pokemon.species === species);
    const caught = (species) => save.pokedex.isCaught(species);
    const teams = trainers.map((trainer) => TrainerTeamFactory.build(TrainerTeamRules.select(trainer, { rematch, inTeam, caught }), this._random));
    return new TrainerBattleContext({ id: info.id, league, trainers, teams, rematch, questKey });
  }

  /** @private @returns {boolean} */
  _beaten(save, owner, isLeague) {
    if (!save) return false;
    if (isLeague || owner.kind === TrainerKinds.GYM) return save.player.hasBadge(owner.id);
    return (save.statistics.trainerWins[owner.id] || 0) > 0;
  }

  /** @private */
  _notify(text, tone) {
    NotificationSystem.getInstance().notifyTemporary(text, { channel: NotificationChannels.BATTLE, tone });
  }
}
