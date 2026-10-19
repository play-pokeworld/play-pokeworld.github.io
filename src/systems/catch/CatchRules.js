/**
 * @file CatchRules.js
 * @brief Catch roll and catch rewards (C++: class CatchRules, static), port of the original
 * attemptAutoCatch() / rollWeightedTalentForSpecies() / rollCaptureIv():
 *   - final encounter of a legendary (side) quest: rate × 2, capped at 100, never guaranteed;
 *     Pokémon given by a main quest: rate 100;
 *   - success when the rate is ≥ 100, on the very first catch of the save, or chance(rate);
 *   - the caught Pokémon gets a talent drawn from the species pool weighted by rarity
 *     (60 / 30 / 12) and has 10 % chance of +1 IV on a random stat below the cap.
 */
import { TalentDB } from '../../data/pokemon/TalentDB.js';
import { BattleRules } from '../../config/BattleRules.js';
import { QuestRules } from '../../config/QuestRules.js';
import { CaptureRules } from '../../config/CaptureRules.js';
import { PokemonRules } from '../../config/PokemonRules.js';
import { QuestCatchKinds } from '../../data/catch/QuestCatchKinds.js';

export class CatchRules {
  /**
   * @param {number} ballRate - BallRateRules.effectiveRate
   * @param {string} questKind - QuestCatchKinds value
   * @returns {number}
   */
  static finalRate(ballRate, questKind) {
    if (questKind === QuestCatchKinds.GIFT) return BattleRules.GUARANTEED_CATCH_RATE;
    if (questKind === QuestCatchKinds.LEGENDARY) {
      return Math.min(BattleRules.GUARANTEED_CATCH_RATE, ballRate * QuestRules.ENCOUNTER_CATCH_MULT);
    }
    return ballRate;
  }

  /**
   * @param {number} rate
   * @param {boolean} firstCatch - Nothing caught yet besides the starter
   * @param {import('../../core/Random.js').Random} random
   * @returns {boolean}
   */
  static roll(rate, firstCatch, random) {
    return rate >= BattleRules.GUARANTEED_CATCH_RATE || firstCatch || random.chance(rate);
  }

  /**
   * @param {import('../../data/pokemon/PokemonSpecies.js').PokemonSpecies} species
   * @param {import('../../core/Random.js').Random} random
   * @returns {string|null} Talent of the caught Pokémon, null when the pool is empty
   */
  static rollTalent(species, random) {
    const talents = TalentDB.getInstance();
    const weighted = [];
    for (const id of species.talents.filter((talent) => talents.has(talent))) {
      const rarity = talents.getById(id).rarity || 1;
      const weight = CaptureRules.TALENT_WEIGHT_BY_RARITY[rarity] ?? CaptureRules.TALENT_WEIGHT_OTHER;
      for (let i = 0; i < weight; i++) weighted.push(id);
    }
    return weighted.length > 0 ? weighted[random.int(0, weighted.length - 1)] : null;
  }

  /**
   * 10 % chance of +1 IV on a random stat below the cap.
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData} pokemon
   * @param {import('../../core/Random.js').Random} random
   * @returns {string|null} Stat that gained the IV
   */
  static rollIvBonus(pokemon, random) {
    if (!random.chance(CaptureRules.IV_CHANCE_PCT)) return null;
    const open = PokemonRules.STAT_KEYS.filter((stat) => pokemon.ivs[stat] < PokemonRules.IV_MAX);
    if (open.length === 0) return null;
    const stat = open[random.int(0, open.length - 1)];
    pokemon.addIv(stat);
    return stat;
  }
}
