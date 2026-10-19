/**
 * @file ShopRules.js
 * @brief Poké Ball stock and quantities of the town shops, ported from the original
 * ui/game/shop-panel.js and application/economy/pokeballs.js (C++: namespace ShopRules).
 */
export const ShopRules = Object.freeze({
  /** Balls sold in every shop, unlocked by the badge requirement of the LOCATION (original badgeReq). */
  BALL_STOCK: Object.freeze([
    Object.freeze({ ball: 'pokeball', badgesRequired: 0 }),
    Object.freeze({ ball: 'greatball', badgesRequired: 2 }),
    Object.freeze({ ball: 'ultraball', badgesRequired: 5 })
  ]),
  /** Master Ball: one offer per currency, price rising by `step` at every Master Ball bought. */
  MASTER_BALL: Object.freeze({
    ball: 'masterball',
    badgesRequired: 8,
    maxPerPurchase: 100,
    prices: Object.freeze([
      Object.freeze({ currency: 'money', base: 10000000, step: 5000000 }),
      Object.freeze({ currency: 'dungeonToken', base: 25000, step: 12500 }),
      Object.freeze({ currency: 'questPoint', base: 5000, step: 2500 }),
      Object.freeze({ currency: 'diamond', base: 500, step: 250 })
    ])
  }),
  /** One Honor Ball offered every `every` Poké Balls bought (original HONOR_EVERY). */
  HONOR_BALL: Object.freeze({ ball: 'honorball', from: 'pokeball', every: 10 }),
  /** Currency of the regular offers. */
  CURRENCY: 'money',
  /** Quantity shortcut buttons of the footer (original +10 / +100). */
  QUANTITY_STEPS: Object.freeze([10, 100])
});
