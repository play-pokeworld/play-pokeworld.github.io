/** @file StaffListView.js @brief Shared live employee list; one active employee per sector. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { FacilityStaffSystem } from '../../systems/FacilityStaffSystem.js';
import { HatcheryRules } from '../../config/HatcheryRules.js';
import { TrainingRules } from '../../config/TrainingRules.js';
import { StaffRules } from '../../config/StaffRules.js';
import { StaffCard } from './StaffCard.js';
import { t } from '../../localization/LocalizationManager.js';

export class StaffListView extends UIContainer {
  /** @param {string} feature */
  constructor(feature) {
    super({ className: 'pw-facility-staff', name: 'StaffListView' });
    this._feature = feature;
    this._summary = new UIText({ tagName: 'div', className: 'staff-summary' });
    this._fees = new UIText({
      tagName: 'div',
      className: 'pw-facility-fee-banner',
    });
    this._list = new UIContainer({ className: 'staff-list' });
    this._cards = new Map();
    this.addChildren([this._summary, this._fees, this._list]);
    this.refresh();
  }
  /** Keeps portraits, buttons and progress bars alive on XP updates. */
  refresh() {
    const system = FacilityStaffSystem.getInstance();
    const models = system.getSnapshot(this._feature);
    const active = models.some((model) => model.active);
    this._summary.setText(
      t('facility_staff_summary', {
        active: Number(active),
        max: StaffRules.MAX_ACTIVE,
        levels: system.getSectorLevels(this._feature),
        total: models.length * StaffRules.MAX_LEVEL,
      }),
    );
    this._fees.setVisible(this._feature !== 'mine');
    this._fees.setText(
      t('facility_staff_fees', {
        fee: system.getFee(
          this._feature,
          this._feature === 'hatchery'
            ? HatcheryRules.AUTO_HATCH_FEE
            : TrainingRules.AUTOMATION_FEE,
        ),
      }),
    );
    for (const model of models) {
      if (!this._cards.has(model.id)) {
        const card = new StaffCard(model);
        this._cards.set(model.id, card);
        this._list.addChild(card);
      }
      this._cards.get(model.id).setModel(model, active);
    }
  }
}
