/**
 * @file TrainingProgression.js
 * @brief Mode gates, eligibility and rewards. Pure domain rules; no DOM or persistence writes.
 */
import { TrainingRules } from '../../config/TrainingRules.js';
import { PokemonRules } from '../../config/PokemonRules.js';
import { MoveConfig } from '../../config/MoveConfig.js';
import { MoveLearnset } from '../../data/pokemon/MoveLearnset.js';
import { TalentDB } from '../../data/pokemon/TalentDB.js';
import { LeagueDB } from '../../data/trainers/LeagueDB.js';

export class TrainingProgression {
  /** @param {Object} save @param {string} mode @returns {boolean} */
  static isModeUnlocked(save, mode) {
    if (!save || !TrainingRules.MODES.includes(mode)) return false;
    const badge = TrainingRules.MODE_BADGES[mode];
    if (badge) return save.player.hasBadge(badge);
    if (TrainingRules.LEAGUE_GATED_MODES.includes(mode)) return LeagueDB.getInstance().getAll().some((league) =>
      TrainingRules.LEAGUE_REGION_IDS.includes(league.region) && save.player.hasBadge(league.badge));
    return true;
  }
  /** @param {Object} pokemon @returns {string[]} */
  static availableMoves(pokemon) {
    const known = new Set([...pokemon.moves, ...pokemon.unlockedMoves]);
    return MoveLearnset.trainingPoolFor(pokemon.getTypes()).filter((id) => !known.has(id));
  }
  /** @param {Object} save @param {Object} pokemon @param {string} mode @returns {boolean} */
  static eligible(save, pokemon, mode) {
    if (!pokemon || !this.isModeUnlocked(save, mode)) return false;
    if (mode === 'move') return this.availableMoves(pokemon).length > 0;
    if (mode === 'level') return pokemon.level < PokemonRules.MAX_LEVEL;
    if (mode === 'ev') return PokemonRules.STAT_KEYS.reduce((sum, stat) => sum + pokemon.evs[stat], 0) < PokemonRules.EV_TOTAL_MAX;
    const species = pokemon.getSpecies();
    if (mode === 'talent') return species.talents.some((id) => id !== species.hiddenTalent && !save.talents.has(species.id, id));
    return mode === 'hidden' && !!species.hiddenTalent && !save.talents.hasHidden(species.id);
  }
  /** @param {Object} save @param {Object|null} pokemon @returns {Object[]} */
  static modes(save, pokemon) {
    return TrainingRules.MODES.map((id) => ({ id, unlocked: this.isModeUnlocked(save, id),
      eligible: this.eligible(save, pokemon, id), requiredBadge: TrainingRules.MODE_BADGES[id] || null,
      leagueRequired: TrainingRules.LEAGUE_GATED_MODES.includes(id) }));
  }
  /** @param {Object} save @param {Object} pokemon @param {string} mode @param {Object} random @returns {Object} */
  static reward(save, pokemon, mode, random) {
    const reward = { move: null, talent: null, stat: null, levels: 0, evs: 0 };
    if (mode === 'move') {
      reward.move = random.pick(this.availableMoves(pokemon)) || null;
      if (reward.move) {
        pokemon.unlockMove(reward.move);
        if (pokemon.moves.length < MoveConfig.ACTIVE_SLOTS) pokemon.moves.push(reward.move);
      }
    } else if (mode === 'level') {
      const target = Math.min(PokemonRules.MAX_LEVEL, pokemon.level + random.int(TrainingRules.LEVEL_GAIN_MIN, TrainingRules.LEVEL_GAIN_MAX));
      reward.levels = target - pokemon.level;
      pokemon.setLevel(target);
    } else if (mode === 'ev') {
      reward.stat = random.pick(PokemonRules.STAT_KEYS.filter((stat) => pokemon.evs[stat] < PokemonRules.EV_MAX)) || null;
      if (reward.stat && pokemon.addEv(reward.stat, TrainingRules.EV_GAIN)) reward.evs = TrainingRules.EV_GAIN;
    } else if (mode === 'talent') {
      const species = pokemon.getSpecies();
      const talents = species.talents.filter((id) => id !== species.hiddenTalent);
      const weighted = talents.flatMap((id) => Array(TrainingRules.TALENT_RARITY_WEIGHTS[TalentDB.getInstance().getById(id)?.rarity] || 1).fill(id));
      reward.talent = random.pick(weighted) || null;
      if (reward.talent) { reward.talentNew = save.talents.unlock(species.id, reward.talent); pokemon.talent = reward.talent; }
    } else if (mode === 'hidden') {
      reward.talent = pokemon.getSpecies().hiddenTalent;
      if (reward.talent) reward.talentNew = save.talents.unlock(pokemon.species, reward.talent);
    }
    return reward;
  }
}
