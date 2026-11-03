/**
 * @file PokemonData.js
 * @brief Owned (or wild) Pokémon instance (C++: class PokemonData : public BaseModel).
 *
 * Persisted state only: identifiers (species slug, form, talent, held item, moves), level, total
 * experience, current HP, shiny flag, IV / EV spreads. Everything else is DERIVED from the data
 * repositories and never saved: display name, sprite, types, stats, max HP, experience bounds.
 *
 * Serialized shape (save schema 15):
 *   { uid, species, form, nickname, level, exp, hp, shiny, favorite, locked, talent, heldItem,
 *     moves[], unlockedMoves[], ivs{}, evs{}, evolvedTargets[] }
 */
import { BaseModel } from '../core/BaseModel.js';
import { AssetPaths } from '../../config/AssetPaths.js';
import { PokemonRules } from '../../config/PokemonRules.js';
import { PokemonDB } from './PokemonDB.js';
import { StatCalculator } from './StatCalculator.js';
import { ExperienceCurve } from './ExperienceCurve.js';
import { MoveLearnset } from './MoveLearnset.js';
import { Random } from '../../core/Random.js';
import { LocalizationManager, t, compose } from '../../localization/LocalizationManager.js';

/** Fallback species when a save entry is corrupted. */
const DEFAULT_SPECIES = 'pikachu';

export class PokemonData extends BaseModel {
  /**
   * @param {Object} [data={}] - Serialized PokemonData (use PokemonFactory to create new ones)
   */
  constructor(data = {}) {
    super(`Pokemon_${data?.species || DEFAULT_SPECIES}`, 'Data');
    /** @private @type {Readonly<Record<string, number>>|null} stats cache */
    this._stats = null;
    /** @type {boolean} Runtime-only flag: a rental Pokémon is labelled with a translation key. */
    this.rental = false;
    this.deserialize(data);
  }

  // --- Derived data -------------------------------------------------------------------------

  /** @returns {import('./PokemonSpecies.js').PokemonSpecies|null} */
  getSpecies() {
    return PokemonDB.getInstance().getById(this.species);
  }

  /** @returns {import('./PokemonSpecies.js').PokemonSpecies|import('./PokemonForm.js').PokemonForm|null} */
  getVariant() {
    return PokemonDB.getInstance().getVariant(this.species, this.form);
  }

  /** @returns {ReadonlyArray<string>} Lowercase type ids (of the form when there is one) */
  getTypes() {
    return this.getVariant()?.types || [];
  }

  /** @returns {string} Localization key of the species (or form) name */
  getNameKey() {
    const variant = this.getVariant();
    return variant ? variant.getNameKey() : `pokemon.${this.species}`;
  }

  /**
   * Nickname if any, otherwise the species name in the active language.
   * @returns {string}
   */
  getDisplayName() {
    const base = this.nickname || (LocalizationManager.getInstance().has(this.getNameKey()) ? t(this.getNameKey()) : this.species);
    // A rental Pokémon (Battle Atoll) is labelled by a translation key, never by stored text.
    return this.rental ? compose(t('atoll_rental'), ' ', base) : base;
  }

  /** @returns {string} */
  getSpritePath() {
    return AssetPaths.pokemonSprite(this.species, this.form, this.shiny);
  }

  /** @returns {Readonly<Record<string, number>>} Current stats (hp = max HP) */
  getStats() {
    if (!this._stats) {
      const variant = this.getVariant();
      this._stats = variant
        ? StatCalculator.all(variant.baseStats, this.level, { shiny: this.shiny, ivs: this.ivs, evs: this.evs })
        : Object.freeze(StatCalculator.zeroSpread());
    }
    return this._stats;
  }

  /** @returns {number} */
  getMaxHp() {
    return Math.max(1, this.getStats().hp);
  }

  /** @returns {number} HP ratio in percent (0..100) */
  getHpPercent() {
    return Math.max(0, Math.min(100, Math.round((this.hp / this.getMaxHp()) * 100)));
  }

  /** @returns {number} Experience earned since the current level started */
  getExpInLevel() {
    return Math.max(0, this.exp - ExperienceCurve.levelStart(this.level));
  }

  /** @returns {number} Experience the current level needs (0 at MAX_LEVEL) */
  getExpLevelSpan() {
    if (this.level >= PokemonRules.MAX_LEVEL) return 0;
    return ExperienceCurve.levelStart(this.level + 1) - ExperienceCurve.levelStart(this.level);
  }

  /** @returns {number} Experience ratio of the current level in percent (0..100) */
  getExpPercent() {
    const span = this.getExpLevelSpan();
    return span > 0 ? Math.max(0, Math.min(100, Math.round((this.getExpInLevel() / span) * 100))) : 100;
  }

  // --- Rules ----------------------------------------------------------------------------------

  /**
   * Adds experience and handles level ups like the original levelUp(): the HP gained by the
   * new max HP is added to the current HP, and new level-up moves fill the free slots.
   * @param {number} amount
   * @returns {number} Levels gained
   */
  addExp(amount) {
    if (this.level >= PokemonRules.MAX_LEVEL || !(amount > 0)) return 0;
    this.exp += Math.floor(amount);
    const before = this.level;
    const target = ExperienceCurve.levelFor(this.exp);
    if (target > before) this.setLevel(target);
    return this.level - before;
  }

  /**
   * Sets the level (experience moved to the start of that level when below it).
   * @param {number} level
   * @param {{resetExperience?:boolean}} [options] - Incubation restarts the parent at the new level baseline.
   */
  setLevel(level, { resetExperience = false } = {}) {
    const oldMax = this.getMaxHp();
    this.level = Math.max(PokemonRules.MIN_LEVEL, Math.min(PokemonRules.MAX_LEVEL, Math.floor(level)));
    this.exp = resetExperience ? ExperienceCurve.levelStart(this.level) : Math.max(this.exp, ExperienceCurve.levelStart(this.level));
    this._invalidateStats();
    const newMax = this.getMaxHp();
    this.hp = Math.max(0, Math.min(newMax, this.hp + (newMax - oldMax)));
    this._learnLevelUpMoves();
  }

  /**
   * +1 IV on one stat (catch bonus), up to PokemonRules.IV_MAX. HP keeps its missing amount.
   * @param {string} stat - PokemonRules.STAT_KEYS value
   * @returns {boolean} False when that IV is already at the cap
   */
  addIv(stat) {
    if (!PokemonRules.STAT_KEYS.includes(stat) || this.ivs[stat] >= PokemonRules.IV_MAX) return false;
    this._changeStats(() => { this.ivs[stat]++; });
    return true;
  }

  /**
   * Adds EVs without exceeding the per-stat or aggregate game caps.
   * @param {string} stat - PokemonRules.STAT_KEYS value
   * @param {number} [amount=1]
   * @returns {number} EVs added
   */
  addEv(stat, amount = 1) {
    if (!PokemonRules.STAT_KEYS.includes(stat)) return 0;
    const requested = Math.max(0, Math.floor(Number(amount) || 0));
    const total = PokemonRules.STAT_KEYS.reduce((sum, key) => sum + this.evs[key], 0);
    const added = Math.min(requested, PokemonRules.EV_MAX - this.evs[stat], PokemonRules.EV_TOTAL_MAX - total);
    if (added <= 0) return 0;
    this._changeStats(() => { this.evs[stat] += added; });
    return added;
  }

  /**
   * Level-based evolution targets this Pokémon can still produce.
   *
   * The game never transforms a Pokémon: an evolution ADDS a new Pokémon of the evolved species
   * at level 1 to the collection, and the source keeps its species and level (reference behaviour).
   * Each target is produced once per Pokémon, hence `evolvedTargets`.
   *
   * Split evolutions (Wurmple, Nincada) list several targets at the same level and all of them are
   * produced; conditional ones (Tyrogue) select exactly one target from the IV comparison.
   * @returns {string[]} Species ids ready to be produced, empty when nothing is due
   */
  getPendingLevelEvolutions() {
    const source = this.getSpecies();
    if (!source?.evolutions?.length) return [];
    const due = source.evolutions.filter((entry) =>
      !entry.item && Number.isFinite(entry.level) && this.level >= entry.level);
    if (!due.length) return [];
    const conditional = due.filter((entry) => entry.condition);
    const selected = conditional.length ? [this._selectConditionalEvolution(conditional)] : due;
    return selected
      .filter(Boolean)
      .map((entry) => entry.to)
      .filter((target) => !this.hasEvolvedInto(target));
  }

  /**
   * Picks the evolution matching a condition (`attack_above_defense`, `defense_above_attack`,
   * `attack_equals_defense`), the same rule as the reference: Tyrogue reads its own IVs.
   * @private
   * @param {ReadonlyArray<Object>} entries
   * @returns {Object|null}
   */
  _selectConditionalEvolution(entries) {
    const attack = Number(this.ivs?.atk) || 0;
    const defense = Number(this.ivs?.def) || 0;
    const wanted = attack > defense
      ? 'attack_above_defense'
      : defense > attack
        ? 'defense_above_attack'
        : 'attack_equals_defense';
    return entries.find((entry) => entry.condition === wanted) || entries[0] || null;
  }

  /** @param {string} targetSpecies @returns {boolean} True when this Pokémon already produced it */
  hasEvolvedInto(targetSpecies) {
    return this.evolvedTargets.includes(targetSpecies);
  }

  /**
   * Records that this Pokémon produced `targetSpecies` (idempotent). The caller creates the new
   * Pokémon; this only prevents a second production.
   * @param {string} targetSpecies
   * @returns {boolean} True when the record was added
   */
  markEvolvedInto(targetSpecies) {
    if (!targetSpecies || this.evolvedTargets.includes(targetSpecies)) return false;
    this.evolvedTargets.push(targetSpecies);
    return true;
  }

  /** @param {string} moveId @returns {boolean} */
  unlockMove(moveId) {
    if (typeof moveId !== 'string' || !moveId || this.unlockedMoves.includes(moveId)) return false;
    this.unlockedMoves.push(moveId);
    return true;
  }

  /**
   * @param {boolean} shiny - Shiny Pokémon have boosted stats (PokemonRules.SHINY_STAT_MULT)
   */
  setShiny(shiny) {
    this._changeStats(() => { this.shiny = !!shiny; });
  }

  /** @param {number} damage */
  takeDamage(damage) {
    this.hp = Math.max(0, this.hp - Math.max(0, damage));
  }

  /** @param {number} amount */
  heal(amount) {
    this.hp = Math.min(this.getMaxHp(), this.hp + Math.max(0, amount));
  }

  /** @returns {boolean} */
  isFainted() {
    return this.hp <= 0;
  }

  /** Fully heals the Pokémon. */
  healFull() {
    this.hp = this.getMaxHp();
  }

  /**
   * Fills the free move slots with the level-up moves known at the current level.
   * @private
   */
  _learnLevelUpMoves() {
    const expected = MoveLearnset.movesForLevel(this.getTypes(), this.level);
    for (const moveId of expected) {
      if (this.moves.length >= expected.length) break;
      if (!this.moves.includes(moveId)) this.moves.push(moveId);
    }
  }

  /** @private */
  _invalidateStats() {
    this._stats = null;
  }

  /**
   * Applies a change of the stat inputs; the HP keep their missing amount.
   * @private
   * @param {Function} change
   */
  _changeStats(change) {
    const oldMax = this.getMaxHp();
    change();
    this._invalidateStats();
    const newMax = this.getMaxHp();
    this.hp = Math.max(0, Math.min(newMax, this.hp + (newMax - oldMax)));
  }

  // --- Persistence ----------------------------------------------------------------------------

  /**
   * @override
   * @returns {Object}
   */
  serialize() {
    return {
      uid: this.uid,
      species: this.species,
      form: this.form,
      nickname: this.nickname,
      level: this.level,
      exp: this.exp,
      hp: this.hp,
      shiny: this.shiny,
      favorite: this.favorite,
      locked: this.locked,
      talent: this.talent,
      heldItem: this.heldItem,
      moves: [...this.moves],
      unlockedMoves: [...this.unlockedMoves],
      ivs: { ...this.ivs },
      evs: { ...this.evs },
      evolvedTargets: [...this.evolvedTargets]
    };
  }

  /**
   * Reads the current shape only: older shapes are converted by data/save/migrations/.
   * @override
   * @param {Object} data
   */
  deserialize(data = {}) {
    const raw = data || {};
    const db = PokemonDB.getInstance();
    const species = String(raw.species || '').toLowerCase();
    this.species = db.has(species) ? species : DEFAULT_SPECIES;
    this.form = raw.form && db.getById(this.species)?.getForm(raw.form) ? raw.form : '';
    this.uid = raw.uid || PokemonData.generateUid();
    this.nickname = raw.nickname || '';
    this.level = Math.max(PokemonRules.MIN_LEVEL, Math.min(PokemonRules.MAX_LEVEL, Math.floor(Number(raw.level) || 5)));
    this.exp = Math.max(Number(raw.exp) || 0, ExperienceCurve.levelStart(this.level));
    this.shiny = raw.shiny === true;
    this.favorite = raw.favorite === true;
    this.locked = raw.locked === true;
    this.talent = raw.talent || null;
    this.heldItem = raw.heldItem || null;
    this.moves = Array.isArray(raw.moves) ? raw.moves.filter((id) => typeof id === 'string') : [];
    const unlockedMoves = Array.isArray(raw.unlockedMoves)
      ? raw.unlockedMoves
      : Array.isArray(raw.trainingUnlockedMoves)
        ? raw.trainingUnlockedMoves
        : [];
    this.unlockedMoves = [...new Set(unlockedMoves.filter((id) => typeof id === 'string' && id.length > 0))];
    this.evolvedTargets = Array.isArray(raw.evolvedTargets)
      ? [...new Set(raw.evolvedTargets.filter((id) => typeof id === 'string' && id.length > 0))]
      : [];
    this.ivs = StatCalculator.clampSpread(raw.ivs, PokemonRules.IV_MAX);
    this.evs = StatCalculator.clampSpread(raw.evs, PokemonRules.EV_MAX, PokemonRules.EV_TOTAL_MAX);
    this._invalidateStats();
    this.hp = Math.max(0, Math.min(this.getMaxHp(), Number.isFinite(raw.hp) ? raw.hp : this.getMaxHp()));
  }

  /**
   * Unique id of an owned Pokémon (original 'p_xxxxxxxxx_xxxxx' format).
   * @param {Random} [random=Random.default]
   * @returns {string}
   */
  static generateUid(random = Random.default) {
    const chunk = (length) => Math.floor(random.next() * Math.pow(36, length)).toString(36).padStart(length, '0');
    return `p_${chunk(9)}_${chunk(5)}`;
  }
}
