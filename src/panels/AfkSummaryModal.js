/**
 * @file AfkSummaryModal.js
 * @brief Modal dialog presenting post-AFK fast-forward rewards and statistics.
 */

import { UIModal } from '../ui/UIModal.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIImage } from '../ui/UIImage.js';
import { ModalIds } from '../config/ModalIds.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { t } from '../localization/LocalizationManager.js';

export class AfkSummaryModal extends UIModal {
  constructor() {
    super({
      id: ModalIds.AFK_SUMMARY,
      overlayId: 'pw-afk-summary-overlay',
      className: 'pw-afk-modal-window',
      size: 'md',
      hasHeader: true,
      hasFooter: true,
      closeOnBackdrop: true,
      showCloseBtn: true,
      name: 'AfkSummaryModal'
    });
    this.setTitle(t('afk_summary_title'));
    /** @private @type {Object|null} */
    this._summary = null;
  }

  /** @override @param {Object} [params={}] */
  open(params = {}) {
    this._summary = params.summary || null;
    this.setTitle(t('afk_summary_title'));
    this._render();
    super.open(params);
  }

  /** @private */
  _render() {
    this.clearChildren();
    if (!this._summary) return;

    const summary = this._summary;
    const body = new UIContainer({ className: 'pw-afk-summary-body pw-col pw-gap-3' });

    // 1. Time away
    const totalSeconds = Math.max(1, Math.floor((Number(summary.durationMs) || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    body.addChild(new UIContainer({
      className: 'pw-afk-row pw-row pw-items-center pw-gap-2',
      children: [
        new UIText({ tagName: 'span', className: 'pw-bold', text: t('afk_time_away', { time: timeText }) })
      ]
    }));

    // 2. Battles simulated
    body.addChild(new UIContainer({
      className: 'pw-afk-row pw-row pw-items-center pw-gap-2',
      children: [
        new UIText({ tagName: 'span', text: t('afk_battles_simulated', { count: TextFormatter.formatNumber(summary.battlesSimulated || 0) }) })
      ]
    }));

    // 3. Currency earned
    if (summary.currencyEarned > 0) {
      body.addChild(new UIContainer({
        className: 'pw-afk-row pw-row pw-items-center pw-gap-2',
        children: [
          new UIText({ tagName: 'span', className: 'pw-text-accent pw-bold', text: t('afk_money_earned', { amount: TextFormatter.formatNumber(summary.currencyEarned) }) })
        ]
      }));
    }

    // 4. Daycare progress
    if (summary.daycareKoAdvanced > 0) {
      body.addChild(new UIContainer({
        className: 'pw-afk-row pw-row pw-items-center pw-gap-2',
        children: [
          new UIText({ tagName: 'span', text: t('afk_daycare_progress', { count: TextFormatter.formatNumber(summary.daycareKoAdvanced) }) })
        ]
      }));
    }

    // 5. Route items dropped
    if (summary.itemsDropped && summary.itemsDropped.length > 0) {
      const itemsBox = new UIContainer({ className: 'pw-afk-items-section pw-col pw-gap-1' });
      itemsBox.addChild(new UIText({ tagName: 'div', className: 'pw-bold pw-text-sm', text: t('afk_items_found') }));

      const itemsGrid = new UIContainer({ className: 'pw-row pw-wrap pw-gap-2' });
      const itemDb = ItemDB.getInstance();
      for (const item of summary.itemsDropped) {
        const itemDef = itemDb.getById(item.itemId);
        const name = itemDef ? t(itemDef.nameKey) : item.itemId;
        const card = new UIContainer({
          className: 'pw-afk-item-card pw-row pw-items-center pw-gap-1',
          children: [
            new UIImage({
              src: itemDb.getImagePath(item.itemId),
              alt: name,
              className: 'inv-icon-img',
              pixelated: true
            }),
            new UIText({ tagName: 'span', text: `${name} ×${item.quantity}` })
          ]
        });
        itemsGrid.addChild(card);
      }
      itemsBox.addChild(itemsGrid);
      body.addChild(itemsBox);
    }

    // 6. Fatigue note
    if (summary.fatigueWearApplied > 0) {
      body.addChild(new UIContainer({
        className: 'pw-afk-row pw-afk-fatigue-note pw-text-warning',
        children: [
          new UIText({ tagName: 'span', text: t('afk_fatigue_note', { damage: summary.fatigueWearApplied }) })
        ]
      }));
    }

    this.addChild(body);

    // Footer
    this.setFooter([
      new UIButton({
        className: 'hbtn pw-btn-primary',
        text: t('afk_close_btn'),
        onClick: () => this.close()
      })
    ]);
  }
}
