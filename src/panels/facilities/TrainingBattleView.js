/** @file TrainingBattleView.js @brief Independent live-training surface inside the live battle window. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIKeyedList } from '../../ui/UIKeyedList.js';
import { TrainingLiveBattleCard } from './TrainingLiveBattleCard.js';
import { TrainingSystem } from '../../systems/TrainingSystem.js';
import { TrainingBattleChangedEvent } from '../../core/events/TrainingBattleChangedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { SaveCreatedEvent } from '../../core/events/SaveCreatedEvent.js';
import { SaveDeletedEvent } from '../../core/events/SaveDeletedEvent.js';
import { t } from '../../localization/LocalizationManager.js';

export class TrainingBattleView extends UIContainer {
  constructor() {
    super({ className: 'pw-training-live', name: 'TrainingBattleView' });
    this._list = new UIKeyedList({
      className: 'pw-training-live-list',
      create: (entry) => new TrainingLiveBattleCard(entry.index),
      update: (card, entry) => card.setState(entry),
    });
    this.addChildren([
      new UIText({ tagName: 'h3', text: t('training_live_title') }),
      this._list,
    ]);
    for (const event of [
      TrainingBattleChangedEvent,
      SaveLoadedEvent,
      SaveCreatedEvent,
      SaveDeletedEvent,
    ])
      this.listen(event, () => this._refresh());
    this._refresh();
  }
  /** @override @param {number} dt */
  onUpdate(dt) {
    super.onUpdate(dt);
    this._refresh();
  }
  /** @private */
  _refresh() {
    const entries = TrainingSystem.getInstance().getLiveStates();
    this.setVisible(entries.length > 0);
    this._list.setEntries(entries);
  }
}
