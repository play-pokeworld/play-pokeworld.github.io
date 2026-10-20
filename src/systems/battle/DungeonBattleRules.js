/**
 * @file DungeonBattleRules.js
 * @brief Draws and scales wild encounters for a grid-dungeon tile.
 */
import { EncounterRarities } from '../../data/world/LocationKinds.js';
import { PokemonFactory } from '../../data/pokemon/PokemonFactory.js';
import { EncounterRules } from './EncounterRules.js';

const FINAL_BOSS_HP_MULTIPLIER = 4.5;
const FINAL_BOSS_STAT_MULTIPLIERS = Object.freeze({ atk: 1.5, def: 1.35 });
const MINI_BOSS_HP_MULTIPLIER = 2;
const ELITE_HP_MULTIPLIER = 1.25;
const RARE_ON_COMMON_TILE_CHANCE = 0.05;
const FLOOR_LEVEL_BONUS = 3;
const FLOOR_HP_BONUS = 0.15;

export class DungeonBattleRules {
  /**
   * @param {ReadonlyArray<Object>} encounters
   * @param {ReadonlyArray<import('../../data/pokemon/PokemonData.js').PokemonData>} team
   * @param {import('../../core/Random.js').Random} random
   * @param {{tileType:string,floor:number,depth:number}} context
   * @returns {{pokemon:import('../../data/pokemon/PokemonData.js').PokemonData, foeOptions:Object, introKey:string}|null}
   */
  static draw(encounters, team, random, { tileType, floor, depth }) {
    let pokemon;
    let hpMultiplier = 1;
    let statMultipliers = {};
    let introKey = 'battle_log.wild_appeared';
    const currentFloor = Math.max(1, Number(floor) || 1);
    const finalFloor = currentFloor >= Math.max(1, Number(depth) || 1);

    if (tileType === 'boss' && finalFloor) {
      pokemon = DungeonBattleRules._drawBoss(encounters, team, random);
      if (!pokemon) return null;
      pokemon.setLevel(Math.min(100, pokemon.level + 8 + Math.max(1, Number(depth) || 1) * 2));
      hpMultiplier = FINAL_BOSS_HP_MULTIPLIER;
      statMultipliers = FINAL_BOSS_STAT_MULTIPLIERS;
      introKey = 'dungeon_boss_appears';
    } else {
      let bucketHint = tileType === 'elite' ? 'uncommon' : tileType === 'boss' ? 'rare' : 'common';
      if (tileType === 'combat' && random.next() < RARE_ON_COMMON_TILE_CHANCE) bucketHint = 'rare';
      pokemon = EncounterRules.drawWild(encounters, team, random, { bucketHint });
      if (!pokemon) return null;
      const floorStep = currentFloor - 1;
      if (floorStep > 0) {
        pokemon.setLevel(Math.min(100, pokemon.level + floorStep * FLOOR_LEVEL_BONUS));
        hpMultiplier *= 1 + floorStep * FLOOR_HP_BONUS;
      }
      if (tileType === 'boss') {
        pokemon.setLevel(Math.min(100, pokemon.level + 3));
        hpMultiplier *= MINI_BOSS_HP_MULTIPLIER;
        introKey = 'dungeon_boss_appears';
      } else if (tileType === 'elite') {
        pokemon.setLevel(Math.min(100, pokemon.level + 2));
        hpMultiplier *= ELITE_HP_MULTIPLIER;
      }
    }

    pokemon.dungeonTileType = tileType;
    return {
      pokemon,
      foeOptions: { hpMultiplier, statMultipliers, dungeonBoss: tileType === 'boss' && finalFloor },
      introKey
    };
  }

  /** @private */
  static _drawBoss(encounters, team, random) {
    const preferred = [EncounterRarities.RARE, EncounterRarities.UNCOMMON, EncounterRarities.COMMON];
    const entry = preferred
      .map((rarity) => encounters.filter((candidate) => candidate.rarity === rarity))
      .find((candidates) => candidates.length > 0);
    const selected = random.pick(entry || encounters);
    if (!selected) return null;
    const level = random.int(selected.minLevel, selected.maxLevel);
    const shiny = random.next() < EncounterRules.shinyRate(team);
    return PokemonFactory.create(selected.species, level, { shiny, random });
  }
}
