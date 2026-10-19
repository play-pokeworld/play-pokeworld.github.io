/**
 * @file DashboardLayout.js
 * @brief Static description of the game dashboard (C++ equivalent: namespace DashboardLayout { constexpr ... }).
 * Window ids, column ids, the mobile breakpoint and the mobile tab → windows mapping.
 * The default column of each window is chosen where the panel is created (GamePage).
 */

/** Window ids (DOM ids of the dashboard DraggablePanels). */
export const WindowIds = Object.freeze({
  STORY: 'win-story',
  ACHIEVEMENTS: 'win-achievements',
  TEAM: 'win-team',
  HATCHERY: 'win-hatchery',
  MINE: 'win-mine',
  MAP: 'win-map',
  BATTLE: 'win-battle',
  BASE: 'win-base',
  SHORTCUTS: 'win-shortcuts',
  CURRENCY: 'win-currency',
  POKEBALLS: 'win-pokeballs',
  LOCATION: 'win-tabs',
  TRAINING: 'win-training'
});

/**
 * Desktop columns, left to right. A panel receives its starting column at creation
 * (`new StoryPanel(DashboardColumns.LEFT)`); creation order gives the top-to-bottom order.
 */
export const DashboardColumns = Object.freeze({
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right'
});

/** Column ids in display order. */
export const DASHBOARD_COLUMN_ORDER = Object.freeze([DashboardColumns.LEFT, DashboardColumns.CENTER, DashboardColumns.RIGHT]);

/** Viewport width (px) at or below which the dashboard switches to the mobile layout. */
export const MOBILE_BREAKPOINT_PX = 850;

/** Mobile bottom navigation: one tab = a set of visible windows. */
export const MOBILE_VIEWS = Object.freeze([
  { id: 'adventure', labelKey: 'adventure_tab', windows: [WindowIds.MAP, WindowIds.LOCATION, WindowIds.STORY] },
  { id: 'combat', labelKey: 'tab_combat', windows: [WindowIds.BATTLE] },
  { id: 'team', labelKey: 'team_btn', windows: [WindowIds.TEAM] },
  { id: 'shortcuts', labelKey: 'shortcuts_tab', windows: [WindowIds.SHORTCUTS, WindowIds.CURRENCY, WindowIds.POKEBALLS] },
  { id: 'manage', labelKey: 'manage_tab', windows: [] }
]);

/** Id of the mobile view that shows the management sub-navigation. */
export const MOBILE_MANAGE_VIEW_ID = 'manage';

/** Sub-tabs of the "manage" mobile view. */
export const MOBILE_MANAGE_VIEWS = Object.freeze([
  { id: 'hatchery', labelKey: 'tab_hatchery', windows: [WindowIds.HATCHERY] },
  { id: 'training', labelKey: 'training_tab', windows: [WindowIds.TRAINING] },
  { id: 'mine', labelKey: 'mine_title', windows: [WindowIds.MINE] },
  { id: 'base', labelKey: 'base_tab', windows: [WindowIds.BASE] }
]);
