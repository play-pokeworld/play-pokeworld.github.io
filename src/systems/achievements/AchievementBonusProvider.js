/**
 * @file AchievementBonusProvider.js
 * @brief Exposes permanent unlocked achievement bonuses to BonusSystem.
 */

import { SaveSystem } from '../SaveSystem.js';
import { BonusRules, BonusTypes } from '../../config/BonusRules.js';
import { AchievementDB } from '../../data/achievements/AchievementDB.js';
import { SaveCreatedEvent } from '../../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../../core/events/SaveDeletedEvent.js';
import { AchievementUnlockedEvent } from '../../core/events/AchievementUnlockedEvent.js';

/** Anti-inflation guardrail caps (V6 §9.3). */
const ANTI_INFLATION_CAPS = Object.freeze({
  [`${BonusTypes.MONEY}_global`]: 29,
  [`${BonusTypes.XP}_global`]: 25,
  [`${BonusTypes.CAPTURE}_global`]: 4.5,
  [`${BonusTypes.SHINY_MULTIPLIER}_global`]: 1.15
});

const REGIONAL_MONEY_CAP = 15;

/**
 * @param {string|null} scopeStr
 * @param {string|null} [targetType]
 * @returns {Object|null}
 */
function parseScope(scopeStr, targetType) {
  const scope = {};
  if (typeof scopeStr === 'string' && scopeStr.startsWith('region:')) {
    scope.region = scopeStr.slice('region:'.length);
  }
  if (targetType) {
    scope.kind = targetType;
  }
  return Object.keys(scope).length > 0 ? scope : null;
}

export class AchievementBonusProvider {
  static EVENTS = Object.freeze([
    SaveCreatedEvent,
    SaveLoadedEvent,
    SaveDeletedEvent,
    AchievementUnlockedEvent
  ]);

  static TYPES = Object.freeze(Object.values(BonusTypes));

  /**
   * @param {Object} [context={}]
   * @returns {Array<{type: string, value: number, scope: Object|null, unit: string}>}
   */
  getContributions(context = {}) {
    const save = context.save || SaveSystem.getInstance().getCurrentSave();
    if (!save?.achievements) return [];

    const db = AchievementDB.getInstance();
    const achievements = db.getAll();

    /** @type {Map<string, {type: string, scope: Object|null, unit: string, isMultiplier: boolean, values: number[]}>} */
    const grouped = new Map();

    for (const ach of achievements) {
      if (!ach.bonus || !ach.bonus.type || !Array.isArray(ach.bonus.values)) continue;
      const tier = save.achievements.getUnlockedTier(ach.id);
      if (tier < 0) continue;

      const val = Number(ach.bonus.values[tier]);
      if (!Number.isFinite(val) || val <= 0) continue;

      const scope = parseScope(ach.scope, ach.bonus.targetType);
      const scopeKey = scope ? JSON.stringify(scope) : 'global';
      const type = ach.bonus.type;
      const groupKey = `${type}::${scopeKey}`;
      const isMultiplier = type === BonusTypes.SHINY_MULTIPLIER;

      let entry = grouped.get(groupKey);
      if (!entry) {
        entry = {
          type,
          scope,
          unit: ach.bonus.unit || '',
          isMultiplier,
          values: []
        };
        grouped.set(groupKey, entry);
      }
      entry.values.push(val);
    }

    const contributions = [];

    for (const entry of grouped.values()) {
      let aggregatedValue;
      if (entry.isMultiplier) {
        aggregatedValue = entry.values.reduce((acc, v) => acc * v, 1);
      } else {
        aggregatedValue = entry.values.reduce((acc, v) => acc + v, 0);
      }

      // Apply anti-inflation guardrails
      if (!entry.scope) {
        const capKey = `${entry.type}_global`;
        if (ANTI_INFLATION_CAPS[capKey] !== undefined) {
          aggregatedValue = Math.min(aggregatedValue, ANTI_INFLATION_CAPS[capKey]);
        }
      } else if (entry.type === BonusTypes.MONEY && entry.scope.region) {
        aggregatedValue = Math.min(aggregatedValue, REGIONAL_MONEY_CAP);
      }

      contributions.push({
        sourceId: BonusRules.SOURCE_IDS.ACHIEVEMENTS,
        type: entry.type,
        value: aggregatedValue,
        scope: entry.scope ? { ...entry.scope } : null,
        unit: entry.unit
      });
    }

    return contributions;
  }
}
