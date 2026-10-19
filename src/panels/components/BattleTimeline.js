/**
 * @file BattleTimeline.js
 * @brief Strip of the last battle actions above the fighters (C++: class BattleTimeline : public UIContainer).
 * Same markup as the original (`#battle-visual-timeline > span.battle-timeline-chip.<kind>`):
 * one chip per move used (tinted with the move type) and one chip for the damage of hits
 * that are not neutral ("12 ×2"). Only the last TIMELINE_MAX_CHIPS chips are kept.
 */

import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { BattleConfig } from '../../config/BattleConfig.js';
import { effectivenessDisplay } from './EffectivenessDisplay.js';
import { t } from '../../localization/LocalizationManager.js';

/** Chip kinds (CSS modifiers of .battle-timeline-chip). */
export const TimelineChipKinds = Object.freeze({ MOVE: 'move' });

export class BattleTimeline extends UIContainer {
  constructor() {
    super({ id: 'battle-visual-timeline', name: 'BattleTimeline' });
    /** @private @type {UIText[]} oldest first */
    this._chips = [];
  }

  /**
   * Adds the chips of one attack.
   * @param {import('../../core/events/BattleAttackEvent.js').BattleAttackEvent} attack
   */
  addAttack(attack) {
    this._addChip(t(`move.${attack.moveId}`), `${TimelineChipKinds.MOVE} type-${attack.moveType}`);
    const display = effectivenessDisplay(attack.effectiveness);
    if (display.chipKind) {
      this._addChip(t('battle_timeline_damage', { damage: attack.damage, multiplier: t(display.labelKey) }), display.chipKind);
    }
  }

  /** Removes every chip (new battle). */
  clear() {
    this._chips = [];
    this.clearChildren();
  }

  /**
   * @private
   * @param {string} text
   * @param {string} classes - Kind modifiers
   */
  _addChip(text, classes) {
    const chip = new UIText({ tagName: 'span', className: `battle-timeline-chip ${classes}`, text });
    this.addChild(chip);
    this._chips.push(chip);
    while (this._chips.length > BattleConfig.TIMELINE_MAX_CHIPS) {
      const oldest = this._chips.shift();
      this.removeChild(oldest);
      oldest.destroy();
    }
  }
}
