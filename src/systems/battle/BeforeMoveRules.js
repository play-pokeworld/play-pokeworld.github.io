/**
 * @file BeforeMoveRules.js
 * @brief Can a combatant act this turn? (C++: class BeforeMoveRules), port of the original
 * handleStatusBeforeMove: flinch skips once; the cure_all berry (Lum) cures once per battle;
 * sleep counts down and skips; freeze counts down, then thaws with FREEZE_THAW_CHANCE or skips;
 * paralysis skips with PARA_SKIP_CHANCE; confusion counts down, then skips with
 * CONFUSE_SKIP_CHANCE (no self damage, as in the original).
 */
import { BattleRules } from '../../config/BattleRules.js';
import { StatusConditions } from '../../data/battle/StatusConditions.js';
import { HeldEffectKinds } from '../../data/items/HeldEffectKinds.js';
import { StatusRules } from './StatusRules.js';

const LUM_TRIGGER = 'cure_all';

export class BeforeMoveRules {
  /**
   * @param {import('./BattleCombatant.js').BattleCombatant} combatant
   * @param {import('../../core/Random.js').Random} random
   * @param {import('./BattleLog.js').BattleLog} log
   * @returns {boolean} true when the combatant acts
   */
  static canAct(combatant, random, log) {
    if (combatant.flinched) {
      combatant.flinched = false;
      log.add('battle_log.flinch_skip', { name: combatant.name });
      return false;
    }
    if (combatant.status && combatant.heldEffect(HeldEffectKinds.CURE_ALL) && !combatant.usedTriggers.has(LUM_TRIGGER)) {
      combatant.usedTriggers.add(LUM_TRIGGER);
      StatusRules.cure(combatant, log);
    }
    switch (combatant.status) {
      case StatusConditions.SLEEP:
        combatant.statusTurns--;
        if (combatant.statusTurns > 0) {
          log.add('battle_log.sleeping', { name: combatant.name, turns: combatant.statusTurns });
          return false;
        }
        StatusRules.cure(combatant, log);
        return true;
      case StatusConditions.FREEZE:
        if (combatant.statusTurns > 0) {
          combatant.statusTurns--;
          if (combatant.statusTurns <= 0) {
            StatusRules.cure(combatant, log);
            return true;
          }
        }
        if (random.chance(BattleRules.FREEZE_THAW_CHANCE)) {
          StatusRules.cure(combatant, log);
          return true;
        }
        log.add('battle_log.frozen', { name: combatant.name });
        return false;
      case StatusConditions.PARALYSIS:
        if (random.chance(BattleRules.PARA_SKIP_CHANCE)) {
          log.add('battle_log.paralyzed', { name: combatant.name });
          return false;
        }
        return true;
      case StatusConditions.CONFUSION:
        combatant.statusTurns--;
        if (combatant.statusTurns <= 0) {
          StatusRules.cure(combatant, log);
          return true;
        }
        if (random.chance(BattleRules.CONFUSE_SKIP_CHANCE)) {
          log.add('battle_log.confused', { name: combatant.name });
          return false;
        }
        return true;
      default:
        return true;
    }
  }
}
