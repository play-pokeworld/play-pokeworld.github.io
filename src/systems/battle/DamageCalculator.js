/**
 * @file DamageCalculator.js
 * @brief Damage of a damaging move (C++: class DamageCalculator), port of the original
 * executeAttack pipeline:
 *
 *   base   = floor((2L/5 + 2) * power * atk / def / 50 + 2)
 *   damage = max(1, floor(base * stab * eff * random(85..100)% * item * weather * talent))
 *   then: multi-hit ×hits, screens, Mimic, resistance berry, training, Assault Vest, burn,
 *   damage_taken talents (each step floors and keeps at least 1, burn excepted).
 *
 * Power: move power, fixed_power_hit, random_power, conditional_power, consecutive_power,
 * power talents. Attack / defense: raw stat × battle modifier (defense modifier ignored by
 * ignore_defense_mods talents, bypassDefenseBoosts moves and ignore_stat_mods moves) × held
 * buffs (choice stat, eviolite) × attack_stat / foe_attack_stat / defense_stat talents, held
 * hazards item, sand Rock special defense, terrain seed.
 * Side effects: marks the gem / seed triggers as used and records the cross_power type.
 */
import { BattleRules } from '../../config/BattleRules.js';
import { Weathers } from '../../data/battle/BattleFields.js';
import { MoveEffectKinds } from '../../data/battle/MoveEffectKinds.js';
import { TalentEffectKinds } from '../../data/battle/TalentEffectKinds.js';
import { HeldEffectKinds } from '../../data/items/HeldEffectKinds.js';
import { EffectConditions } from './EffectConditions.js';
import { MoveTyping } from './MoveTyping.js';

/** Trigger ids stored in BattleCombatant.usedTriggers. */
export const DamageTriggers = Object.freeze({ GEM: 'gem', SEED: 'seed' });

/**
 * @typedef {Object} DamageRequest
 * @property {import('./BattleCombatant.js').BattleCombatant} attacker
 * @property {import('./BattleCombatant.js').BattleCombatant} defender
 * @property {Readonly<Object>} move
 * @property {import('./BattleField.js').BattleField} field
 * @property {import('../../core/Random.js').Random} random
 * @property {boolean} [training=false] - Training battle (foe damage reduced)
 * @property {boolean} [attackerIsFoe=false]
 * @property {number} [faintedAllies=0] - Fainted team members of the attacker
 */

/**
 * @typedef {Object} DamageResult
 * @property {number} damage
 * @property {number} effectiveness
 * @property {string} moveType
 * @property {number} hits
 * @property {boolean} immune
 * @property {boolean} gemUsed
 * @property {boolean} resistBerryUsed
 */

/**
 * @param {Readonly<Object>} move
 * @param {string} kind
 * @returns {Readonly<Object>[]}
 */
const effectsOf = (move, kind) => move.effects?.filter((effect) => effect.kind === kind) ?? [];

/** @param {number} value @returns {number} */
const atLeastOne = (value) => Math.max(1, Math.floor(value));

export class DamageCalculator {
  /**
   * @param {DamageRequest} request
   * @returns {DamageResult}
   */
  static compute(request) {
    const { attacker, defender, move, field, random } = request;
    const typing = MoveTyping.resolve(attacker, move, field);
    const moveType = typing.type;
    const effectiveness = MoveTyping.effectiveness(attacker, defender, move, moveType);
    const result = { damage: 0, effectiveness, moveType, hits: 1, immune: effectiveness === 0, gemUsed: false, resistBerryUsed: false };
    if (result.immune) return result;

    const physical = move.category === 'physical';
    const attackerCtx = { self: attacker, target: defender, move, moveType, field, effectiveness };
    const defenderCtx = { self: defender, target: attacker, move, moveType, field, effectiveness };

    const power = DamageCalculator._power(request, attackerCtx);
    if (power <= 0) return { ...result, immune: false };
    const atk = DamageCalculator._attack(request, attackerCtx, physical);
    const def = DamageCalculator._defense(request, defenderCtx, physical);

    const stab = DamageCalculator._stab(attacker, moveType);
    const randomMult = random.int(BattleRules.DAMAGE_RANDOM_MIN, 100) / 100;
    const item = DamageCalculator._itemAndTalentMult(request, attackerCtx, result);
    const weather = BattleRules.WEATHER_TYPE_MULT[field.weather]?.[moveType] ?? 1;

    const base = (((2 * attacker.level) / 5 + 2) * power * atk) / def / 50 + 2;
    let damage = atLeastOne(base * stab * effectiveness * randomMult * item * weather * typing.damageMult);

    result.hits = DamageCalculator._hits(attacker, move, random);
    if (result.hits > 1) damage = atLeastOne(damage * result.hits);
    if ((field.weather === Weathers.LIGHTSCREEN && !physical) || (field.weather === Weathers.REFLECT && physical)) {
      damage = atLeastOne(damage * BattleRules.SCREEN_MULT);
    }
    if (attacker.nextDamageMult) {
      damage = atLeastOne(damage * attacker.nextDamageMult);
      attacker.nextDamageMult = null;
    }
    const berry = defender.heldEffect(HeldEffectKinds.RESISTANCE_BERRY);
    if (berry && berry.type === moveType && effectiveness > 1) {
      damage = atLeastOne(damage * (1 - (berry.percent ?? BattleRules.RESIST_BERRY_PERCENT) / 100));
      result.resistBerryUsed = true;
    }
    if (request.training && request.attackerIsFoe) damage = atLeastOne(damage * BattleRules.TRAINING_FOE_DAMAGE);
    if (!physical && defender.heldEffect(HeldEffectKinds.DEFENSE)) damage = atLeastOne(damage * BattleRules.ASSAULT_VEST_MULT);
    if (attacker.status === 'burn' && physical) damage = Math.floor(damage / 2);
    for (const effect of defender.talentEffects(TalentEffectKinds.DAMAGE_TAKEN)) {
      if (EffectConditions.met(effect.when, defenderCtx)) damage = atLeastOne(damage * effect.mult);
    }
    result.damage = damage;
    return result;
  }

  /** @private */
  static _power({ attacker, defender, move, random }, ctx) {
    let power = move.power || 0;
    if (move.id === 'stored_power') {
      let statStages = 0;
      for (const stat of ['atk', 'def', 'spa', 'spd', 'spe']) {
        if (attacker.statMods[stat] > 1.0) {
          statStages += Math.round((attacker.statMods[stat] - 1.0) / 0.5);
        }
      }
      power += statStages * 30;
    }
    const fixed = effectsOf(move, MoveEffectKinds.FIXED_POWER_HIT)[0];
    if (fixed) {
      const bonus = fixed.powerIfTargetStatus;
      power = bonus && defender.status && bonus.statuses.includes(defender.status) ? bonus.power : fixed.power;
    }
    for (const effect of effectsOf(move, MoveEffectKinds.RANDOM_POWER)) power *= random.int(effect.minMult, effect.maxMult);
    for (const effect of effectsOf(move, MoveEffectKinds.CONDITIONAL_POWER)) {
      if (EffectConditions.met(effect.when, ctx)) power *= effect.mult;
    }
    for (const effect of effectsOf(move, MoveEffectKinds.CONSECUTIVE_POWER)) {
      const stacks = Math.min(attacker.consecutiveUses, effect.maxStacks);
      if (stacks > 1) power *= Math.pow(effect.mult, stacks - 1);
    }
    for (const effect of attacker.talentEffects(TalentEffectKinds.POWER)) {
      if (EffectConditions.met(effect.when, ctx)) power = Math.floor(power * effect.mult);
    }
    return power;
  }

  /** @private */
  static _attack({ attacker, defender, move }, ctx, physical) {
    const stat = move.id === 'body_press' ? 'def' : physical ? 'atk' : 'spa';
    const category = physical ? 'physical' : 'special';
    const choice = attacker.heldEffect(HeldEffectKinds.CHOICE);
    const buff = choice && choice.stat === stat ? choice.mult : 1;
    let atk = attacker.getStat(stat) * buff * attacker.statMods[stat];
    for (const effect of defender.talentEffects(TalentEffectKinds.FOE_ATTACK_STAT)) {
      if (!effect.category || effect.category === category) atk = Math.max(1, Math.floor(atk * effect.mult));
    }
    for (const effect of attacker.talentEffects(TalentEffectKinds.ATTACK_STAT)) {
      if ((!effect.category || effect.category === category) && EffectConditions.met(effect.when, ctx)) atk *= effect.mult;
    }
    return atk;
  }

  /** @private */
  static _defense({ attacker, defender, move, field }, ctx, physical) {
    const stat = physical ? 'def' : 'spd';
    const category = physical ? 'physical' : 'special';
    const ignoreMods = attacker.hasTalentEffect(TalentEffectKinds.IGNORE_DEFENSE_MODS) || move.bypassDefenseBoosts
      || effectsOf(move, MoveEffectKinds.IGNORE_STAT_MODS).length > 0;
    const buff = defender.heldEffect(HeldEffectKinds.EVIOLITE) && defender.canEvolve() ? 1 + BattleRules.EVIOLITE_DEFENSE_BONUS : 1;
    let def = defender.getStat(stat) * buff * (ignoreMods ? 1 : defender.statMods[stat]);
    for (const effect of defender.talentEffects(TalentEffectKinds.DEFENSE_STAT)) {
      if ((!effect.category || effect.category === category) && EffectConditions.met(effect.when, ctx)) def *= effect.mult;
    }
    if (defender.heldEffect(HeldEffectKinds.HAZARDS)) def *= defender.heldPower();
    if (field.weather === Weathers.SAND && !physical && defender.getTypes().includes('rock')) def *= BattleRules.SAND_ROCK_DEFENSE;
    const seed = defender.heldEffect(HeldEffectKinds.SEED);
    if (seed && !defender.usedTriggers.has(DamageTriggers.SEED) && seed.terrain === field.terrain) {
      defender.usedTriggers.add(DamageTriggers.SEED);
      defender.seedBoost = true;
    }
    if (defender.seedBoost) def *= BattleRules.SEED_DEFENSE;
    return Math.max(1, def);
  }

  /** @private */
  static _stab(attacker, moveType) {
    let stab = 1;
    if (attacker.getTypes().includes(moveType)) {
      stab = BattleRules.STAB;
      for (const effect of attacker.talentEffects(TalentEffectKinds.STAB)) stab = effect.mult;
    }
    for (const effect of attacker.talentEffects(TalentEffectKinds.STAB_MINIMUM)) stab = Math.max(stab, effect.mult);
    return stab;
  }

  /** @private Original itemTypeMult + talentDmgMult (held items, berries, talents, cross power). */
  static _itemAndTalentMult({ attacker, move, field, faintedAllies = 0 }, ctx, result) {
    const { moveType } = ctx;
    const physical = move.category === 'physical';
    let mult = 1;
    const held = attacker.getHeldItem()?.effect;
    if (held) {
      const power = attacker.heldPower();
      switch (held.kind) {
        case HeldEffectKinds.TYPE_BOOST:
          if (held.type === moveType) mult *= power;
          break;
        case HeldEffectKinds.CHOICE:
          if ((held.stat === 'atk') === physical) mult *= power;
          break;
        case HeldEffectKinds.LIFE_ORB:
        case HeldEffectKinds.EXTEND:
        case HeldEffectKinds.MEGA_STONE:
          mult *= power;
          break;
        case HeldEffectKinds.Z_CRYSTAL:
          if (held.type === moveType) mult *= 1.4;
          break;
        case HeldEffectKinds.PUNCH:
          if (move.tags.includes('punch')) mult *= power;
          break;
        case HeldEffectKinds.SLOW:
          if (move.cooldown > 1) mult *= power;
          break;
        case HeldEffectKinds.CONSECUTIVE: {
          const stacks = Math.min(BattleRules.METRONOME_MAX_STACKS, Math.max(0, attacker.consecutiveUses - 1));
          mult *= 1 + BattleRules.METRONOME_STEP * stacks;
          break;
        }
        case HeldEffectKinds.PINCH_DMG:
          if (attacker.hp < attacker.maxHp * BattleRules.PINCH_HP_RATIO) mult *= 1 + power;
          break;
        case HeldEffectKinds.ICE_BOOST:
          if (moveType === 'ice') mult *= 1 + power;
          break;
        case HeldEffectKinds.GEM:
          if (held.type === moveType && !attacker.usedTriggers.has(DamageTriggers.GEM)) {
            attacker.usedTriggers.add(DamageTriggers.GEM);
            result.gemUsed = true;
            mult *= BattleRules.GEM_MULT;
          }
          break;
        default:
          break;
      }
    }
    if (attacker.lastCrossType && attacker.lastCrossType !== moveType) {
      let cross = 1;
      if (attacker.getTypes().includes(attacker.lastCrossType) && attacker.getTypes().includes(moveType)) {
        cross += BattleRules.CROSS_STAB_BONUS ?? 0.35;
      }
      for (const effect of attacker.talentEffects(TalentEffectKinds.CROSS_POWER)) cross += effect.add;
      if (field.weather === Weathers.CROSSROOM) cross += BattleRules.CROSS_ROOM_ADD;
      mult *= cross;
    }
    attacker.lastCrossType = moveType;
    for (const effect of attacker.talentEffects(TalentEffectKinds.DAMAGE)) {
      if (EffectConditions.met(effect.when, ctx)) mult *= effect.mult;
    }
    if (faintedAllies > 0) {
      for (const effect of attacker.talentEffects(TalentEffectKinds.DAMAGE_PER_FAINTED_ALLY)) mult *= 1 + effect.add * faintedAllies;
    }
    return mult;
  }

  /** @private */
  static _hits(attacker, move, random) {
    if (!Array.isArray(move.hits)) return 1;
    const minimum = Math.max(2, move.hits[0]);
    const maximum = Math.max(minimum, move.hits[1]);
    const forceMax = attacker.hasTalentEffect(TalentEffectKinds.MAX_HITS) || !!attacker.heldEffect(HeldEffectKinds.MULTI_HIT);
    return forceMax ? maximum : random.int(minimum, maximum);
  }
}
