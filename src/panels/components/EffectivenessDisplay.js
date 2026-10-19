/**
 * @file EffectivenessDisplay.js
 * @brief How each type-effectiveness tier is shown (C++: namespace EffectivenessDisplay).
 * badgeClass: modifier of `.move-eff-badge` (move rows);
 * chipKind: modifier of `.battle-timeline-chip` (null = no damage chip for this tier);
 * labelKey: localization key of the short multiplier ("×2", "×½"…).
 */

import { EffectivenessTiers, TypeChart } from '../../data/core/TypeChart.js';

const DISPLAY = Object.freeze({
  [EffectivenessTiers.IMMUNE]: Object.freeze({ badgeClass: 'immune', chipKind: 'immune', labelKey: 'eff_0x' }),
  [EffectivenessTiers.QUARTER]: Object.freeze({ badgeClass: 'resist', chipKind: 'resist', labelKey: 'eff_quarter' }),
  [EffectivenessTiers.HALF]: Object.freeze({ badgeClass: 'resist', chipKind: 'resist', labelKey: 'eff_half' }),
  [EffectivenessTiers.NEUTRAL]: Object.freeze({ badgeClass: 'neutral', chipKind: null, labelKey: 'eff_1x' }),
  [EffectivenessTiers.DOUBLE]: Object.freeze({ badgeClass: 'super', chipKind: 'super', labelKey: 'eff_2x' }),
  [EffectivenessTiers.QUADRUPLE]: Object.freeze({ badgeClass: 'super', chipKind: 'super', labelKey: 'eff_4x' })
});

/**
 * @param {number} multiplier - TypeChart.effectiveness() result
 * @returns {{badgeClass: string, chipKind: string|null, labelKey: string}}
 */
export function effectivenessDisplay(multiplier) {
  return DISPLAY[TypeChart.tierOf(multiplier)];
}
