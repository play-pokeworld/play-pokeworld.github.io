/**
 * @file MineSellObjective.js
 * @brief Sell `count` mine items (original mine_sell, counts the quantity sold).
 */
import { QuestObjective } from './QuestObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { MineItemSoldEvent } from '../../../core/events/MineItemSoldEvent.js';

export class MineSellObjective extends QuestObjective {
  static TYPE = ObjectiveTypes.MINE_SELL;
  static EVENTS = [MineItemSoldEvent];

  /** @override */
  progressFor(event) {
    return Math.max(0, event.count);
  }
}
