/**
 * @file PokemonActionRules.js
 * @brief Pure decision table: may an action be performed on a Pokémon with these usages?
 * (C++ equivalent: class PokemonActionRules, static). DOM-free and save-free.
 */
import {
  POKEMON_ACTION_RULES,
  POKEMON_USAGE_ORDER,
  PokemonActionLockKinds
} from '../../config/PokemonUsageRules.js';

export class PokemonActionRules {
  /**
   * @param {string} action - PokemonActionIds value
   * @param {ReadonlyArray<string>} usages - Current PokemonUsageIds of the Pokémon
   * @returns {{kind:string, usage:string}|null} The first lock (most specific usage first), or null
   */
  static lockFor(action, usages) {
    const rule = POKEMON_ACTION_RULES[action];
    if (!rule) return null;
    const current = new Set(Array.isArray(usages) ? usages : []);
    const blocking = POKEMON_USAGE_ORDER.find((usage) => current.has(usage) && rule.lockedBy.includes(usage));
    if (blocking) return Object.freeze({ kind: PokemonActionLockKinds.LOCKED_BY, usage: blocking });
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
