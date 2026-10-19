/**
 * @file BadgeRules.js
 * @brief Badge counting per region (original regionBadgeCount): only gym badges count, league
 * titles (also stored in PlayerData.badges) do not.
 */
import { TrainerDB } from '../../data/trainers/TrainerDB.js';
import { TrainerKinds } from '../../data/trainers/TrainerKinds.js';

export class BadgeRules {
  /**
   * @param {import('../../data/save/PlayerData.js').PlayerData} player
   * @param {string} region
   * @returns {number}
   */
  static regionCount(player, region) {
    const trainers = TrainerDB.getInstance();
    return (player?.badges ?? []).filter((id) => {
      const trainer = trainers.getById(id);
      return trainer?.kind === TrainerKinds.GYM && trainer.region === region;
    }).length;
  }

  /**
   * @param {string} region
   * @returns {number} Gyms of the region (badge total shown next to the count)
   */
  static regionTotal(region) {
    return TrainerDB.getInstance().getGyms(region).length;
  }
}
