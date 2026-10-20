/**
 * @file MigrationV5ToV6.js
 * @brief Save migration 5 -> 6: persist progressive currency visibility and local capture counts.
 */
import { CURRENCIES } from '../CurrencyDefinitions.js';

const LEGACY_REVEAL_IDS = Object.freeze({
  dungeonToken: 'dungeonTokens',
  questPoint: 'questPoints',
  diamond: 'diamonds',
  battlePoint: 'battlePoints',
  farmPoint: 'farmPoints',
  contestToken: 'contestTokens'
});

/** @param {*} value */
function readCounters(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result = {};
  for (const [key, rawCount] of Object.entries(value)) {
    const count = Math.floor(Number(rawCount) || 0);
    if (count > 0) result[key] = count;
  }
  return result;
}

export const MigrationV5ToV6 = Object.freeze({
  from: 5,
  to: 6,
  /** @param {Object} raw @returns {Object} */
  migrate(raw) {
    const currencies = raw.currencies && typeof raw.currencies === 'object' ? raw.currencies : {};
    const storedReveal = currencies.revealed && typeof currencies.revealed === 'object'
      ? currencies.revealed
      : {};
    const legacyReveal = raw.G?.wallet?.revealed && typeof raw.G.wallet.revealed === 'object'
      ? raw.G.wallet.revealed
      : {};
    const revealed = {};

    for (const definition of CURRENCIES) {
      const legacyId = LEGACY_REVEAL_IDS[definition.id];
      const amount = Number(currencies[definition.id]) || 0;
      const wasRevealed = storedReveal[definition.id] === true ||
        (legacyId ? legacyReveal[legacyId] === true : false);
      revealed[definition.id] = definition.id === 'money' || wasRevealed || amount > 0;
    }

    const statistics = raw.statistics && typeof raw.statistics === 'object' ? raw.statistics : {};
    return {
      ...raw,
      version: 6,
      currencies: { ...currencies, revealed },
      statistics: {
        ...statistics,
        capturesByLocation: readCounters(statistics.capturesByLocation)
      }
    };
  }
});
