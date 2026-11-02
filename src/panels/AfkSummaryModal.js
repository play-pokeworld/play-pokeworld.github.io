/**
 * @file AfkSummaryModal.js
 * @brief AFK window: the progress of the replay, then the recap of what really happened while away.
 *
 * Two modes, like the original game:
 *  - `progress`: the catch-up is grinding — title, live percentage and a filling bar,
 *  - `summary` : the recap — status pill, the shared session stat grid (same component as the battle
 *    summary: ONE visual language), the captured Pokémon and the found items, an optional note, close.
 *
 * Every figure comes from the replay itself (see `fastforward/CatchUpRecorder.js`): nothing is
 * estimated, and an absence that simulated nothing never opens this window.
 */

import { UIModal } from '../ui/UIModal.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIImage } from '../ui/UIImage.js';
import { UIProgressBar } from '../ui/UIProgressBar.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { ModalIds } from '../config/ModalIds.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { SaveCard } from '../ui/SaveCard.js';
import { groupBattleCaptures } from './components/BattleLootStrip.js';
import { FastForwardRules } from '../config/FastForwardRules.js';
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
    // Built once: `setFooter` appends, and the window is re-rendered on every progress tick.
    this._closeButton = new UIButton({ className: 'hbtn pw-btn-primary', text: t('afk_close_btn'), onClick: () => this.close() });
    this.setFooter([this._closeButton]);
    /** @private @type {Object|null} */
    this._summary = null;
    /** @private @type {Object|null} */
    this._progress = null;
  }

  /** @override @param {Object} [params={}] */
  open(params = {}) {
    this._summary = params.summary || null;
    this._progress = params.mode === 'progress' ? params.progress || null : null;
    const titleKey = this._progress ? 'offline_ff_title'
      : this._summary?.debug ? 'afk_panel_title_debug' : 'afk_panel_title_return';
    this.setTitle(t(titleKey));
    this._render();
    super.open(params);
  }

  /** @private */
  _render() {
    this.clearChildren();
    if (this._progress) {
      this._renderProgress();
      return;
    }
    if (!this._summary) return;
    this._renderSummary(this._summary);
  }

  /** First phase: the replay is grinding. @private */
  _renderProgress() {
    const progress = this._progress;
    const body = new UIContainer({ className: 'pw-afk-summary-body pw-col pw-gap-3' });
    body.addChild(new UIText({
      tagName: 'div',
      className: 'afk-result-status',
      text: t('afk_ff_progress', { pct: progress.pct })
    }));
    body.addChild(new UIProgressBar({
      value: progress.pct,
      max: 100,
      size: 'lg',
      className: 'afk-ff-bar'
    }));
    const stageLabel = this._activityLabel(progress.stage);
    if (stageLabel) body.addChild(new UIText({ tagName: 'div', className: 'afk-ff-stage pw-text-sm pw-light1', text: stageLabel }));
    this.addChild(body);
  }

  /**
   * Second phase: the recap, in the same order and with the same components as the original AFK panel.
   * @private
   * @param {Object} summary
   */
  _renderSummary(summary) {
    const body = new UIContainer({ className: 'pw-afk-summary-body pw-col pw-gap-3' });

    // 1. Status pill: lost > something gained > nothing gained.
    const statusKey = summary.lost ? 'afk_panel_status_lost'
      : summary.wins > 0 ? 'afk_panel_status_ok' : 'afk_panel_status_empty';
    const statusKind = summary.lost ? ' danger' : summary.wins > 0 ? ' success' : ' info';
    body.addChild(new UIText({ tagName: 'div', className: `afk-result-status${statusKind}`, text: t(statusKey) }));

    // 2. Shared session stat grid (identical to the battle summary).
    body.addChild(this._statGrid(summary));

    // 3. Captured Pokémon, then found items — same rows as the battle summary.
    body.addChild(this._capturesSection(summary.captureList || []));
    body.addChild(this._itemsSection(summary.items || []));

    // 4. Notes: dungeon outcome, then the cap when it truncated the window.
    for (const note of this._notes(summary)) {
      body.addChild(new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1 pw-afk-note', text: note }));
    }

    this.addChild(body);
  }

  /** @private @param {Object} summary @returns {UIContainer} */
  _statGrid(summary) {
    // The absence itself: what the player lived through, capped window or not (the cap is noted below).
    const duration = SaveCard.formatPlayTime((Number(summary.durationMs) || 0) / 1000);
    const metrics = [
      [duration, t('afk_panel_duration')],
      [summary.wins || 0, t('afk_panel_battles')],
      [`+${TextFormatter.formatNumber(summary.money || 0)}₽`, t('afk_panel_money')],
      [summary.fainted || 0, t('afk_panel_team_ko')],
      [summary.captures || 0, t('afk_panel_captures')],
      [`+${TextFormatter.formatNumber(summary.energy || 0)}`, t('afk_panel_energy')],
      [summary.training || 0, t('afk_panel_training')],
      [summary.mineDigs || 0, t('afk_panel_mine_digs')]
    ];
    if ((summary.daycareLevels || 0) > 0) metrics.push([`+${summary.daycareLevels}`, t('afk_panel_daycare_levels')]);
    const dungeon = summary.dungeon;
    if (dungeon) {
      metrics.push([dungeon.fights || 0, t('afk_panel_dungeon_fights')]);
      if ((dungeon.floors || 0) > 0) metrics.push([`+${dungeon.floors}`, t('afk_panel_dungeon_floors')]);
      if ((dungeon.tokens || 0) > 0) metrics.push([`+${TextFormatter.formatNumber(dungeon.tokens)}`, t('afk_panel_dungeon_tokens')]);
      if ((dungeon.runs || 0) > 0) metrics.push([dungeon.runs, t('afk_panel_dungeon_runs')]);
    }

    const grid = new UIContainer({ className: 'battle-session-summary-grid' });
    for (const [value, label] of metrics) {
      grid.addChild(new UIContainer({
        className: 'battle-session-summary-stat',
        children: [
          new UIText({ tagName: 'b', text: typeof value === 'number' ? TextFormatter.formatNumber(value) : value }),
          new UIText({ tagName: 'span', text: label })
        ]
      }));
    }
    return grid;
  }

  /** @private @param {Array<Object>} captures @returns {UIContainer} */
  _capturesSection(captures) {
    const section = new UIContainer({ className: 'pw-col pw-gap-sm' });
    section.addChild(new UIText({ tagName: 'h3', className: 'battle-summary-section-title', text: t('captured_pokemon_title') }));
    const groups = groupBattleCaptures(captures);
    if (!groups.length) {
      section.addChild(new UIText({ tagName: 'div', className: 'battle-summary-empty', text: t('afk_none') }));
      return section;
    }
    for (const group of groups) {
      const pokemonName = group.name || t(`pokemon.${group.species}`);
      const subLabel = group.duplicateCount > 0
        ? t('battle_summary_duplicate_count', { count: group.duplicateCount })
        : t(group.shiny ? 'battle_summary_shiny' : 'battle_summary_standard');
      section.addChild(new UIContainer({
        className: `battle-summary-entry ${group.shiny ? 'is-shiny' : 'is-normal'}`,
        children: [
          new UIContainer({
            className: 'pw-summary-sprite',
            children: [new UIPokemonSprite({ species: group.species, form: group.form, shiny: group.shiny, alt: pokemonName, size: PokemonSpriteSizes.STANDARD })]
          }),
          new UIContainer({
            className: 'pw-flex-1',
            children: [
              new UIText({ tagName: 'div', className: 'pw-summary-name', text: pokemonName }),
              new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1', text: subLabel })
            ]
          }),
          new UIText({ tagName: 'div', className: 'pw-summary-count', text: `×${group.count}` })
        ]
      }));
    }
    return section;
  }

  /** @private @param {Array<Object>} items @returns {UIContainer} */
  _itemsSection(items) {
    const section = new UIContainer({ className: 'pw-col pw-gap-sm' });
    section.addChild(new UIText({ tagName: 'h3', className: 'battle-summary-section-title', text: t('found_items_title') }));
    const filtered = items.filter((entry) => entry?.itemId && entry.quantity > 0);
    if (!filtered.length) {
      section.addChild(new UIText({ tagName: 'div', className: 'battle-summary-empty', text: t('afk_none') }));
      return section;
    }
    const list = new UIContainer({ className: 'pw-row-wrap pw-gap-sm' });
    for (const entry of filtered) {
      const name = t(`item.${entry.itemId}.name`);
      list.addChild(new UIContainer({
        className: 'pw-card-bordered pw-row pw-gap-sm battle-summary-entry is-normal',
        children: [
          new UIImage({ src: ItemDB.getInstance().getImagePath(entry.itemId), alt: name, className: 'battle-summary-item-icon', pixelated: true }),
          new UIContainer({
            children: [
              new UIText({ tagName: 'div', className: 'pw-bold pw-text-sm pw-light2', text: name }),
              new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1', text: `×${TextFormatter.formatNumber(entry.quantity)}` })
            ]
          })
        ]
      }));
    }
    section.addChild(list);
    return section;
  }

  /**
   * @private
   * @param {Object} summary
   * @returns {string[]} Truthful notes: dungeon outcome first, then the truncated window.
   */
  _notes(summary) {
    const notes = [];
    const dungeon = summary.dungeon;
    if (dungeon) {
      if ((dungeon.runs || 0) > 1) {
        notes.push(t('afk_dungeon_runs_note', {
          runs: dungeon.runs,
          clears: dungeon.clears || 0,
          wipes: dungeon.wipes || 0
        }));
      } else if (dungeon.cleared) {
        notes.push(t('afk_dungeon_cleared'));
      } else if (dungeon.wiped) {
        notes.push(t('afk_dungeon_wiped'));
      } else if (dungeon.active) {
        notes.push(t(dungeon.pilot ? 'afk_dungeon_ongoing_pilot' : 'afk_dungeon_ongoing', {
          floor: dungeon.floor || 1,
          depth: dungeon.depth || 1
        }));
      }
    }
    if ((Number(summary.durationMs) || 0) / 1000 > FastForwardRules.MAX_CATCH_UP_SECONDS) {
      notes.push(t('afk_capped_note', {
        time: SaveCard.formatPlayTime(FastForwardRules.MAX_CATCH_UP_SECONDS),
        hours: Math.round(FastForwardRules.MAX_CATCH_UP_SECONDS / 3600)
      }));
    }
    return notes;
  }

  /**
   * @private
   * @param {string} activity
   * @returns {string} Stage line of the progress phase (the activity being replayed)
   */
  _activityLabel(activity) {
    switch (activity) {
      case 'battle': return t('afk_panel_battles');
      case 'training': return t('afk_panel_training');
      case 'dungeonAuto': return t('afk_panel_dungeon_fights');
      case 'mineAuto': return t('afk_panel_mine_digs');
      default: return '';
    }
  }
}
