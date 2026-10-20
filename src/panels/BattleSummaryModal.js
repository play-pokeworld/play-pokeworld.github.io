/**
 * @file BattleSummaryModal.js
 * @brief Original-style wild-session loot summary rendered entirely with UI widgets.
 */
import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIImage } from '../ui/UIImage.js';
import { UIButton } from '../ui/UIButton.js';
import { UIProgressBar } from '../ui/UIProgressBar.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { ModalIds } from '../config/ModalIds.js';
import { BattleSystem } from '../systems/BattleSystem.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleStateChangedEvent } from '../core/events/BattleStateChangedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { SaveCard } from '../ui/SaveCard.js';
import { groupBattleCaptures } from './components/BattleLootStrip.js';
import { t } from '../localization/LocalizationManager.js';

export class BattleSummaryModal extends StaticModalPanel {
  constructor() {
    super({
      id: ModalIds.BATTLE_SUMMARY,
      title: t('battle_session_summary_title'),
      size: 'lg',
      name: 'BattleSummaryModal'
    });
    this.setBodyClass('pw-battle-summary-modal');
    for (const eventClass of [BattleStartedEvent, BattleStateChangedEvent, BattleEndedEvent, SaveCreatedEvent, SaveLoadedEvent]) {
      this.listen(eventClass, () => {
        if (this.isOpen()) this._render();
      });
    }
  }

  /** Rebuilds the summary from a fresh, read-only system snapshot. @override */
  onEnter() {
    super.onEnter();
    this._render();
  }

  /** @private */
  _render() {
    this.clearChildren();
    const summary = BattleSystem.getInstance().getBattleSummary();
    const run = summary.run;
    if (!run) {
      this.addChild(new UIText({ tagName: 'p', className: 'battle-summary-empty', text: t('battle_summary_empty') }));
      return;
    }

    const layout = new UIContainer({ className: 'pw-battle-summary-layout' });
    const left = new UIContainer({ className: 'pw-battle-summary-column pw-battle-summary-column--combat' });
    const right = new UIContainer({ className: 'pw-battle-summary-column pw-battle-summary-column--loot' });
    this._renderRunStats(run, left);
    this._renderCurrencies(run, left);
    this._renderDamage(run.damageByPokemon || [], left);
    this._renderCaptures(run.catches || [], right);
    this._renderItems(run.items || [], right);
    layout.addChildren([left, right]);
    this.addChild(layout);
    this._renderFooter(summary);
  }

  /** @private @param {Object} run */
  _renderRunStats(run, target) {
    const catches = Array.isArray(run.catches) ? run.catches : [];
    const items = Array.isArray(run.items) ? run.items : [];
    const totalItems = items.reduce((sum, entry) => sum + Math.max(0, Number(entry.quantity) || 0), 0);
    const durationMs = Number(run.durationMs) || Math.max(0, Date.now() - (Number(run.startedAt) || Date.now()));
    const duration = SaveCard.formatPlayTime(durationMs / 1000);
    const locationName = run.locationId ? t(`location.${run.locationId}`) : '';
    const metrics = [
      [run.wins ?? run.battles ?? 0, t('afk_panel_battles')],
      [catches.length, t('afk_panel_captures')],
      [totalItems, t('found_items_title')],
      [run.playerKOs ?? 0, t('afk_panel_team_ko')],
      [duration, t('afk_panel_duration')],
      [locationName, t('tab_info')]
    ];
    target.addChild(new UIText({ tagName: 'h3', className: 'battle-summary-section-title', text: t('battle_summary_session_title') }));
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
    target.addChild(grid);
  }

  /** @private @param {Object} run @param {UIContainer} target */
  _renderCurrencies(run, target) {
    const entries = [];
    if (run.moneyGained > 0) {
      entries.push(this._currencyChip(
        'money',
        t('battle_loot_money_title'),
        `+${TextFormatter.formatNumber(run.moneyGained)}`
      ));
    }
    if (run.tokensGained > 0) {
      entries.push(this._currencyChip(
        'dungeonToken',
        t('dungeon_loot_bag_tokens'),
        TextFormatter.formatNumber(run.tokensGained)
      ));
    }
    if (!entries.length) return;
    target.addChild(new UIText({ tagName: 'h3', className: 'battle-summary-section-title', text: t('battle_summary_loot_title') }));
    target.addChild(new UIContainer({ className: 'pw-summary-currency', children: entries }));
  }

  /** @private @param {string} id @param {string} title @param {string} amount */
  _currencyChip(id, title, amount) {
    const chip = new UIContainer({ className: 'loot-item loot-currency' });
    chip.setTooltip(title);
    chip.addChildren([
      new UIImage({ src: AssetPaths.currency(id), alt: '', className: 'loot-currency-icon' }),
      new UIText({ tagName: 'span', className: 'loot-count', text: amount })
    ]);
    return chip;
  }

  /** @private @param {Array<Object>} damageEntries */
  _renderDamage(damageEntries, target) {
    target.addChild(new UIText({ tagName: 'h3', className: 'battle-summary-section-title', text: t('battle_team_damage_title') }));
    const sorted = [...damageEntries].sort((a, b) => (Number(b.damage) || 0) - (Number(a.damage) || 0));
    const totalDamage = sorted.reduce((sum, entry) => sum + Math.max(0, Number(entry.damage) || 0), 0);
    if (!sorted.length) {
      target.addChild(new UIText({ tagName: 'div', className: 'battle-summary-empty', text: t('battle_summary_no_damage') }));
      return;
    }

    const list = new UIContainer({ className: 'battle-damage-summary-list' });
    for (const entry of sorted) {
      const damage = Math.max(0, Number(entry.damage) || 0);
      const percent = totalDamage > 0 ? Math.round((damage / totalDamage) * 100) : 0;
      const pokemonName = entry.name || t(`pokemon.${entry.species}`);
      const row = new UIContainer({ className: 'battle-damage-row' });
      const head = new UIContainer({
        className: 'battle-damage-head',
        children: [
          new UIContainer({
            className: 'battle-damage-poke',
            children: [
              new UIPokemonSprite({ species: entry.species, alt: pokemonName, shiny: !!entry.shiny, size: PokemonSpriteSizes.STANDARD }),
              new UIText({ tagName: 'b', text: pokemonName })
            ]
          }),
          new UIContainer({
            className: 'battle-damage-values',
            children: [
              new UIText({ tagName: 'span', text: TextFormatter.formatNumber(damage) }),
              new UIText({ tagName: 'small', text: t('battle_summary_damage_meta', { percent, kos: entry.kos || 0 }) })
            ]
          })
        ]
      });
      row.addChildren([
        head,
        new UIProgressBar({ value: percent, max: 100, trackClassName: 'battle-damage-bar', fillClassName: 'battle-damage-fill' })
      ]);
      list.addChild(row);
    }
    target.addChild(list);
  }

  /** @private @param {Array<Object>} catches @param {UIContainer} target */
  _renderCaptures(catches, target) {
    target.addChild(new UIText({ tagName: 'h3', className: 'battle-summary-section-title', text: t('captured_pokemon_title') }));
    const groups = groupBattleCaptures(catches);
    if (!groups.length) {
      target.addChild(new UIText({ tagName: 'div', className: 'battle-summary-empty', text: t('battle_summary_no_captures') }));
      return;
    }
    const list = new UIContainer({ className: 'pw-col pw-gap-sm' });
    for (const group of groups) {
      const pokemonName = group.name || t(`pokemon.${group.species}`);
      const subLabel = group.duplicateCount > 0
        ? t('battle_summary_duplicate_count', { count: group.duplicateCount })
        : t(group.shiny ? 'battle_summary_shiny' : 'battle_summary_standard');
      list.addChild(new UIContainer({
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
    target.addChild(list);
  }

  /** @private @param {Array<Object>} items @param {UIContainer} target */
  _renderItems(items, target) {
    target.addChild(new UIText({ tagName: 'h3', className: 'battle-summary-section-title', text: t('found_items_title') }));
    const filtered = items.filter((entry) => entry?.itemId && entry.quantity > 0);
    if (!filtered.length) {
      target.addChild(new UIText({ tagName: 'div', className: 'battle-summary-empty', text: t('battle_summary_no_items') }));
      return;
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
    target.addChild(list);
  }

  /** @private @param {Object} summary */
  _renderFooter(summary) {
    const buttons = [];
    if (summary.state === 'ended' && summary.run?.battles > 0) {
      buttons.push(new UIButton({
        id: 'loot-restart-btn',
        variant: 'hbtn',
        className: 'pw-static-064',
        text: t('loot_restart_btn'),
        onClick: () => {
          const locationId = summary.run.locationId;
          this.close();
          BattleSystem.getInstance().startBattle(locationId);
        }
      }));
    }
    buttons.push(new UIButton({
      id: 'loot-continue-btn',
      variant: 'hbtn',
      className: 'pw-static-065',
      text: t('loot_continue_btn'),
      onClick: () => this.close()
    }));
    this.addChild(new UIContainer({ className: 'pw-static-063 pw-battle-summary-footer', children: buttons }));
  }
}
