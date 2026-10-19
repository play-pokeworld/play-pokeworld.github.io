/**
 * @file PokemonFactory.js
 * @brief Creates new Pokémon instances (C++: class PokemonFactory, static).
 * Port of the original createPoke(): zero IVs / EVs, experience at the start of the level,
 * full HP, level-up moves of the species, and a talent drawn from the species pool with the
 * 60 / 30 / 10 rarity roll (the hidden talent is never drawn).
 */
import { PokemonDB } from './PokemonDB.js';
import { TalentDB } from './TalentDB.js';
import { PokemonData } from './PokemonData.js';
import { MoveLearnset } from './MoveLearnset.js';
import { ExperienceCurve } from './ExperienceCurve.js';
import { StatCalculator } from './StatCalculator.js';
import { PokemonRules } from '../../config/PokemonRules.js';
import { Random } from '../../core/Random.js';

export class PokemonFactory {
  /**
   * @param {string} speciesId - PokemonDB id
   * @param {number} level
   * @param {Object} [options]
   * @param {string} [options.form='']   - Form suffix
   * @param {boolean} [options.shiny=false]
   * @param {string} [options.nickname='']
   * @param {Random} [options.random=Random.default]
   * @returns {PokemonData|null} null for an unknown species
   */
  static create(speciesId, level, { form = '', shiny = false, nickname = '', random = Random.default } = {}) {
    const species = PokemonDB.getInstance().getById(speciesId);
    if (!species) return null;
    const variant = (form && species.getForm(form)) || species;
    const clampedLevel = Math.max(PokemonRules.MIN_LEVEL, Math.min(PokemonRules.MAX_LEVEL, Math.floor(level)));
    const stats = StatCalculator.all(variant.baseStats, clampedLevel, { shiny });
    return new PokemonData({
      uid: PokemonData.generateUid(random),
      species: species.id,
      form: variant === species ? '' : form,
      nickname,
      level: clampedLevel,
      exp: ExperienceCurve.levelStart(clampedLevel),
      hp: stats.hp,
      shiny,
      talent: PokemonFactory.rollTalent(species, random),
      heldItem: null,
      moves: [...MoveLearnset.movesForLevel(variant.types, clampedLevel)],
      ivs: StatCalculator.zeroSpread(),
      evs: StatCalculator.zeroSpread()
    });
  }

  /**
   * Original talent roll: 60% common, 30% rare, 10% very rare; when the species has no talent
   * of the rolled rarity, the first talent of its pool.
   * @param {import('./PokemonSpecies.js').PokemonSpecies} species
   * @param {Random} [random=Random.default]
   * @returns {string}
   */
  static rollTalent(species, random = Random.default) {
    const talents = TalentDB.getInstance();
    const available = species.talents.filter((id) => talents.has(id) && id !== species.hiddenTalent);
    // PokemonDB.validate() guarantees a non-empty talent pool (the original fell back to 'sturdy').
    if (available.length === 0) return species.talents[0];
    const roll = random.int(0, 99);
    let threshold = 0;
    let rarity = 3;
    for (const [tier, percent] of Object.entries(PokemonRules.TALENT_ROLL)) {
      threshold += percent;
      if (roll < threshold) { rarity = Number(tier); break; }
    }
    const matching = available.filter((id) => talents.getById(id).rarity === rarity);
    return matching.length > 0 ? random.pick(matching) : available[0];
  }
}
