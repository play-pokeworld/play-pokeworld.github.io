/** @file MineAutomationView.js @brief Purchased automatic chisel and its per-hit diamond fee. */
import { UIContainer } from '../../ui/UIContainer.js';
import { FacilityAutomationToggle } from './FacilityAutomationToggle.js';
import { MineRules } from '../../config/MineRules.js';
import { MineSystem } from '../../systems/MineSystem.js';

export class MineAutomationView extends UIContainer {
  constructor() {
    super({ className: 'automation-dashboard', name: 'MineAutomationView' });
    this._auto = new FacilityAutomationToggle({
      icon: 'pickaxe',
      titleKey: 'mine_auto_title',
      descriptionKey: 'facility_mine_auto_desc',
      currency: 'diamond',
      price: {
        currency: MineRules.CURRENCY_ID,
        amount: MineRules.AUTOMATION_COST,
      },
      onBuy: () => MineSystem.getInstance().buyAutomation(),
      onToggle: () => MineSystem.getInstance().toggleAutomation(),
    });
    this.addChild(this._auto);
    this.refresh();
  }
  /** Keeps the module switch stable while mining runs. */
  refresh() {
    const state = MineSystem.getInstance().getSnapshot();
    this._auto.setModel({
      purchased: state?.autoPurchased === true,
      enabled: state?.autoEnabled === true,
      fee: state?.autoFee,
    });
  }
}
