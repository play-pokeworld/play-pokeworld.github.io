import { LocationActivityKinds } from './LocationActivityKinds.js';
/** @file RelaunchRules.js @brief Original one-time quest-point relaunch upgrades and live countdown. */
import { DungeonAutoRules } from './DungeonAutoRules.js';
export const RelaunchRules = Object.freeze({
  WILD: LocationActivityKinds.WILD,
  DUNGEON: LocationActivityKinds.DUNGEON,
  DELAY_MS: 5000,
  CURRENCY: 'questPoint',
  DEFAULT_MODE: DungeonAutoRules.DEFAULT_MODE,
  UPGRADES: Object.freeze({
    wild: Object.freeze({
      key: 'autoRelaunch',
      cost: 2500,
      labelKey: 'relaunch_wild_title',
      toggleLabelKey: 'relaunch_wild_toggle',
      descriptionKey: 'relaunch_wild_description',
      icon: 'refresh',
    }),
    dungeon: Object.freeze({
      key: 'autoDungeonRelaunch',
      cost: 5000,
      labelKey: 'relaunch_dungeon_title',
      toggleLabelKey: 'relaunch_dungeon_toggle',
      descriptionKey: 'relaunch_dungeon_description',
      icon: 'dungeon',
    }),
  }),
});
