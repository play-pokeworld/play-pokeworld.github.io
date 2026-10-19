/**
 * @file ItemObjective.js
 * @brief Hold the item `item` in the bag (original item: checked, not consumed).
 */
import { StateObjective } from './StateObjective.js';
import { ObjectiveTypes } from '../ObjectiveTypes.js';
import { InventoryChangedEvent } from '../../../core/events/InventoryChangedEvent.js';

export class ItemObjective extends StateObjective {
  static TYPE = ObjectiveTypes.ITEM;
  static EVENTS = [InventoryChangedEvent];

  /** @override */
  stateProgress(context) {
    return context.itemCount(this.params.item) > 0 ? 1 : 0;
  }

  /** @override */
  get count() {
    return 1;
  }

  /** @override */
  describe() {
    return { count: 1, item: this.params.item };
  }
}
