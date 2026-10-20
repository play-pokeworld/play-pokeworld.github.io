/**
 * @file MigrationV10ToV11.js
 * @brief Save migration 10 -> 11: persist the repeatable-quest board and restore its unlock gate.
 */
import { QuestDB } from '../../quests/QuestDB.js';
import { QuestCategories } from '../../quests/QuestCategories.js';
import { QuestRules } from '../../../config/QuestRules.js';

/** @param {*} value @returns {string|null} */
function normalizeChoiceId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const id = String(value).trim().replace(/^repeatable[._]/, '').replace(/^r_/, '');
  return id && QuestDB.getInstance().getById(QuestDB.keyOf(QuestCategories.REPEATABLE, id)) ? id : null;
}

/** @param {*} value @returns {number} */
function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

export const MigrationV10ToV11 = Object.freeze({
  from: 10,
  to: 11,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const quests = source.quests && typeof source.quests === 'object' ? source.quests : {};
    const player = source.player && typeof source.player === 'object' ? source.player : {};
    const choices = [];
    const rawChoices = quests.repeatableChoices ?? source.repeatableChoices;
    for (const value of Array.isArray(rawChoices) ? rawChoices : []) {
      const id = normalizeChoiceId(value);
      if (!id || choices.includes(id)) continue;
      choices.push(id);
      if (choices.length >= QuestRules.REPEATABLE_OFFER_COUNT) break;
    }

    const rawUpgrades = quests.repeatableSlotUpgrades ?? source.repeatableSlotUpgrades;
    const rawMaxSlots = quests.maxRepeatables ?? source.maxRepeatables;
    const requestedUpgrades = rawUpgrades == null
      ? nonNegativeInteger(rawMaxSlots) - QuestRules.REPEATABLE_SLOTS
      : nonNegativeInteger(rawUpgrades);
    const repeatableSlotUpgrades = Math.max(0, Math.min(
      QuestRules.REPEATABLE_SLOT_UPGRADE_COSTS.length,
      requestedUpgrades
    ));
    const repeatablesCompleted = nonNegativeInteger(quests.repeatablesCompleted);
    const hasActiveRepeatable = Object.keys(quests.active && typeof quests.active === 'object' ? quests.active : {})
      .some((key) => key.startsWith(`${QuestCategories.REPEATABLE}.`));
    const badges = Array.isArray(player.badges) ? player.badges : [];
    const repeatableUnlocked = quests.repeatableUnlocked === true ||
      quests.repeatableQuestsUnlocked === true || source.repeatableQuestsUnlocked === true ||
      badges.length > 0 || player.region === 'johto' || hasActiveRepeatable ||
      repeatablesCompleted > 0 || choices.length > 0 || repeatableSlotUpgrades > 0;
    const rawLastRollAt = Number(quests.repeatableLastRollAt ?? source.repeatableLastRollAt);
    const repeatableLastRollAt = Number.isFinite(rawLastRollAt)
      ? Math.max(0, Math.floor(rawLastRollAt))
      : 0;

    return {
      ...source,
      version: 11,
      quests: {
        ...quests,
        repeatablesCompleted,
        repeatableUnlocked,
        repeatableChoices: choices,
        repeatableLastRollAt,
        repeatableSlotUpgrades
      }
    };
  }
});
