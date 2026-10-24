/** @file MineUiRules.js @brief Mine presentation identities; all energy/cost/power values come from MineSystem. */
export const MineUiRules = Object.freeze({
  SURVEY_BUTTON_ID: 'pw-mine-new-layer',
  SURVEY_CONFIRM_ID: 'pw-mine-survey-confirm',
  TOOL_AREAS: Object.freeze({
    chisel: 'single',
    hammer: 'square3',
    pickaxe: 'cross',
    drill: 'line5',
    dynamite: 'square3',
  }),
  ITEM_SKINS: Object.freeze({
    fire_stone: 'firestone',
    water_stone: 'waterstone',
    thunder_stone: 'thunderstone',
    leaf_stone: 'leafstone',
    moon_stone: 'moonstone',
    sun_stone: 'sunstone',
  }),
  TOOL_ICONS: Object.freeze({
    chisel: 'mineToolChisel',
    hammer: 'mineToolHammer',
    pickaxe: 'mineToolPickaxe',
    drill: 'mineToolDrill',
    dynamite: 'mineToolDynamite',
  }),
});
