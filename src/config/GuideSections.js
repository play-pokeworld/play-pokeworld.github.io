/**
 * @file GuideSections.js
 * @brief Stable guide ids, localized-content keys and dashboard-window help routes.
 * This file contains presentation metadata only; FeatureAccessSystem resolves every access gate.
 */
import { WindowIds } from './DashboardLayout.js';
import { CONTENT_FEATURES } from './ContentAccessRules.js';
import { LocationKinds } from '../data/world/LocationKinds.js';

export const GuideSectionIds = Object.freeze({
  MAP: 'map',
  COMBAT: 'combat',
  POKEMON: 'pokemon',
  BAG: 'bag',
  POKEDEX: 'pokedex',
  POKEBALLS: 'pokeballs',
  STATS: 'stats',
  SHINY: 'shiny',
  QUESTS: 'quests',
  ECONOMY: 'economy',
  SAVE: 'save',
  DUNGEON: 'dungeon',
  HATCHERY: 'hatchery',
  MINE: 'mine',
  TRAINING: 'training',
  ACHIEVEMENTS: 'achievements'
});

export const GuideGateKinds = Object.freeze({
  FEATURE: 'feature',
  LOCATION_KIND: 'location-kind'
});

const page = (titleKey, bodyKey) => Object.freeze({ titleKey, bodyKey });
const typeChartPage = Object.freeze({ titleKey: 'guide_type_chart_title', typeChart: true });
const section = (id, titleKey, icon, pages, gate = null) => Object.freeze({
  id,
  titleKey,
  icon,
  pages: Object.freeze(pages),
  ...(gate ? { gate: Object.freeze(gate) } : {})
});

/** Frozen, locale-independent Guide content references in the original display order. */
export const GUIDE_SECTION_DEFINITIONS = Object.freeze([
  section(GuideSectionIds.MAP, 'guide_map_title', 'map', [
    page('guide_map_read', 'guide_map_simple_desc'),
    page('guide_progress_locks', 'guide_progress_locks_desc')
  ]),
  section(GuideSectionIds.COMBAT, 'guide_combat_title', 'swords', [
    page('guide_combat_basics', 'guide_combat_basics_desc'),
    page('guide_combat_switch', 'guide_combat_switch_desc'),
    typeChartPage,
    page('guide_combat_loot', 'guide_combat_loot_desc')
  ]),
  section(GuideSectionIds.POKEMON, 'guide_pokemon_title', 'team', [
    page('guide_pokemon_sheet', 'guide_pokemon_sheet_desc'),
    page('guide_sheet_moves', 'guide_sheet_moves_desc')
  ]),
  section(GuideSectionIds.BAG, 'guide_bag_title', 'backpack', [
    page('guide_bag_org', 'guide_bag_org_desc'),
    page('guide_bag_held', 'guide_bag_held_desc'),
    page('guide_bag_treasure', 'guide_bag_treasure_desc')
  ]),
  section(GuideSectionIds.POKEDEX, 'guide_pokedex_title', 'pokeball', [
    page('guide_pokedex_current_title', 'guide_pokedex_current_desc')
  ]),
  section(GuideSectionIds.POKEBALLS, 'guide_balls_title', 'pokeball', [
    page('guide_capture_current_title', 'guide_capture_current_desc'),
    page('guide_balls_custom', 'guide_balls_custom_desc'),
    page('guide_balls_shiny_case', 'guide_balls_shiny_case_desc')
  ]),
  section(GuideSectionIds.STATS, 'guide_stats_title', 'dumbbell', [
    page('guide_stats_formula', 'guide_stats_current_desc')
  ]),
  section(GuideSectionIds.SHINY, 'guide_shiny_title', 'sparkle', [
    page('guide_shiny_dupes', 'guide_shiny_dupes_desc'),
    page('guide_shiny_farm', 'guide_shiny_farm_desc')
  ]),
  section(GuideSectionIds.QUESTS, 'guide_quests_title', 'book', [
    page('guide_main_quests', 'guide_main_quests_desc'),
    page('guide_side_quests', 'guide_side_quests_desc'),
    page('guide_repeatable_quests', 'guide_repeatable_quests_desc')
  ]),
  section(GuideSectionIds.ECONOMY, 'guide_economy', 'coin', [
    page('guide_shops', 'guide_shops_desc'),
    page('guide_currencies', 'guide_economy_rewards_desc')
  ]),
  section(GuideSectionIds.ACHIEVEMENTS, 'guide_ach_title', 'trophy', [
    page('guide_ach_current_title', 'guide_ach_current_desc')
  ]),
  section(GuideSectionIds.SAVE, 'guide_save_title', 'save', [
    page('guide_save_local_title', 'guide_save_local_desc'),
    page('guide_import_export', 'guide_import_export_current_desc')
  ]),
  section(GuideSectionIds.DUNGEON, 'guide_dungeon_title', 'tent', [
    page('guide_dungeon_goal', 'guide_dungeon_goal_desc'),
    page('guide_dungeon_map', 'guide_dungeon_map_desc'),
    page('guide_dungeon_floor', 'guide_dungeon_floor_desc')
  ], { kind: GuideGateKinds.LOCATION_KIND, id: LocationKinds.DUNGEON }),
  section(GuideSectionIds.HATCHERY, 'guide_hatchery_title', 'egg', [
    page('guide_hatchery_deposit', 'guide_hatchery_deposit_desc'),
    page('guide_hatchery_current_title', 'guide_hatchery_current_desc')
  ], { kind: GuideGateKinds.FEATURE, id: CONTENT_FEATURES.HATCHERY }),
  section(GuideSectionIds.MINE, 'guide_mine_title', 'pickaxe', [
    page('guide_mine_goal', 'guide_mine_goal_desc'),
    page('guide_mine_tools_current_title', 'guide_mine_tools_current_desc'),
    page('guide_mine_energy', 'guide_mine_energy_desc')
  ], { kind: GuideGateKinds.FEATURE, id: CONTENT_FEATURES.MINE }),
  section(GuideSectionIds.TRAINING, 'guide_training_title', 'dumbbell', [
    page('guide_training_current_title', 'guide_training_current_desc')
  ], { kind: GuideGateKinds.FEATURE, id: CONTENT_FEATURES.TRAINING })
]);

/** Localized labels for the supported ×0, ×¼, ×½, ×1, ×2 and ×4 factors. */
export const GUIDE_TYPE_EFFECT_KEYS = Object.freeze({
  0: 'guide_type_immune_short',
  0.25: 'guide_type_quarter_short',
  0.5: 'guide_type_half_short',
  1: 'guide_type_neutral_short',
  2: 'guide_type_double_short',
  4: 'guide_type_quadrup_short'
});

export const GUIDE_SECTION_FOR_WINDOW = Object.freeze({
  [WindowIds.STORY]: GuideSectionIds.QUESTS,
  [WindowIds.ACHIEVEMENTS]: GuideSectionIds.ACHIEVEMENTS,
  [WindowIds.TEAM]: GuideSectionIds.POKEMON,
  [WindowIds.HATCHERY]: GuideSectionIds.HATCHERY,
  [WindowIds.MINE]: GuideSectionIds.MINE,
  [WindowIds.BATTLE]: GuideSectionIds.COMBAT,
  [WindowIds.BASE]: null,
  [WindowIds.SHORTCUTS]: null,
  [WindowIds.CURRENCY]: GuideSectionIds.ECONOMY,
  [WindowIds.POKEBALLS]: GuideSectionIds.POKEBALLS,
  [WindowIds.LOCATION]: GuideSectionIds.MAP,
  [WindowIds.TRAINING]: GuideSectionIds.TRAINING
});
