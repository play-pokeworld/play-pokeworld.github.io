/**
 * @file SaveValues.js
 * @brief Small JSON-only readers used by persistent facility models.
 */
export const SaveValues = Object.freeze({
  number(value, fallback = 0, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
  },
  integer(value, fallback, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, Math.floor(number))) : fallback;
  },
  ids(value) {
    return [...new Set((Array.isArray(value) ? value : [])
      .filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))];
  },
  copy(value) { return value == null ? null : JSON.parse(JSON.stringify(value)); }
});
