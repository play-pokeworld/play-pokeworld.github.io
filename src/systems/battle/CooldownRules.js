/**
 * @file CooldownRules.js
 * @brief Time before the next action of a combatant (C++: class CooldownRules), port of the
 * original calcAttackCd / effectiveSpeed / resetPlayerCd / resetEnemyCd.
 *
 *   speed    = max(5, floor(spe × modifier × (para 0.5) × first matching speed talent))
 *   cooldown = clamp(BASE × 100 / (100 + min(speed, CAP)), MIN, MAX)   (milliseconds)
 *
 * After a move: × move cooldown multiplier; quick claw (speed item) divides fast moves by its
 * power; the first matching move_speed talent divides by its multiplier; power herb (charge
 * item) cancels the multiplier of slow moves; berries: skip_cd (chance = power), pinch_fast
 * (once, ÷2), pinch_first (once, instant).
 */
import { BattleConfig } from '../../config/BattleConfig.js';
import { BattleRules } from '../../config/BattleRules.js';
import { StatusConditions } from '../../data/battle/StatusConditions.js';
import { TalentEffectKinds } from '../../data/battle/TalentEffectKinds.js';
import { HeldEffectKinds } from '../../data/items/HeldEffectKinds.js';
import { EffectConditions } from './EffectConditions.js';

/** Para halves the speed; the speed never drops below MIN_SPEED. */
const PARA_SPEED_MULT = 0.5;
const MIN_SPEED = 5;
const Triggers = Object.freeze({ PINCH_FAST: 'pinch_fast', PINCH_FIRST: 'pinch_first' });

export class CooldownRules {
  /**
   * @param {import('./BattleCombatant.js').BattleCombatant} combatant
   * @param {import('./BattleField.js').BattleField} field
   * @returns {number}
   */
  static effectiveSpeed(combatant, field) {
    let speed = combatant.getStat('spe') * combatant.statMods.spe;
    if (combatant.status === StatusConditions.PARALYSIS) speed *= PARA_SPEED_MULT;
    const ctx = { self: combatant, target: null, move: null, moveType: null, field, effectiveness: null };
    const talent = combatant.talentEffects(TalentEffectKinds.SPEED).find((effect) => EffectConditions.met(effect.when, ctx));
    if (talent) speed *= talent.mult;
    return Math.max(MIN_SPEED, Math.floor(speed));
  }

  /**
   * @param {number} speed
   * @returns {number} Base cooldown in milliseconds
   */
  static baseCooldown(speed) {
    const cooldown = (BattleConfig.ATTACK_COOLDOWN_BASE_MS * 100) / (100 + Math.min(speed, BattleConfig.ATTACK_SPEED_CAP));
    return Math.round(Math.min(BattleConfig.ATTACK_COOLDOWN_MAX_MS, Math.max(BattleConfig.ATTACK_COOLDOWN_MIN_MS, cooldown)));
  }

  /**
   * @param {import('./BattleCombatant.js').BattleCombatant} combatant
   * @param {Readonly<Object>|null} lastMove - MoveDB entry of the move just used (null at start)
   * @param {import('./BattleField.js').BattleField} field
   * @param {import('../../core/Random.js').Random} random
   * @returns {number} Milliseconds
   */
  static next(combatant, lastMove, field, random) {
    let cooldown = CooldownRules.baseCooldown(CooldownRules.effectiveSpeed(combatant, field));
    if (!lastMove) return cooldown;
    const multiplier = lastMove.cooldown ?? 1;
    cooldown *= multiplier;
    if (combatant.heldEffect(HeldEffectKinds.SPEED) && multiplier < 1) cooldown = Math.max(1, cooldown / Math.max(1, combatant.heldPower()));
    const ctx = { self: combatant, target: null, move: lastMove, moveType: lastMove.type, field, effectiveness: null };
    const talent = combatant.talentEffects(TalentEffectKinds.MOVE_SPEED).find((effect) => EffectConditions.met(effect.when, ctx));
    if (talent) cooldown /= talent.mult;
    if (combatant.heldEffect(HeldEffectKinds.CHARGE) && multiplier > 1) cooldown /= multiplier;
    cooldown = CooldownRules._berries(combatant, cooldown, random);
    return Math.round(cooldown);
  }

  /** @private */
  static _berries(combatant, cooldown, random) {
    const effect = combatant.getHeldItem()?.effect;
    if (!effect) return cooldown;
    const pinch = combatant.hp < combatant.maxHp * BattleRules.PINCH_HP_RATIO;
    if (effect.kind === HeldEffectKinds.SKIP_CD && random.chance(combatant.heldPower() * 100)) return BattleRules.INSTANT_COOLDOWN_MS;
    if (effect.kind === HeldEffectKinds.PINCH_FAST && pinch && !combatant.usedTriggers.has(Triggers.PINCH_FAST)) {
      combatant.usedTriggers.add(Triggers.PINCH_FAST);
      return Math.max(BattleRules.INSTANT_COOLDOWN_MS, cooldown / BattleRules.PINCH_FAST_DIVISOR);
    }
    if (effect.kind === HeldEffectKinds.PINCH_FIRST && pinch && !combatant.usedTriggers.has(Triggers.PINCH_FIRST)) {
      combatant.usedTriggers.add(Triggers.PINCH_FIRST);
      return BattleRules.INSTANT_COOLDOWN_MS;
    }
    return cooldown;
  }
}
