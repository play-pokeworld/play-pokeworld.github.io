/**
 * @file HatcheryPanel.js
 * @brief Daycare / hatchery window: incubation slots (C++: class HatcheryPanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIImage } from '../ui/UIImage.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { UIProgressBar } from '../ui/UIProgressBar.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { t } from '../localization/LocalizationManager.js';

/**
 * Preview slots until the breeding system is ported (labelKey = slot title).
 * @type {ReadonlyArray<{labelKey: string, steps: number, maxSteps: number}|null>}
 */
const PREVIEW_SLOTS = Object.freeze([
  { labelKey: 'hatchery_mystery_egg', steps: 240, maxSteps: 500 },
  null
]);

export class HatcheryPanel extends DraggablePanel {
  /**
   * @param {string} column - Starting dashboard column (DashboardColumns value)
   */
  constructor(column) {
    super({
      id: WindowIds.HATCHERY,
      column,
      title: t('hatchery_management_title'),
      icon: 'egg',
      bodyId: 'hatchery-window-body',
      bodyClassName: 'pw-static-022 pw-hatchery-body',
      name: 'HatcheryPanel'
    });

    for (const slot of PREVIEW_SLOTS) {
      this.addChild(slot ? HatcheryPanel._eggSlot(slot) : HatcheryPanel._emptySlot());
    }
  }

  /** @private */
  static _eggSlot(slot) {
    const pct = Math.round((slot.steps / slot.maxSteps) * 100);
    return new UIContainer({
      className: 'pw-hatchery-slot',
      children: [
        new UIImage({ src: AssetPaths.item('mystery_egg.png'), alt: t('hatchery_mystery_egg'), className: 'pw-hatchery-egg-icon', pixelated: true }),
        new UIContainer({
          className: 'pw-hatchery-info',
          children: [
            new UIContainer({
              className: 'pw-hatchery-title-row',
              children: [new UIText({ text: t(slot.labelKey) }), new UIText({ text: t('percent_value', { value: pct }) })]
            }),
            new UIProgressBar({ value: slot.steps, max: slot.maxSteps, trackClassName: 'pw-hatchery-bar-bg', fillClassName: 'pw-hatchery-bar-fill' })
          ]
        })
      ]
    });
  }

  /** @private */
  static _emptySlot() {
    return new UIContainer({
      className: 'pw-hatchery-slot',
      children: [
        new UIText({ tagName: 'div', className: 'pw-hatchery-empty-icon', text: t('add_slot_symbol') }),
        new UIText({ tagName: 'div', className: 'pw-hatchery-empty-text', text: t('hatchery_slot_empty') })
      ]
    });
  }
}
