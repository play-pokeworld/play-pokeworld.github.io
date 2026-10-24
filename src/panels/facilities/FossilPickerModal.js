/** @file FossilPickerModal.js @brief Fossil selection for a slot or queue; optional local laboratory specialization. */
import { StaticModalPanel } from '../../ui/StaticModalPanel.js';
import { UIText } from '../../ui/UIText.js';
import { UIKeyedList } from '../../ui/UIKeyedList.js';
import { FossilChoiceCard } from './FossilChoiceCard.js';
import { ModalIds } from '../../config/ModalIds.js';
import { HatcherySystem } from '../../systems/HatcherySystem.js';
import { FossilSystem } from '../../systems/FossilSystem.js';
import { InventoryChangedEvent } from '../../core/events/InventoryChangedEvent.js';
import { HatcheryChangedEvent } from '../../core/events/HatcheryChangedEvent.js';
import { LocationChangedEvent } from '../../core/events/LocationChangedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { SaveCreatedEvent } from '../../core/events/SaveCreatedEvent.js';
import { SaveDeletedEvent } from '../../core/events/SaveDeletedEvent.js';
import { t } from '../../localization/LocalizationManager.js';

export class FossilPickerModal extends StaticModalPanel {
  /** @param {{lab?:boolean}} [options={}] */
  constructor({ lab = false } = {}) {
    super({
      id: lab ? ModalIds.FOSSIL_LAB : ModalIds.HATCHERY_FOSSILS,
      title: t(lab ? 'fossil_lab_title' : 'hatchery_select_fossil'),
      size: 'md',
      className: 'pw-fossil-picker',
      bodyClassName: 'pw-fossil-picker-body',
      name: 'FossilPickerModal',
    });
    this._lab = lab;
    this._slotIndex = 0;
    this._queue = false;
    this._empty = new UIText({
      tagName: 'p',
      className: 'pw-facility-subtle',
      text: t('fossil_no_candidates'),
    });
    this._choices = new UIKeyedList({
      className: 'pw-fossil-picker-grid',
      key: (entry) => entry.itemId,
      create: (entry) =>
        new FossilChoiceCard(entry, () => this._choose(entry.itemId)),
      update: (card, entry) => card.setEntry(entry),
    });
    this.addChildren([
      new UIText({
        tagName: 'p',
        className: 'pw-facility-subtle',
        text: t(lab ? 'fossil_lab_hint' : 'facility_fossil_picker_hint'),
      }),
      this._empty,
      this._choices,
    ]);
    for (const event of [
      InventoryChangedEvent,
      HatcheryChangedEvent,
      LocationChangedEvent,
    ])
      this.listen(event, () => {
        if (this.isOpen()) this._refresh();
      });
    for (const event of [SaveCreatedEvent, SaveLoadedEvent, SaveDeletedEvent])
      this.listen(event, () => this.close());
  }
  /** @override @param {Object} [params={}] */
  open(params = {}) {
    const system = HatcherySystem.getInstance();
    if (
      this._lab
        ? !FossilSystem.getInstance().canUseHere()
        : !system.isUnlocked() || !system.isModeSwitchUnlocked()
    )
      return;
    this._slotIndex = Number.isInteger(params.slotIndex) ? params.slotIndex : 0;
    this._queue = params.queue === true;
    super.open(params);
    this._refresh();
  }
  /** @private */
  _refresh() {
    if (this._lab && !FossilSystem.getInstance().canUseHere()) {
      this.close();
      return;
    }
    const choices = HatcherySystem.getInstance().getFossilCandidates();
    this._empty.setVisible(!choices.length);
    this._choices.setEntries(choices);
  }
  /** @private @param {string} itemId */
  _choose(itemId) {
    const system = HatcherySystem.getInstance();
    const result = this._lab
      ? FossilSystem.getInstance().revive(itemId)
      : this._queue
        ? system.enqueueFossil(this._slotIndex, itemId)
        : system.startFossilIncubation(itemId, this._slotIndex);
    if (result.result === 'ready') this.close();
  }
}
