/**
 * @file HitReactionRules.js
 * @brief Reactions after a damaging hit (C++: class HitReactionRules), port of the end of the
 * original executeAttack: Life Orb recoil, on_super_effective_hit talents and Weakness Policy
 * (direct modifiers), contact_status talents on physical moves, counter berries (Jaboca /
 * Rowap), hit_buff berries (once), super_heal berry (once, super effective hits).
 */
import { BattleRules } from '../../config/BattleRules.js';
import { TalentEffectKinds } from '../../data/battle/TalentEffectKinds.js';
import { HeldEffectKinds } from '../../data/items/HeldEffectKinds.js';
import { StatChangeRules } from './StatChangeRules.js';
import { StatusRules } from './StatusRules.js';

/** Once-per-battle trigger ids. */
const Triggers = Object.freeze({ HIT_BUFF: 'hit_buff', SUPER_HEAL: 'super_heal' });

/** Weakness Policy doubles both attack stats. */
const WEAKNESS_POLICY_STATS = Object.freeze(['atk', 'spa']);
const WEAKNESS_POLICY_MULT = 2;

export class HitReactionRules {
  /**
   * @param {Object} hit
   * @param {import('./BattleCombatant.js').BattleCombatant} hit.attacker
   * @param {import('./BattleCombatant.js').BattleCombatant} hit.defender
   * @param {Readonly<Object>} hit.move
   * @param {number} hit.effectiveness
   * @param {import('./BattleField.js').BattleField} hit.field
   * @param {import('../../core/Random.js').Random} hit.random
   * @param {import('./BattleLog.js').BattleLog} hit.log
   */
  static apply({ attacker, defender, move, effectiveness, field, random, log }) {
    const physical = move.category === 'physical';
    if (attacker.heldEffect(HeldEffectKinds.LIFE_ORB) && move.power > 0) {
      const recoil = attacker.takeDamage(Math.max(1, Math.floor(attacker.maxHp * BattleRules.LIFE_ORB_RECOIL)));
      log.add('battle_log.item_recoil', { name: attacker.name, itemId: attacker.pokemon.heldItem, damage: recoil });
    }
    if (effectiveness > 1 && !defender.isFainted()) {
      for (const effect of defender.talentEffects(TalentEffectKinds.ON_SUPER_EFFECTIVE_HIT)) {
        StatChangeRules.applyRaw(defender, effect.stat, effect.mult);
        log.add('battle_log.stat_up', { name: defender.name, stat: effect.stat });
      }
      if (defender.heldEffect(HeldEffectKinds.BOOST)) {
        for (const stat of WEAKNESS_POLICY_STATS) StatChangeRules.applyRaw(defender, stat, WEAKNESS_POLICY_MULT);
        log.add('battle_log.item_boost', { name: defender.name, itemId: defender.pokemon.heldItem });
      }
    }
    if (physical && !attacker.isFainted() && !attacker.status) {
      for (const effect of defender.talentEffects(TalentEffectKinds.CONTACT_STATUS)) {
        if (!random.chance(effect.chance)) continue;
        const status = effect.statuses ? random.pick(effect.statuses) : effect.status;
        if (StatusRules.inflict(attacker, status, { field, random, log, source: defender, turns: effect.turns })) break;
      }
    }
    HitReactionRules._berries({ attacker, defender, physical, effectiveness, log });
  }

  /** @private */
  static _berries({ attacker, defender, physical, effectiveness, log }) {
    const effect = defender.getHeldItem()?.effect;
    if (!effect) return;
    const itemId = defender.pokemon.heldItem;
    const counter = (effect.kind === HeldEffectKinds.COUNTER_PHYS && physical) || (effect.kind === HeldEffectKinds.COUNTER_SPEC && !physical);
    if (counter && !attacker.isFainted()) {
      const damage = attacker.takeDamage(Math.max(1, Math.floor(attacker.maxHp * BattleRules.COUNTER_BERRY_DAMAGE)));
      log.add('battle_log.item_counter', { name: defender.name, itemId, damage });
    }
    if (defender.isFainted()) return;
    if (effect.kind === HeldEffectKinds.HIT_BUFF && !defender.usedTriggers.has(Triggers.HIT_BUFF)) {
      defender.usedTriggers.add(Triggers.HIT_BUFF);
      StatChangeRules.apply(defender, effect.stat, 1 + defender.heldPower(), log);
    }
    if (effect.kind === HeldEffectKinds.SUPER_HEAL && effectiveness > 1 && !defender.usedTriggers.has(Triggers.SUPER_HEAL)) {
      defender.usedTriggers.add(Triggers.SUPER_HEAL);
      const amount = defender.heal(Math.max(1, Math.floor(defender.maxHp * defender.heldPower())));
      log.add('battle_log.item_heal', { name: defender.name, itemId, amount });
    }
  }
}
