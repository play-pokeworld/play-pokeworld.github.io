/**
 * @file TypeChart.js
 * @brief Type effectiveness table (C++: class TypeChart, static).
 * Same table as the original game (domain/battle/type-system.js, 18 types with Fairy).
 * Type ids are lowercase everywhere ('fire', 'water'…), like the localization keys `type.<id>`;
 * the raw Pokédex table still stores capitalized names, so every input is normalized.
 */

export const TYPE_IDS = Object.freeze([
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
]);

/** attacker type -> defender type -> multiplier (missing pairs are neutral, ×1). */
const CHART = Object.freeze({
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
});

/** Readable effectiveness tiers (C++: enum class EffectivenessTier). */
export const EffectivenessTiers = Object.freeze({
  IMMUNE: 'immune',
  QUARTER: 'quarter',
  HALF: 'half',
  NEUTRAL: 'neutral',
  DOUBLE: 'double',
  QUADRUPLE: 'quadruple'
});

export class TypeChart {
  /**
   * @param {string|null|undefined} type - Any casing ('Fire', 'fire')
   * @returns {string|null} Lowercase type id, or null when unknown / empty
   */
  static normalize(type) {
    if (!type) return null;
    const id = String(type).toLowerCase();
    return TYPE_IDS.includes(id) ? id : null;
  }

  /**
   * Damage multiplier of an attack type against a defender (one or two types).
   * @param {string} attackType
   * @param {string[]} defenderTypes
   * @returns {number} 0, 0.25, 0.5, 1, 2 or 4
   */
  static effectiveness(attackType, defenderTypes) {
    const attack = TypeChart.normalize(attackType);
    if (!attack) return 1;
    const defenders = [...new Set((defenderTypes || []).map((type) => TypeChart.normalize(type)).filter(Boolean))];
    return defenders.reduce((multiplier, defender) => multiplier * (CHART[attack][defender] ?? 1), 1);
  }

  /**
   * @param {number} multiplier
   * @returns {string} EffectivenessTiers value
   */
  static tierOf(multiplier) {
    if (multiplier === 0) return EffectivenessTiers.IMMUNE;
    if (multiplier >= 4) return EffectivenessTiers.QUADRUPLE;
    if (multiplier >= 2) return EffectivenessTiers.DOUBLE;
    if (multiplier <= 0.25) return EffectivenessTiers.QUARTER;
    if (multiplier < 1) return EffectivenessTiers.HALF;
    return EffectivenessTiers.NEUTRAL;
  }
}
