/**
 * @file AtollBattleContext.js
 * @brief Manages setup, team swapping, and settlement for Battle Atoll challenges.
 */

import { EventBus } from '../../core/EventBus.js';
import { SaveSystem } from '../SaveSystem.js';
import { BonusSystem } from '../BonusSystem.js';
import { BonusTypes } from '../../config/BonusRules.js';
import { NotificationSystem } from '../NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../../config/NotificationConfig.js';
import {
  ATOLL_MODES,
  ATOLL_BOSS_MODES,
  ATOLL_FRAGMENTS_PER_BOSS,
  computeAtollFactoryReward,
  reorganizeAtollFactoryTeam
} from '../../data/atoll/AtollDB.js';
import { AtollBattleFinishedEvent } from '../../core/events/AtollBattleFinishedEvent.js';
import { AtollStateChangedEvent } from '../../core/events/AtollStateChangedEvent.js';
import { t } from '../../localization/LocalizationManager.js';

export class AtollBattleContext {
  /**
   * @param {Object} options
   * @param {string} options.modeKey
   * @param {Array<{pokemon: import('../../data/pokemon/PokemonData.js').PokemonData}>} options.foes
   * @param {Array<import('../../data/pokemon/PokemonData.js').PokemonData>|null} [options.backupTeam=null]
   * @param {Array<string>|null} [options.backupTeamUids=null]
   * @param {Array<Object>|null} [options.backupSlotItems=null]
   */
  constructor({ modeKey, foes, backupTeam = null, backupTeamUids = null, backupSlotItems = null }) {
    this.modeKey = modeKey;
    this.mode = ATOLL_MODES[modeKey] || ATOLL_MODES.tower_c;
    this.foes = foes;
    this.backupTeam = backupTeam;
    this.backupTeamUids = backupTeamUids;
    this.backupSlotItems = backupSlotItems;
    this.settled = false;

    this.openingLines = [
      { key: 'battle_log.trainer_challenge', params: { trainerId: 'atoll' } }
    ];
  }

  /**
   * Settles the outcome of the battle, applying rewards, streaks, and restoring party state.
   * @param {boolean} victory
   * @param {import('../battle/BattleSession.js').BattleSession} [session]
   */
  onBattleEnd(victory, session = null) {
    if (this.settled) return;
    this.settled = true;

    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;

    let tokensGained = 0;
    let reorgNotice = '';

    if (victory) {
      const mode = this.mode;
      let baseReward = mode.reward || 10;

      if (mode.borrowed) {
        const runBefore = save.atoll.factoryRun;
        const streakBefore = runBefore ? runBefore.streak : 0;
        baseReward = computeAtollFactoryReward(baseReward, streakBefore);

        if (runBefore) {
          runBefore.streak += 1;
          const currentRentalTeam = session?.team?.map((p) => (p && typeof p.serialize === 'function' ? p.serialize() : p)) || runBefore.team;
          runBefore.team = reorganizeAtollFactoryTeam(currentRentalTeam, runBefore.seedWindow, runBefore.streak);
          reorgNotice = ' ' + t('atoll_factory_reorg_notice');
        }
      }

      tokensGained = BonusSystem.getInstance().applyMultiplier(baseReward, BonusTypes.ATOLL_TOKENS);
      save.atoll.addTokens(tokensGained);
      save.atoll.recordWin(this.modeKey);

      // Boss rewards (e.g. dome_final)
      if (ATOLL_BOSS_MODES.includes(this.modeKey)) {
        const fragmentsBase = ATOLL_FRAGMENTS_PER_BOSS;
        const fragmentsGained = BonusSystem.getInstance().applyMultiplier(fragmentsBase, BonusTypes.ATOLL_FRAGMENTS) || fragmentsBase;
        save.atoll.addFragments(fragmentsGained);
        save.achievements.incrementStat('atoll_bosses', 1);

        NotificationSystem.getInstance().notify(
          t('legend_fragments_gained', { n: fragmentsGained, total: save.atoll.fragments, cost: 50 }),
          { tone: NotificationTones.SUCCESS }
        );

        // Check flawless: no player KOs during session
        if (session && session.playerKOs === 0) {
          save.achievements.incrementStat('atoll_flawless_boss', 1);
        }
      }

      // Achievement metrics
      save.achievements.setStat('atoll_streak', Math.max(save.achievements.getStat('atoll_streak'), save.atoll.streak));
      save.achievements.incrementStat('atoll_room_wins', 1);

      NotificationSystem.getInstance().notify(
        t('atoll_win_reward', { tokens: tokensGained, streak: save.atoll.streak }) + reorgNotice,
        { tone: NotificationTones.SUCCESS }
      );
    } else {
      save.atoll.recordLoss();
      if (this.mode.borrowed) {
        save.atoll.clearFactoryRun();
      }
      NotificationSystem.getInstance().notify(
        t('atoll_streak_lost'),
        { tone: NotificationTones.DANGER }
      );
    }

    // Restore backed up team / items
    this.restoreTeam(save);

    SaveSystem.getInstance().saveCurrent();
    EventBus.getInstance().dispatch(new AtollBattleFinishedEvent(this.modeKey, victory, tokensGained));
    EventBus.getInstance().dispatch(new AtollStateChangedEvent());
  }

  /**
   * Restores original team and slot items to the save.
   * @param {import('../../data/save/SaveData.js').SaveData} save
   */
  restoreTeam(save) {
    if (this.backupTeamUids && save.teamMembers) {
      save.teamMembers.clear();
      for (const uid of this.backupTeamUids) {
        save.teamMembers.add(uid);
      }
    }
  }
}
