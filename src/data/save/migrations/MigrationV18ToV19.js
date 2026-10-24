/** @file MigrationV18ToV19.js @brief Adds a manual mine-survey clock without touching valid progress or roster references. */
import { SaveValues } from '../../core/SaveValues.js';
export const MigrationV18ToV19 = Object.freeze({
  from: 18,
  to: 19,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const mine = raw.mine && typeof raw.mine === 'object' ? raw.mine : {};
    return {
      ...raw,
      version: 19,
      mine: {
        ...mine,
        manualSurveyReadyAt: SaveValues.number(
          mine.manualSurveyReadyAt,
          0,
          0,
          Number.MAX_SAFE_INTEGER,
        ),
      },
    };
  },
});
