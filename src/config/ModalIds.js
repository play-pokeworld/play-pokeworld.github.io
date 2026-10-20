/**
 * @file ModalIds.js
 * @brief Ids of the modal windows that can be opened by request (C++ equivalent: namespace ModalIds).
 * A modal is opened by dispatching `new ModalOpenRequestedEvent(ModalIds.X, params)`: the modal with
 * that id opens itself, so no page or panel ever needs a reference to another window.
 * The values are the DOM ids of the modal windows (kept from the previous versions for CSS).
 */

export const ModalIds = Object.freeze({
  STARTER: 'starter-modal-inner',
  TEAM: 'team-modal',
  TEAM_PRESETS: 'team-presets-modal',
  POKEMON_INFO: 'poke-modal-inner',
  HELD_ITEM_PICKER: 'held-item-picker-window',
  BATTLE_SUMMARY: 'battle-summary-inner',
  SETTINGS: 'settings-window',
  /** Localized people and dialogue at the current location. */
  NPC_TALK: 'pw-npc-talk',
  /** Repeatable quest offer board and slot-upgrade dialog. */
  REPEATABLE_QUESTS: 'pw-repeatable-quests',
  REPEATABLE_UPGRADES: 'pw-repeatable-upgrades',
  /** Params: { filterId } */
  BALL_PICKER: 'pw-ball-picker',
  BALL_FILTERS: 'pw-ball-editor',
  /** Full-screen panels (UIFullscreenPanel) */
  SHOP: 'fs-shop',
  BAG: 'fs-inventory',
  BOX: 'fs-box',
  BADGES: 'fs-badges',
  POKEDEX: 'fs-pokedex',
  GUIDE: 'fs-guide'
});
