/**
 * @file ModalIds.js
 * @brief Ids of the modal windows that can be opened by request (C++ equivalent: namespace ModalIds).
 * A modal is opened by dispatching `new ModalOpenRequestedEvent(ModalIds.X, params)`: the modal with
 * that id opens itself, so no page or panel ever needs a reference to another window.
 * The values are the DOM ids of the modal windows (kept from the previous versions for CSS).
 */

export const ModalIds = Object.freeze({
  STARTER: 'starter-modal-inner',
  REGIONAL_STARTER: 'pw-regional-starter',
  TEAM: 'team-modal',
  TEAM_PRESETS: 'team-presets-modal',
  TEAM_PRESET_EDITOR:'pw-team-preset-editor',
  POKEMON_INFO: 'poke-modal-inner',
  /** Params: { itemId }; choose a valid Pokémon for an inventory item. */
  ITEM_TARGET: 'pw-item-target',
  /** Params: { pokemonUid, location, moveId }; select a move slot to learn into. */
  MOVE_LEARN: 'pw-move-learn',
  BATTLE_SUMMARY: 'battle-summary-inner',
  HATCHERY_MANAGEMENT: 'pw-hatchery-management',
  TRAINING_MANAGEMENT: 'pw-training-management',
  MINE_MANAGEMENT: 'pw-mine-management',
  HATCHERY_FOSSILS: 'pw-hatchery-fossils',
  FOSSIL_LAB: 'pw-fossil-lab',
  SETTINGS: 'settings-window',
  /** Localized people and dialogue at the current location. */
  NPC_TALK: 'pw-npc-talk',
  /** Interactive secret-base room visit opened from the Location panel or Base panel. */
  SECRET_BASE_VISIT: 'pw-secret-base-visit',
  SECRET_BASE_NPC: 'pw-secret-base-npc-modal',
  SECRET_BASE_PC: 'pw-secret-base-pc-modal',
  /** Repeatable quest offer board and slot-upgrade dialog. */
  REPEATABLE_QUESTS: 'pw-repeatable-quests',
  REPEATABLE_UPGRADES: 'pw-repeatable-upgrades',
  /** Kanto exploration puzzle list and sequence/code interaction. */
  PUZZLES: 'fs-puzzles',
  PUZZLE_SOLVE: 'pw-puzzle-solve',
  /** Color legend opened from the Map panel's "?" header control. */
  MAP_HELP: 'pw-map-help',
  /** Params: { filterId } */
  BALL_PICKER: 'pw-ball-picker',
  BALL_FILTERS: 'pw-ball-editor',
  /** Full-screen panels (UIFullscreenPanel) */
  SHOP: 'fs-shop',
  MARKET: 'fs-market',
  BAG: 'fs-inventory',
  BOX: 'fs-box',
  BADGES: 'fs-badges',
  POKEDEX: 'fs-pokedex',
  ACHIEVEMENTS: 'fs-achievements',
  ATOLL: 'fs-atoll',
  ATOLL_FACTORY_PREP: 'pw-atoll-factory-prep',
  RELAUNCH_CONFIRM_PREFIX:'pw-relaunch-confirm-',
  GUIDE: 'fs-guide',
  DICTIONARY: 'fs-dictionary',
  DICTIONARY_DETAIL: 'pw-dictionary-detail',
  AFK_SUMMARY: 'afk-summary-modal'
});
