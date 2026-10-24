/**
 * @file FacilityManagementSystem.js
 * @brief Shared upgrade query/command adapter; feature availability remains FeatureAccessSystem's job.
 */
import { BaseSystem } from './BaseSystem.js';
import { SaveSystem } from './SaveSystem.js';
import { HatcherySystem } from './HatcherySystem.js';
import { TrainingSystem } from './TrainingSystem.js';
import { MineSystem } from './MineSystem.js';
import { HatcheryRules } from '../config/HatcheryRules.js';
import { TrainingRules } from '../config/TrainingRules.js';
import { MineRules } from '../config/MineRules.js';
import { FacilityRules } from '../config/FacilityRules.js';

export class FacilityManagementSystem extends BaseSystem {
  static _instance = null;
  /** @returns {FacilityManagementSystem} */
  static getInstance() { return this._instance || (this._instance = new FacilityManagementSystem()); }
  constructor() { super('FacilityManagementSystem', 'System'); }
  /** @param {string} feature @returns {Object[]} */
  getUpgrades(feature) {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return [];
    let upgrades = [];
    if (feature === 'hatchery') {
      const data = save.hatchery;
      upgrades = [
        { id: 'slots', labelKey: 'hatchery_slots_title', value: data.maxSlots, maximum: HatcheryRules.MAX_SLOT_COUNT,
          cost: HatcheryRules.SLOT_UPGRADE_COSTS[data.maxSlots - 1], currency: FacilityRules.QUEUE_CURRENCY },
        { id: 'queue', labelKey: 'queue_size_title', value: FacilityRules.QUEUE_DEFAULT + data.queueLevel * FacilityRules.QUEUE_STEP,
          maximum: FacilityRules.QUEUE_MAX, cost: FacilityRules.QUEUE_UPGRADE_COSTS[data.queueLevel], currency: FacilityRules.QUEUE_CURRENCY },
        { id: 'auto-hatch', labelKey: 'facility_auto_hatch', owned: data.autoHatchPurchased, cost: HatcheryRules.AUTO_HATCH_COST, currency: FacilityRules.QUEUE_CURRENCY },
        { id: 'auto-fill', labelKey: 'facility_auto_fill', owned: data.autoFillPurchased, cost: HatcheryRules.AUTO_FILL_COST, currency: FacilityRules.QUEUE_CURRENCY }
      ];
    } else if (feature === 'training') {
      const data = save.training;
      upgrades = [
        { id: 'slots', labelKey: 'facility_training_slots', value: data.maxSlots, maximum: TrainingRules.MAX_SLOT_COUNT,
          cost: data.maxSlots < TrainingRules.MAX_SLOT_COUNT ? TrainingRules.SECOND_SLOT_COST : null, currency: FacilityRules.QUEUE_CURRENCY },
        { id: 'queue', labelKey: 'queue_size_title', value: FacilityRules.QUEUE_DEFAULT + data.queueLevel * FacilityRules.QUEUE_STEP,
          maximum: FacilityRules.QUEUE_MAX, cost: FacilityRules.QUEUE_UPGRADE_COSTS[data.queueLevel], currency: FacilityRules.QUEUE_CURRENCY },
        ...data.slots.map((slot, index) => ({ id: `auto-${index}`, labelKey: 'facility_auto_training_slot', labelParams: { slot: index + 1 },
          owned: slot.autoPurchased, cost: TrainingRules.AUTOMATION_COST, currency: FacilityRules.QUEUE_CURRENCY }))
      ];
    } else if (feature === 'mine') {
      const data = save.mine;
      upgrades = [
        { id: 'energy', labelKey: 'mine_energy_upgrade_title', value: data.maxEnergy,
          cost: MineRules.ENERGY_UPGRADE_COSTS[data.energyLevel], currency: MineRules.CURRENCY_ID },
        { id: 'auto', labelKey: 'mine_auto_title', owned: data.autoPurchased, cost: MineRules.AUTOMATION_COST, currency: MineRules.CURRENCY_ID },
        ...Object.entries(MineRules.TOOLS).filter(([, tool]) => tool.cost > 0).map(([id, tool]) => ({
          id: `tool-${id}`, labelKey: `mine_tool_${id}`, owned: data.unlockedTools.includes(id), cost: tool.cost, currency: MineRules.CURRENCY_ID,
          energyCost: tool.energyCost, power: tool.power
        }))
      ];
    }
    return upgrades.map((upgrade) => ({ ...upgrade,
      owned: upgrade.owned === true || upgrade.cost == null,
      canAfford: save.currencies.get(upgrade.currency) >= (upgrade.cost || 0) }));
  }
  /** @param {string} feature @param {string} id @returns {Object} */
  purchase(feature, id) {
    const offered = this.getUpgrades(feature).find((upgrade) => upgrade.id === id && !upgrade.owned);
    if (!offered) return { result: 'unavailable' };
    if (feature === 'hatchery') {
      const system = HatcherySystem.getInstance();
      if (id === 'slots') return system.upgradeSlot();
      if (id === 'queue') return system.upgradeQueue();
      if (id === 'auto-hatch') return system.buyAutomation('hatch');
      if (id === 'auto-fill') return system.buyAutomation('fill');
    } else if (feature === 'training') {
      const system = TrainingSystem.getInstance();
      if (id === 'slots') return system.upgradeSlot();
      if (id === 'queue') return system.upgradeQueue();
      if (id.startsWith('auto-')) return system.buyAutomation(Number(id.slice('auto-'.length)));
    } else if (feature === 'mine') {
      const system = MineSystem.getInstance();
      if (id === 'energy') return system.upgradeEnergy();
      if (id === 'auto') return system.buyAutomation();
      if (id.startsWith('tool-')) return system.buyTool(id.slice('tool-'.length));
    }
    return { result: 'unavailable' };
  }
}
