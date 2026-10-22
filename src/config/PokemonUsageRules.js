/**
 * @file PokemonUsageRules.js
 * @brief Where an owned Pokémon can currently be used, and which actions each usage locks
 * (C++ equivalent: namespace PokemonUsageRules { constexpr ... }).
 *
 * Every owned Pokémon lives in the save collection and is always shown by the PC box. A usage
 * only says which game mode is using it right now; it never moves or copies the Pokémon. A
 * future mode adds its id here and, when it needs to, a lock in POKEMON_ACTION_RULES.
 */

/** Usage ids (stable, language neutral: labels are `pokemon_usage_<id>`). */
export const PokemonUsageIds = Object.freeze({
  TEAM: 'team',
  DAYCARE: 'daycare',
  TRAINING: 'training'
});

/**
 * Usages read from the save (party, daycare slots). The others are session claims registered
 * through PokemonUsageSystem.claim() by the mode that runs them.
 */
export const PERSISTED_POKEMON_USAGES = Object.freeze([PokemonUsageIds.TEAM, PokemonUsageIds.DAYCARE]);

/** Reporting order, most specific first: the first usage is the one shown in the info sheet. */
export const POKEMON_USAGE_ORDER = Object.freeze([
  PokemonUsageIds.TRAINING,
  PokemonUsageIds.DAYCARE,
  PokemonUsageIds.TEAM
]);

/** Actions on one owned Pokémon whose availability depends on its usages. */
export const PokemonActionIds = Object.freeze({
  /** Equip a learnable move (info sheet, move-learning modal). */
  LEARN_MOVE: 'learnMove',
  /** Give or take a held item (held items only act in the party). */
  CHANGE_HELD_ITEM: 'changeHeldItem',
  /** Use a bag item on the Pokémon (CT/CS, Rare Candy, vitamins, evolution items). */
  USE_ITEM: 'useItem',
  /** Join the active party from the PC (withdraw or replacement selection). */
  JOIN_TEAM: 'joinTeam',
  /** Be left at the daycare. */
  DEPOSIT_DAYCARE: 'depositDaycare',
  /** Start a training-centre session. */
  TRAIN: 'train'
});

/**
 * `lockedBy`: usages that forbid the action. `requires`: a usage the Pokémon must have.
 * Actions absent from this table (favorite / collection lock flags) are always allowed.
 */
export const POKEMON_ACTION_RULES = Object.freeze({
  [PokemonActionIds.LEARN_MOVE]: Object.freeze({
    lockedBy: Object.freeze([PokemonUsageIds.DAYCARE, PokemonUsageIds.TRAINING])
  }),
  [PokemonActionIds.CHANGE_HELD_ITEM]: Object.freeze({
    requires: PokemonUsageIds.TEAM,
    lockedBy: Object.freeze([])
  }),
  [PokemonActionIds.USE_ITEM]: Object.freeze({
    lockedBy: Object.freeze([PokemonUsageIds.DAYCARE])
  }),
  [PokemonActionIds.JOIN_TEAM]: Object.freeze({
    lockedBy: Object.freeze([PokemonUsageIds.TEAM, PokemonUsageIds.DAYCARE, PokemonUsageIds.TRAINING])
  }),
  [PokemonActionIds.DEPOSIT_DAYCARE]: Object.freeze({
    lockedBy: Object.freeze([PokemonUsageIds.DAYCARE, PokemonUsageIds.TRAINING])
  }),
  [PokemonActionIds.TRAIN]: Object.freeze({
    lockedBy: Object.freeze([PokemonUsageIds.DAYCARE, PokemonUsageIds.TRAINING])
  })
});

/** Kinds of action lock returned by PokemonActionRules.lockFor(). */
export const PokemonActionLockKinds = Object.freeze({
  /** A current usage forbids the action (`pokemon_action_locked_<usage>`). */
  LOCKED_BY: 'locked-by',
  /** A required usage is missing (`pokemon_action_requires_<usage>`). */
  REQUIRES: 'requires'
});
