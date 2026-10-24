/** @file MigrationV17ToV18.js @brief Adds slot-local filter facts without changing assignments, FIFO order or battle DTOs. */
import { SaveValues } from '../../core/SaveValues.js';
import { HatcheryRules } from '../../../config/HatcheryRules.js';
import { FacilityFilterData } from '../FacilityFilterData.js';
export const MigrationV17ToV18 = Object.freeze({
  from: 17,
  to: 18,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const hatchery = raw.hatchery || {},
      training = raw.training || {};
    return {
      ...raw,
      version: 18,
      hatchery: {
        ...hatchery,
        filters: Array.from(
          {
            length: SaveValues.integer(
              hatchery.maxSlots,
              HatcheryRules.DEFAULT_SLOT_COUNT,
              1,
              HatcheryRules.MAX_SLOT_COUNT,
            ),
          },
          (_, index) =>
            new FacilityFilterData(
              'hatchery',
              hatchery.filters?.[index] || { sort: 'legacy' },
            ).serialize(),
        ),
      },
      training: {
        ...training,
        slots: (Array.isArray(training.slots) ? training.slots : []).map(
          (source) => {
            const slot = source && typeof source === 'object' ? source : {};
            return {
              ...slot,
              filters: new FacilityFilterData(
                'training',
                slot.filters || {
                  mode:
                    slot.autoOptions?.length === 1
                      ? slot.autoOptions[0]
                      : 'configured',
                },
              ).serialize(),
            };
          },
        ),
      },
    };
  },
});
