/**
 * @file BattleCombatant.js
 * @brief A Pokémon inside a battle (C++: class BattleCombatant). Wraps a PokemonData (whose HP
 * is the persistent state) and adds the volatile battle state: stat modifiers and their turns,
 * status, flinch, move rotation, consecutive-use counters, temporary types, used berries.
 * Talents: the rolled talent, plus the species hidden talent when `hiddenTalentActive`
 * (always for wild / NPC Pokémon, for the player only once unlocked — original
 * getPokemonHiddenTalent).
 */
import { TalentDB } from '../../data/pokemon/TalentDB.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { MoveLearnset } from '../../data/pokemon/MoveLearnset.js';
import { heldItemPower } from './HeldItemPower.js';

/** Stats that can be modified in battle (accuracy uses `accuracyPenalty`, as in the original). */
export const MODIFIABLE_STATS = Object.freeze(['atk', 'def', 'spa', 'spd', 'spe']);

export class BattleCombatant {
  /**
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData} pokemon
   * @param {string} side - BattleSides value
   * @param {Object} [options]
   * @param {boolean} [options.npc=false] - Wild or trainer Pokémon
   * @param {boolean} [options.hiddenTalentActive] - Defaults to `npc`
   * @param {number} [options.heldQuantity=0] - Owned copies of the held item (player items scale)
   */
  constructor(pokemon, side, { npc = false, hiddenTalentActive = npc, heldQuantity = 0 } = {}) {
    this.pokemon = pokemon;
    this.side = side;
    this.npc = npc;
    this.hiddenTalentActive = hiddenTalentActive;
    this.heldQuantity = heldQuantity;
    /** @type {Record<string, number>} */
    this.statMods = Object.fromEntries(MODIFIABLE_STATS.map((stat) => [stat, 1]));
    /** @type {Record<string, number>} Remaining turns of each modified stat */
    this.statModTurns = {};
    /** @type {string|null} */
    this.status = null;
    /** Remaining turns; for badpoison the number of turns elapsed (damage n/16). */
    this.statusTurns = 0;
    /** Stacks of accuracy_down: the next move loses ACCURACY_DOWN_STEP accuracy per stack. */
    this.accuracyPenalty = 0;
    /** @type {string|null} Type of the last damaging move (cross_power). */
    this.lastCrossType = null;
    /** Terrain seed consumed: defense ×SEED_DEFENSE for the rest of the battle. */
    this.seedBoost = false;
    this.flinched = false;
    this.moveIndex = 0;
    /** @type {string|null} */
    this.lastMoveId = null;
    this.consecutiveUses = 0;
    /** @type {string|null} Temporary extra type (Soak, Forest's Curse…) */
    this.addedType = null;
    /** @type {string|null} Type replacing the own types (Camouflage, Conversion) */
    this.typeOverride = null;
    /** @type {number|null} One-shot damage multiplier (Mimic) */
    this.nextDamageMult = null;
    /** @type {Set<string>} Once-per-battle triggers already used (berries…) */
    this.usedTriggers = new Set();
    /** @type {Readonly<Object>[]|null} */
    this._talentEffects = null;
  }

  // --- Identity -------------------------------------------------------------------------------

  /** @returns {string} */
  get name() {
    return this.pokemon.getDisplayName();
  }

  /** @returns {number} */
  get hp() {
    return this.pokemon.hp;
  }

  /** @returns {number} */
  get maxHp() {
    return this.pokemon.getMaxHp();
  }

  /** @returns {number} */
  get level() {
    return this.pokemon.level;
  }

  /** @returns {string[]} Current types */
  getTypes() {
    return this.typeOverride ? [this.typeOverride] : [...this.pokemon.getTypes()];
  }

  /**
   * @param {string} stat - hp, atk, def, spa, spd, spe
   * @returns {number} Raw stat (no battle modifier)
   */
  getStat(stat) {
    return this.pokemon.getStats()[stat] || 1;
  }

  /** @returns {boolean} The species can still evolve (eviolite) */
  canEvolve() {
    return (this.pokemon.getSpecies()?.evolutions?.length ?? 0) > 0;
  }

  /** @returns {string[]} Active move ids (rotation order) */
  getMoves() {
    return MoveLearnset.activeMovesOf(this.pokemon);
  }

  /** @returns {string|null} Next move of the rotation (original pMoveIdx / eMoveIdx), advances it */
  nextMove() {
    const moves = this.getMoves();
    if (moves.length === 0) return null;
    const moveId = moves[this.moveIndex % moves.length];
    this.moveIndex = (this.moveIndex + 1) % moves.length;
    return moveId;
  }

  // --- Talents and held item --------------------------------------------------------------------

  /** @returns {string[]} Active talent ids */
  getTalentIds() {
    const species = this.pokemon.getSpecies();
    const ids = [this.pokemon.talent];
    if (this.hiddenTalentActive && species?.hiddenTalent && species.hiddenTalent !== this.pokemon.talent) ids.push(species.hiddenTalent);
    return ids.filter(Boolean);
  }

  /**
   * @param {string} kind - TalentEffectKinds value
   * @returns {Readonly<Object>[]} Effects of that kind of the active talents
   */
  talentEffects(kind) {
    if (!this._talentEffects) {
      const talents = TalentDB.getInstance();
      this._talentEffects = this.getTalentIds().flatMap((id) => talents.getById(id)?.effects ?? []);
    }
    return this._talentEffects.filter((effect) => effect.kind === kind);
  }

  /** @param {string} kind @returns {boolean} */
  hasTalentEffect(kind) {
    return this.talentEffects(kind).length > 0;
  }

  /** @returns {Readonly<Object>|null} ItemDB entry of the held item */
  getHeldItem() {
    return this.pokemon.heldItem ? ItemDB.getInstance().getById(this.pokemon.heldItem) : null;
  }

  /**
   * @param {string} kind - HeldEffectKinds value
   * @returns {Readonly<Object>|null} Effect of the held item when it has that kind
   */
  heldEffect(kind) {
    const effect = this.getHeldItem()?.effect;
    return effect && effect.kind === kind ? effect : null;
  }

  /** @returns {number} Power of the held item (HeldItemPower) */
  heldPower() {
    return heldItemPower(this.getHeldItem(), { npc: this.npc, ownedQuantity: this.heldQuantity });
  }

  // --- HP ---------------------------------------------------------------------------------------

  /** @param {number} amount @returns {number} HP actually lost */
  takeDamage(amount) {
    const before = this.pokemon.hp;
    this.pokemon.takeDamage(Math.max(0, Math.floor(amount)));
    return before - this.pokemon.hp;
  }

  /** @param {number} amount @returns {number} HP actually restored */
  heal(amount) {
    const before = this.pokemon.hp;
    this.pokemon.heal(Math.max(0, Math.floor(amount)));
    return this.pokemon.hp - before;
  }

  /** @returns {boolean} */
  isFainted() {
    return this.pokemon.isFainted();
  }

  /** Clears the volatile state (switch-in, end of battle). */
  resetVolatile() {
    for (const stat of MODIFIABLE_STATS) this.statMods[stat] = 1;
    this.statModTurns = {};
    this.flinched = false;
    this.consecutiveUses = 0;
    this.lastMoveId = null;
    this.accuracyPenalty = 0;
    this.lastCrossType = null;
    this.addedType = null;
    this.typeOverride = null;
    this.nextDamageMult = null;
  }
}
