/** @file LegacyRelaunchMigration.js @brief Pure conversion of explicit original purchase receipts and enabled preferences. */
import { RelaunchRules } from '../../../config/RelaunchRules.js';
import { DungeonAutoRules } from '../../../config/DungeonAutoRules.js';
import { LegacyAutomationRules } from '../../../config/LegacyAutomationRules.js';
const affirmative = (value) =>
  LegacyAutomationRules.TRUE_VALUES.includes(value);
const negative = (value) => LegacyAutomationRules.FALSE_VALUES.includes(value);
function receipt(value) {
  if (
    affirmative(value) ||
    (typeof value === 'number' && Number.isFinite(value) && value > 0)
  )
    return true;
  return (
    !!value &&
    typeof value === 'object' &&
    LegacyAutomationRules.PURCHASE_FLAGS.some((key) => affirmative(value[key]))
  );
}
/** @param {Object} source @returns {Object} */
export function convertLegacyRelaunch(source = {}) {
  const result = {},
    raw = source && typeof source === 'object' ? source : {};
  for (const [kind, rule] of Object.entries(RelaunchRules.UPGRADES)) {
    const upgrades = raw.automationUpgrades;
    const purchase = Array.isArray(upgrades)
      ? upgrades.find(
          (entry) => entry === rule.key || (entry && entry.key === rule.key),
        )
      : upgrades?.[rule.key];
    const preference = raw.automation?.[rule.key];
    const owned =
      (Array.isArray(upgrades) && purchase === rule.key) ||
      receipt(purchase) ||
      affirmative(preference) ||
      receipt(preference) ||
      affirmative(preference?.enabled);
    const disabled =
      negative(preference) ||
      negative(preference?.enabled) ||
      (preference == null && negative(purchase?.enabled));
    result[kind] = { purchased: !!owned, enabled: !!owned && !disabled };
  }
  result.dungeon.mode = DungeonAutoRules.MODES.includes(
    raw.automation?.autoDungeonMode,
  )
    ? raw.automation.autoDungeonMode
    : RelaunchRules.DEFAULT_MODE;
  return result;
}
