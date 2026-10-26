/**
 * @file SecretBaseRules.js
 * @brief Hoenn secret-base access, alcove mapping, editor limits, and ORAS flag rewards.
 */
const ALCOVES_BY_LOCATION = Object.freeze({
  route101: Object.freeze(['tree_1', 'bush_1']),
  route102: Object.freeze(['bush_2', 'tree_2']),
  route103: Object.freeze(['cave_1', 'bush_3']),
  route104: Object.freeze(['tree_3', 'cave_blue_1']),
  route110: Object.freeze(['tree_4', 'bush_4']),
  route111: Object.freeze(['cave_2', 'cave_yellow_1', 'cave_red_1']),
  route112: Object.freeze(['cave_red_2', 'cave_red_5']),
  route113: Object.freeze(['cave_yellow_2', 'cave_red_3']),
  route114: Object.freeze(['cave_3', 'cave_red_4', 'cave_red_6']),
  route115: Object.freeze(['cave_blue_2', 'cave_blue_5']),
  route116: Object.freeze(['cave_4', 'cave_yellow_3']),
  route117: Object.freeze(['bush_5', 'tree_5']),
  route118: Object.freeze(['cave_yellow_4', 'cave_blue_3']),
  route119: Object.freeze(['tree_6', 'cave_blue_6']),
  route120: Object.freeze(['bush_6', 'cave_yellow_5']),
  route121: Object.freeze(['cave_5', 'cave_yellow_6']),
  route123: Object.freeze(['cave_6', 'cave_blue_4'])
});

const FLAG_RANKS = Object.freeze([
  Object.freeze({ id: 'normal', threshold: 0, bonuses: Object.freeze({ money: 0, xp: 0, mineEnergyMax: 0, routeLoot: 0 }) }),
  Object.freeze({ id: 'bronze', threshold: 10, bonuses: Object.freeze({ money: 3, xp: 0, mineEnergyMax: 0, routeLoot: 0 }) }),
  Object.freeze({ id: 'silver', threshold: 50, bonuses: Object.freeze({ money: 3, xp: 3, mineEnergyMax: 3, routeLoot: 0 }) }),
  Object.freeze({ id: 'gold', threshold: 150, bonuses: Object.freeze({ money: 5, xp: 5, mineEnergyMax: 5, routeLoot: 1 }) }),
  Object.freeze({ id: 'platinum', threshold: 400, bonuses: Object.freeze({ money: 8, xp: 8, mineEnergyMax: 8, routeLoot: 2 }) })
]);

export const SecretBaseRules = Object.freeze({
  REGION: 'hoenn',
  LOCATION_CONFIRM_ID:'pw-location-base-confirm',
  UNLOCK_QUEST_KEY: 'main.216',
  LEGACY_UNLOCK_QUEST_ID: '216',
  LEGACY_UNLOCK_MAIN_STEP: 16,
  ALCOVES_BY_LOCATION,
  FLAG_RANKS,
  MAX_DECORATIONS: 26,
  MAX_NPCS: Infinity,
  MAX_NPC_TEAM: 6,
  MAX_NPC_NAME_LENGTH: 18,
  MAX_NPC_MESSAGE_LENGTH: 80,
  MAX_PC_MESSAGE_LENGTH: 200,
  FLAG_COOLDOWN_MS: 24 * 60 * 60 * 1000,
  VISIT_SECONDS: 60,
  VISIT_STEP_MS: 180,
  MAX_EXCHANGE_BYTES: 96 * 1024,
  MAX_EXCHANGE_ITEMS: 27,
  MAX_EXCHANGE_NPCS: 8,
  EXCHANGE_KIND: 'pw-secret-base',
  EXCHANGE_VERSION: 1,
  NPC_SPRITES: Object.freeze(Array.from({ length: 101 }, (_, index) => `trainer-${index}`)),
  DEFAULT_LAYOUT_ID: 'cave_1',
  CHANGE_REASONS: Object.freeze({
    ESTABLISHED: 'established', RELOCATED: 'relocated', DECORATED: 'decorated',
    NPC_CHANGED: 'npc-changed', PC_MESSAGE: 'pc-message', FLAG_COLLECTED: 'flag-collected',
    VISIT_BATTLE: 'visit-battle'
  }),
  DEFAULT_NPC_SPRITE: 'trainer-0',
  CELL_TYPES: Object.freeze({ FLOOR: 'floor', WALL: 'wall', HOLE: 'hole', CLIFF: 'cliff', VOID: 'void' }),
  LAYERS: Object.freeze({ FLOOR: 'floor', SURFACE: 'surface', WALL: 'wall' }),
  ITEM_IDS: Object.freeze({
    PC: 'pc', STAIRS: 'stairs', BOARD: 'solid_board', STAND: 'stand', SLIDE: 'slide',
    RED_TENT: 'red_tent', BLUE_TENT: 'blue_tent'
  }),
  EFFECTS: Object.freeze({
    SIT: 'sit', BURST: 'burst', BOARD: 'board', DOOR: 'door', STAIRS: 'stairs', PC: 'pc',
    GLITTER: 'glitter', JUMP: 'jump', SPIN: 'spin', NOTE_PREFIX: 'note:'
  }),
  DIRECTIONS: Object.freeze({
    UP: Object.freeze({ id: 'up', dx: 0, dy: -1 }),
    RIGHT: Object.freeze({ id: 'right', dx: 1, dy: 0 }),
    DOWN: Object.freeze({ id: 'down', dx: 0, dy: 1 }),
    LEFT: Object.freeze({ id: 'left', dx: -1, dy: 0 })
  })
});
