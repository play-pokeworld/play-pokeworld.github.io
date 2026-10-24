/** @file TrainingAutomationView.js @brief All persistent training slots and their automation queues. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIKeyedList } from '../../ui/UIKeyedList.js';
import { TrainingSystem } from '../../systems/TrainingSystem.js';
import { TrainingQueueCard } from './TrainingQueueCard.js';
import { t } from '../../localization/LocalizationManager.js';

export class TrainingAutomationView extends UIContainer {
  constructor() {
    super({
      className: 'pw-facility-training-auto',
      name: 'TrainingAutomationView',
    });
    this._slots = new UIKeyedList({
      className: 'training-auto-slot-list',
      create: (entry) => new TrainingQueueCard(entry.index),
      update: (card, entry) => card.setEntry(entry, this._state),
    });
    this._slots.setTooltip(t('queue_manual_hint'));
    this.addChild(this._slots);
    this.refresh();
  }
  /** Retains each queue editor when its battle progresses. */
  refresh() {
    this._state = TrainingSystem.getInstance().getSnapshot();
    this._slots.setEntries(this._state.slots);
  }
}
