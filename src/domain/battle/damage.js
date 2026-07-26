import { typeEffect } from './type-system.js';

export function calculateBaseDamage({ level = 1, power = 40, attack = 10, defense = 10, modifier = 1 } = {}) {
  const safeDefense = Math.max(1, Number(defense) || 1);
  const raw = (((2 * Number(level || 1) / 5 + 2) * Number(power || 0) * (Number(attack || 1) / safeDefense)) / 50 + 2) * Number(modifier || 1);
  return Math.max(1, Math.floor(raw));
}

export function calculateDamage(move, attacker, defender) {
  const power = Number(move?.power || 40);
  const modifier = typeEffect(move?.type, defender?.type1 || defender?.type, defender?.type2 || null);
  return calculateBaseDamage({
    level: attacker?.level || 1,
    power,
    attack: attacker?.atk || attacker?.attack || 10,
    defense: defender?.def || defender?.defense || 10,
    modifier,
  });
}
