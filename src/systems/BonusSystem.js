/**
 * @file BonusSystem.js
 * @brief Aggregates typed gameplay modifiers from independent bonus providers.
 *
 * A provider returns `{ type, value, scope? }` contributions. The system owns aggregation policy,
 * scope filtering and multiplier application; individual sources do not alter rewards directly.
 */
import { BaseSystem } from './BaseSystem.js';
import { BonusRules } from '../config/BonusRules.js';
import { EventBus } from '../core/EventBus.js';
import { BonusChangedEvent } from '../core/events/BonusChangedEvent.js';

export class BonusSystem extends BaseSystem {
  /** @private @type {BonusSystem|null} */
  static _instance = null;

  /** @returns {BonusSystem} */
  static getInstance() {
    if (!BonusSystem._instance) BonusSystem._instance = new BonusSystem();
    return BonusSystem._instance;
  }

  constructor() {
    super('BonusSystem', 'System');
    /** @private @type {Map<string, Object>} */
    this._providers = new Map();
    /** @private @type {Map<string, Array<[Function, Function]>>} */
    this._providerSubscriptions = new Map();
    /** @private @type {boolean} */
    this._initialized = false;
  }

  /** @override */
  init() {
    if (this._initialized) return;
    this._initialized = true;
    for (const [sourceId, provider] of this._providers) this._subscribeProvider(sourceId, provider);
  }

  /**
   * Registers or replaces one source provider. A provider implements `getContributions(context)`.
   * @param {string} sourceId
   * @param {{getContributions: Function}} provider
   * @returns {boolean}
   */
  registerProvider(sourceId, provider) {
    const id = String(sourceId || '').trim();
    if (!id || typeof provider?.getContributions !== 'function') return false;
    const previous = this._providers.get(id);
    if (previous) this._unsubscribeProvider(id);
    this._providers.set(id, provider);
    if (this._initialized) this._subscribeProvider(id, provider);
    return true;
  }

  /** @param {string} sourceId @returns {boolean} */
  unregisterProvider(sourceId) {
    const id = String(sourceId || '');
    const provider = this._providers.get(id);
    if (!provider) return false;
    const types = this._typesForProvider(provider);
    this._unsubscribeProvider(id);
    this._providers.delete(id);
    EventBus.getInstance().dispatch(new BonusChangedEvent([id], types));
    return true;
  }

  /** @private @param {string} sourceId @param {Object} provider */
  _subscribeProvider(sourceId, provider) {
    this._unsubscribeProvider(sourceId);
    const events = provider.constructor?.EVENTS || provider.EVENTS || [];
    if (!Array.isArray(events) || events.length === 0) return;
    const types = this._typesForProvider(provider);
    const unsubscribe = events
      .filter((eventClass) => typeof eventClass === 'function' && eventClass.TYPE)
      .map((eventClass) => EventBus.getInstance().subscribe(eventClass, () => {
        EventBus.getInstance().dispatch(new BonusChangedEvent([sourceId], types));
      }));
    this._providerSubscriptions.set(sourceId, unsubscribe);
  }

  /** @private @param {string} sourceId */
  _unsubscribeProvider(sourceId) {
    const subscriptions = this._providerSubscriptions.get(sourceId) || [];
    for (const unsubscribe of subscriptions) unsubscribe();
    this._providerSubscriptions.delete(sourceId);
  }

  /** @private @param {Object} provider @returns {string[]} */
  _typesForProvider(provider) {
    const types = provider.constructor?.TYPES || provider.TYPES || [];
    return Array.isArray(types) ? types.filter((type) => typeof type === 'string') : [];
  }

  /**
   * Returns a defensive list of active contributions matching the requested context.
   * @param {Object} [context={}]
   * @returns {Array<{sourceId:string,type:string,value:number,unit:string,scope:Object|null}>}
   */
  getContributions(context = {}) {
    const active = [];
    for (const [sourceId, provider] of this._providers) {
      const contributions = provider.getContributions(context) || [];
      for (const contribution of contributions) {
        if (!contribution || typeof contribution.type !== 'string') continue;
        const value = Number(contribution.value);
        if (!Number.isFinite(value) || !this._matchesScope(contribution.scope, context)) continue;
        const rule = BonusRules.TYPE_RULES[contribution.type];
        active.push({
          sourceId,
          type: contribution.type,
          value,
          unit: contribution.unit || rule?.unit || BonusRules.DEFAULT_UNIT,
          scope: contribution.scope ? { ...contribution.scope } : null
        });
      }
    }
    return active;
  }

  /**
   * Aggregates one bonus type. Percentage/point/flat values sum; explicit multipliers multiply.
   * @param {string} type
   * @param {Object} [context={}]
   * @returns {number}
   */
  getTotal(type, context = {}) {
    const rule = BonusRules.TYPE_RULES[type];
    const aggregation = rule?.aggregation || BonusRules.DEFAULT_AGGREGATION;
    const matching = this.getContributions(context).filter((entry) => entry.type === type);
    if (aggregation === 'multiply') {
      return matching.reduce((total, entry) => total * entry.value, 1);
    }
    return matching.reduce((total, entry) => total + entry.value, 0);
  }

  /**
   * Converts an aggregated percentage or explicit multiplier into a scalar.
   * Unknown/non-percentage bonus types return 1 and should be read with getTotal().
   * @param {string} type
   * @param {Object} [context={}]
   * @returns {number}
   */
  getMultiplier(type, context = {}) {
    const rule = BonusRules.TYPE_RULES[type];
    if (!rule) return 1;
    if (rule.aggregation === 'multiply') return this.getTotal(type, context);
    if (rule.unit !== 'percent') return 1;
    return Math.max(0, 1 + this.getTotal(type, context) / 100);
  }

  /**
   * Applies the selected modifier to a non-negative numeric amount and floors like the reference.
   * @param {number} amount
   * @param {string} type
   * @param {Object} [context={}]
   * @returns {number}
   */
  applyMultiplier(amount, type, context = {}) {
    const base = Math.max(0, Math.floor(Number(amount) || 0));
    if (!base) return 0;
    return Math.max(0, Math.floor(base * this.getMultiplier(type, context)));
  }

  /** @private @param {Object|null} scope @param {Object} context */
  _matchesScope(scope, context) {
    if (!scope || typeof scope !== 'object') return true;
    for (const key of BonusRules.SCOPE_KEYS) {
      if (scope[key] !== undefined && scope[key] !== context[key]) return false;
    }
    return true;
  }

  /** @override */
  onDestroy() {
    for (const sourceId of this._providerSubscriptions.keys()) this._unsubscribeProvider(sourceId);
    this._providers.clear();
    super.onDestroy();
  }
}
