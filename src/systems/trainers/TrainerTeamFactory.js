/**
 * @file TrainerTeamFactory.js
 * @brief Builds the Pokémon of a trainer team from its member data (original createTrainerBattleTeam):
 * the species / level base from PokemonFactory, then the scripted moves, talent, held item and
 * IV / EV spreads (clamped by PokemonData). Unknown moves / talents / items are ignored.
 */
import { PokemonFactory } from '../../data/pokemon/PokemonFactory.js';
import { PokemonData } from '../../data/pokemon/PokemonData.js';
import { MoveDB } from '../../data/battle/MoveDB.js';
import { TalentDB } from '../../data/pokemon/TalentDB.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { Random } from '../../core/Random.js';

export class TrainerTeamFactory {
  /**
   * @param {Readonly<Object>[]} members - TrainerDB members
   * @param {Random} [random=Random.default]
   * @returns {PokemonData[]}
   */
  static build(members, random = Random.default) {
    return members.map((member) => TrainerTeamFactory.buildMember(member, random)).filter(Boolean);
  }

  /**
   * @param {Readonly<Object>} member
   * @param {Random} [random=Random.default]
   * @returns {PokemonData|null}
   */
  static buildMember(member, random = Random.default) {
    const base = PokemonFactory.create(member.species, member.level, { random });
    if (!base) return null;
    const data = base.serialize();
    const moves = member.moves.filter((id) => MoveDB.getInstance().has(id));
    return new PokemonData({
      ...data,
      moves: moves.length ? moves : data.moves,
      talent: member.talent && TalentDB.getInstance().has(member.talent) ? member.talent : data.talent,
      heldItem: member.item && ItemDB.getInstance().has(member.item) ? member.item : null,
      ivs: { ...data.ivs, ...member.ivs },
      evs: { ...data.evs, ...member.evs },
      hp: undefined
    });
  }
}
