/**
 * @file StatChangeRules.js
 * @brief Battle stat changes (C++: class StatChangeRules), port of the original pwStatChange:
 * changes are multipliers clamped to [STAT_MOD_MIN, STAT_MOD_MAX] lasting STAT_MOD_TURNS turns.
 * Talents: invert_stat_changes (Contrary), stat_drop_immunity (Clear Body family); held items:
 * protect (Clear Amulet) blocks drops, extend (Light Clay) +1 turn on raises, cure
 * (Mental Herb) -1 turn on drops.
 */
import { BattleRules } from '../../config/BattleRules.js';
import { TalentEffectKinds } from '../../data/battle/TalentEffectKinds.js';
import { HeldEffectKinds } from '../../data/items/HeldEffectKinds.js';

export class StatChangeRules {
  /**
   * @param {import('./BattleCombatant.js').BattleCombatant} target
   * @param {string} stat
   * @param {number} mult - < 1 lowers, > 1 raises
   * @param {import('./BattleLog.js').BattleLog} log
   * @returns {boolean} true when the stat changed
   */
  static apply(target, stat, mult, log) {
    let factor = Number(mult);
    if (!Number.isFinite(factor) || factor <= 0 || factor === 1 || !(stat in target.statMods)) return false;
    if (target.hasTalentEffect(TalentEffectKinds.INVERT_STAT_CHANGES)) factor = 1 / factor;
    if (factor < 1 && StatChangeRules.isDropBlocked(target, stat)) {
      log.add('battle_log.stat_blocked', { name: target.name, stat });
      return false;
    }
    const current = target.statMods[stat];
    const next = Math.max(BattleRules.STAT_MOD_MIN, Math.min(BattleRules.STAT_MOD_MAX, current * factor));
    if (Math.abs(next - current) < 1e-9) return false;
    target.statMods[stat] = next;
    let turns = BattleRules.STAT_MOD_TURNS;
    if (factor > 1 && target.heldEffect(HeldEffectKinds.EXTEND)) turns += 1;
    if (factor < 1 && target.heldEffect(HeldEffectKinds.CURE)) turns = Math.max(1, turns - 1);
    target.statModTurns[stat] = turns;
    log.add(factor > 1 ? 'battle_log.stat_up' : 'battle_log.stat_down', { name: target.name, stat });
    return true;
  }

  /**
   * Direct multiplier without duration, talents or items (original on-KO talents, Weakness
   * Policy, Speed Boost, flash* talents write the modifier directly): it lasts until the battle
   * ends or a timed change of the same stat expires.
   * @param {import('./BattleCombatant.js').BattleCombatant} target
   * @param {string} stat
   * @param {number} mult
   */
  static applyRaw(target, stat, mult) {
    if (!(stat in target.statMods)) return;
    target.statMods[stat] = Math.max(BattleRules.STAT_MOD_MIN, Math.min(BattleRules.STAT_MOD_MAX, target.statMods[stat] * mult));
  }

  /**
   * @param {import('./BattleCombatant.js').BattleCombatant} target
   * @param {string} stat
   * @returns {boolean}
   */
  static isDropBlocked(target, stat) {
    if (target.heldEffect(HeldEffectKinds.PROTECT)) return true;
    return target.talentEffects(TalentEffectKinds.STAT_DROP_IMMUNITY).some((effect) => !effect.stats || effect.stats.includes(stat));
  }

  /**
   * One turn passes for the modifiers of a combatant (original pwTickBoostDurations).
   * @param {import('./BattleCombatant.js').BattleCombatant} combatant
   */
  static tick(combatant) {
    for (const stat of Object.keys(combatant.statModTurns)) {
      combatant.statModTurns[stat]--;
      if (combatant.statModTurns[stat] <= 0) {
        delete combatant.statModTurns[stat];
        combatant.statMods[stat] = combatant._baseStatMultipliers?.[stat] ?? 1;
      }
    }
  }
}
