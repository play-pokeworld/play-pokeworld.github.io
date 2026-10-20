/**
 * @file CurrenciesData.js
 * @brief Wallet model: one amount and one progressive visibility flag per currency.
 */

import { BaseModel } from '../core/BaseModel.js';
import { EventBus } from '../../core/EventBus.js';
import { CurrencyChangedEvent } from '../../core/events/CurrencyChangedEvent.js';
import { CURRENCIES } from './CurrencyDefinitions.js';

export class CurrenciesData extends BaseModel {
  /** @param {Object} [initialData={}] */
  constructor(initialData = {}) {
    super('CurrenciesData', 'Data');
    this.deserialize(initialData);
  }

  /** @param {string} id @returns {number} */
  get(id) {
    return typeof this[id] === 'number' ? this[id] : 0;
  }

  /**
   * @param {string} id
   * @returns {boolean} Whether the currency belongs in the wallet panel
   */
  isRevealed(id) {
    if (!CURRENCIES.some((currency) => currency.id === id)) return false;
    if (id === 'battlePoint') return this.get(id) > 0;
    return this.revealed[id] === true;
  }

  /**
   * Reveals a currency without changing its balance (used by unlock systems such as the mine).
   * @param {string} id
   * @returns {boolean} Whether visibility changed
   */
  reveal(id) {
    if (!CURRENCIES.some((currency) => currency.id === id) || this.isRevealed(id)) return false;
    this.revealed[id] = true;
    EventBus.getInstance().dispatch(new CurrencyChangedEvent(id, this.get(id)));
    return true;
  }

  /**
   * Modifies a balance (never below zero), revealing earned currencies as in the original.
   * @param {string} id
   * @param {number} delta
   */
  add(id, delta) {
    const before = this.get(id);
    this[id] = Math.max(0, before + delta);
    if (delta > 0 && id !== 'battlePoint' && CURRENCIES.some((currency) => currency.id === id)) {
      this.revealed[id] = true;
    }
    EventBus.getInstance().dispatch(new CurrencyChangedEvent(id, this[id]));
  }

  /** @override @returns {Object} */
  serialize() {
    const out = { revealed: { ...this.revealed } };
    for (const definition of CURRENCIES) out[definition.id] = this.get(definition.id);
    return out;
  }

  /** @override @param {Object} data */
  deserialize(data = {}) {
    const raw = data && typeof data === 'object' ? data : {};
    const rawReveal = raw.revealed && typeof raw.revealed === 'object' ? raw.revealed : {};
    this.revealed = {};
    for (const definition of CURRENCIES) {
      const amount = raw[definition.id];
      this[definition.id] = Number.isFinite(amount) ? Math.max(0, amount) : definition.startAmount;
      this.revealed[definition.id] = definition.id === 'money' ||
        rawReveal[definition.id] === true || this[definition.id] > 0;
    }
  }
}
