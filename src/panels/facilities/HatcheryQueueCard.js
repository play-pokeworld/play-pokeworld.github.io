/** @file HatcheryQueueCard.js @brief Daycare/incubation queue and fossil priority controls. */
import { FacilityFilterGrid } from './FacilityFilterGrid.js';
import { FacilityQueueCard } from './FacilityQueueCard.js';
import { UIButton } from '../../ui/UIButton.js';
import { HatcherySystem } from '../../systems/HatcherySystem.js';
import { FacilityPokemonSelectionSystem } from '../../systems/FacilityPokemonSelectionSystem.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../../config/ModalIds.js';
import { HatcheryRules } from '../../config/HatcheryRules.js';
import { t } from '../../localization/LocalizationManager.js';

export class HatcheryQueueCard extends FacilityQueueCard {
  /** @param {number} index */
  constructor(index) {
    super({
      index,
      onBuild: () => HatcherySystem.getInstance().rebuildQueues(index),
      onAdd: () =>
        FacilityPokemonSelectionSystem.getInstance().openSelection(
          'hatchery',
          index,
          { queue: true },
        ),
      onClear: () => HatcherySystem.getInstance().removeFromQueue(index),
      onRemove: (_entry, position) =>
        HatcherySystem.getInstance().removeFromQueue(index, position),
      onFossil: () =>
        EventBus.getInstance().dispatch(
          new ModalOpenRequestedEvent(ModalIds.HATCHERY_FOSSILS, {
            slotIndex: index,
            queue: true,
          }),
        ),
    });
    this._priority = new UIButton({
      text: t('facility_priority_pokemon'),
      size: 'sm',
      variant: 'secondary',
      onClick: () => HatcherySystem.getInstance().togglePriority(index),
    });
    this._mode = new UIButton({
      text: t('hatchery_mode_switch'),
      className: 'hbtn hatchery-mode-toggle',
      size: 'sm',
      onClick: () => HatcherySystem.getInstance().toggleMode(index),
    });
    this.addOption(this._summary);
    this.addOption(this._mode);
    this.addOption(this._priority);
    this._filtersGrid = new FacilityFilterGrid('hatchery', (key, value) =>
      HatcherySystem.getInstance().setAutomationFilter(index, key, value),
    );
    this.addFilter(this._filtersGrid);
  }
  /** @param {Object} entry @param {Object} state */
  setEntry(entry, state) {
    const incubation = entry.mode === HatcheryRules.MODE_INCUBATION;
    this._filtersGrid.setFilters(entry.filters);
    this.toggleClass('is-exp', !incubation);
    this.toggleClass('is-breed', incubation);
    this._mode.setVisible(state.modeSwitchUnlocked);
    this._mode.setText(
      t(incubation ? 'hatchery_mode_incubation' : 'hatchery_mode_daycare'),
    );

    this._title.setText(
      `${t('facility_slot_number', { slot: entry.index + 1 })} · ${t(incubation ? 'hatchery_mode_incubation' : 'hatchery_mode_daycare')}`,
    );
    this._priority.setVisible(incubation);
    this._priority.toggleClass('is-fossil', entry.priority === 'fossil');
    this._priority.toggleClass('is-pokemon', entry.priority !== 'fossil');
    this._priority.setText(
      t(
        entry.priority === 'fossil'
          ? 'facility_priority_fossil'
          : 'facility_priority_pokemon',
      ),
    );
    super.setModel({
      summary: t(
        incubation
          ? 'facility_hatchery_incubation_queue_hint'
          : 'facility_hatchery_daycare_queue_hint',
        { kos: HatcheryRules.DAYCARE_KOS_PER_LEVEL },
      ),
      queue: entry.queue,
      limit: state.queueLimit,
      fossilsAllowed: incubation && state.modeSwitchUnlocked,
    });
  }
}
