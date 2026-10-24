/**
 * @file DungeonExpeditionPanel.js
 * @brief Grid navigation, banked satchel and controls for the current dungeon expedition.
 */
import { DungeonPilotControls } from './DungeonPilotControls.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIImage } from '../../ui/UIImage.js';
import { UIMaskIcon } from '../../ui/UIMaskIcon.js';
import { QuestRewardsView } from './QuestRewardsView.js';
import { DungeonSystem } from '../../systems/DungeonSystem.js';
import { BattleSystem } from '../../systems/BattleSystem.js';
import { LocationSystem } from '../../systems/LocationSystem.js';
import { DungeonRules } from '../../config/DungeonRules.js';
import { DungeonTileVisuals } from '../../config/DungeonTileVisuals.js';
import { AssetPaths } from '../../config/AssetPaths.js';
import { DungeonRunChangedEvent } from '../../core/events/DungeonRunChangedEvent.js';
import { BattleStartedEvent } from '../../core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../../core/events/BattleEndedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { TextFormatter } from '../../core/TextFormatter.js';
import { t } from '../../localization/LocalizationManager.js';

const TILE_LABEL_KEYS = Object.freeze({
  unknown: 'dungeon_node_fog',
  empty: 'dungeon_node_empty',
  combat: 'dungeon_node_combat',
  elite: 'dungeon_node_elite',
  chest: 'dungeon_node_chest',
  boss: 'dungeon_node_boss',
  ladder: 'dungeon_node_ladder'
});

export class DungeonExpeditionPanel extends UIContainer {
  constructor() {
    super({ className: 'pw-dungeon-expedition', name: 'DungeonExpeditionPanel' });
    this._content=new UIContainer({className:'pw-dungeon-content'});this.addChildren([this._content,new DungeonPilotControls()]);
    this.listen(DungeonRunChangedEvent, () => this.render());
    this.listen(BattleStartedEvent, () => this.render());
    this.listen(BattleEndedEvent, () => this.render());
    this.listen(SaveLoadedEvent, () => this.render());
    this.render();
  }

  /** @param {Object} [options] */
  render() {
    this._content.clearChildren();
    const system = DungeonSystem.getInstance();
    const run = system.getRun();
    if (run?.active) {
      this.show();
      this._content.addChild(this._activeRun(run));
      return;
    }
    this.hide();
  }

  /** @private @param {import('../../data/save/DungeonRunData.js').DungeonRunData} run */
  _activeRun(run) {
    const multiplier = DungeonRules.multiplierFor(run.floor).toFixed(1);
    const header = new UIContainer({
      className: 'pw-dungeon-header',
      children: [
        new UIText({ className: 'pw-dungeon-title', text: t('dungeon_bar_title') }),
        new UIText({ className: 'pw-dungeon-location', text: t(`location.${run.locationId}`) }),
        new UIText({ className: 'pw-dungeon-floor', text: t('dungeon_floor_label', { floor: run.floor, depth: run.depth }) }),
        new UIText({ className: 'pw-dungeon-multiplier', text: t('dungeon_multiplier', { mult: multiplier }) })
      ]
    });
    const bagSummary = new UIContainer({
      className: 'pw-dungeon-bag-summary',
      children: [new UIText({ text: t('dungeon_bag_summary', {
        tokens: TextFormatter.formatNumber(run.bag.tokens),
        money: TextFormatter.formatNumber(run.bag.money),
        riskTokens: TextFormatter.formatNumber(Math.ceil(run.bag.tokens * (1 - DungeonRules.WIPE_KEEP_RATIO))),
        riskMoney: TextFormatter.formatNumber(Math.ceil(run.bag.money * (1 - DungeonRules.WIPE_KEEP_RATIO)))
      }) })]
    });
    const lootView = new QuestRewardsView();
    lootView.addClass('pw-dungeon-loot');
    lootView.setRewards({
      currencies: { money: run.loot.money, dungeonToken: run.loot.tokens },
      items: { ...run.loot.items }
    });
    const map = this._grid(run);
    const controls = new UIContainer({ className: 'pw-dungeon-actions' });
    if (run.pendingNode && !BattleSystem.getInstance().isActive()) {
      controls.addChild(new UIButton({
        variant: 'hbtn',
        text: t('dungeon_resume_battle'),
        onClick: () => DungeonSystem.getInstance().resumePendingEncounter()
      }));
    }
    controls.addChild(new UIButton({
      variant: 'danger',
      text: t('dungeon_ascend_btn', { tokens: run.bag.tokens, money: run.bag.money }),
      onClick: () => DungeonSystem.getInstance().ascend()
    }));
    controls.addChild(new UIButton({
      variant: 'ghost',
      text: t('dungeon_abandon_btn'),
      onClick: () => DungeonSystem.getInstance().abandon()
    }));
    return new UIContainer({
      className: 'pw-panel pw-dungeon-panel',
      children: [header, bagSummary, map, lootView, controls]
    });
  }

  /** @private @param {Object} run */
  _grid(run) {
    const map = run.map;
    if (!map) return new UIText({ className: 'pw-dungeon-map-unavailable', text: t('dungeon_map_unavailable') });
    const grid = new UIContainer({ className: `pw-dgn-grid pw-dgn-grid--${map.cols}` });
    const board = new UIContainer({ className: 'pw-dungeon-map', children: [grid] });
    grid.setAttribute('role', 'grid');
    grid.setAttribute('tabindex', '0');
    grid.setAttribute('aria-label', t('dungeon_grid_aria', { floor: run.floor }));
    grid.addDomListener('keydown', (event) => {
      const direction = {
        ArrowRight: 'right', ArrowLeft: 'left', ArrowUp: 'up', ArrowDown: 'down'
      }[event.key];
      if (!direction) return;
      event.preventDefault();
      DungeonSystem.getInstance().move(direction);
    });
    const here = map.tiles[run.pos];
    const blocked = BattleSystem.getInstance().isActive();
    for (let row = 0; row < map.rows; row++) {
      for (let col = 0; col < map.cols; col++) {
        const tile = map.tiles[`c${col}r${row}`];
        if (!tile) continue;
        const adjacent = !!here && Math.abs(tile.col - here.col) + Math.abs(tile.row - here.row) === 1;
        const revealed = tile.revealed || tile.done || tile.id === run.pos;
        const knownType = revealed ? tile.type : 'unknown';
        const name = t(TILE_LABEL_KEYS[knownType] || TILE_LABEL_KEYS.unknown);
        const classes = [
          'pw-dgn-tile',
          `t-${knownType}`,
          tile.id === run.pos ? 'is-here' : '',
          !revealed ? 'is-fog' : '',
          tile.done && tile.id !== run.pos ? 'is-done' : '',
          revealed || adjacent ? 'is-open' : ''
        ].filter(Boolean).join(' ');
        const cell = new UIButton({
          variant: 'ghost',
          className: classes,
          text: '',
          disabled: blocked || (!revealed && !adjacent),
          onClick: () => DungeonSystem.getInstance().moveTo(tile.id)
        });
        cell.setAriaLabel(t('dungeon_tile_aria', { tile: name, col: col + 1, row: row + 1 }));
        cell.setData('node', tile.id);
        const content = tile.id === run.pos ? this._playerSprite() : this._tileGlyph(tile, knownType);
        if (content) cell.addChild(content);
        grid.addChild(cell);
      }
    }
    return board;
  }

  /** @private @returns {UIImage} The trainer drawn on the player's tile, as on the reference board. */
  _playerSprite() {
    return new UIImage({
      className: 'pw-dgn-player',
      src: AssetPaths.trainerSprite(DungeonTileVisuals.PLAYER_TRAINER),
      pixelated: true
    });
  }

  /**
   * Monochrome glyph of a tile, tinted by the tile colour. Fog keeps its CSS question mark and a
   * resolved fight or chest becomes plain ground.
   * @private
   * @param {Object} tile
   * @param {string} knownType
   * @returns {import('../../ui/UIElement.js').UIElement|null}
   */
  _tileGlyph(tile, knownType) {
    const file = DungeonTileVisuals.GLYPHS[knownType];
    if (!file || (tile.done && DungeonTileVisuals.CLEARED_WHEN_DONE.includes(knownType))) return null;
    const glyph = new UIMaskIcon({ className: 'pw-dgn-ic', src: AssetPaths.dungeonTile(file) });
    const badge = DungeonTileVisuals.BADGES[knownType];
    if (!badge) return glyph;
    return new UIContainer({
      tagName: 'span',
      className: 'pw-dgn-elite',
      children: [glyph, new UIMaskIcon({ className: 'pw-dgn-ic pw-dgn-star', src: AssetPaths.dungeonTile(badge) })]
    });
  }

}
