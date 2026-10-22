/**
 * @file BonusRules.js
 * @brief Shared bonus vocabulary and stacking semantics for every gameplay bonus source.
 * Providers (secret-base flags now; achievements and other systems as they are ported) contribute
 * typed values. Percentage contributions add together; explicit multipliers multiply together.
 */

export const BonusTypes = Object.freeze({
  ATOLL_DISCOUNT: 'atollDiscount',
  ATOLL_FRAGMENTS: 'atollFragments',
  ATOLL_TOKENS: 'atollTokens',
  CAPTURE: 'capture',
  CHAMPION_COOLDOWN: 'champCooldown',
  CRITICAL_CHANCE: 'crit',
  DUPLICATE_VALUE: 'dupeVal',
  FARM_MATERIAL: 'farmMaterial',
  FOSSIL_HATCH_SPEED: 'fossilHatchSpeed',
  HATCH_SPEED: 'hatchSpeed',
  LOOT: 'loot',
  MINE_ENERGY_MAX: 'mineEnergyMax',
  MINE_LAYER_ITEMS: 'mineLayerItems',
  MINE_RARE_CHANCE: 'mineRareChance',
  MINE_TREASURE_VALUE: 'mineTreasureVal',
  MONEY: 'money',
  PC_BOXES: 'pc_boxes',
  POST_BATTLE_HEAL: 'postBattleHeal',
  QUEUE_SLOTS: 'queueSlots',
  RARE_ITEM_CHANCE: 'rareItemChance',
  ROUTE_LOOT: 'routeLoot',
  SHINY_MULTIPLIER: 'shiny',
  SHOP_DISCOUNT: 'shopDiscount',
  STAFF_PRODUCTION: 'staffProd',
  HATCH_STEPS_REDUCTION: 'stepsReduction',
  TRAINING_DURATION: 'trainingDuration',
  TRAINING_EV_GAIN: 'trainingEvGain',
  TYPE_DAMAGE: 'typeDamage',
  XP: 'xp'
});

const TYPE_RULES = Object.freeze({
  [BonusTypes.ATOLL_DISCOUNT]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.ATOLL_FRAGMENTS]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.ATOLL_TOKENS]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.CAPTURE]: Object.freeze({ unit: 'points', aggregation: 'sum' }),
  [BonusTypes.CHAMPION_COOLDOWN]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.CRITICAL_CHANCE]: Object.freeze({ unit: 'points', aggregation: 'sum' }),
  [BonusTypes.DUPLICATE_VALUE]: Object.freeze({ unit: 'flat', aggregation: 'sum' }),
  [BonusTypes.FARM_MATERIAL]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.FOSSIL_HATCH_SPEED]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.HATCH_SPEED]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.LOOT]: Object.freeze({ unit: 'points', aggregation: 'sum' }),
  [BonusTypes.MINE_ENERGY_MAX]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.MINE_LAYER_ITEMS]: Object.freeze({ unit: 'flat', aggregation: 'sum' }),
  [BonusTypes.MINE_RARE_CHANCE]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.MINE_TREASURE_VALUE]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.MONEY]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.PC_BOXES]: Object.freeze({ unit: 'flat', aggregation: 'sum' }),
  [BonusTypes.POST_BATTLE_HEAL]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.QUEUE_SLOTS]: Object.freeze({ unit: 'flat', aggregation: 'sum' }),
  [BonusTypes.RARE_ITEM_CHANCE]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.ROUTE_LOOT]: Object.freeze({ unit: 'points', aggregation: 'sum' }),
  [BonusTypes.SHINY_MULTIPLIER]: Object.freeze({ unit: 'multiplier', aggregation: 'multiply' }),
  [BonusTypes.SHOP_DISCOUNT]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.STAFF_PRODUCTION]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.HATCH_STEPS_REDUCTION]: Object.freeze({ unit: 'flat', aggregation: 'sum' }),
  [BonusTypes.TRAINING_DURATION]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.TRAINING_EV_GAIN]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.TYPE_DAMAGE]: Object.freeze({ unit: 'percent', aggregation: 'sum' }),
  [BonusTypes.XP]: Object.freeze({ unit: 'percent', aggregation: 'sum' })
});

export const BonusRules = Object.freeze({
  SOURCE_IDS: Object.freeze({ SECRET_BASE_FLAGS: 'secret-base-flags' }),
  TYPE_RULES,
  DEFAULT_AGGREGATION: 'sum',
  DEFAULT_UNIT: 'flat',
  SCOPE_KEYS: Object.freeze(['region', 'locationId', 'kind'])
});
