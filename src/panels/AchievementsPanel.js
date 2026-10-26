/**
 * @file AchievementsPanel.js
 * @brief Achievement tracker window: pinned achievements progress and entry point to full achievements modal.
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIIcon } from '../ui/UIIcon.js';
import { UIProgressBar } from '../ui/UIProgressBar.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { AchievementSystem } from '../systems/AchievementSystem.js';
import { AchievementDB } from '../data/achievements/AchievementDB.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { ModalIds } from '../config/ModalIds.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { AchievementPinnedEvent } from '../core/events/AchievementPinnedEvent.js';
import { AchievementUnlockedEvent } from '../core/events/AchievementUnlockedEvent.js';
import { PokedexChangedEvent } from '../core/events/PokedexChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { LanguageChangedEvent } from '../core/events/LanguageChangedEvent.js';
import { t } from '../localization/LocalizationManager.js';

const RANK_KEYS = Object.freeze(['ach_rank_bronze', 'ach_rank_silver', 'ach_rank_gold', 'ach_rank_diamond']);

/**
 * Calculates display progress for an achievement.
 * @param {Object} ach
 * @param {Object|null} save
 * @returns {{value: number, nextTarget: number, pct: number, rankKey: string, rankClass: string}}
 */
function progressFor(ach, save) {
  const sys = AchievementSystem.getInstance();
  const prog = sys.getProgress(ach, save);
  const rankKey = prog.currentTier < 0 ? 'ach_rank_locked' : RANK_KEYS[Math.min(prog.currentTier, RANK_KEYS.length - 1)];
  const rankClass = prog.currentTier < 0 ? 'rank-none' : `rank-${rankKey.replace('ach_rank_', '')}`;

  return {
    value: prog.metricValue,
    nextTarget: prog.nextTarget,
    pct: prog.progressPct,
    rankKey,
    rankClass
  };
}

export class AchievementsPanel extends DraggablePanel {
  /** @param {string} column - Starting dashboard column (DashboardColumns value) */
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

    for (const eventClass of [
      AchievementPinnedEvent,
      AchievementUnlockedEvent,
      PokedexChangedEvent,
      SaveCreatedEvent,
      SaveLoadedEvent,
      LanguageChangedEvent
    ]) {
      this.listen(eventClass, () => this._render());
    }
    this._render();
  }

  /** @private */
  _render() {
    this.clearChildren();
    const save = SaveSystem.getInstance().getCurrentSave();
    const db = AchievementDB.getInstance();
    const sys = AchievementSystem.getInstance();

    const pinnedList = sys.getPinnedList(save);

    if (pinnedList.length === 0) {
      const emptyCard = new UIContainer({
        className: 'pw-ach-empty-tracker',
        children: [
          new UIText({ text: t('ach_no_pinned') })
        ]
      });
      emptyCard.setAttribute('role', 'button');
      emptyCard.setAttribute('tabindex', '0');
      emptyCard.setTooltip(t('ach_open_hint'));
      emptyCard.addDomListener('click', () => {
        EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.ACHIEVEMENTS));
      });
      this.addChild(emptyCard);
      return;
    }

    const cards = [];
    for (const pinnedAch of pinnedList) {
      const pinnedLabel = db.getLocalizedName(pinnedAch);
      const pinnedDesc = db.getLocalizedDesc(pinnedAch);

      const progress = progressFor(pinnedAch, save);
      const percent = t('percent_value', { value: progress.pct });
      const valueText = t('value_over_max', { value: progress.value, max: progress.nextTarget });
      const fam = db.getFamily(pinnedAch?.family);

      const card = new UIContainer({
        className: 'pw-ach-tracker-card',
        children: [
          new UIContainer({
            className: 'pw-ach-header-row',
            children: [
              new UIContainer({
                className: 'pw-ach-title-block',
                children: [
                  new UIContainer({
                    className: 'pw-ach-title',
                    children: [new UIIcon({ name: fam?.icon || 'star' }), new UIText({ text: pinnedLabel })]
                  }),
                  new UIText({ className: 'pw-ach-desc', text: pinnedDesc })
                ]
              }),
              new UIText({ className: `pw-rank-chip ${progress.rankClass}`, text: t(progress.rankKey) })
            ]
          }),
          new UIContainer({
            className: 'pw-ach-progress-row',
            children: [
              new UIProgressBar({
                value: progress.pct,
                max: 100,
                trackClassName: 'pw-ach-progress-bar-bg',
                fillClassName: 'pw-ach-progress-bar-fill'
              }),
              new UIContainer({
                className: 'pw-ach-stats-text',
                children: [new UIText({ text: valueText }), new UIText({ text: percent })]
              })
            ]
          })
        ]
      });

      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setTooltip(t('ach_open_hint'));
      card.addDomListener('click', () => {
        EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.ACHIEVEMENTS));
      });

      cards.push(card);
    }

    const container = new UIContainer({
      className: 'pw-ach-tracker-list',
      children: cards
    });

    this.addChild(container);
  }
}
