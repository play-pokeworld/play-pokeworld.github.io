/**
 * @file FacilityPurchase.js
 * @brief Checks funds and mutates a purchase before emitting wallet events. Caller saves once.
 */
export class FacilityPurchase {
  /** @param {Object} save @param {number} cost @param {string} currency @param {Function} apply */
  static apply(save, cost, currency, apply) {
    if (!save) return { result: 'no-save' };
    if (!Number.isFinite(cost) || cost < 0) return { result: 'max-upgrade' };
    if (save.currencies.get(currency) < cost) return { result: 'insufficient-funds', cost, currency };
    apply();
    save.currencies.add(currency, -cost);
    return { result: 'ready', cost, currency };
  }
}
