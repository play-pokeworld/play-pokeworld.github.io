/** @file HatcheryAutomationView.js @brief Purchased modules, sorting priorities and all hatchery FIFO queues. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIKeyedList } from '../../ui/UIKeyedList.js';
import { UIText } from '../../ui/UIText.js';
import { UISwitch } from '../../ui/UISwitch.js';
import { HatcherySystem } from '../../systems/HatcherySystem.js';
import { HatcheryRules } from '../../config/HatcheryRules.js';
import { FacilityAutomationToggle } from './FacilityAutomationToggle.js';
import { HatcheryQueueCard } from './HatcheryQueueCard.js';
import { t } from '../../localization/LocalizationManager.js';

export class HatcheryAutomationView extends UIContainer {
  constructor() {
    super({
      className: 'hatchery-auto-layout',
      name: 'HatcheryAutomationView',
    });
    this._hatch = new FacilityAutomationToggle({
      icon: 'egg',
      titleKey: 'automation_autoHatch',
      descriptionKey: 'automation_autoHatch_desc',
      price: { currency: 'questPoint', amount: HatcheryRules.AUTO_HATCH_COST },
      onBuy: () => HatcherySystem.getInstance().buyAutomation('hatch'),
      onToggle: () => HatcherySystem.getInstance().toggleAutomation('hatch'),
    });
    this._fill = new FacilityAutomationToggle({
      icon: 'box',
      titleKey: 'automation_autoSeedHatchery',
      descriptionKey: 'facility_auto_fill_desc',
      price: { currency: 'questPoint', amount: HatcheryRules.AUTO_FILL_COST },
      onBuy: () => HatcherySystem.getInstance().buyAutomation('fill'),
      onToggle: () => HatcherySystem.getInstance().toggleAutomation('fill'),
    });
    this._filters = new Map();
    const filters = new UIContainer({ className: 'pw-facility-filters' });
    for (const id of HatcheryRules.AUTOMATION_FILTERS) {
      const toggle = new UISwitch({
        onLabel: t(`facility_auto_filter_${id}`),
        offLabel: t(`facility_auto_filter_${id}`),
        onChange: () => HatcherySystem.getInstance().toggleAutoOption(id),
      });
      toggle.setAriaLabel(t(`facility_auto_filter_${id}`));
      this._filters.set(id, toggle);
      filters.addChild(toggle);
    }
    this._fees = new UIText({ tagName: 'p', className: 'pw-facility-subtle' });
    this._queues = new UIKeyedList({
      className: 'pw-facility-queues',
      create: (entry) => new HatcheryQueueCard(entry.index),
      update: (card, entry) => card.setEntry(entry, this._state),
    });
    this._legacy = new UIContainer({
      className: 'pw-facility-legacy-options',
      children: [
        new UIText({ tagName: 'b', text: t('facility_filter_legacy_rules') }),
        filters,
      ],
    });
    this.addChildren([
      new UIContainer({
        className: 'automation-dashboard',
        children: [this._hatch, this._fill],
      }),
      this._fees,
      this._legacy,
      this._queues,
    ]);
    this.refresh();
  }
  /** Updates options/fees/queues without replacing unaffected controls. */
  refresh() {
    const state = HatcherySystem.getInstance().getSnapshot();
    this._state = state;
    this._legacy.setVisible(
      state.entries.some((entry) => entry.filters.sort === 'legacy'),
    );
    this._hatch.setModel({
      purchased: state.autoHatchPurchased,
      enabled: state.autoHatchEnabled,
      fee: state.hatchFee,
    });
    this._fill.setModel({
      purchased: state.autoFillPurchased,
      enabled: state.autoFillEnabled,
    });
    this._fees.setVisible(state.autoHatchPurchased || state.autoFillPurchased);
    this._fees.setText(
      t('facility_hatchery_fees', {
        level: state.levelFee,
        hatch: state.hatchFee,
      }),
    );
    for (const [id, toggle] of this._filters)
      toggle.setChecked(state.autoOptions?.includes(id));
    this._queues.setEntries(state.entries);
  }
}
