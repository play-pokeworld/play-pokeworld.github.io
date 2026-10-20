/**
 * @file CurrencyDefinitions.js
 * @brief Static description of every currency (C++ equivalent: static const CurrencyDef[]).
 * Pure data: labels are localization keys, icons are file stems resolved by AssetPaths.currency().
 */

/**
 * @typedef {Object} CurrencyDefinition
 * @property {string} id          - Field name in CurrenciesData
 * @property {string} iconStem    - File stem in assets/images/currency/
 * @property {string} labelKey    - Localization key of the display name
 * @property {string} [gainKey]   - Localization key of the acquisition tooltip
 * @property {number} startAmount - Amount granted to a new save
 * @property {boolean} shown      - Listed in the Currencies window
 */

/** @type {ReadonlyArray<CurrencyDefinition>} */
export const CURRENCIES = Object.freeze([
  Object.freeze({ id: 'money', iconStem: 'money', labelKey: 'currency_money', gainKey: 'currency_money_gain', startAmount: 500, shown: true }),
  Object.freeze({ id: 'dungeonToken', iconStem: 'dungeonToken', labelKey: 'currency_dungeon_tokens', gainKey: 'currency_jd_gain', startAmount: 0, shown: true }),
  Object.freeze({ id: 'questPoint', iconStem: 'questPoint', labelKey: 'currency_quest_points', gainKey: 'currency_pq_gain', startAmount: 0, shown: true }),
  Object.freeze({ id: 'diamond', iconStem: 'diamond', labelKey: 'currency_diamonds', gainKey: 'currency_diamond_gain', startAmount: 0, shown: true }),
  Object.freeze({ id: 'battlePoint', iconStem: 'battlePoint', labelKey: 'currency_battle_points', gainKey: 'currency_pc_gain', startAmount: 0, shown: true }),
  Object.freeze({ id: 'farmPoint', iconStem: 'farmPoint', labelKey: 'currency_farm_points', startAmount: 0, shown: false }),
  Object.freeze({ id: 'contestToken', iconStem: 'contestToken', labelKey: 'currency_contest_tokens', startAmount: 0, shown: false })
]);
