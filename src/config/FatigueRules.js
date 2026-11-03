/**
 * @file FatigueRules.js
 * @brief Battle fatigue — "50 consecutive victories without rest" (PLAN_EQUILIBRAGE_GLOBAL §7).
 *
 * A wild battle in this game is one uninterrupted chain: `BattleSession`
 * keeps sending a new foe as long as the player wins, and the team is only
 * healed when the chain ends (`BattleSystem._end` → `healFull()`). Fatigue is
 * therefore a property of the CURRENT CHAIN, measured in victories won inside
 * it — never in knock-outs suffered. That distinction is the historical bug
 * fixed in v1.16.10: the old code read `session.playerKOs`, which counts the
 * PLAYER's own fainted Pokémon, is reset on every `BattleSession`
 * construction, and is therefore 0 in a clean fight — the threshold was
 * unreachable and `battle_log.fatigue_warning` never fired.
 *
 * The wear itself is HP loss dealt to the whole (non-fainted) team after each
 * victory past the threshold, so it matters inside the chain. Anything that
 * ends the chain (victory with no next foe, defeat, running away) heals the
 * team and resets the count, which is exactly what "rest" means here.
 */

/** Victories needed before the first wear. */
const THRESHOLD = 50;
/** Victories between two wear steps. */
const STEP_SIZE = 5;
/** Hard cap on the wear (10 % of max HP per victory). */
const MAX_STEPS = 10;
/** Wear per step, as a fraction of max HP. */
const WEAR_PER_STEP = 0.01;
/** The `stamina` talent halves the wear. */
const STAMINA_DIVISOR = 2;

export const FatigueRules = Object.freeze({
  THRESHOLD,
  STEP_SIZE,
  MAX_STEPS,
  WEAR_PER_STEP,
  STAMINA_DIVISOR,

  /**
   * Wear step for a number of consecutive victories.
   * @param {number} victories - Victories won in the current uninterrupted chain
   * @returns {number} 0 below the threshold, otherwise 1..MAX_STEPS
   */
  stepFor(victories) {
    const count = Math.max(0, Math.floor(Number(victories) || 0));
    if (count < THRESHOLD) return 0;
    return Math.min(MAX_STEPS, Math.floor((count - THRESHOLD) / STEP_SIZE) + 1);
  },

  /**
   * True on the single victory that crosses the threshold (the warning).
   * @param {number} victories
   * @returns {boolean}
   */
  isWarningPoint(victories) {
    return Math.floor(Number(victories) || 0) === THRESHOLD;
  },

  /**
   * HP lost by a team member for one wear step.
   * @param {number} maxHp
   * @param {number} step - Value returned by stepFor()
   * @param {{stamina?: boolean}} [options]
   * @returns {number} 0 when there is nothing to apply
   */
  wearFor(maxHp, step, options = {}) {
    const safeStep = Math.max(0, Math.floor(Number(step) || 0));
    const hp = Math.max(1, Math.floor(Number(maxHp) || 0));
    if (safeStep === 0) return 0;
    const divisor = options.stamina ? STAMINA_DIVISOR : 1;
    return Math.max(1, Math.round((hp * WEAR_PER_STEP * safeStep) / divisor));
  },

  /**
   * True when the member owns the `stamina` talent (visible or hidden).
   * @param {Object} member
   * @param {Object} save
   * @returns {boolean}
   */
  hasStamina(member, save) {
    if (!member) return false;
    if (member.talent === 'stamina') return true;
    const hidden = save?.talents;
    return typeof hidden?.hasHidden === 'function' ? hidden.hasHidden(member.species) : false;
  }
});
