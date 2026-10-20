/**
 * @file RouteDropRules.js
 * @brief Pure rules for the original location-based wild-battle loot roll.
 */
import { BattleRules } from '../../config/BattleRules.js';
import { HeldEffectKinds } from '../../data/items/HeldEffectKinds.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { ROUTE_DROPS } from '../../data/world/RouteDrops.js';
import { TalentDB } from '../../data/pokemon/TalentDB.js';
import { TalentEffectKinds } from '../../data/battle/TalentEffectKinds.js';

export class RouteDropRules {
  /** @param {string} locationId @returns {ReadonlyArray<string>} */
  static poolFor(locationId) {
    return ROUTE_DROPS[locationId] ?? [];
  }

  /**
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData[]} team
   * @returns {number} Drop chance in percent, capped like the original game.
   */
  static chancePercent(team) {
    let chance = BattleRules.WILD_DROP_BASE_CHANCE_PCT;
    const items = ItemDB.getInstance();
    const talents = TalentDB.getInstance();
    for (const pokemon of team ?? []) {
      if (!pokemon || pokemon.isFainted()) continue;
      const talent = talents.getById(pokemon.talent);
      for (const effect of talent?.effects ?? []) {
        if (effect.kind === TalentEffectKinds.LOOT_WEIGHT) chance += Math.max(0, Number(effect.add) || 0);
      }
      const heldEffect = pokemon.heldItem ? items.getById(pokemon.heldItem)?.effect : null;
      if (heldEffect?.kind === HeldEffectKinds.LOOT || heldEffect?.kind === HeldEffectKinds.LOOT_BOOST) {
        chance += BattleRules.WILD_DROP_HELD_ITEM_BONUS_PCT;
      }
    }
    return Math.min(BattleRules.WILD_DROP_MAX_CHANCE_PCT, chance);
  }

  /**
   * @param {string} locationId
   * @param {import('../../core/Random.js').Random} random
   * @param {import('../../data/pokemon/PokemonData.js').PokemonData[]} team
   * @returns {string|null} Item id, or null when this victory produces no route item.
   */
  static draw(locationId, random, team) {
    const pool = RouteDropRules.poolFor(locationId);
    if (!pool.length || !random.chance(RouteDropRules.chancePercent(team))) return null;
    return random.pick(pool) ?? null;
  }
}
