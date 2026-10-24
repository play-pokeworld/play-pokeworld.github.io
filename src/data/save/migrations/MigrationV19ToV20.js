/** @file MigrationV19ToV20.js @brief Adds relaunch ownership without changing collection, facilities or battle snapshots. */
import { RelaunchData } from '../RelaunchData.js';
import { convertLegacyRelaunch } from './LegacyRelaunchMigration.js';
export const MigrationV19ToV20 = Object.freeze({
  from: 19,
  to: 20,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    return {
      ...raw,
      version: 20,
      relaunch: new RelaunchData(
        raw.relaunch || convertLegacyRelaunch(raw),
      ).serialize(),
    };
  },
});
