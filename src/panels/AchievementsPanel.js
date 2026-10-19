/**
 * @file AchievementsPanel.js
 * @brief Achievement tracker window: pinned achievement selector + progress card
 * (C++: class AchievementsPanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIIcon } from '../ui/UIIcon.js';
import { UIDropdown } from '../ui/UIDropdown.js';
import { UIProgressBar } from '../ui/UIProgressBar.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { PlayerDefaults } from '../config/PlayerDefaults.js';
import { t } from '../localization/LocalizationManager.js';

/** Achievements that can be pinned (labelKey = display name). */
const PINNABLE_ACHIEVEMENTS = Object.freeze([
  { id: 'dex_kanto', labelKey: 'ach_dex_kanto' },
  { id: 'badges_kanto', labelKey: 'ach_badges_kanto' },
  { id: 'total_battles', labelKey: 'ach_total_battles' }
]);

export class AchievementsPanel extends DraggablePanel {
  /**
   * @param {string} column - Starting dashboard column (DashboardColumns value)
   */
  constructor(column) {
    super({
      id: WindowIds.ACHIEVEMENTS,
      column,
      title: t('achievements_title'),
      icon: 'trophy',
      bodyId: 'achievements-window-body',
      bodyClassName: 'pw-static-022 pw-ach-body',
      name: 'AchievementsPanel'
    });
    this._pinnedId = PINNABLE_ACHIEVEMENTS[0].id;
    this._render();
  }

  /** @private */
  _render() {
    this.clearChildren();
    const caught = SaveSystem.getInstance().getCurrentSave()?.pokedex.getCaughtCount() ?? 0;
    const total = PlayerDefaults.KANTO_DEX_SIZE;
    const pct = Math.min(100, Math.round((caught / total) * 100));
    const pinnedLabel = t(PINNABLE_ACHIEVEMENTS.find((a) => a.id === this._pinnedId).labelKey);

    this.addChild(new UIContainer({
      className: 'pw-ach-pinned-row',
      children: [
        new UIText({ className: 'pw-ach-pinned-label', text: t('achievements_pinned_label') }),
        new UIDropdown({
          className: 'pw-ach-pinned-dropdown',
          options: PINNABLE_ACHIEVEMENTS.map((a) => ({ value: a.id, label: t(a.labelKey) })),
          value: this._pinnedId,
          onChange: (id) => {
            this._pinnedId = id;
            NotificationSystem.getInstance().notify(
              t('notif_achievement_pinned', { name: t(PINNABLE_ACHIEVEMENTS.find((a) => a.id === id).labelKey) }),
              { channel: NotificationChannels.ACHIEVEMENT }
            );
            this._render();
          }
        })
      ]
    }));

    const card = new UIContainer({
      className: 'pw-ach-tracker-card',
      children: [
        new UIContainer({
          className: 'pw-ach-header-row',
          children: [
            new UIContainer({
              className: 'pw-ach-title',
              children: [new UIIcon({ name: 'star' }), new UIText({ text: pinnedLabel })]
            }),
            new UIText({ className: 'pw-rank-chip', text: t('ach_rank_bronze') })
          ]
        }),
        new UIContainer({
          className: 'pw-ach-progress-row',
          children: [
            new UIProgressBar({ value: caught, max: total, trackClassName: 'pw-ach-progress-bar-bg', fillClassName: 'pw-ach-progress-bar-fill' }),
            new UIContainer({
              className: 'pw-ach-stats-text',
              children: [
                new UIText({ text: t('value_over_max', { value: caught, max: total }) }),
                new UIText({ text: t('percent_value', { value: pct }) })
              ]
            })
          ]
        })
      ]
    });
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setTooltip(t('ach_open_hint'));
    card.addDomListener('click', () => NotificationSystem.getInstance().notify(
      t('ach_progress_summary', { name: pinnedLabel, value: caught, max: total, pct }),
      { channel: NotificationChannels.ACHIEVEMENT, tone: NotificationTones.WARNING }
    ));
    this.addChild(card);
  }
}
