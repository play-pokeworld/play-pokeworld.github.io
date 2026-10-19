/**
 * @file ItemKinds.js
 * @brief Item families of data/raw/items-data.js (C++: enum class ItemKind).
 * tm / hm teach `move`; ball has `ball.rate`; fossil `revives` a species; treasure has a sell `value`.
 */
export const ItemKinds = Object.freeze({
  HELD: 'held',
  TM: 'tm',
  HM: 'hm',
  BALL: 'ball',
  STONE: 'stone',
  EVOLUTION: 'evolution',
  FOSSIL: 'fossil',
  KEY: 'key',
  CONSUMABLE: 'consumable',
  CANDY: 'candy',
  TREASURE: 'treasure',
  KEYSTONE: 'keystone',
  MEMORY: 'memory'
});
