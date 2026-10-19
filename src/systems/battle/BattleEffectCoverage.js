/**
 * @file BattleEffectCoverage.js
 * @brief Which effect kinds of the three data vocabularies the battle engine implements
 * (C++: constexpr tables). Every kind must be listed (tests/BattleEngine.test.js); docs/
 * BATTLE_EFFECTS.md explains each entry.
 *   PORTED    - implemented by the engine (rule file named in the value comment)
 *   DEFERRED  - battle effect of the original not implemented yet
 *   NO_BATTLE - no effect inside a battle (other systems, or none in the original either)
 */
import { MoveEffectKinds } from '../../data/battle/MoveEffectKinds.js';
import { TalentEffectKinds } from '../../data/battle/TalentEffectKinds.js';
import { HeldEffectKinds } from '../../data/items/HeldEffectKinds.js';

export const CoverageStates = Object.freeze({ PORTED: 'ported', DEFERRED: 'deferred', NO_BATTLE: 'no_battle' });

const { PORTED, DEFERRED, NO_BATTLE } = CoverageStates;

/** @type {Readonly<Record<string, string>>} */
export const MOVE_EFFECT_COVERAGE = Object.freeze({
  [MoveEffectKinds.STATUS]: PORTED,
  [MoveEffectKinds.STAT]: PORTED,
  [MoveEffectKinds.FLINCH]: PORTED,
  [MoveEffectKinds.ACCURACY_DOWN]: PORTED,
  [MoveEffectKinds.RECOIL]: PORTED,
  [MoveEffectKinds.RECOIL_MAX_HP]: PORTED,
  [MoveEffectKinds.DRAIN]: PORTED,
  [MoveEffectKinds.CONSECUTIVE_POWER]: PORTED,
  [MoveEffectKinds.CONDITIONAL_POWER]: PORTED,
  [MoveEffectKinds.EFFECTIVENESS_AGAINST]: PORTED,
  [MoveEffectKinds.RANDOM_POWER]: PORTED,
  [MoveEffectKinds.SWITCH_OUT]: PORTED,
  [MoveEffectKinds.WEATHER]: PORTED,
  [MoveEffectKinds.TERRAIN]: PORTED,
  [MoveEffectKinds.ADD_TYPE]: PORTED,
  [MoveEffectKinds.SELF_FAINT]: PORTED,
  [MoveEffectKinds.RANDOM_STATS]: PORTED,
  [MoveEffectKinds.CURE]: PORTED,
  [MoveEffectKinds.WEATHER_TYPE]: PORTED,
  [MoveEffectKinds.COPY_FIRST_MOVE_TYPE]: PORTED,
  [MoveEffectKinds.CALL_RANDOM_MOVE]: PORTED,
  [MoveEffectKinds.USE_FOE_FIRST_MOVE]: PORTED,
  [MoveEffectKinds.USE_OWN_FIRST_MOVE]: PORTED,
  [MoveEffectKinds.BATTLE_BONUS]: NO_BATTLE,
  [MoveEffectKinds.FIXED_POWER_HIT]: PORTED,
  [MoveEffectKinds.TRANSFORM]: DEFERRED,
  [MoveEffectKinds.IGNORE_TYPE_IMMUNITY]: PORTED,
  [MoveEffectKinds.IGNORE_STAT_MODS]: PORTED
});

/** @type {Readonly<Record<string, string>>} */
export const TALENT_EFFECT_COVERAGE = Object.freeze(Object.fromEntries(
  Object.values(TalentEffectKinds).map((kind) => [kind, kind === TalentEffectKinds.LOOT_WEIGHT ? DEFERRED : PORTED])
));

/** Held effects without battle effect or not implemented yet; every other kind is PORTED. */
const HELD_EXCEPTIONS = Object.freeze({
  [HeldEffectKinds.Z_CRYSTAL]: DEFERRED,
  [HeldEffectKinds.MEGA_STONE]: DEFERRED,
  [HeldEffectKinds.LOOT]: DEFERRED,
  [HeldEffectKinds.LOOT_BOOST]: DEFERRED,
  [HeldEffectKinds.ENCOUNTER]: DEFERRED,
  [HeldEffectKinds.FLAVOR]: NO_BATTLE,
  [HeldEffectKinds.BREEDING]: NO_BATTLE,
  [HeldEffectKinds.TRAINING]: NO_BATTLE
});

/** @type {Readonly<Record<string, string>>} */
export const HELD_EFFECT_COVERAGE = Object.freeze(Object.fromEntries(
  Object.values(HeldEffectKinds).map((kind) => [kind, HELD_EXCEPTIONS[kind] ?? PORTED])
));
