/** @file TrainingQueueCard.js @brief Per-slot automation choices, module toggle and persistent FIFO editor. */
import { FacilityFilterGrid } from './FacilityFilterGrid.js';
import { FacilityQueueCard } from './FacilityQueueCard.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UISwitch } from '../../ui/UISwitch.js';
import { FacilityAutomationToggle } from './FacilityAutomationToggle.js';
import { FacilityPokemonSelectionSystem } from '../../systems/FacilityPokemonSelectionSystem.js';
import { TrainingSystem } from '../../systems/TrainingSystem.js';
import { FacilityStaffSystem } from '../../systems/FacilityStaffSystem.js';
import { TrainingRules } from '../../config/TrainingRules.js';
import { FacilityUiRules } from '../../config/FacilityUiRules.js';
import { t } from '../../localization/LocalizationManager.js';

export class TrainingQueueCard extends FacilityQueueCard {
  /** @param {number} index */
  constructor(index) {
    super({
      index,
      onAdd: () =>
        FacilityPokemonSelectionSystem.getInstance().openSelection(
          'training',
          index,
          { queue: true },
        ),
      onClear: () => TrainingSystem.getInstance().removeFromQueue(index),
      onRemove: (entry) =>
        TrainingSystem.getInstance().removeFromQueue(index, entry.uid),
      onBuild: () => TrainingSystem.getInstance().fillQueue(index),
    });
    this._auto = new FacilityAutomationToggle({
      icon: 'dumbbell',
      titleKey: 'facility_auto_training',
      descriptionKey: 'facility_auto_training_desc',
      price: { currency: 'questPoint', amount: TrainingRules.AUTOMATION_COST },
      onBuy: () => TrainingSystem.getInstance().buyAutomation(index),
      onToggle: () => TrainingSystem.getInstance().toggleAutomation(index),
    });
    this.addClass('pw-training-queue-card');
    this.addClass('training-auto-slot-card');
    this._header = new UIContainer({
      className: 'pw-training-queue-header',
      children: [this._title, this._summary, this._auto],
    });
    this.addChild(this._header);
    this._filtersGrid = new FacilityFilterGrid('training', (key, value) =>
      TrainingSystem.getInstance().setAutomationFilter(index, key, value),
    );
    this.addFilter(this._filtersGrid);
    this._modes = new Map();
    for (const id of TrainingRules.AUTOMATION_OPTIONS) {
      const toggle = new UISwitch({
        onLabel: t(FacilityUiRules.MODE_KEYS[id]),
        offLabel: t(FacilityUiRules.MODE_KEYS[id]),
        onChange: () =>
          TrainingSystem.getInstance().toggleAutoOption(index, id),
      });
      toggle.setAriaLabel(t(FacilityUiRules.MODE_KEYS[id]));
      this._modes.set(id, toggle);
      this.addOption(toggle);
    }
    this.addOption(
      new UIContainer({
        className: 'pw-facility-subtle',
        children: [
          new UIText({ text: t('facility_training_queue_reservation') }),
        ],
      }),
    );
  }
  /** @param {Object} entry @param {Object} state */
  setEntry(entry, state) {
    this._auto.setModel({
      purchased: entry.autoPurchased,
      enabled: entry.autoEnabled,
      fee: FacilityStaffSystem.getInstance().getFee(
        'training',
        TrainingRules.AUTOMATION_FEE,
      ),
    });
    this.toggleClass('is-purchased', entry.autoPurchased);
    this._summary.setVisible(entry.autoPurchased);
    this._header.setTooltip(t('facility_training_queue_reservation'));
    this._filters.setVisible(entry.autoPurchased);
    this._options.setVisible(
      entry.autoPurchased && entry.filters.mode === 'configured',
    );
    this._filtersGrid.setVisible(entry.autoPurchased);
    this._filtersGrid.setFilters(entry.filters, !entry.autoPurchased);
    this._queueBox.setVisible(entry.autoPurchased);
    for (const mode of entry.modes) {
      const toggle = this._modes.get(mode.id);
      toggle.setVisible(
        entry.autoPurchased &&
          entry.filters.mode === 'configured' &&
          mode.unlocked,
      );
      toggle.setChecked(entry.autoOptions.includes(mode.id));
    }
    super.setModel({
      summary: entry.pokemon
        ? t('facility_assigned_name', { name: entry.pokemon.getDisplayName() })
        : t('training_slot_empty'),
      queue: entry.queue,
      limit: state.queueLimit,
    });
  }
}
