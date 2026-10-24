/**
 * @file PokemonActionRules.js
 * @brief Pure decision table: may an action be performed on a Pokémon with these usages?
 * (C++ equivalent: class PokemonActionRules, static). DOM-free and save-free.
 */
import {
  POKEMON_ACTION_RULES,
  POKEMON_USAGE_ORDER,
  PokemonActionLockKinds,
  PokemonUsageIds
} from '../../config/PokemonUsageRules.js';

export class PokemonActionRules {
  /**
   * @param {string} action - PokemonActionIds value
   * @param {ReadonlyArray<string>} usages - Current PokemonUsageIds of the Pokémon
   * @param {{trainingBattle?:boolean}} [context] - Read from the same persisted training assignment.
   * @returns {{kind:string, usage:string}|null} The first lock (most specific usage first), or null
   */
  static lockFor(action, usages, { trainingBattle = false } = {}) {
    const rule = POKEMON_ACTION_RULES[action];
    if (!rule) return null;
    const current = new Set(Array.isArray(usages) ? usages : []);
    const blocking = POKEMON_USAGE_ORDER.find((usage) => current.has(usage) && rule.lockedBy.includes(usage));
    if (blocking) return Object.freeze({ kind: PokemonActionLockKinds.LOCKED_BY, usage: blocking });
    if (trainingBattle && rule.lockedDuringTrainingBattle && current.has(PokemonUsageIds.TRAINING)) {
      return Object.freeze({ kind: PokemonActionLockKinds.LOCKED_BY, usage: PokemonUsageIds.TRAINING });
    }
    if (rule.requires && !current.has(rule.requires)) {
      return Object.freeze({ kind: PokemonActionLockKinds.REQUIRES, usage: rule.requires });
    }
    return null;
  }

  /**
   * @param {string} action
   * @param {ReadonlyArray<string>} usages
   * @returns {boolean}
   */
  static isAllowed(action, usages) {
    return PokemonActionRules.lockFor(action, usages) === null;
  }
}
