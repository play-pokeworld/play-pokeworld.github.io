/**
 * @file Shortcuts.js
 * @brief Buttons of the shortcuts window (C++ equivalent: static const Shortcut SHORTCUTS[]).
 */

/** Shortcut ids. */
export const ShortcutIds = Object.freeze({
  BOX: 'box_view',
  BAG: 'inventory',
  MARKET: 'market',
  POKEDEX: 'pokedex',
  DICTIONARY: 'dictionary',
  GUIDE: 'guide',
  BADGES: 'badges'
});

/**
 * Button list, in display order. `modalId` (ModalIds value) is the screen opened by the button;
 * null while that screen does not exist yet.
 */
export const SHORTCUTS = Object.freeze([
  { id: ShortcutIds.BOX, labelKey: 'shortcut_pc_box', icon: 'box', variant: 'primary', modalId: null },
  { id: ShortcutIds.BAG, labelKey: 'shortcut_bag', icon: 'backpack', variant: 'success', modalId: null },
  { id: ShortcutIds.MARKET, labelKey: 'shortcut_market', icon: 'store', variant: 'primary', modalId: null },
  { id: ShortcutIds.POKEDEX, labelKey: 'panel_pokedex_title', icon: 'pokeball', variant: 'secondary', modalId: null },
  { id: ShortcutIds.DICTIONARY, labelKey: 'dictionary_title', icon: 'bookOpen', variant: 'secondary', modalId: null },
  { id: ShortcutIds.GUIDE, labelKey: 'guide_title', icon: 'help', variant: 'secondary', modalId: null },
  { id: ShortcutIds.BADGES, labelKey: 'shortcut_badges', icon: 'medal', variant: 'primary', modalId: null }
]);
