/**
 * @file MigrationV6ToV7.js
 * @brief Save migration 6 -> 7: persist guided-tutorial state.
 */

/** @param {*} value @returns {string[]} */
function idsOf(value) {
  if (Array.isArray(value)) return [...new Set(value.filter((id) => typeof id === 'string' && id))];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).filter(([, enabled]) => enabled === true).map(([id]) => id);
}

/**
 * Existing saves without tutorial state are not enrolled retroactively. Original saves that did
 * persist tutorial flags keep them, including their one-time reward guard.
 * @param {*} current
 * @param {*} legacy
 */
function tutorialState(current, legacy) {
  const source = current && typeof current === 'object' ? current : legacy;
  if (!source || typeof source !== 'object') {
    return { enabled: false, completed: [], rewardsClaimed: [] };
  }
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : false,
    completed: idsOf(source.completed),
    rewardsClaimed: idsOf(source.rewardsClaimed ?? source.rewards)
  };
}

export const MigrationV6ToV7 = Object.freeze({
  from: 6,
  to: 7,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const legacyTutorial = raw.G?.tutorial;
    return {
      ...raw,
      version: 7,
      tutorial: tutorialState(raw.tutorial, legacyTutorial)
    };
  }
});
