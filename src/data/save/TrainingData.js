/**
 * @file TrainingData.js
 * @brief Assigned collection uids, automation queues and resumable battle DTOs.
 */
import { FacilityFilterRules } from '../../config/FacilityFilterRules.js';
import { FacilityFilterData } from './FacilityFilterData.js';
import { BaseModel } from '../core/BaseModel.js';
import { SaveValues } from '../core/SaveValues.js';
import { BattleSnapshotRules } from '../../config/BattleSnapshotRules.js';
import { TrainingRules } from '../../config/TrainingRules.js';
import { FacilityRules } from '../../config/FacilityRules.js';

export class TrainingData extends BaseModel {
  /** @param {Object} [data={}] */
  constructor(data = {}) {
    super('TrainingData', 'Data');
    this.deserialize(data);
  }
  /** @param {string} uid @returns {number} */
  findSlot(uid) {
    return this.slots.findIndex(
      (slot) => slot.pokemonUid === uid || slot.queue.includes(uid),
    );
  }
  /** @returns {string[]} */
  getReservedUids() {
    return this.slots
      .flatMap((slot) => [slot.pokemonUid, ...slot.queue])
      .filter(Boolean);
  }
  /** @override */
  serialize() {
    return {
      maxSlots: this.maxSlots,
      queueLevel: this.queueLevel,
      slots: this.slots.map(({ filters, ...slot }) => ({
        ...SaveValues.copy(slot),
        filters: filters.serialize(),
      })),
    };
  }
  /** @override @param {Object} data */
  deserialize(data = {}) {
    const raw = data && typeof data === 'object' ? data : {};
    this.maxSlots = SaveValues.integer(
      raw.maxSlots,
      TrainingRules.DEFAULT_SLOT_COUNT,
      TrainingRules.DEFAULT_SLOT_COUNT,
      TrainingRules.MAX_SLOT_COUNT,
    );
    this.queueLevel = SaveValues.integer(
      raw.queueLevel,
      0,
      0,
      FacilityRules.QUEUE_UPGRADE_COSTS.length,
    );
    this.slots = Array.from({ length: this.maxSlots }, (_, index) => {
      const slot = raw.slots?.[index] || {};
      const battle =
        slot.battle?.version === BattleSnapshotRules.VERSION &&
        slot.battle.training === true
          ? SaveValues.copy(slot.battle)
          : null;
      const filters = new FacilityFilterData('training', slot.filters);
      const selected = filters.get('mode');
      const autoOptions =
        selected === 'all'
          ? [...FacilityFilterRules.MODE_ORDER]
          : TrainingRules.MODES.includes(selected)
            ? [selected]
            : TrainingRules.AUTOMATION_OPTIONS.filter((id) =>
                slot.autoOptions?.includes(id),
              );
      return {
        pokemonUid: typeof slot.pokemonUid === 'string' ? slot.pokemonUid : '',
        filters,
        mode: TrainingRules.MODES.includes(slot.mode)
          ? slot.mode
          : TrainingRules.MODE_ID,
        battle,
        elapsed: SaveValues.number(slot.elapsed),
        autoPurchased: slot.autoPurchased === true,
        autoEnabled:
          slot.autoPurchased === true &&
          slot.autoEnabled === true &&
          (slot.battle == null || battle !== null),
        autoOptions,
        queue: SaveValues.ids(slot.queue).slice(
          0,
          FacilityRules.QUEUE_DEFAULT +
            this.queueLevel * FacilityRules.QUEUE_STEP,
        ),
        result:
          slot.result && typeof slot.result === 'object'
            ? SaveValues.copy(slot.result)
            : null,
      };
    });
  }
}
