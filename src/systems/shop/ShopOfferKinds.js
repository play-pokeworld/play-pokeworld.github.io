/**
 * @file ShopOfferKinds.js
 * @brief Kinds of shop offers (original shopItemsModel `kind`).
 */
export const ShopOfferKinds = Object.freeze({
  POKEMON: 'pokemon',
  /** Item of the shop stock, paid in money, limited by the bag stack. */
  ITEM: 'item',
  UPGRADE:'upgrade',
  /** Poké Ball unlocked by the location badge requirement, paid in money. */
  BALL: 'ball',
  /** Master Ball, one offer per currency, rising price. */
  MASTER_BALL: 'masterball'
});
