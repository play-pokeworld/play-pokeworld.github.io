/**
 * @file MigrationV14ToV15.js
 * @brief Save migration 14 -> 15: persist the Rework secret-base domain.
 */

/** @param {*} value @returns {Object} */
function secretBaseState(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
}

export const MigrationV14ToV15 = Object.freeze({
  from: 14,
  to: 15,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
      ...source,
      version: 15,
      secretBase: secretBaseState(source.secretBase)
    };
  }
});
