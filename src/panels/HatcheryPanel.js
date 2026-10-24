/** @file HatcheryPanel.js @brief Remote machine slots and local Pewter lab, composed from stable facility widgets. */
import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIKeyedList } from '../ui/UIKeyedList.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { HatcherySlotCard } from './facilities/HatcherySlotCard.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { ModalIds } from '../config/ModalIds.js';
import { HatcheryRules } from '../config/HatcheryRules.js';
import { HatcherySystem } from '../systems/HatcherySystem.js';
import { FossilSystem } from '../systems/FossilSystem.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { HatcheryChangedEvent } from '../core/events/HatcheryChangedEvent.js';
import { HatcheryLevelUpEvent } from '../core/events/HatcheryLevelUpEvent.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { BoxChangedEvent } from '../core/events/BoxChangedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { ContentAccessChangedEvent } from '../core/events/ContentAccessChangedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class HatcheryPanel extends DraggablePanel {
  /** @param {string} column */
  constructor(column) {
    super({
      id: WindowIds.HATCHERY,
      column,
      title: t('hatchery_management_title'),
      icon: 'egg',
      bodyId: 'hatchery-window-body',
      bodyClassName: 'pw-static-022 pw-hatchery-body machine-window-body',
      name: 'HatcheryPanel',
    });
    this._manage = new UIButton({
      icon: 'settings',
      text: t('hatchery_management_button'),
      className: 'hbtn pw-facility-manage',
      onClick: () =>
        EventBus.getInstance().dispatch(
          new ModalOpenRequestedEvent(ModalIds.HATCHERY_MANAGEMENT),
        ),
    });
    this._manage.setAriaLabel(t('hatchery_management_button'));
    this._manage.setTooltip(t('hatchery_management_button'));
    this._summary = new UIText({
      tagName: 'div',
      className: 'pw-facility-subtle',
    });
    this._slots = new UIKeyedList({
      className: 'hatchery-slots pw-facility-slots',
      create: (entry) => new HatcherySlotCard(entry.index),
      update: (card, entry) => card.setEntry(entry, this._state),
    });
    this._hatchery = new UIContainer({
      className: 'pw-facility-dashboard',
      children: [
        new UIContainer({
          className: 'hatchery-upgrade-row',
          children: [this._manage],
        }),
        this._slots,
      ],
    });
    this._lab = new UIButton({
      text: t('fossil_lab_title'),
      icon: 'egg',
      variant: 'secondary',
      onClick: () =>
        EventBus.getInstance().dispatch(
          new ModalOpenRequestedEvent(ModalIds.FOSSIL_LAB),
        ),
    });
    this.addChildren([this._hatchery, this._lab]);
    for (const event of [
      HatcheryChangedEvent,
      HatcheryLevelUpEvent,
      TeamChangedEvent,
      BoxChangedEvent,
      LocationChangedEvent,
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
    const system = HatcherySystem.getInstance();
    const unlocked = system.isUnlocked();
    const lab = FossilSystem.getInstance().canUseHere();
    this.toggleClass('pw-progression-hidden', !unlocked && !lab);
    this._hatchery.setVisible(unlocked);
    this._manage.setVisible(unlocked);
    this._lab.setVisible(lab);
    if (!unlocked) return;
    this._state = system.getSnapshot();
    this._summary.setText(
      t('hatchery_slots_current', {
        count: this._state.maxSlots,
        max: HatcheryRules.MAX_SLOT_COUNT,
      }),
    );
    this._slots.setEntries(this._state.entries);
  }
}
