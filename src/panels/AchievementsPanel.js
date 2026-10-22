/**
 * @file AchievementsPanel.js
 * @brief Achievement tracker window: pinned regional Pokédex progress.
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
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { PokedexChangedEvent } from '../core/events/PokedexChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { t } from '../localization/LocalizationManager.js';

/** Pinned achievements with the reference tier thresholds. */
const PINNABLE_ACHIEVEMENTS = Object.freeze([
  Object.freeze({ id: 'dex_kanto', labelKey: 'ach_dex_kanto', region: 'kanto', tiers: [25, 50, 100, 151] }),
  Object.freeze({ id: 'dex_johto', labelKey: 'ach_dex_johto', region: 'johto', tiers: [20, 40, 70, 100] }),
  Object.freeze({ id: 'dex_hoenn', labelKey: 'ach_dex_hoenn', region: 'hoenn', tiers: [30, 60, 100, 135] }),
  Object.freeze({ id: 'dex_national', labelKey: 'ach_dex_national', region: null, tiers: [100, 200, 300, 386] })
]);

const RANK_KEYS = Object.freeze(['ach_rank_bronze', 'ach_rank_silver', 'ach_rank_gold', 'ach_rank_diamond']);

/** @param {Object} achievement @param {Object|null} save */
function progressFor(achievement, save) {
  const pokemon = PokemonDB.getInstance();
  const species = achievement.region ? pokemon.getByRegion(achievement.region) : pokemon.getAll();
  const value = save?.pokedex
    ? species.filter((entry) => save.pokedex.isCaught(entry.id)).length
    : 0;
  let currentTier = -1;
  achievement.tiers.forEach((target, index) => {
    if (value >= target) currentTier = index;
  });
  const completed = currentTier >= achievement.tiers.length - 1;
  const nextTier = completed ? achievement.tiers.length - 1 : currentTier + 1;
  const nextTarget = achievement.tiers[nextTier];
  const previousTarget = currentTier >= 0 ? achievement.tiers[currentTier] : 0;
  const pct = completed
    ? 100
    : Math.max(0, Math.min(100, Math.round(((value - previousTarget) / (nextTarget - previousTarget)) * 100)));
  return {
    value,
    nextTarget,
    pct,
    rankKey: currentTier < 0 ? 'ach_rank_locked' : RANK_KEYS[currentTier],
    rankClass: currentTier < 0 ? 'rank-none' : `rank-${RANK_KEYS[currentTier].replace('ach_rank_', '')}`
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
    this._pinnedId = PINNABLE_ACHIEVEMENTS[0].id;
    for (const eventClass of [PokedexChangedEvent, SaveCreatedEvent, SaveLoadedEvent]) {
      this.listen(eventClass, () => this._render());
    }
    this._render();
  }

  /** @private */
  _render() {
    this.clearChildren();
    const save = SaveSystem.getInstance().getCurrentSave();
    const achievement = PINNABLE_ACHIEVEMENTS.find((entry) => entry.id === this._pinnedId)
      ?? PINNABLE_ACHIEVEMENTS[0];
    const pinnedLabel = t(achievement.labelKey);
    const progress = progressFor(achievement, save);
    const percent = t('percent_value', { value: progress.pct });
    const valueText = t('value_over_max', { value: progress.value, max: progress.nextTarget });

    this.addChild(new UIContainer({
      className: 'pw-ach-pinned-row',
      children: [
        new UIText({ className: 'pw-ach-pinned-label', text: t('achievements_pinned_label') }),
        new UIDropdown({
          className: 'pw-ach-pinned-dropdown',
          options: PINNABLE_ACHIEVEMENTS.map((entry) => ({ value: entry.id, label: t(entry.labelKey) })),
          value: achievement.id,
          onChange: (id) => {
            this._pinnedId = id;
            NotificationSystem.getInstance().notify(
              t('notif_achievement_pinned', { name: t(PINNABLE_ACHIEVEMENTS.find((entry) => entry.id === id)?.labelKey ?? achievement.labelKey) }),
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
            new UIText({ className: `pw-rank-chip ${progress.rankClass}`, text: t(progress.rankKey) })
          ]
        }),
        new UIContainer({
          className: 'pw-ach-progress-row',
          children: [
            new UIProgressBar({ value: progress.pct, max: 100, trackClassName: 'pw-ach-progress-bar-bg', fillClassName: 'pw-ach-progress-bar-fill' }),
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
    card.addDomListener('click', () => NotificationSystem.getInstance().notify(
      t('ach_tracker_progress_summary', {
        name: pinnedLabel,
        value: progress.value,
        max: progress.nextTarget,
        pct: progress.pct
      }),
      { channel: NotificationChannels.ACHIEVEMENT, tone: NotificationTones.WARNING }
    ));
    this.addChild(card);
  }
}
