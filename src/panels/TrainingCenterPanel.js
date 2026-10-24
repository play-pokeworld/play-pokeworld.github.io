/** @file TrainingCenterPanel.js @brief Two persistent assignment cards and shared facility management. */
import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIButton } from '../ui/UIButton.js';
import { UIKeyedList } from '../ui/UIKeyedList.js';
import { TrainingLockedSlotCard } from './facilities/TrainingLockedSlotCard.js';
import { FacilityManagementSystem } from '../systems/FacilityManagementSystem.js';
import { CurrencyChangedEvent } from '../core/events/CurrencyChangedEvent.js';
import { TrainingSlotCard } from './facilities/TrainingSlotCard.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { ModalIds } from '../config/ModalIds.js';
import { TrainingSystem } from '../systems/TrainingSystem.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { TrainingBattleChangedEvent } from '../core/events/TrainingBattleChangedEvent.js';
import { TrainingResultChangedEvent } from '../core/events/TrainingResultChangedEvent.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { BoxChangedEvent } from '../core/events/BoxChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { ContentAccessChangedEvent } from '../core/events/ContentAccessChangedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class TrainingCenterPanel extends DraggablePanel {
  /** @param {string} column */
  constructor(column) {
    super({
      id: WindowIds.TRAINING,
      column,
      title: t('training_center_title'),
      icon: 'dumbbell',
      bodyId: 'training-window-body',
      bodyClassName: 'pw-static-022 pw-training-body machine-window-body',
      name: 'TrainingCenterPanel',
    });
    const manage = new UIButton({
      icon: 'settings',
      text: t('training_management_button'),
      className: 'hbtn pw-facility-manage',
      onClick: () =>
        EventBus.getInstance().dispatch(
          new ModalOpenRequestedEvent(ModalIds.TRAINING_MANAGEMENT),
        ),
    });
    manage.setAriaLabel(t('training_management_button'));
    manage.setTooltip(t('training_management_button'));
    this._slots = new UIKeyedList({
      className: 'pw-training-slot-list',
      create: (entry) => new TrainingSlotCard(entry.index),
      update: (card, entry) => card.setEntry(entry),
    });
    this._lockedSlot = new TrainingLockedSlotCard();
    this.addChildren([
      new UIContainer({
        className: 'hatchery-upgrade-row',
        children: [manage],
      }),
      new UIContainer({
        className: 'training-slot-grid pw-facility-slots',
        children: [this._slots, this._lockedSlot],
      }),
    ]);
    for (const event of [
      CurrencyChangedEvent,
      TrainingBattleChangedEvent,
      TrainingResultChangedEvent,
      BattleStartedEvent,
      BattleEndedEvent,
      BoxChangedEvent,
      SaveCreatedEvent,
      SaveLoadedEvent,
      SaveDeletedEvent,
      ContentAccessChangedEvent,
    ])
      this.listen(event, () => this._refresh());
    this._refresh();
  }
  /** @override */
  onEnter() {
    super.onEnter();
    this._refresh();
  }
  /** @private */
  _refresh() {
    const system = TrainingSystem.getInstance();
    this.toggleClass('pw-progression-hidden', !system.isUnlocked());
    if (system.isUnlocked()) {
      this._slots.setEntries(system.getSnapshot().slots);
      this._lockedSlot.setModel(
        FacilityManagementSystem.getInstance()
          .getUpgrades('training')
          .find((model) => model.id === 'slots'),
      );
    }
  }
}
