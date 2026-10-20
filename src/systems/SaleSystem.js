/**
 * @file SaleSystem.js
 * @brief Direct treasure sale, inventory removal and single-write quest handoff.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { NotificationSystem } from './NotificationSystem.js';
import { EventBus } from '../core/EventBus.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { ItemKinds } from '../data/items/ItemKinds.js';
import { MineItemSoldEvent } from '../core/events/MineItemSoldEvent.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { SaleRules } from '../config/SaleRules.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { t } from '../localization/LocalizationManager.js';

export const SaleResults = Object.freeze({
  SOLD: 'sold',
  NO_SAVE: 'no-save',
  NOT_SELLABLE: 'not-sellable',
  OUT_OF_STOCK: 'out-of-stock'
});

export class SaleSystem extends BaseSystem {
  /** @private @type {SaleSystem|null} */
  static _instance = null;

  /** @returns {SaleSystem} */
  static getInstance() {
    if (!SaleSystem._instance) SaleSystem._instance = new SaleSystem();
    return SaleSystem._instance;
  }

  constructor() {
    super('SaleSystem', 'System');
  }

  /** @param {string} itemId @param {number} [quantity=1] */
  getQuote(itemId, quantity = SaleRules.MIN_QUANTITY) {
    const item = ItemDB.getInstance().getById(itemId);
    if (!item || item.kind !== ItemKinds.TREASURE) return null;
    const count = Math.max(SaleRules.MIN_QUANTITY, Math.floor(Number(quantity) || SaleRules.MIN_QUANTITY));
    const diamondUnit = Math.max(0, Number(item.diamondValue) || 0);
    const moneyUnit = Math.max(0, Number(item.value) || 0);
    return {
      count,
      gain: (diamondUnit > 0 ? diamondUnit : moneyUnit) * count,
      currencyId: diamondUnit > 0 ? SaleRules.DIAMOND_CURRENCY_ID : SaleRules.MONEY_CURRENCY_ID
    };
  }

  /**
   * @param {string} itemId
   * @param {number} quantity
   * @returns {{result:string,count:number,gain:number,currencyId:string|null}}
   */
  sell(itemId, quantity = SaleRules.MIN_QUANTITY) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return this._failure(SaleResults.NO_SAVE);
    const item = ItemDB.getInstance().getById(itemId);
    if (!item || item.kind !== ItemKinds.TREASURE) return this._failure(SaleResults.NOT_SELLABLE);
    const owned = save.inventory.count(itemId);
    if (owned < SaleRules.MIN_QUANTITY) return this._failure(SaleResults.OUT_OF_STOCK);
    const requested = Math.max(SaleRules.MIN_QUANTITY, Math.floor(Number(quantity) || SaleRules.MIN_QUANTITY));
    const count = Math.min(requested, owned);
    const diamondUnit = Math.max(0, Number(item.diamondValue) || 0);
    const moneyUnit = Math.max(0, Number(item.value) || 0);
    const currencyId = diamondUnit > 0 ? SaleRules.DIAMOND_CURRENCY_ID : SaleRules.MONEY_CURRENCY_ID;
    const gain = (diamondUnit > 0 ? diamondUnit : moneyUnit) * count;
    if (!save.inventory.remove(itemId, count)) return this._failure(SaleResults.OUT_OF_STOCK);
    save.currencies.add(currencyId, gain);
    EventBus.getInstance().dispatch(new MineItemSoldEvent(count, { deferSave: true }));
    SaveSystem.getInstance().saveCurrent();
    const message = diamondUnit > 0
      ? t('sale_sold_diamonds', { quantity: TextFormatter.formatNumber(count), item: t(`item.${itemId}.name`), gain: TextFormatter.formatNumber(gain) })
      : t('sale_sold_money', { quantity: TextFormatter.formatNumber(count), item: t(`item.${itemId}.name`), gain: t('money_amount', { value: TextFormatter.formatNumber(gain) }) });
    NotificationSystem.getInstance().notifyTemporary(message, {
      channel: NotificationChannels.ECONOMY,
      tone: NotificationTones.SUCCESS
    });
    return { result: SaleResults.SOLD, count, gain, currencyId };
  }

  /** @private @param {string} result */
  _failure(result) {
    if (result === SaleResults.NOT_SELLABLE || result === SaleResults.OUT_OF_STOCK) {
      NotificationSystem.getInstance().notifyTemporary(t('sale_not_available'), {
        channel: NotificationChannels.ECONOMY,
        tone: NotificationTones.WARNING
      });
    }
    return { result, count: 0, gain: 0, currencyId: null };
  }
}
