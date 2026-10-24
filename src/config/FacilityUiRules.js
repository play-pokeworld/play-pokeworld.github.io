/** @file FacilityUiRules.js @brief Shared facility presentation vocabulary, not gameplay gates. */
export const FacilityUiRules = Object.freeze({
  MODE_GATES: Object.freeze({
    level: 'facility_training_gate_level',
    ev: 'facility_training_gate_ev',
    talent: 'facility_training_gate_league',
    hidden: 'facility_training_gate_league',
  }),
  MODE_DISPLAY_ORDER: Object.freeze([
    'move',
    'talent',
    'ev',
    'hidden',
    'level',
  ]),
  TABS: Object.freeze(['upgrades', 'automation', 'staff']),
  MODE_KEYS: Object.freeze({
    move: 'training_mode_move_title',
    talent: 'training_mode_talent_title',
    level: 'training_mode_level_title',
    ev: 'training_mode_ev_title',
    hidden: 'training_mode_hidden_title',
  }),
  STAFF_TITLES: Object.freeze({
    hatchery: 'hatchery_managers_title',
    training: 'training_trainers_title',
    mine: 'management_miners',
  }),
});
