/**
 * @file TurnEndRules.js
 * @brief Start-of-action upkeep of a combatant (C++: class TurnEndRules), port of the original
 * applyEndOfTurnStatus, run before each action of that combatant:
 * status orbs (when healthy, not of the orb type), stat modifier durations, turn_stat talents
 * (Speed Boost), pinch_heal berry (once), status damage (skipped by no_indirect_damage, scaled
 * by status_damage talents) and status durations, Leftovers.
 */
import { BattleRules } from '../../config/BattleRules.js';
import { StatusConditions, STATUS_IMMUNE_TYPES } from '../../data/battle/StatusConditions.js';
import { TalentEffectKinds } from '../../data/battle/TalentEffectKinds.js';
import { HeldEffectKinds } from '../../data/items/HeldEffectKinds.js';
import { StatChangeRules } from './StatChangeRules.js';
import { StatusRules } from './StatusRules.js';

const PINCH_HEAL_TRIGGER = 'pinch_heal';

/** Damage per turn as a fraction of max HP. */
const STATUS_DAMAGE = Object.freeze({ burn: BattleRules.BURN_DAMAGE, poison: BattleRules.POISON_DAMAGE });

/** Statuses whose duration ticks at the end of the turn. */
const TICKING_STATUSES = Object.freeze(['burn', 'poison', 'sleep', 'freeze', 'para']);

export class TurnEndRules {
  /**
   * @param {import('./BattleCombatant.js').BattleCombatant} combatant
   * @param {import('./BattleLog.js').BattleLog} log
   */
  static apply(combatant, log) {
    if (combatant.isFainted()) return;
    TurnEndRules._orb(combatant, log);
    StatChangeRules.tick(combatant);
    for (const effect of combatant.talentEffects(TalentEffectKinds.TURN_STAT)) StatChangeRules.applyRaw(combatant, effect.stat, effect.mult);
    TurnEndRules._pinchHeal(combatant, log);
    if (!combatant.hasTalentEffect(TalentEffectKinds.NO_INDIRECT_DAMAGE)) TurnEndRules._statusDamage(combatant, log);
    if (combatant.heldEffect(HeldEffectKinds.LEFTOVERS) && !combatant.isFainted() && combatant.hp < combatant.maxHp) {
      const amount = combatant.heal(Math.max(1, Math.floor(combatant.maxHp * BattleRules.LEFTOVERS_HEAL)));
      log.add('battle_log.item_heal', { name: combatant.name, itemId: combatant.pokemon.heldItem, amount });
    }
  }

  /** @private */
  static _orb(combatant, log) {
    const orb = combatant.heldEffect(HeldEffectKinds.STATUS);
    if (!orb || combatant.status) return;
    const immuneTypes = STATUS_IMMUNE_TYPES[orb.status] ?? [];
    if (combatant.getTypes().some((type) => immuneTypes.includes(type))) return;
    combatant.status = orb.status;
    combatant.statusTurns = BattleRules.ORB_STATUS_TURNS[orb.status] ?? BattleRules.STATUS_TURNS.default;
    log.add('battle_log.status_inflicted', { name: combatant.name, status: orb.status });
  }

  /** @private */
  static _pinchHeal(combatant, log) {
    if (!combatant.heldEffect(HeldEffectKinds.PINCH_HEAL) || combatant.usedTriggers.has(PINCH_HEAL_TRIGGER)) return;
    if (combatant.isFainted() || combatant.hp >= combatant.maxHp * BattleRules.PINCH_HP_RATIO) return;
    combatant.usedTriggers.add(PINCH_HEAL_TRIGGER);
    const amount = combatant.heal(Math.max(1, Math.floor(combatant.maxHp * combatant.heldPower())));
    log.add('battle_log.item_heal', { name: combatant.name, itemId: combatant.pokemon.heldItem, amount });
  }

  /** @private */
  static _statusDamage(combatant, log) {
    const status = combatant.status;
    if (!status) return;
    const mult = combatant
      .talentEffects(TalentEffectKinds.STATUS_DAMAGE)
      .filter((effect) => effect.statuses.includes(status))
      .reduce((product, effect) => product * effect.mult, 1);
    if (status === StatusConditions.BAD_POISON) {
      combatant.statusTurns++;
      if (mult === 0) return;
      const damage = combatant.takeDamage(Math.max(1, Math.floor((combatant.maxHp * combatant.statusTurns) * BattleRules.BAD_POISON_STEP)) * mult);
      log.add('battle_log.status_damage', { name: combatant.name, status, damage });
      return;
    }
    if (STATUS_DAMAGE[status] && mult > 0) {
      const damage = combatant.takeDamage(Math.max(1, Math.floor(combatant.maxHp * STATUS_DAMAGE[status])) * mult);
      log.add('battle_log.status_damage', { name: combatant.name, status, damage });
    }
    if (TICKING_STATUSES.includes(status)) TurnEndRules.tickStatus(combatant, log);
  }

  /**
   * Original tickStatusDurations: one turn of the status passes, it ends at 0 (badpoison never).
   * @param {import('./BattleCombatant.js').BattleCombatant} combatant
   * @param {import('./BattleLog.js').BattleLog} log
   */
  static tickStatus(combatant, log) {
    if (combatant.statusTurns <= 0) return;
    combatant.statusTurns--;
    if (combatant.statusTurns <= 0 && combatant.status !== StatusConditions.BAD_POISON) StatusRules.cure(combatant, log);
  }
}
