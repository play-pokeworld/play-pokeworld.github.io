export function calculateBaseDamage({ level, power, attack, defense, stab, effectiveness, critical, random, item }) {
  return Math.max(1, Math.floor(((2 * level / 5 + 2) * power * attack / defense / 50 + 2) * stab * effectiveness * critical * random * item));
}
