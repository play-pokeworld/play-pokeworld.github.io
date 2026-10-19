/**
 * @file MoveEffectHandlers.js
 * @brief Handler table of the move effect vocabulary (C++: std::unordered_map<MoveEffectKind,
 * Handler>). MoveExecutor runs every effect of a move after the hit (damaging moves) or after
 * the accuracy roll (status moves). Kinds consumed by DamageCalculator / MoveTyping are
 * registered as passive handlers so that every kind of the vocabulary has an entry.
 *
 * Chances: `secondary` effects are blocked by no_secondary_effects talents (Sheer Force) and
 * need a living target; their chance is multiplied by secondary_chance talents (Serene Grace)
 * and doubled by the punch held item on punch moves (original lucky_punch).
 */
import { BattleRules } from '../../config/BattleRules.js';
import { MoveEffectKinds } from '../../data/battle/MoveEffectKinds.js';
import { TalentEffectKinds } from '../../data/battle/TalentEffectKinds.js';
import { HeldEffectKinds } from '../../data/items/HeldEffectKinds.js';
import { MODIFIABLE_STATS } from './BattleCombatant.js';
import { StatChangeRules } from './StatChangeRules.js';
import { StatusRules } from './StatusRules.js';

/**
 * @typedef {Object} MoveEffectContext
 * @property {import('./BattleCombatant.js').BattleCombatant} attacker
 * @property {import('./BattleCombatant.js').BattleCombatant} defender
 * @property {Readonly<Object>} move
 * @property {import('./BattleField.js').BattleField} field
 * @property {import('../../core/Random.js').Random} random
 * @property {import('./BattleLog.js').BattleLog} log
 * @property {number} damage - Damage dealt by the move (0 for status moves)
 * @property {Object} session - BattleSession services: requestSwitch(c), cureTeam(c),
 *   addBonus(id), executeMove(attacker, defender, moveId, options), randomCallableMove()
 */

/** Punch moves double the secondary chance with the punch held item. */
const PUNCH_SECONDARY_MULT = 2;

/**
 * @param {Readonly<Object>} effect
 * @param {MoveEffectContext} ctx
 * @returns {boolean} true when the effect triggers
 */
export function rollEffectChance(effect, ctx) {
  const { attacker, defender, move, random } = ctx;
  if (effect.secondary) {
    if (attacker.hasTalentEffect(TalentEffectKinds.NO_SECONDARY_EFFECTS) || defender.isFainted()) return false;
  }
  if (effect.chance === undefined || effect.chance === null) return true;
  let chance = effect.chance;
  if (effect.secondary) {
    for (const talent of attacker.talentEffects(TalentEffectKinds.SECONDARY_CHANCE)) chance *= talent.mult;
    if (attacker.heldEffect(HeldEffectKinds.PUNCH) && move.tags.includes('punch')) chance *= PUNCH_SECONDARY_MULT;
  }
  return random.chance(chance);
}

/**
 * @param {Readonly<Object>} effect
 * @param {MoveEffectContext} ctx
 * @returns {import('./BattleCombatant.js').BattleCombatant}
 */
const targetOf = (effect, ctx) => (effect.target === 'self' ? ctx.attacker : ctx.defender);

/**
 * Field duration: base turns, FIELD_EXTENDED_TURNS with the `extendedBy` held item.
 * @param {Readonly<Object>} effect
 * @param {import('./BattleCombatant.js').BattleCombatant} user
 * @returns {number}
 */
export function fieldTurns(effect, user) {
  const base = effect.turns ?? BattleRules.FIELD_TURNS;
  return effect.extendedBy && user.pokemon.heldItem === effect.extendedBy ? BattleRules.FIELD_EXTENDED_TURNS : base;
}

/**
 * Weather duration with weather_duration talents (Climatact).
 * @param {number} turns
 * @param {import('./BattleCombatant.js').BattleCombatant} user
 * @returns {number}
 */
export function weatherTurns(turns, user) {
  const talent = user.talentEffects(TalentEffectKinds.WEATHER_DURATION)[0];
  return talent ? talent.turns : turns;
}

/** Handled by DamageCalculator / MoveTyping. */
const passive = () => {};

/** @type {Readonly<Record<string, (effect: Readonly<Object>, ctx: MoveEffectContext) => void>>} */
export const MOVE_EFFECT_HANDLERS = Object.freeze({
  [MoveEffectKinds.STATUS]: (effect, ctx) => {
    const target = targetOf(effect, ctx);
    if (!rollEffectChance(effect, ctx)) {
      if (!effect.secondary) ctx.log.add('battle_log.move_failed', { name: ctx.attacker.name, moveId: ctx.move.id });
      return;
    }
    const status = effect.statuses ? ctx.random.pick(effect.statuses) : effect.status;
    const inflicted = StatusRules.inflict(target, status, { field: ctx.field, random: ctx.random, log: ctx.log, source: ctx.attacker });
    if (!inflicted && !effect.secondary) ctx.log.add('battle_log.no_effect', { name: target.name });
  },
  [MoveEffectKinds.STAT]: (effect, ctx) => {
    if (!rollEffectChance(effect, ctx)) return;
    StatChangeRules.apply(targetOf(effect, ctx), effect.stat, effect.mult, ctx.log);
  },
  [MoveEffectKinds.FLINCH]: (effect, ctx) => {
    if (!rollEffectChance(effect, ctx)) return;
    if (ctx.defender.hasTalentEffect(TalentEffectKinds.FLINCH_IMMUNITY)) return;
    ctx.defender.flinched = true;
    ctx.log.add('battle_log.flinch', { name: ctx.defender.name });
  },
  [MoveEffectKinds.ACCURACY_DOWN]: (effect, ctx) => {
    if (!rollEffectChance(effect, ctx)) return;
    ctx.defender.accuracyPenalty++;
    ctx.log.add('battle_log.accuracy_down', { name: ctx.defender.name });
  },
  [MoveEffectKinds.RECOIL]: (effect, ctx) => {
    if (ctx.damage <= 0) return;
    const recoil = ctx.attacker.takeDamage(Math.max(1, Math.floor(ctx.damage * effect.fraction)));
    ctx.log.add('battle_log.recoil', { name: ctx.attacker.name, damage: recoil });
  },
  [MoveEffectKinds.RECOIL_MAX_HP]: (effect, ctx) => {
    const recoil = ctx.attacker.takeDamage(Math.max(1, Math.floor(ctx.attacker.maxHp * effect.fraction)));
    ctx.log.add('battle_log.recoil', { name: ctx.attacker.name, damage: recoil });
  },
  [MoveEffectKinds.DRAIN]: (effect, ctx) => {
    if (ctx.damage <= 0) return;
    const healed = ctx.attacker.heal(Math.max(1, Math.floor(ctx.damage * effect.fraction)));
    ctx.log.add('battle_log.drain', { name: ctx.attacker.name, amount: healed });
  },
  [MoveEffectKinds.CONSECUTIVE_POWER]: passive,
  [MoveEffectKinds.CONDITIONAL_POWER]: passive,
  [MoveEffectKinds.EFFECTIVENESS_AGAINST]: passive,
  [MoveEffectKinds.RANDOM_POWER]: passive,
  [MoveEffectKinds.FIXED_POWER_HIT]: passive,
  [MoveEffectKinds.IGNORE_TYPE_IMMUNITY]: passive,
  [MoveEffectKinds.IGNORE_STAT_MODS]: passive,
  [MoveEffectKinds.SWITCH_OUT]: (_effect, ctx) => {
    ctx.session.requestSwitch(ctx.attacker);
  },
  [MoveEffectKinds.WEATHER]: (effect, ctx) => {
    ctx.field.setWeather(effect.weather, weatherTurns(fieldTurns(effect, ctx.attacker), ctx.attacker));
    ctx.log.add('battle_log.weather_set', { name: ctx.attacker.name, weather: effect.weather });
  },
  [MoveEffectKinds.TERRAIN]: (effect, ctx) => {
    ctx.field.setTerrain(effect.terrain, fieldTurns(effect, ctx.attacker));
    ctx.log.add('battle_log.terrain_set', { name: ctx.attacker.name, terrain: effect.terrain });
  },
  [MoveEffectKinds.ADD_TYPE]: (effect, ctx) => {
    ctx.defender.addedType = effect.type;
    ctx.log.add('battle_log.type_added', { name: ctx.defender.name, type: effect.type });
  },
  [MoveEffectKinds.SELF_FAINT]: (_effect, ctx) => {
    ctx.attacker.takeDamage(ctx.attacker.hp);
    ctx.log.add('battle_log.self_faint', { name: ctx.attacker.name });
  },
  [MoveEffectKinds.RANDOM_STATS]: (effect, ctx) => {
    const pool = [...MODIFIABLE_STATS];
    const target = targetOf(effect, ctx);
    for (let i = 0; i < effect.count && pool.length > 0; i++) {
      const stat = pool.splice(ctx.random.int(0, pool.length - 1), 1)[0];
      StatChangeRules.apply(target, stat, effect.mult, ctx.log);
    }
  },
  [MoveEffectKinds.CURE]: (effect, ctx) => {
    if (effect.target === 'team') ctx.session.cureTeam(ctx.attacker);
    else StatusRules.cure(ctx.attacker, ctx.log);
  },
  [MoveEffectKinds.WEATHER_TYPE]: (_effect, ctx) => {
    const types = BattleRules.CAMOUFLAGE_TYPES;
    ctx.attacker.typeOverride = types[ctx.field.weather] ?? types.default;
    ctx.log.add('battle_log.type_changed', { name: ctx.attacker.name, type: ctx.attacker.typeOverride });
  },
  [MoveEffectKinds.COPY_FIRST_MOVE_TYPE]: (_effect, ctx) => {
    const firstType = ctx.session.moveTypeOf(ctx.attacker.getMoves()[0]);
    if (!firstType) return;
    ctx.attacker.typeOverride = firstType;
    ctx.log.add('battle_log.type_changed', { name: ctx.attacker.name, type: firstType });
  },
  [MoveEffectKinds.CALL_RANDOM_MOVE]: (_effect, ctx) => {
    const moveId = ctx.session.randomCallableMove();
    if (moveId) ctx.session.executeMove(ctx.attacker, ctx.defender, moveId);
  },
  [MoveEffectKinds.USE_FOE_FIRST_MOVE]: (effect, ctx) => {
    const moveId = ctx.defender.getMoves()[0];
    if (!moveId || moveId === ctx.move.id) return;
    if (effect.damageMult > 1) ctx.attacker.nextDamageMult = effect.damageMult;
    ctx.session.executeMove(ctx.attacker, ctx.defender, moveId);
  },
  [MoveEffectKinds.USE_OWN_FIRST_MOVE]: (_effect, ctx) => {
    const moveId = ctx.attacker.getMoves()[0];
    if (!moveId || moveId === ctx.move.id) return;
    ctx.session.executeMove(ctx.attacker, ctx.defender, moveId);
  },
  [MoveEffectKinds.BATTLE_BONUS]: (effect, ctx) => {
    ctx.session.addBonus(effect.bonus);
    ctx.log.add('battle_log.bonus', { name: ctx.attacker.name, bonus: effect.bonus });
  },
  [MoveEffectKinds.TRANSFORM]: passive
});
