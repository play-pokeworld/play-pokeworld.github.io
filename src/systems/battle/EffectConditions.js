/**
 * @file EffectConditions.js
 * @brief Evaluates the `when` clause of move / talent effects (C++: bool conditionsMet(...)).
 * Every key of a clause must hold. `self` is the owner of the effect (attacker for offensive
 * effects, defender for defensive ones), `target` the other side.
 *
 * Keys: moveTypes[], moveTag, category, maxPower, fastMove, slowMove, hasSecondary, sharesType,
 * selfHpBelow, selfHpFull, selfStatus (true | statuses[]), targetStatus (true | statuses[]),
 * targetTypes[], noHeldItem, weather[], terrain[], superEffective, notSuperEffective.
 */

/**
 * @typedef {Object} ConditionContext
 * @property {import('./BattleCombatant.js').BattleCombatant} self
 * @property {import('./BattleCombatant.js').BattleCombatant|null} target
 * @property {Readonly<Object>|null} move  - MoveDB entry
 * @property {string|null} moveType      - Type after talents (Aerilate…)
 * @property {import('./BattleField.js').BattleField} field
 * @property {number|null} effectiveness
 */

/**
 * @param {string|null} status
 * @param {true|string[]} expected
 * @returns {boolean}
 */
const statusMatches = (status, expected) => (expected === true ? !!status : !!status && expected.includes(status));

/** @type {Record<string, (value: any, ctx: ConditionContext) => boolean>} */
const CHECKS = Object.freeze({
  moveTypes: (types, ctx) => types.includes(ctx.moveType),
  moveTag: (tag, ctx) => !!ctx.move && ctx.move.tags.includes(tag),
  category: (category, ctx) => ctx.move?.category === category,
  maxPower: (power, ctx) => !!ctx.move && ctx.move.power > 0 && ctx.move.power <= power,
  fastMove: (_, ctx) => !!ctx.move && ctx.move.cooldown < 1,
  slowMove: (_, ctx) => !!ctx.move && ctx.move.cooldown > 1,
  hasSecondary: (_, ctx) => !!ctx.move && ctx.move.effects.some((effect) => effect.secondary),
  sharesType: (_, ctx) => ctx.self.getTypes().includes(ctx.moveType),
  selfHpBelow: (ratio, ctx) => ctx.self.hp < ctx.self.maxHp * ratio,
  selfHpFull: (_, ctx) => ctx.self.hp >= ctx.self.maxHp,
  selfStatus: (expected, ctx) => statusMatches(ctx.self.status, expected),
  targetStatus: (expected, ctx) => !!ctx.target && statusMatches(ctx.target.status, expected),
  targetTypes: (types, ctx) => !!ctx.target && ctx.target.getTypes().some((type) => types.includes(type)),
  noHeldItem: (_, ctx) => !ctx.self.getHeldItem(),
  weather: (weathers, ctx) => weathers.includes(ctx.field.weather),
  terrain: (terrains, ctx) => terrains.includes(ctx.field.terrain),
  superEffective: (_, ctx) => (ctx.effectiveness ?? 1) > 1,
  notSuperEffective: (_, ctx) => (ctx.effectiveness ?? 1) <= 1
});

export class EffectConditions {
  /**
   * @param {Object|undefined|null} when
   * @param {ConditionContext} ctx
   * @returns {boolean} true when there is no clause
   */
  static met(when, ctx) {
    if (!when) return true;
    return Object.entries(when).every(([key, value]) => CHECKS[key]?.(value, ctx) ?? false);
  }

  /** @returns {string[]} Supported keys (DataValidator / tests) */
  static keys() {
    return Object.keys(CHECKS);
  }
}
