/**
 * @file BattleSession.js
 * @brief One wild battle, independent from the save and the event bus (C++: class
 * BattleSession). Port of the original real-time loop (domain/battle/tick.js): both sides
 * count their cooldown down; when it elapses the side runs its upkeep (TurnEndRules; the
 * player's turn also ticks weather and terrain), checks BeforeMoveRules, uses the next move of
 * its rotation (MoveExecutor), then gets a new cooldown (CooldownRules). The player acts first
 * when both are ready.
 * A fainted player Pokémon is replaced by the next living member (EntryRules on entry); the
 * battle is lost when nobody is left. Trainer reserves and an optional wild-encounter factory can
 * send the next foe without ending the active session.
 * HP changes are written to the PokemonData objects; everything else is volatile.
 */
import { BattleConfig } from '../../config/BattleConfig.js';
import { BattleRules } from '../../config/BattleRules.js';
import { PlayerDefaults } from '../../config/PlayerDefaults.js';
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
   * @param {Object} [setup.foeOptions]
   * @param {import('../../core/Random.js').Random} setup.random
   * @param {string|null} [setup.weather=null] - Permanent weather of the location
   * @param {(itemId: string) => number} [setup.ownedQuantity] - Inventory count (held item power)
   * @param {(species: string) => boolean} [setup.hiddenTalentUnlocked] - Player hidden talents
   * @param {boolean} [setup.training=false]
   * @param {Array<{pokemon: import('../../data/pokemon/PokemonData.js').PokemonData, intro?: {key: string, params?: Object}}>} [setup.reserves=[]]
   *   Foes sent in order after `foe` faints; `intro` precedes the default trainer send line
   * @param {() => import('../../data/pokemon/PokemonData.js').PokemonData|null} [setup.nextFoeFactory=null]
   * @param {string|((pokemon: import('../../data/pokemon/PokemonData.js').PokemonData) => string)} [setup.nextFoeIntroKey='battle_log.wild_appeared']
   * @param {(encounter: Object, session: BattleSession) => void} [setup.onFoeDefeated=null]
   */
  constructor({ team, foe, foeOptions = {}, random, weather = null, ownedQuantity = () => 0, hiddenTalentUnlocked = () => false, training = false, reserves = [], nextFoeFactory = null, nextFoeIntroKey = 'battle_log.wild_appeared', onFoeDefeated = null }) {
    this.random = random;
    this.training = training;
    this.field = new BattleField(weather);
    this.log = new BattleLog();
    this._ownedQuantity = ownedQuantity;
    this._hiddenTalentUnlocked = hiddenTalentUnlocked;
    this._nextFoeFactory = typeof nextFoeFactory === 'function' ? nextFoeFactory : null;
    this._nextFoeIntroKey = nextFoeIntroKey;
    this._onFoeDefeated = typeof onFoeDefeated === 'function' ? onFoeDefeated : null;
    /** @type {BattleCombatant[]} */
    this.team = team.map((pokemon) => this._makePlayerCombatant(pokemon));
    this.foe = new BattleCombatant(foe, BattleSides.FOE, { npc: true, ...foeOptions });
    /** @private Foes still waiting to be sent */
    this._reserves = [...reserves];
    /** @type {import('../../data/pokemon/PokemonData.js').PokemonData[]} Every foe sent so far, in order */
    this.sentFoes = [foe];
    /** @type {import('../../data/pokemon/PokemonData.js').PokemonData[]} Foes knocked out, in order */
    this.defeatedFoes = [];
    /** @type {Array<{pokemon:import('../../data/pokemon/PokemonData.js').PokemonData, foeTurns:number, playerAttacks:number}>} */
    this.defeatedEncounters = [];
    /** @type {number} Player Pokémon knocked out in this battle */
    this.playerKOs = 0;
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
    this.playerCooldownTotalMs = 0;
    this.foeCooldownTotalMs = 0;
    /** @private @type {number} Wall-clock deadline for a capture verdict before the next foe is sent. */
    this._capturePauseUntil = 0;
    /** @private @type {boolean} The defeated foe has been settled but is waiting for its transition. */
    this._pendingFoeAdvance = false;
    /** @type {number} Moves used by the wild Pokémon (Timer Ball, original enemyTurnsOnField) */
    this.foeTurns = 0;
    /** @type {number} Moves used by the player (Quick Ball, original attacksOnCurrentEnemy) */
    this.playerAttacks = 0;
  }

  /** @private @param {import('../../data/pokemon/PokemonData.js').PokemonData} pokemon */
  _makePlayerCombatant(pokemon) {
    return new BattleCombatant(pokemon, BattleSides.PLAYER, {
      npc: false,
      hiddenTalentActive: this._hiddenTalentUnlocked(pokemon.species),
      heldQuantity: pokemon.heldItem ? this._ownedQuantity(pokemon.heldItem) : 0
    });
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

  /**
   * Manually switches to another living party member. Uses the same switch-in path as a move or
   * a knockout, so volatile modifiers, Natural Cure, entry talents and the player cooldown stay
   * consistent. The Rework currently has no Regenerator effect in its talent vocabulary.
   * @param {number} index
   * @returns {boolean} Whether a switch was applied
   */
  switchPlayerPokemon(index) {
    if (this.isOver() || this.training || !Number.isInteger(index) || index < 0 || index >= this.team.length) return false;
    if (index === this.activeIndex || this.team[index].isFainted()) return false;
    this._switchTo(index);
    return true;
  }

  /** @returns {boolean} */
  isOver() {
    return this.outcome !== null;
  }

  /** Adds a newly caught team member to the live battle roster. */
  addPlayerPokemon(pokemon) {
    if (!pokemon || this.isOver() || this.team.length >= PlayerDefaults.TEAM_SIZE) return false;
    if (this.team.some((member) => member.pokemon === pokemon)) return false;
    this.team.push(this._makePlayerCombatant(pokemon));
    return true;
  }

  /**
   * Holds a settled wild encounter while its capture result is presented.
   * @param {number} durationMs
   * @returns {boolean}
   */
  pauseForCapture(durationMs) {
    const duration = Math.max(0, Number(durationMs) || 0);
    if (this.isOver() || duration === 0) return false;
    this._capturePauseUntil = Math.max(this._capturePauseUntil, Date.now() + duration);
    return true;
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
    this.playerCooldownTotalMs = this.playerCooldownMs;
    this.foeCooldownTotalMs = this.foeCooldownMs;
  }

  /**
   * @param {number} dt - Seconds since the last update
   */
  update(dt) {
    if (this.isOver()) return;
    if (this._pendingFoeAdvance) {
      if (Date.now() < this._capturePauseUntil) return;
      this._pendingFoeAdvance = false;
      this._capturePauseUntil = 0;
      this._advanceAfterFoeDefeated();
      return;
    }
    const elapsedMs = dt * 1000;
    this.playerCooldownMs -= elapsedMs;
    this.foeCooldownMs -= elapsedMs;
    if (this.playerCooldownMs <= 0) {
      this._act(this.active, this.foe, true);
      this.playerCooldownMs = CooldownRules.next(this.active, this._lastMoveOf(this.active), this.field, this.random);
      this.playerCooldownTotalMs = this.playerCooldownMs;
      if (this._resolve() || this._pendingFoeAdvance) return;
    }
    if (this.foeCooldownMs <= 0) {
      this._act(this.foe, this.active, false);
      this.foeCooldownMs = CooldownRules.next(this.foe, this._lastMoveOf(this.foe), this.field, this.random);
      this.foeCooldownTotalMs = this.foeCooldownMs;
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
    this._hits.push({
      side: attacker.side,
      pokemonUid: attacker.pokemon.uid,
      species: attacker.pokemon.species,
      name: attacker.name,
      shiny: attacker.pokemon.shiny,
      ...hit
    });
  }

  // --- Internals --------------------------------------------------------------------------------

  /** @private */
  _act(actor, target, playerTurn) {
    if (actor.isFainted() || target.isFainted()) return;
    TurnEndRules.apply(actor, this.log);
    this._checkDungeonBossEnrage(actor);
    if (playerTurn) this._tickField();
    if (actor.isFainted()) return;
    if (!BeforeMoveRules.canAct(actor, this.random, this.log)) return;
    const moveId = actor.nextMove();
    if (moveId) {
      if (playerTurn) this.playerAttacks++;
      else this.foeTurns++;
      this._executor.execute(actor, target, moveId);
      this._checkDungeonBossEnrage(target);
    }
    this._processSwitchRequests();
  }

  /** @private @param {BattleCombatant} combatant */
  _checkDungeonBossEnrage(combatant) {
    if (!combatant?.dungeonBoss || combatant.dungeonEnraged || combatant.isFainted()) return;
    if (combatant.hp > combatant.maxHp * 0.5) return;

    combatant.dungeonEnraged = true;
    for (const [stat, multiplier] of [['atk', 1.4], ['spe', 1.6]]) {
      const base = combatant._baseStatMultipliers[stat] || 1;
      const nextBase = Math.min(BattleRules.STAT_MOD_MAX, base * multiplier);
      const ratio = nextBase / base;
      combatant._baseStatMultipliers[stat] = nextBase;
      combatant.statMods[stat] = Math.min(BattleRules.STAT_MOD_MAX, combatant.statMods[stat] * ratio);
    }
    if (combatant === this.foe && this.foeCooldownMs > 0) {
      this.foeCooldownMs = Math.ceil(this.foeCooldownMs / 1.6);
      if (this.foeCooldownTotalMs > 0) this.foeCooldownTotalMs = Math.ceil(this.foeCooldownTotalMs / 1.6);
    }
    this.log.add('dungeon_boss_enrage', { name: combatant.name });
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
    this.playerCooldownTotalMs = this.playerCooldownMs;
  }

  /** @private @returns {boolean} true when the battle ended */
  _resolve() {
    if (this.foe.isFainted()) {
      const scorer = this.active;
      this._onKo(scorer);
      this.log.add('battle_log.foe_fainted', { name: this.foe.name });
      this.defeatedFoes.push(this.foe.pokemon);
      const encounter = {
        pokemon: this.foe.pokemon,
        foeTurns: this.foeTurns,
        playerAttacks: this.playerAttacks,
        scorerUid: scorer?.pokemon?.uid ?? null,
        scorerSpecies: scorer?.pokemon?.species ?? null,
        scorerName: scorer?.name ?? '',
        scorerShiny: !!scorer?.pokemon?.shiny
      };
      this.defeatedEncounters.push(encounter);
      if (this._onFoeDefeated) this._onFoeDefeated(encounter, this);
      if (Date.now() < this._capturePauseUntil) {
        this._pendingFoeAdvance = true;
        return false;
      }
      return this._advanceAfterFoeDefeated();
    }
    if (this.active.isFainted()) {
      this.playerKOs++;
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

  /** @private @returns {boolean} true when the battle ended */
  _advanceAfterFoeDefeated() {
    if (!this.team.some((member) => !member.isFainted())) {
      this.outcome = BattleOutcomes.DEFEAT;
      return true;
    }
    if (this._reserves.length) {
      this._sendNextFoe(this._reserves.shift());
      return false;
    }
    if (this._nextFoeFactory) {
      const nextFoe = this._nextFoeFactory();
      if (nextFoe) {
        const introKey = typeof this._nextFoeIntroKey === 'function'
          ? this._nextFoeIntroKey(nextFoe)
          : this._nextFoeIntroKey;
        this._sendNextFoe({
          pokemon: nextFoe,
          intro: { key: introKey, params: { name: nextFoe.getDisplayName() } },
          announceOnly: true
        });
        return false;
      }
    }
    this.outcome = BattleOutcomes.VICTORY;
    return true;
  }

  /** @private Sends a trainer reserve or the next wild Pokémon into the active session. */
  _sendNextFoe(next) {
    if (!next?.pokemon) return;
    this.foe = new BattleCombatant(next.pokemon, BattleSides.FOE, { npc: true });
    this.sentFoes.push(next.pokemon);
    this.foeTurns = 0;
    this.playerAttacks = 0;
    if (next.intro) this.log.add(next.intro.key, next.intro.params ?? {});
    if (!next.announceOnly) this.log.add('battle_log.trainer_sends', { name: this.foe.name });
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
