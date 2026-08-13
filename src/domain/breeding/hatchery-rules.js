/**
 * PokeWorld Domain — Breeding & Hatchery Rules
 *
 * Pure business rules for the hatchery (incubation + daycare). Zero DOM access.
 * The `breeding:hatch` ECS system (src/application/ecs-gameplay-systems.js)
 * consumes these rules; every historical K.O.-count behavior is reproduced with
 * strict parity (design decision documented in MIGRATION_STATUS.md: the game
 * keeps K.O.-count progression, modelled as ECS component data — it is NOT
 * converted to the step counter of the mainline games).
 *
 * @module domain/breeding/hatchery-rules
 */

/** Daycare: one level every N K.O.s (user design decision, phase 30). */
export const DAYCARE_KOS_PER_LEVEL = 10;

/** Incubation requirements clamp window (legacy: 25–100 K.O. per egg/fossil). */
export const MIN_REQUIRED_KOS = 25;
export const MAX_REQUIRED_KOS = 100;

/**
 * Required K.O. count to hatch an egg fossil / revive, by species BST band.
 * Strict parity with the historical `hatcheryStepsForPokemon`:
 *   BST ≤250 → 25, ≤330 → 35, ≤420 → 50, ≤520 → 70, ≤600 → 85, else 100
 * then scaled by (1 - staffBonus) and clamped to [25, 100].
 *
 * @param {Object} opts
 * @param {number} opts.bst - Species base stat total
 * @param {boolean} [opts.isLegendary=false] - Legendaries always need 100 K.O.s
 * @param {number} [opts.staffBonus=0] - Hatchery speed staff bonus (0..1)
 * @returns {number} Required K.O. count, integer in [25, 100]
 */
export function computeRequiredHatchKos({ bst = 0, isLegendary = false, staffBonus = 0 } = {}) {
  let base = MAX_REQUIRED_KOS;
  if (!isLegendary) {
    const total = Number(bst) || 0;
    if (total <= 250) base = 25;
    else if (total <= 330) base = 35;
    else if (total <= 420) base = 50;
    else if (total <= 520) base = 70;
    else if (total <= 600) base = 85;
  }
  const scaled = Math.ceil(base * (1 - Math.max(0, Number(staffBonus) || 0)));
  return Math.max(MIN_REQUIRED_KOS, Math.min(MAX_REQUIRED_KOS, scaled));
}

/**
 * Advance one incubation slot by `koCount` K.O.s.
 * @param {{stepsKo:number, requiredKos:number}} slot - Current component data
 * @param {number} koCount - K.O.s to credit (>=1)
 * @param {{autoHatch?:boolean}} [opts]
 * @returns {{stepsKo:number, hatchReady:boolean}} New component data;
 *          `hatchReady` is only true when automation auto-hatch is enabled and
 *          the counter reaches the requirement (parity with the legacy gate).
 */
export function applyIncubationKills(slot, koCount, opts = {}) {
  const stepsKo = (Number(slot.stepsKo) || 0) + Math.max(1, Math.floor(Number(koCount) || 1));
  const requiredKos = Number(slot.requiredKos) || 10;
  return { stepsKo, hatchReady: !!opts.autoHatch && stepsKo >= requiredKos };
}

/**
 * Advance one daycare ('exp' mode) slot by `koCount` K.O.s.
 * Pure arithmetic: 10 K.O. = 1 level, capped at level 100, leftover K.O.s are
 * kept in the slot counter. The caller (ECS system) owns money/fees/eviction —
 * those are economy/boundary concerns modelled on the Wallet component.
 *
 * @param {{stepsKo:number, level:number}} slot - Current component data
 * @param {number} koCount - K.O.s to credit
 * @param {{kosPerLevel?:number, maxLevel?:number}} [opts]
 * @returns {{stepsKo:number, level:number, levelsGained:number}}
 */
export function applyDaycareKills(slot, koCount, opts = {}) {
  const kosPerLevel = Math.max(1, Math.floor(Number(opts.kosPerLevel) || DAYCARE_KOS_PER_LEVEL));
  const maxLevel = Math.max(1, Math.floor(Number(opts.maxLevel) || 100));
  let stepsKo = (Number(slot.stepsKo) || 0) + Math.max(1, Math.floor(Number(koCount) || 1));
  let level = Math.max(1, Math.floor(Number(slot.level) || 1));
  let levelsGained = 0;
  while (stepsKo >= kosPerLevel && level < maxLevel) {
    stepsKo -= kosPerLevel;
    level += 1;
    levelsGained += 1;
  }
  return { stepsKo, level, levelsGained };
}

/**
 * Daycare fee for a batch of gained levels.
 * @param {number} levelsGained
 * @param {number} feePerLevel
 * @returns {number}
 */
export function computeDaycareFee(levelsGained, feePerLevel) {
  return Math.max(0, Math.floor(Number(levelsGained) || 0)) * Math.max(0, Number(feePerLevel) || 0);
}

/**
 * Calculate the total egg steps required to hatch a species based on base steps.
 * @param {number} baseEggSteps - Species base egg cycle steps
 * @param {number} [speedMultiplier=1] - Hatchery speed boost multiplier
 * @returns {number}
 */
export function calculateRequiredEggSteps(baseEggSteps, speedMultiplier = 1) {
  const steps = Math.max(1, Number(baseEggSteps) || 2560);
  const mult = Math.max(0.1, Number(speedMultiplier) || 1);
  return Math.round(steps / mult);
}

/**
 * Determine if an egg is ready to hatch given current steps.
 * @param {number} currentSteps
 * @param {number} requiredSteps
 * @returns {boolean}
 */
export function isEggReadyToHatch(currentSteps, requiredSteps) {
  return (Number(currentSteps) || 0) >= (Number(requiredSteps) || 1);
}

/**
 * Calculate Shiny probability roll for a hatched Pokemon.
 * Masuda method or Shiny Charm boosts can be supplied as multipliers.
 * @param {number} [baseOdds=4096] - Base odds denominator (1 in X)
 * @param {number} [charmMultiplier=1] - Shiny charm boost
 * @returns {boolean}
 */
export function rollHatchShiny(baseOdds = 4096, charmMultiplier = 1) {
  const effectiveOdds = Math.max(1, Math.round(baseOdds / Math.max(0.1, charmMultiplier)));
  return Math.random() * effectiveOdds < 1;
}

/**
 * Calculate XP granted to a Pokemon after breeding completion.
 * @param {number} level - Current Pokemon level
 * @param {number} baseExp - Species base Exp yield
 * @returns {number}
 */
export function calculateBreedingExpReward(level, baseExp) {
  const lvl = Math.max(1, Number(level) || 1);
  const bexp = Math.max(10, Number(baseExp) || 50);
  return Math.round((lvl * bexp) / 5);
}

