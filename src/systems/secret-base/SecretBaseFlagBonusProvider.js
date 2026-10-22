/**
 * @file SecretBaseFlagBonusProvider.js
 * @brief Exposes the current ORAS flag rank as shared BonusSystem contributions.
 */
import { SaveSystem } from '../SaveSystem.js';
import { BonusTypes } from '../../config/BonusRules.js';
import { SecretBaseRules } from '../../config/SecretBaseRules.js';
import { SaveCreatedEvent } from '../../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../../core/events/SaveDeletedEvent.js';
import { SecretBaseChangedEvent } from '../../core/events/SecretBaseChangedEvent.js';

const BONUS_TYPE_IDS = Object.freeze({
  money: BonusTypes.MONEY,
  xp: BonusTypes.XP,
  mineEnergyMax: BonusTypes.MINE_ENERGY_MAX,
  routeLoot: BonusTypes.ROUTE_LOOT
});

export class SecretBaseFlagBonusProvider {
  static EVENTS = Object.freeze([SaveCreatedEvent, SaveLoadedEvent, SaveDeletedEvent, SecretBaseChangedEvent]);
  static TYPES = Object.freeze(Object.values(BONUS_TYPE_IDS));

  /**
   * @param {Object} [context={}]
   * @returns {Array<{type:string,value:number}>}
   */
  getContributions(context = {}) {
    const save = context.save || SaveSystem.getInstance().getCurrentSave();
    const rankId = save?.secretBase?.getFlagRankId?.();
    const rank = SecretBaseRules.FLAG_RANKS.find((entry) => entry.id === rankId);
    if (!rank) return [];
    return Object.entries(rank.bonuses).flatMap(([sourceType, value]) => {
      const type = BONUS_TYPE_IDS[sourceType];
      return type && Number(value) > 0 ? [{ type, value: Number(value) }] : [];
    });
  }
}
