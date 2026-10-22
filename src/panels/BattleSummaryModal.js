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
import { ModalNames } from '../config/ModalNames.js';
import { BattleSystem } from '../systems/BattleSystem.js';
import { DungeonSystem } from '../systems/DungeonSystem.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleStateChangedEvent } from '../core/events/BattleStateChangedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { DungeonRunChangedEvent } from '../core/events/DungeonRunChangedEvent.js';
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
      size: 'md',
      className: 'pw-battle-summary-shell',
      name: ModalNames.BATTLE_SUMMARY
    });
    this.setBodyClass('pw-battle-summary-modal');
    for (const eventClass of [BattleStartedEvent, BattleStateChangedEvent, BattleEndedEvent, DungeonRunChangedEvent, SaveCreatedEvent, SaveLoadedEvent]) {
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
    const summary = this._mergeDungeonRun(BattleSystem.getInstance().getBattleSummary());
    const run = summary.run;
    if (!run) {
      this.addChild(new UIText({ tagName: 'p', className: 'battle-summary-empty', text: t('battle_summary_empty') }));
      return;
    }

    const layout = new UIContainer({ className: 'pw-battle-summary-layout' });
    this._renderRunStats(run, layout);
    this._renderCurrencies(run, layout);
    this._renderDamage(run.damageByPokemon || [], layout);
    this._renderCaptures(run.catches || [], layout);
    this._renderItems(run.items || [], layout);
    this.addChild(layout);
    this._renderFooter(summary);
  }

  /** @private @param {Object} summary @returns {Object} */
  _mergeDungeonRun(summary) {
    const dungeonSystem = DungeonSystem.getInstance();
    const expedition = dungeonSystem.getRunSummary();
    if (!expedition) {
      const lastRun = summary.state === 'ended'
        ? dungeonSystem.getLastRunForBattle(summary.run?.runId)
        : null;
      return lastRun ? this._mergeSettledDungeonRun(summary, lastRun) : summary;
    }
    const current = summary.run || {};
    const battleIsActive = summary.state === 'active';
    const catches = expedition.loot.catches.map((entry) => ({ ...entry }));
    if (battleIsActive) catches.push(...(current.catches || []).map((entry) => ({ ...entry })));
    const itemCounts = { ...expedition.loot.items };
    if (battleIsActive) {
      for (const entry of current.items || []) {
        const quantity = Math.max(0, Math.floor(Number(entry.quantity) || 0));
        if (entry.itemId && quantity > 0) itemCounts[entry.itemId] = (itemCounts[entry.itemId] || 0) + quantity;
      }
    }
    const items = Object.entries(itemCounts)
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }));
    const startedAt = Number(expedition.startedAt) || 0;
    return {
      ...summary,
      run: {
        ...current,
        locationId: expedition.locationId,
        wins: expedition.totalWins,
        totalWins: expedition.totalWins,
        battles: expedition.totalWins + (battleIsActive ? 1 : 0),
        startedAt,
        durationMs: startedAt > 0 ? Math.max(0, Date.now() - startedAt) : 0,
        catches,
        items,
        moneyGained: expedition.loot.money + (battleIsActive ? Math.max(0, Number(current.moneyGained) || 0) : 0),
        tokensGained: expedition.bag.tokens,
        playerKOs: current.playerKOs || 0,
        isDungeonRun: true,
        dungeonSettled: false
      }
    };
  }

  /** @private @param {Object} summary @param {Object} lastRun @returns {Object} */
  _mergeSettledDungeonRun(summary, lastRun) {
    const current = summary.run || {};
    const loot = lastRun.loot || {};
    const banked = lastRun.banked || { tokens: 0, money: 0 };
    const lost = lastRun.lost || { tokens: 0, money: 0 };
    const startedAt = Number(lastRun.startedAt) || 0;
    const endedAt = Number(lastRun.endedAt) || Date.now();
    const wins = Math.max(0, Number(lastRun.wins) || 0);
    const catches = Array.isArray(loot.catches) ? loot.catches.map((entry) => ({ ...entry })) : [];
    const items = Object.entries(loot.items || {})
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity: Math.max(0, Math.floor(Number(quantity) || 0)) }));
    return {
      ...summary,
      run: {
        ...current,
        locationId: lastRun.locationId,
        wins,
        totalWins: wins,
        battles: wins + (lastRun.outcome === 'wipe' ? 1 : 0),
        startedAt,
        durationMs: startedAt > 0 ? Math.max(0, endedAt - startedAt) : 0,
        catches,
        items,
        moneyGained: Math.max(0, Number(loot.money) || 0),
        tokensGained: Math.max(0, Number(banked.tokens) || 0),
        playerKOs: current.playerKOs || 0,
        isDungeonRun: true,
        dungeonSettled: true,
        dungeonOutcome: lastRun.outcome,
        dungeonBanked: { tokens: Math.max(0, Number(banked.tokens) || 0), money: Math.max(0, Number(banked.money) || 0) },
        dungeonLost: { tokens: Math.max(0, Number(lost.tokens) || 0), money: Math.max(0, Number(lost.money) || 0) },
        dungeonTollRefunded: Math.max(0, Number(lastRun.tollRefunded) || 0)
      }
    };
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
      [run.battles ?? run.wins ?? 0, t('afk_panel_battles')],
      [catches.length, t('afk_panel_captures')],
      [totalItems, t('found_items_title')],
      [run.playerKOs ?? 0, t('afk_panel_team_ko')],
      [duration, t('afk_panel_duration')],
      [locationName, t('tab_info')]
    ];
    if (run.dungeonSettled && run.dungeonOutcome) {
      metrics.push([t(`dungeon_summary_outcome_${run.dungeonOutcome}`), t('dungeon_summary_outcome')]);
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
    target.addChild(grid);
  }

  /** @private @param {Object} run @param {UIContainer} target */
  _renderCurrencies(run, target) {
    const entries = [];
    const banked = run.dungeonSettled ? run.dungeonBanked || {} : null;
    const money = banked ? Number(banked.money) || 0 : Number(run.moneyGained) || 0;
    const tokens = banked ? Number(banked.tokens) || 0 : Number(run.tokensGained) || 0;
    // Keep currency sprites directly below the session metrics, as in main.
    if (tokens > 0) {
      entries.push(this._currencyChip(
        'dungeonToken',
        banked ? t('dungeon_summary_banked_tokens') : t('dungeon_loot_bag_tokens'),
        TextFormatter.formatNumber(tokens)
      ));
    }
    if (money > 0) {
      entries.push(this._currencyChip(
        'money',
        banked ? t('dungeon_summary_banked_money') : t('battle_loot_money_title'),
        `+${TextFormatter.formatNumber(money)}`
      ));
    }
    if (entries.length) target.addChild(new UIContainer({ className: 'pw-summary-currency', children: entries }));
    else if (run.dungeonSettled) target.addChild(new UIText({ className: 'battle-summary-empty', text: t('dungeon_summary_no_banked') }));
    if (!run.dungeonSettled) return;

    const settlement = [];
    const lost = run.dungeonLost || {};
    if (Number(lost.money) > 0) settlement.push(this._currencyChip(
      'money',
      t('dungeon_summary_lost_money'),
      `−${TextFormatter.formatNumber(lost.money)}`
    ));
    if (Number(lost.tokens) > 0) settlement.push(this._currencyChip(
      'dungeonToken',
      t('dungeon_summary_lost_tokens'),
      `−${TextFormatter.formatNumber(lost.tokens)}`
    ));
    if (settlement.length) {
      target.addChild(new UIText({ tagName: 'h3', className: 'battle-summary-section-title', text: t('dungeon_summary_lost_title') }));
      target.addChild(new UIContainer({ className: 'pw-summary-currency', children: settlement }));
    }
    if (run.dungeonTollRefunded > 0) {
      target.addChild(new UIText({
        className: 'pw-battle-summary-toll-refund',
        text: t('dungeon_summary_toll_refund', { amount: TextFormatter.formatNumber(run.dungeonTollRefunded) })
      }));
    }
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
    if (summary.state === 'ended' && summary.run?.battles > 0 && summary.run?.isDungeonRun !== true) {
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
