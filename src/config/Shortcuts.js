/**
 * @file Shortcuts.js
 * @brief Buttons of the shortcuts window (C++ equivalent: static const Shortcut SHORTCUTS[]).
 */
import { ModalIds } from './ModalIds.js';

/** Shortcut ids. */
export const ShortcutIds = Object.freeze({
  BOX: 'box_view',
  BAG: 'inventory',
  MARKET: 'market',
  POKEDEX: 'pokedex',
  ACHIEVEMENTS: 'achievements',
  DICTIONARY: 'dictionary',
  GUIDE: 'guide',
  ATOLL: 'atoll',
  BADGES: 'badges'
});

/**
 * Button list, in display order. `modalId` (ModalIds value) is the screen opened by the button;
 * null while that screen does not exist yet.
 */
export const SHORTCUTS = Object.freeze([
  { id: ShortcutIds.BOX, labelKey: 'shortcut_pc_box', icon: 'box', variant: 'primary', modalId: ModalIds.BOX },
  { id: ShortcutIds.BAG, labelKey: 'shortcut_bag', icon: 'bag', variant: 'success', modalId: ModalIds.BAG },
  { id: ShortcutIds.MARKET, labelKey: 'shortcut_market', icon: 'shop', variant: 'primary', modalId: ModalIds.MARKET, requiresMarketGate: true },
  { id: ShortcutIds.POKEDEX, labelKey: 'panel_pokedex_title', icon: 'pokeball', variant: 'secondary', modalId: ModalIds.POKEDEX },
  { id: ShortcutIds.ACHIEVEMENTS, labelKey: 'achievements_title', icon: 'trophy', variant: 'secondary', modalId: ModalIds.ACHIEVEMENTS },
  { id: ShortcutIds.DICTIONARY, labelKey: 'dictionary_title', icon: 'dictionary', variant: 'secondary', modalId: ModalIds.DICTIONARY },
  { id: ShortcutIds.GUIDE, labelKey: 'guide_title', icon: 'guide', variant: 'secondary', modalId: ModalIds.GUIDE },
  { id: ShortcutIds.ATOLL, labelKey: 'battle_atoll_title', icon: 'atoll', variant: 'danger', modalId: ModalIds.ATOLL, requiresChampionTitle: true },
  { id: ShortcutIds.BADGES, labelKey: 'shortcut_badges', icon: 'badge', variant: 'primary', modalId: ModalIds.BADGES }
]);
