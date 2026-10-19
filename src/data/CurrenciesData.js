/**
 * @file CurrenciesData.js
 * @brief Wallet model: single source of truth for every currency, money included
 * (C++ equivalent: class CurrenciesData : public BaseModel).
 */

import { BaseModel } from './BaseModel.js';
import { EventBus } from '../core/EventBus.js';
import { CurrencyChangedEvent } from '../core/events/CurrencyChangedEvent.js';
import { CURRENCIES } from './CurrencyDefinitions.js';

export class CurrenciesData extends BaseModel {
  /**
   * @param {Object} [initialData={}]
   */
  constructor(initialData = {}) {
    super('CurrenciesData', 'Data');
    this.deserialize(initialData);
  }

  /**
   * @param {string} id - Currency id (see CurrencyDefinitions)
   * @returns {number}
   */
  get(id) {
    return typeof this[id] === 'number' ? this[id] : 0;
  }

  /**
   * Modifies the amount of a currency (never below zero) and notifies listeners.
   * @param {string} id
   * @param {number} delta
   */
  add(id, delta) {
    this[id] = Math.max(0, this.get(id) + delta);
    EventBus.getInstance().dispatch(new CurrencyChangedEvent(id, this[id]));
  }

  /**
   * @override
   * @returns {Object}
   */
  serialize() {
    const out = {};
    for (const def of CURRENCIES) {
      out[def.id] = this.get(def.id);
    }
    return out;
  }

  /**
   * Missing currencies get their start amount.
   * @override
   * @param {Object} data
   */
  deserialize(data = {}) {
    const raw = data || {};
    for (const def of CURRENCIES) {
      this[def.id] = Number.isFinite(raw[def.id]) ? raw[def.id] : def.startAmount;
    }
  }
}
