/**
 * @file MoveTyping.js
 * @brief Type and effectiveness of a move used by a combatant (C++: class MoveTyping).
 * Type: fixed_power_hit type, then move_type_change talents (-ate talents, Normalize: power ×mult).
 * Effectiveness: TypeChart, effectiveness_against (Freeze-Dry), temporary added type (×1.25 /
 * ×0.75), resisted_damage talents (Tinted Lens), ignore_type_immunity (Scrappy, Shadow Force).
 * Deliberate difference: the original kept the declared type for STAB / weather after an -ate
 * talent; the engine uses the resolved type everywhere.
 */
import { TypeChart } from '../../data/core/TypeChart.js';
import { BattleRules } from '../../config/BattleRules.js';
import { MoveEffectKinds } from '../../data/battle/MoveEffectKinds.js';
import { TalentEffectKinds } from '../../data/battle/TalentEffectKinds.js';

/**
 * @param {Readonly<Object>} move
 * @param {string} kind
 * @returns {Readonly<Object>|undefined}
 */
const moveEffect = (move, kind) => move.effects.find((effect) => effect.kind === kind);

export class MoveTyping {
  /**
   * @param {import('./BattleCombatant.js').BattleCombatant} attacker
   * @param {Readonly<Object>} move - MoveDB entry
   * @returns {{type: string, damageMult: number}}
   */
  static resolve(attacker, move) {
    const type = moveEffect(move, MoveEffectKinds.FIXED_POWER_HIT)?.type ?? move.type;
    for (const effect of attacker.talentEffects(TalentEffectKinds.MOVE_TYPE_CHANGE)) {
      if (type !== effect.to && (effect.from === null || effect.from === undefined || effect.from === type)) {
        return { type: effect.to, damageMult: effect.powerMult ?? 1 };
      }
    }
    return { type, damageMult: 1 };
  }

  /**
   * @param {import('./BattleCombatant.js').BattleCombatant} attacker
   * @param {import('./BattleCombatant.js').BattleCombatant} defender
   * @param {Readonly<Object>} move
   * @param {string} moveType - Result of resolve()
   * @returns {number} Final multiplier (0 = immune)
   */
  static effectiveness(attacker, defender, move, moveType) {
    const defenderTypes = defender.getTypes();
    let eff = TypeChart.effectiveness(moveType, defenderTypes);
    const against = moveEffect(move, MoveEffectKinds.EFFECTIVENESS_AGAINST);
    if (against && defenderTypes.includes(against.targetType)) {
      const partial = TypeChart.effectiveness(moveType, [against.targetType]);
      if (partial > 0) eff = (eff / partial) * against.mult;
    }
    if (defender.addedType) {
      const added = TypeChart.effectiveness(moveType, [defender.addedType]);
      if (added > 1) eff *= BattleRules.ADDED_TYPE_WEAK;
      else if (added < 1) eff *= BattleRules.ADDED_TYPE_RESIST;
    }
    if (eff > 0 && eff < 1) {
      for (const effect of attacker.talentEffects(TalentEffectKinds.RESISTED_DAMAGE)) eff *= effect.mult;
    }
    if (eff === 0 && MoveTyping.ignoresImmunity(attacker, move, moveType)) eff = 1;
    return eff;
  }

  /**
   * @param {import('./BattleCombatant.js').BattleCombatant} attacker
   * @param {Readonly<Object>} move
   * @param {string} moveType
   * @returns {boolean}
   */
  static ignoresImmunity(attacker, move, moveType) {
    if (moveEffect(move, MoveEffectKinds.IGNORE_TYPE_IMMUNITY)) return true;
    return attacker.talentEffects(TalentEffectKinds.IGNORE_TYPE_IMMUNITY).some((effect) => !effect.moveTypes || effect.moveTypes.includes(moveType));
  }
}
