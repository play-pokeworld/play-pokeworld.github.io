/**
 * @file MoveExecutor.js
 * @brief Executes one move (C++: class MoveExecutor), port of the original executeAttack /
 * executeStatMove:
 *   1. consecutive-use counter, log;
 *   2. type_immunity talents of the target (absorb: heal, flash: speed boost) for moves aimed
 *      at the foe;
 *   3. accuracy roll;
 *   4. damaging move: attacker pinch stat berries, DamageCalculator, HP loss, HitReactionRules,
 *      move effects, eject item; status move: type immunity for foe-aimed moves, move effects.
 * Called moves (Metronome, Mimic, Sketch) run through the session with a depth guard.
 */
import { BattleRules } from '../../config/BattleRules.js';
import { MoveDB } from '../../data/battle/MoveDB.js';
import { MoveEffectKinds } from '../../data/battle/MoveEffectKinds.js';
import { TalentEffectKinds } from '../../data/battle/TalentEffectKinds.js';
import { HeldEffectKinds } from '../../data/items/HeldEffectKinds.js';
import { MODIFIABLE_STATS } from './BattleCombatant.js';
import { AccuracyRules } from './AccuracyRules.js';
import { DamageCalculator } from './DamageCalculator.js';
import { HitReactionRules } from './HitReactionRules.js';
import { MOVE_EFFECT_HANDLERS } from './MoveEffectHandlers.js';
import { MoveTyping } from './MoveTyping.js';
import { StatChangeRules } from './StatChangeRules.js';

/** Maximum nesting of called moves (Metronome → move). */
const MAX_CALL_DEPTH = 1;

/** Effect kinds that act on the target of a status move. */
const FOE_EFFECT_KINDS = Object.freeze(new Set([
  MoveEffectKinds.FLINCH,
  MoveEffectKinds.ACCURACY_DOWN,
  MoveEffectKinds.ADD_TYPE
]));

const Triggers = Object.freeze({ PINCH_STAT: 'pinch_stat', PINCH_RANDOM: 'pinch_random' });

/**
 * @param {Readonly<Object>} move
 * @returns {boolean} The move is aimed at the foe (damage or foe-side effect)
 */
const aimsAtFoe = (move) => move.power > 0 || move.effects.some((effect) =>
  FOE_EFFECT_KINDS.has(effect.kind)
  || ((effect.kind === MoveEffectKinds.STAT || effect.kind === MoveEffectKinds.STATUS) && effect.target !== 'self')
  || effect.kind === MoveEffectKinds.FIXED_POWER_HIT);

export class MoveExecutor {
  /**
   * @param {Object} session - BattleSession (field, random, log and the services of MoveEffectContext)
   */
  constructor(session) {
    this._session = session;
  }

  /**
   * @param {import('./BattleCombatant.js').BattleCombatant} attacker
   * @param {import('./BattleCombatant.js').BattleCombatant} defender
   * @param {string} moveId
   * @param {number} [depth=0]
   */
  execute(attacker, defender, moveId, depth = 0) {
    const move = MoveDB.getInstance().getById(moveId);
    if (!move || depth > MAX_CALL_DEPTH) return;
    const { field, random, log } = this._session;
    attacker.consecutiveUses = attacker.lastMoveId === moveId ? attacker.consecutiveUses + 1 : 1;
    attacker.lastMoveId = moveId;
    log.add('battle_log.move_used', { name: attacker.name, moveId });

    const foeAimed = aimsAtFoe(move);
    const moveType = MoveTyping.resolve(attacker, move).type;
    if (foeAimed && this._absorbedByTalent(attacker, defender, move, moveType)) return;
    if (foeAimed && !AccuracyRules.rollHit(attacker, defender, move, random)) {
      log.add('battle_log.miss', { name: attacker.name, moveId });
      return;
    }
    const ctx = { attacker, defender, move, field, random, log, damage: 0, session: this._session.servicesFor(depth) };
    const damaging = move.power > 0 || move.effects.some((effect) => effect.kind === MoveEffectKinds.FIXED_POWER_HIT);
    if (damaging) {
      this._pinchStatBerries(attacker);
      const result = DamageCalculator.compute({
        attacker, defender, move, field, random,
        training: this._session.training,
        attackerIsFoe: this._session.isFoe(attacker),
        faintedAllies: this._session.faintedAllies(attacker)
      });
      if (result.immune) {
        log.add('battle_log.immune', { name: defender.name });
        return;
      }
      if (result.gemUsed) log.add('battle_log.item_gem', { name: attacker.name, itemId: attacker.pokemon.heldItem });
      if (result.resistBerryUsed) log.add('battle_log.item_resist', { name: defender.name, itemId: defender.pokemon.heldItem });
      ctx.damage = defender.takeDamage(result.damage);
      log.add('battle_log.damage', { name: defender.name, damage: ctx.damage, effectiveness: result.effectiveness, hits: result.hits });
      this._session.recordHit(attacker, { moveId, moveType: result.moveType, damage: ctx.damage, effectiveness: result.effectiveness });
      HitReactionRules.apply({ attacker, defender, move, effectiveness: result.effectiveness, field, random, log });
    } else if (foeAimed && MoveTyping.effectiveness(attacker, defender, move, moveType) === 0) {
      log.add('battle_log.immune', { name: defender.name });
      return;
    } else if (move.effects.length === 0) {
      log.add('battle_log.no_effect', { name: attacker.name });
    }
    for (const effect of move.effects) MOVE_EFFECT_HANDLERS[effect.kind]?.(effect, ctx);
    if (damaging && attacker.heldEffect(HeldEffectKinds.EJECT) && !attacker.isFainted()) this._session.requestSwitch(attacker);
  }

  /** @private @returns {boolean} true when a type_immunity talent cancelled the move */
  _absorbedByTalent(attacker, defender, move, moveType) {
    const { log } = this._session;
    const effect = defender.talentEffects(TalentEffectKinds.TYPE_IMMUNITY).find((entry) => entry.moveType === moveType);
    if (!effect) return false;
    if (effect.healFraction) {
      const amount = defender.heal(Math.max(1, Math.floor(defender.maxHp * effect.healFraction)));
      log.add('battle_log.absorb', { name: defender.name, moveId: move.id, amount });
    } else if (effect.boost) {
      StatChangeRules.applyRaw(defender, effect.boost.stat, effect.boost.mult);
      log.add('battle_log.absorb_boost', { name: defender.name, moveId: move.id, stat: effect.boost.stat });
    } else {
      log.add('battle_log.immune', { name: defender.name });
    }
    return true;
  }

  /** @private Original pinch_stat / pinch_random berries (attacker below PINCH_HP_RATIO, once). */
  _pinchStatBerries(attacker) {
    const effect = attacker.getHeldItem()?.effect;
    if (!effect || attacker.hp >= attacker.maxHp * BattleRules.PINCH_HP_RATIO) return;
    const { log, random } = this._session;
    if (effect.kind === HeldEffectKinds.PINCH_STAT && !attacker.usedTriggers.has(Triggers.PINCH_STAT)) {
      attacker.usedTriggers.add(Triggers.PINCH_STAT);
      StatChangeRules.apply(attacker, effect.stat, 1 + attacker.heldPower(), log);
    }
    if (effect.kind === HeldEffectKinds.PINCH_RANDOM && !attacker.usedTriggers.has(Triggers.PINCH_RANDOM)) {
      attacker.usedTriggers.add(Triggers.PINCH_RANDOM);
      StatChangeRules.apply(attacker, random.pick(MODIFIABLE_STATS), 1 + attacker.heldPower(), log);
    }
  }
}
