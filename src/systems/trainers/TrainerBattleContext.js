/**
 * @file TrainerBattleContext.js
 * @brief Everything BattleSystem needs to run and settle one trainer battle (a gym leader, a quest
 * trainer, or a whole league fought in a row). Built by TrainerSystem; BattleSystem only calls
 * the generic members (foes, introKey, onVictory) and never imports the trainer modules.
 *
 * Original settlement (battle-switch.js / quest-core.js completeQuestTrainerBattle):
 *  - gym: first win -> badge + reward money; rematch -> no money;
 *  - league: first win -> regional title + reward money; rematch -> no money;
 *  - gym / league: experience for every living member (TrainerRewardRules.expShare);
 *  - quest trainers (rival, villain, boss…): quest points from the reward, no experience.
 */
import { TrainerKinds } from '../../data/trainers/TrainerKinds.js';
import { TrainerRewardRules } from './TrainerRewardRules.js';
import { TrainerRules } from '../../config/TrainerRules.js';
import { EventBus } from '../../core/EventBus.js';
import { TrainerDefeatedEvent } from '../../core/events/TrainerDefeatedEvent.js';
import { LocalizationManager } from '../../localization/LocalizationManager.js';
import { BonusSystem } from '../BonusSystem.js';
import { BonusTypes } from '../../config/BonusRules.js';

export class TrainerBattleContext {
  /**
   * @param {Object} setup
   * @param {string} setup.id - Trainer id, or league id for a league
   * @param {Readonly<Object>|null} setup.league - LeagueDB definition when fighting a league
   * @param {Readonly<Object>[]} setup.trainers - TrainerDB definitions, in fighting order
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData[][]} setup.teams - One team per trainer
   * @param {boolean} setup.rematch
   * @param {string|null} [setup.questKey=null] - Quest that asked for the battle
   */
  constructor({ id, league, trainers, teams, rematch, questKey = null }) {
    this.id = id;
    this.league = league;
    this.trainers = trainers;
    this.rematch = rematch;
    this.questKey = questKey;
    const first = trainers[0];
    /** @type {Array<{key: string, params: Object}>} First lines of the battle log */
    this.openingLines = [{ key: league ? 'battle_log.league_challenge' : 'battle_log.trainer_challenge', params: { trainerId: league ? league.id : id } }];
    if (LocalizationManager.getInstance().has(`trainer.${first.id}.intro`)) {
      this.openingLines.push({ key: 'battle_log.trainer_quote', params: { quoteTrainerId: first.id, quoteKind: 'intro', trainerId: first.id } });
    }
    /** @type {Array<{pokemon: Object, trainerId: string, intro?: {key: string, params: Object}}>} */
    this.foes = [];
    teams.forEach((team, stage) => {
      const trainerId = trainers[stage]?.id ?? id;
      team.forEach((pokemon, index) => {
        const entry = { pokemon, trainerId };
        if (stage > 0 && index === 0) {
          entry.intro = {
            key: 'battle_log.league_next_trainer',
            params: { previousTrainerId: trainers[stage - 1].id, trainerId: trainers[stage].id }
          };
        }
        this.foes.push(entry);
      });
    });
  }

  /** @returns {boolean} true when the battle grants experience */
  get grantsExperience() {
    return !!this.league || this.trainers[0]?.kind === TrainerKinds.GYM;
  }

  /**
   * Applies the win to the save and writes the battle log.
   * @param {Object} args
   * @param {import('../../data/save/SaveData.js').SaveData} args.save
   * @param {import('../battle/BattleSession.js').BattleSession} args.session
   * @param {string} args.locationId
   * @returns {{money: number, questPoints: number, expShare: number}}
   */
  onVictory({ save, session, locationId, deferSave = true }) {
    const log = session.log;
    const owner = this.league ?? this.trainers[0];
    const wonBefore = this.league ? save.statistics.hasWonLeague(this.league.region) : this._wonBefore(save, owner);
    for (const trainer of this.trainers) save.statistics.recordTrainerWin(trainer.id);
    if (this.league) save.statistics.recordTrainerWin(this.league.id);
    log.add('battle_log.trainer_defeated', { trainerId: owner.id });

    let money = 0;
    let questPoints = 0;
    if (this.league || owner.kind === TrainerKinds.GYM) {
      if (!wonBefore) {
        if (this.league) save.statistics.recordLeague(this.league.region);
        else save.player.earnBadge(owner.id, { deferSave });
        money = BonusSystem.getInstance().applyMultiplier(owner.reward, BonusTypes.MONEY);
        save.currencies.add(TrainerRules.MONEY_CURRENCY, money);
        log.add(this.league ? 'battle_log.league_title' : 'battle_log.badge_earned', { trainerId: owner.id, badgeTrainerId: owner.id });
        if (money > 0) log.add('battle_log.money', { money });
      } else {
        log.add('battle_log.rematch_no_money');
      }
    } else {
      questPoints = TrainerRewardRules.questPoints(owner.reward);
      save.currencies.add(TrainerRules.QUEST_POINT_CURRENCY, questPoints);
      log.add('battle_log.quest_points', { points: questPoints });
    }
    const last = this.trainers[this.trainers.length - 1];
    if (LocalizationManager.getInstance().has(`trainer.${last.id}.win`)) log.add('battle_log.trainer_quote', { quoteTrainerId: last.id, quoteKind: 'win', trainerId: last.id });

    const living = save.team.filter((pokemon) => !pokemon.isFainted()).length;
    const expShare = this.grantsExperience ? TrainerRewardRules.expShare(session.sentFoes, living) : 0;
    for (const trainer of this.trainers) EventBus.getInstance().dispatch(
      new TrainerDefeatedEvent(trainer.id, locationId, { deferSave })
    );
    if (this.league) EventBus.getInstance().dispatch(
      new TrainerDefeatedEvent(this.league.id, locationId, { deferSave })
    );
    return { money, questPoints, expShare };
  }

  /** @private */
  _wonBefore(save, trainer) {
    return trainer.kind === TrainerKinds.GYM ? save.player.hasBadge(trainer.id) : (save.statistics.trainerWins[trainer.id] || 0) > 0;
  }
}
