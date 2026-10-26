/**
 * @file StatusRules.js
 * @brief Inflicting status conditions (C++: class StatusRules), port of the original
 * isImmuneToStatus + secondary status application. A Pokémon holds one status at a time.
 * Blocking order: existing status, Safeguard, type immunity, status_immunity talents
 * (optionally conditional), immunity berries, status_resist_chance (Wonder Skin).
 * Duration (original heldStatusTurns): sleep rand(1,3), para 2, others 3; the cure held item
 * (Mental Herb) of the target removes one turn, status_duration talents of the source (Color
 * Spore) multiply it; never below 1. Synchronize (reflect_status) sends the status back to the
 * source with the same duration.
 */
import { BattleRules } from '../../config/BattleRules.js';
import { Weathers } from '../../data/battle/BattleFields.js';
import { StatusConditions, STATUS_IMMUNE_TYPES } from '../../data/battle/StatusConditions.js';
import { TalentEffectKinds } from '../../data/battle/TalentEffectKinds.js';
import { HeldEffectKinds } from '../../data/items/HeldEffectKinds.js';
import { EffectConditions } from './EffectConditions.js';

export class StatusRules {
  /**
   * @param {import('./BattleCombatant.js').BattleCombatant} target
   * @param {string} status
   * @param {import('./BattleField.js').BattleField} field
   * @param {import('../../core/Random.js').Random} random
   * @returns {boolean}
   */
  static isImmune(target, status, field, random) {
    if (field.weather === Weathers.SAFEGUARD) return true;
    if (target.hasTalent?.('goodasgold')) return true;
    const immuneTypes = STATUS_IMMUNE_TYPES[status] ?? [];
    if (target.getTypes().some((type) => immuneTypes.includes(type))) return true;
    const ctx = { self: target, target: null, move: null, moveType: null, field, effectiveness: null };
    const talentImmune = target
      .talentEffects(TalentEffectKinds.STATUS_IMMUNITY)
      .some((effect) => (!effect.statuses || effect.statuses.includes(status)) && EffectConditions.met(effect.when, ctx));
    if (talentImmune) return true;
    if (target.heldEffect(HeldEffectKinds.IMMUNITY_BERRY)?.status === status) return true;
    return target.talentEffects(TalentEffectKinds.STATUS_RESIST_CHANCE).some((effect) => random.chance(effect.chance));
  }

  /**
   * @param {string} status
   * @param {import('./BattleCombatant.js').BattleCombatant} target
   * @param {import('../../core/Random.js').Random} random
   * @param {import('./BattleCombatant.js').BattleCombatant|null} [source=null]
   * @param {number} [baseTurns] - Forced base duration (orbs, contact talents, Synchronize)
   * @returns {number} Turns of a freshly inflicted status
   */
  static rollTurns(status, target, random, source = null, baseTurns = undefined) {
    const rule = BattleRules.STATUS_TURNS[status] ?? BattleRules.STATUS_TURNS.default;
    if (status === StatusConditions.BAD_POISON) return 0;
    let turns = baseTurns ?? (Array.isArray(rule) ? random.int(rule[0], rule[1]) : rule);
    if (target.heldEffect(HeldEffectKinds.CURE)) turns = Math.max(1, turns - 1);
    for (const effect of source?.talentEffects(TalentEffectKinds.STATUS_DURATION) ?? []) turns = Math.max(1, Math.round(turns * effect.mult));
    return turns;
  }

  /**
   * @param {import('./BattleCombatant.js').BattleCombatant} target
   * @param {string} status
   * @param {Object} context
   * @param {import('./BattleField.js').BattleField} context.field
   * @param {import('../../core/Random.js').Random} context.random
   * @param {import('./BattleLog.js').BattleLog} context.log
   * @param {import('./BattleCombatant.js').BattleCombatant|null} [context.source=null]
   * @param {number} [context.turns] - Forced duration (orbs, contact talents)
   * @param {boolean} [context.reflected=false] - Internal: already sent back by Synchronize
   * @returns {boolean} true when the status was inflicted
   */
  static inflict(target, status, { field, random, log, source = null, turns, reflected = false }) {
    if (target.isFainted() || target.status || !Object.values(StatusConditions).includes(status)) return false;
    if (StatusRules.isImmune(target, status, field, random)) return false;
    target.status = status;
    target.statusTurns = StatusRules.rollTurns(status, target, random, reflected ? null : source, turns);
    log.add('battle_log.status_inflicted', { name: target.name, status });
    if (!reflected && source && source !== target && target.hasTalentEffect(TalentEffectKinds.REFLECT_STATUS)) {
      log.add('battle_log.status_reflected', { name: target.name });
      StatusRules.inflict(source, status, { field, random, log, source: target, turns: target.statusTurns, reflected: true });
    }
    return true;
  }

  /**
   * @param {import('./BattleCombatant.js').BattleCombatant} target
   * @param {import('./BattleLog.js').BattleLog} log
   */
  static cure(target, log) {
    if (!target.status) return;
    log.add('battle_log.status_cured', { name: target.name, status: target.status });
    target.status = null;
    target.statusTurns = 0;
  }
}
