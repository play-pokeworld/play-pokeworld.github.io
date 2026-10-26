/** @file FacilityManagementModal.js @brief Shared upgrades/automation/staff shell for the three facilities. */
import { StaticModalPanel } from '../../ui/StaticModalPanel.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UITabBar } from '../../ui/UITabBar.js';
import { FACILITY_PANELS } from '../../config/FacilityPanels.js';
import { FacilityUiRules } from '../../config/FacilityUiRules.js';
import { FeatureAccessSystem } from '../../systems/FeatureAccessSystem.js';
import { FacilityUpgradesView } from './FacilityUpgradesView.js';
import { StaffListView } from './StaffListView.js';
import { HatcheryAutomationView } from './HatcheryAutomationView.js';
import { TrainingAutomationView } from './TrainingAutomationView.js';
import { MineAutomationView } from './MineAutomationView.js';
import { HatcheryChangedEvent } from '../../core/events/HatcheryChangedEvent.js';
import { TrainingBattleChangedEvent } from '../../core/events/TrainingBattleChangedEvent.js';
import { MineChangedEvent } from '../../core/events/MineChangedEvent.js';
import { FacilityStaffChangedEvent } from '../../core/events/FacilityStaffChangedEvent.js';
import { CurrencyChangedEvent } from '../../core/events/CurrencyChangedEvent.js';
import { ContentAccessChangedEvent } from '../../core/events/ContentAccessChangedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { SaveCreatedEvent } from '../../core/events/SaveCreatedEvent.js';
import { SaveDeletedEvent } from '../../core/events/SaveDeletedEvent.js';
import { t } from '../../localization/LocalizationManager.js';

export class FacilityManagementModal extends StaticModalPanel {
  /** @param {string} feature */
  constructor(feature) {
    const presentation = FACILITY_PANELS[feature];
    super({
      id: presentation.modalId,
      title: t(presentation.titleKey),
      size: 'md',
      className: 'management-inner pw-facility-management',
      bodyClassName: 'pw-facility-management-body',
      name: 'FacilityManagementModal',
    });
    this.setIcon('settings');
    this._feature = feature;
    this._views = new Map();
    this._tab = 'upgrades';
    this._tabs = new UITabBar({
      className: 'management-tabs',
      buttonClassName: 'hbtn',
      selectedId: this._tab,
      tabs: FacilityUiRules.TABS.map((id) => ({
        id,
        label: t(
          id === 'staff'
            ? FacilityUiRules.STAFF_TITLES[feature]
            : `management_${id}`,
        ),
        icon: {
          upgrades: 'save',
          automation: 'settings',
          staff: feature === 'mine' ? 'pickaxe' : 'team',
        }[id],
      })),
      onSelect: (id) => this._selectTab(id),
    });
    this._content = new UIContainer({ className: 'management-content' });
    this.addChild(
      new UIContainer({
        className: 'management-shell',
        children: [this._tabs, this._content],
      }),
    );
    for (const event of [
      HatcheryChangedEvent,
      TrainingBattleChangedEvent,
      MineChangedEvent,
      FacilityStaffChangedEvent,
      CurrencyChangedEvent,
      ContentAccessChangedEvent,
    ])
      this.listen(event, () => {
        if (this.isOpen()) this._refresh();
      });
    for (const event of [SaveLoadedEvent, SaveCreatedEvent, SaveDeletedEvent])
      this.listen(event, () => this.close());
  }
  /** @override @param {Object} [params={}] */
  open(params = {}) {
    if (!FeatureAccessSystem.getInstance().isFeatureUnlocked(this._feature))
      return;
    if (FacilityUiRules.TABS.includes(params.tab)) this._tab = params.tab;
    super.open(params);
    this._tabs.select(this._tab, false);
    this._selectTab(this._tab);
  }
  /** @private @param {string} id */
  _selectTab(id) {
    this._tab = id;
    if (!this._views.has(id)) {
      const view =
        id === 'upgrades'
          ? new FacilityUpgradesView(this._feature)
          : id === 'staff'
            ? new StaffListView(this._feature)
            : this._feature === 'hatchery'
              ? new HatcheryAutomationView()
              : this._feature === 'training'
                ? new TrainingAutomationView()
                : new MineAutomationView();
      this._views.set(id, view);
      this._content.addChild(view);
    }
    for (const [key, view] of this._views) view.setVisible(key === id);
    this._refresh();
  }
  /** @private */
  _refresh() {
    if (!FeatureAccessSystem.getInstance().isFeatureUnlocked(this._feature)) {
      this.close();
      return;
    }
    this._views.get(this._tab)?.refresh();
  }
}
