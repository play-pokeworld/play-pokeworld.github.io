/**
 * @file BattleSession.js
 * @brief One wild battle, independent from the save and the event bus (C++: class
 * BattleSession). Port of the original real-time loop (domain/battle/tick.js): both sides
 * count their cooldown down; when it elapses the side runs its upkeep (TurnEndRules; the
 * player's turn also ticks weather and terrain), checks BeforeMoveRules, uses the next move of
 * its rotation (MoveExecutor), then gets a new cooldown (CooldownRules). The player acts first
 * when both are ready.
 * A fainted player Pokémon is replaced by the next living member (EntryRules on entry); the
 * battle is lost when nobody is left, won when the foe faints (on_ko_stat talents first) and no
 * reserve foe is left: trainer battles queue their next Pokémon in `reserves` (original champTeam).
 * HP changes are written to the PokemonData objects; everything else is volatile.
 */
import { BattleConfig } from '../../config/BattleConfig.js';
import { BattleSides } from '../../config/BattleSides.js';
import { MoveDB } from '../../data/battle/MoveDB.js';
import { MoveEffectKinds } from '../../data/battle/MoveEffectKinds.js';
import { TalentEffectKinds } from '../../data/battle/TalentEffectKinds.js';
import { BattleCombatant } from './BattleCombatant.js';
import { BattleField } from './BattleField.js';
import { BattleLog } from './BattleLog.js';
import { BeforeMoveRules } from './BeforeMoveRules.js';
import { CooldownRules } from './CooldownRules.js';
import { EntryRules } from './EntryRules.js';
import { MoveExecutor } from './MoveExecutor.js';
import { StatChangeRules } from './StatChangeRules.js';
import { StatusRules } from './StatusRules.js';
import { TurnEndRules } from './TurnEndRules.js';

/** Battle outcomes. */
export const BattleOutcomes = Object.freeze({ VICTORY: 'victory', DEFEAT: 'defeat' });

/** on_ko_stat value meaning "the higher of atk / spa" (Beast Boost). */
const BEST_ATTACK_STAT = 'best_attack';

/** Moves Metronome can never call. */
const NOT_CALLABLE_KINDS = Object.freeze(new Set([
  MoveEffectKinds.CALL_RANDOM_MOVE,
  MoveEffectKinds.USE_FOE_FIRST_MOVE,
  MoveEffectKinds.USE_OWN_FIRST_MOVE
]));

/**
 * @typedef {Object} BattleHit
 * @property {string} side - BattleSides value of the attacker
 * @property {string} moveId
 * @property {string} moveType
 * @property {number} damage
 * @property {number} effectiveness
 */

export class BattleSession {
  /**
   * @param {Object} setup
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData[]} setup.team
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData} setup.foe
   * @param {import('../../core/Random.js').Random} setup.random
   * @param {string|null} [setup.weather=null] - Permanent weather of the location
   * @param {(itemId: string) => number} [setup.ownedQuantity] - Inventory count (held item power)
   * @param {(species: string) => boolean} [setup.hiddenTalentUnlocked] - Player hidden talents
   * @param {boolean} [setup.training=false]
   * @param {Array<{pokemon: import('../../data/pokemon/PokemonData.js').PokemonData, intro?: {key: string, params?: Object}}>} [setup.reserves=[]]
   *   Foes sent in order after `foe` faints; `intro` replaces the default 'battle_log.trainer_sends' line
   */
  constructor({ team, foe, random, weather = null, ownedQuantity = () => 0, hiddenTalentUnlocked = () => false, training = false, reserves = [] }) {
    this.random = random;
    this.training = training;
    this.field = new BattleField(weather);
    this.log = new BattleLog();
    /** @type {BattleCombatant[]} */
    this.team = team.map((pokemon) => new BattleCombatant(pokemon, BattleSides.PLAYER, {
      npc: false,
      hiddenTalentActive: hiddenTalentUnlocked(pokemon.species),
      heldQuantity: pokemon.heldItem ? ownedQuantity(pokemon.heldItem) : 0
    }));
    this.foe = new BattleCombatant(foe, BattleSides.FOE, { npc: true });
    /** @private Foes still waiting to be sent */
    this._reserves = [...reserves];
    /** @type {import('../../data/pokemon/PokemonData.js').PokemonData[]} Every foe sent so far, in order */
    this.sentFoes = [foe];
    /** @type {import('../../data/pokemon/PokemonData.js').PokemonData[]} Foes knocked out, in order */
    this.defeatedFoes = [];
    this.activeIndex = Math.max(0, this.team.findIndex((member) => !member.isFainted()));
    /** @type {string|null} BattleOutcomes value once finished */
    this.outcome = null;
    /** @type {Set<string>} battle_bonus ids */
    this.bonuses = new Set();
    /** @type {BattleHit[]} */
    this._hits = [];
    /** @type {Set<BattleCombatant>} */
    this._switchRequests = new Set();
    this._executor = new MoveExecutor(this);
    /** @type {string[]|null} */
    this._callablePool = null;
    this.playerCooldownMs = 0;
    this.foeCooldownMs = 0;
    /** @type {number} Moves used by the wild Pokémon (Timer Ball, original enemyTurnsOnField) */
    this.foeTurns = 0;
    /** @type {number} Moves used by the player (Quick Ball, original attacksOnCurrentEnemy) */
    this.playerAttacks = 0;
  }

  // --- Queries ----------------------------------------------------------------------------------

  /** @returns {BattleCombatant} */
  get active() {
    return this.team[this.activeIndex];
  }

  /** @returns {number} Foes still waiting to be sent */
  get reserveCount() {
    return this._reserves.length;
  }

  /** @returns {boolean} */
  isOver() {
    return this.outcome !== null;
  }

  /** @returns {BattleHit[]} Hits since the last call */
  drainHits() {
    const hits = this._hits;
    this._hits = [];
    return hits;
  }

  // --- Lifecycle --------------------------------------------------------------------------------

  /** Entry effects (player first, as in the original) and first cooldowns. */
  start() {
    const startDelayMs = BattleConfig.START_DELAY_S * 1000;
    EntryRules.apply(this.active, this.foe, this.field, this.log);
    EntryRules.apply(this.foe, this.active, this.field, this.log);
    this.playerCooldownMs = startDelayMs + CooldownRules.next(this.active, null, this.field, this.random);
    this.foeCooldownMs = startDelayMs + CooldownRules.next(this.foe, null, this.field, this.random);
  }

  /**
   * @param {number} dt - Seconds since the last update
   */
  update(dt) {
    if (this.isOver()) return;
    const elapsedMs = dt * 1000;
    this.playerCooldownMs -= elapsedMs;
    this.foeCooldownMs -= elapsedMs;
    if (this.playerCooldownMs <= 0) {
      this._act(this.active, this.foe, true);
      this.playerCooldownMs = CooldownRules.next(this.active, this._lastMoveOf(this.active), this.field, this.random);
      if (this._resolve()) return;
    }
    if (this.foeCooldownMs <= 0) {
      this._act(this.foe, this.active, false);
      this.foeCooldownMs = CooldownRules.next(this.foe, this._lastMoveOf(this.foe), this.field, this.random);
      this._resolve();
    }
  }

  // --- Services used by the rules (MoveEffectContext.session) -----------------------------------

  /**
   * @param {number} depth - Call depth of the running move
   * @returns {Object}
   */
  servicesFor(depth) {
    return {
      requestSwitch: (combatant) => this.requestSwitch(combatant),
      cureTeam: (combatant) => this.cureTeam(combatant),
      addBonus: (bonus) => this.bonuses.add(bonus),
      executeMove: (attacker, defender, moveId) => this._executor.execute(attacker, defender, moveId, depth + 1),
      randomCallableMove: () => this.randomCallableMove(),
      moveTypeOf: (moveId) => MoveDB.getInstance().getById(moveId)?.type ?? null
    };
  }

  /** @param {BattleCombatant} combatant - Only the player's side can switch */
  requestSwitch(combatant) {
    if (combatant.side === BattleSides.PLAYER) this._switchRequests.add(combatant);
  }

  /** @param {BattleCombatant} combatant - Cures every member of its side */
  cureTeam(combatant) {
    const members = combatant.side === BattleSides.PLAYER ? this.team : [this.foe];
    for (const member of members) StatusRules.cure(member, this.log);
  }

  /** @returns {string|null} Random damaging move id (original Metronome pool) */
  randomCallableMove() {
    if (!this._callablePool) {
      this._callablePool = MoveDB.getInstance()
        .getAll()
        .filter((move) => move.power > 0 && move.category !== 'status' && !move.effects.some((effect) => NOT_CALLABLE_KINDS.has(effect.kind)))
        .map((move) => move.id);
    }
    return this.random.pick(this._callablePool) ?? null;
  }

  /** @param {BattleCombatant} combatant @returns {boolean} */
  isFoe(combatant) {
    return combatant.side === BattleSides.FOE;
  }

  /** @param {BattleCombatant} combatant @returns {number} */
  faintedAllies(combatant) {
    return combatant.side === BattleSides.PLAYER ? this.team.filter((member) => member.isFainted()).length : 0;
  }

  /**
   * @param {BattleCombatant} attacker
   * @param {{moveId: string, moveType: string, damage: number, effectiveness: number}} hit
   */
  recordHit(attacker, hit) {
    this._hits.push({ side: attacker.side, ...hit });
  }

  // --- Internals --------------------------------------------------------------------------------

  /** @private */
  _act(actor, target, playerTurn) {
    if (actor.isFainted() || target.isFainted()) return;
    TurnEndRules.apply(actor, this.log);
    if (playerTurn) this._tickField();
    if (actor.isFainted()) return;
    if (!BeforeMoveRules.canAct(actor, this.random, this.log)) return;
    const moveId = actor.nextMove();
    if (moveId) {
      if (playerTurn) this.playerAttacks++;
      else this.foeTurns++;
      this._executor.execute(actor, target, moveId);
    }
    this._processSwitchRequests();
  }

  /** @private */
  _tickField() {
    const { weatherEnded, terrainEnded } = this.field.tick();
    if (weatherEnded) this.log.add(this.field.weather ? 'battle_log.weather_default' : 'battle_log.weather_ended');
    if (terrainEnded) this.log.add('battle_log.terrain_ended');
  }

  /** @private @returns {Readonly<Object>|null} */
  _lastMoveOf(combatant) {
    return combatant.lastMoveId ? MoveDB.getInstance().getById(combatant.lastMoveId) : null;
  }

  /** @private */
  _processSwitchRequests() {
    const requested = this._switchRequests.has(this.active);
    this._switchRequests.clear();
    if (!requested || this.foe.isFainted()) return;
    const next = this._nextAliveIndex();
    if (next !== -1) this._switchTo(next);
  }

  /** @private @returns {number} Next living member after the active one, -1 when none */
  _nextAliveIndex() {
    for (let offset = 1; offset < this.team.length; offset++) {
      const index = (this.activeIndex + offset) % this.team.length;
      if (!this.team[index].isFainted()) return index;
    }
    return -1;
  }

  /** @private */
  _switchTo(index) {
    const previous = this.active;
    if (previous.status && previous.hasTalentEffect(TalentEffectKinds.CURE_ON_SWITCH)) StatusRules.cure(previous, this.log);
    previous.resetVolatile();
    this.activeIndex = index;
    this.active.resetVolatile();
    this.log.add('battle_log.switch', { name: this.active.name });
    EntryRules.apply(this.active, this.foe, this.field, this.log);
    this.playerCooldownMs = CooldownRules.next(this.active, null, this.field, this.random);
  }

  /** @private @returns {boolean} true when the battle ended */
  _resolve() {
    if (this.foe.isFainted()) {
      this._onKo(this.active);
      this.log.add('battle_log.foe_fainted', { name: this.foe.name });
      this.defeatedFoes.push(this.foe.pokemon);
      if (this._reserves.length) {
        this._sendNextFoe();
        return false;
      }
      this.outcome = BattleOutcomes.VICTORY;
      return true;
    }
    if (this.active.isFainted()) {
      this.log.add('battle_log.player_fainted', { name: this.active.name });
      const next = this._nextAliveIndex();
      if (next === -1) {
        this.outcome = BattleOutcomes.DEFEAT;
        return true;
      }
      this._switchTo(next);
    }
    return false;
  }

  /** @private Original champion switch: the next foe enters, the per-foe counters restart. */
  _sendNextFoe() {
    const next = this._reserves.shift();
    this.foe = new BattleCombatant(next.pokemon, BattleSides.FOE, { npc: true });
    this.sentFoes.push(next.pokemon);
    this.foeTurns = 0;
    this.playerAttacks = 0;
    if (next.intro) this.log.add(next.intro.key, next.intro.params ?? {});
    this.log.add('battle_log.trainer_sends', { name: this.foe.name });
    EntryRules.apply(this.foe, this.active, this.field, this.log);
    this.foeCooldownMs = BattleConfig.FOE_SWITCH_DELAY_S * 1000 + CooldownRules.next(this.foe, null, this.field, this.random);
  }

  /** @private on_ko_stat talents of the Pokémon that scored the KO (direct modifiers). */
  _onKo(scorer) {
    if (!scorer || scorer.isFainted()) return;
    for (const effect of scorer.talentEffects(TalentEffectKinds.ON_KO_STAT)) {
      const stat = effect.stat === BEST_ATTACK_STAT ? (scorer.getStat('spa') > scorer.getStat('atk') ? 'spa' : 'atk') : effect.stat;
      StatChangeRules.applyRaw(scorer, stat, effect.mult);
    }
  }
}
