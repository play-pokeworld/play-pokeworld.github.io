/**
 * @file MinePanel.js
 * @brief Persistent grid-mine controls, energy gauge and recovered-loot view.
 */
import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIIcon } from '../ui/UIIcon.js';
import { UIButton } from '../ui/UIButton.js';
import { UIProgressBar } from '../ui/UIProgressBar.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { MineRules } from '../config/MineRules.js';
import { MineSystem } from '../systems/MineSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { MineLootDB } from '../data/items/MineLootDB.js';
import { MineChangedEvent } from '../core/events/MineChangedEvent.js';
import { BonusChangedEvent } from '../core/events/BonusChangedEvent.js';
import { InventoryChangedEvent } from '../core/events/InventoryChangedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { ContentAccessChangedEvent } from '../core/events/ContentAccessChangedEvent.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { t } from '../localization/LocalizationManager.js';

export class MinePanel extends DraggablePanel {
  /** @param {string} column */
  constructor(column) {
    super({
      id: WindowIds.MINE,
      column,
      title: t('mine_window_title'),
      icon: 'pickaxe',
      bodyId: 'mine-window-body',
      bodyClassName: 'pw-static-025 pw-mine-body',
      name: 'MinePanel'
    });
    this._energyElapsed = 0;
    this._energyText = null;
    this._energyBar = null;
    for (const eventClass of [
      MineChangedEvent, BonusChangedEvent, InventoryChangedEvent, LocationChangedEvent,
      SaveCreatedEvent, SaveLoadedEvent, SaveDeletedEvent, ContentAccessChangedEvent
    ]) this.listen(eventClass, () => this._render());
    this._render();
  }

  /** @override */
  onEnter() {
    super.onEnter();
    if (MineSystem.getInstance().canUseHere()) MineSystem.getInstance().ensureLayer();
    this._render();
  }

  /** @override */
  onUpdate(dt) {
    super.onUpdate(dt);
    this._energyElapsed += Math.max(0, Number(dt) || 0);
    if (this._energyElapsed < 1) return;
    this._energyElapsed = 0;
    this._refreshEnergy();
  }

  /** @private */
  _render() {
    const mineSystem = MineSystem.getInstance();
    const unlocked = mineSystem.isUnlocked();
    this.toggleClass('pw-progression-hidden', !unlocked);
    this.clearChildren();
    this._energyText = null;
    this._energyBar = null;
    if (!unlocked) return;
    if (!mineSystem.canUseHere()) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-mine-empty', text: t('mine_location_required', {
        location: t(`location.${MineRules.LOCATION_ID}`)
      }) }));
      return;
    }
    const snapshot = MineSystem.getInstance().getSnapshot();
    if (!snapshot) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-mine-empty', text: t('no_save_loaded') }));
      return;
    }
    this._energyText = new UIText({
      className: 'pw-mine-energy-value',
      text: t('value_over_max', { value: Math.floor(snapshot.energy), max: snapshot.maxEnergy })
    });
    this._energyBar = new UIProgressBar({
      value: snapshot.energy,
      max: snapshot.maxEnergy,
      variant: 'energy',
      size: 'sm',
      className: 'pw-mine-energy-bar'
    });
    this.addChild(new UIContainer({
      className: 'pw-mine-energy-row',
      children: [
        new UIContainer({ className: 'pw-mine-energy-label', children: [new UIIcon({ name: 'zap', size: 'sm' }), new UIText({ text: t('mine_energy') })] }),
        this._energyText
      ]
    }));
    this.addChild(this._energyBar);
    this.addChild(new UIText({ tagName: 'div', className: 'pw-mine-summary', text: t('mine_completed_count', { count: snapshot.completedCount }) }));
    this.addChild(this._toolSelector(snapshot));
    if (!snapshot.hasLayer) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-mine-empty', text: t('mine_start_first') }));
      this.addChild(new UIButton({
        variant: 'primary',
        fullWidth: true,
        text: t('mine_start_btn'),
        onClick: () => MineSystem.getInstance().startNextLayer()
      }));
    } else {
      this.addChild(this._grid(snapshot));
    }
    this.addChild(this._treasureList());
  }

  /** @private @param {Object} snapshot */
  _toolSelector(snapshot) {
    return new UIContainer({
      className: 'pw-mine-tools',
      children: snapshot.tools.map((tool) => {
        const button = new UIButton({
          variant: 'secondary',
          size: 'sm',
          className: 'pw-mine-tool',
          text: t(`mine_tool_${tool.id}`),
          onClick: () => MineSystem.getInstance().setTool(tool.id)
        });
        button.setActive(snapshot.tool === tool.id);
        button.setTooltip(t('mine_tool_cost_hint', { cost: tool.energyCost, power: tool.power }));
        return button;
      })
    });
  }

  /** @private @param {Object} snapshot */
  _grid(snapshot) {
    const grid = new UIContainer({ className: 'pw-mine-grid', name: 'MineGrid' });
    for (let y = 0; y < MineRules.HEIGHT; y++) {
      for (let x = 0; x < MineRules.WIDTH; x++) {
        const durability = snapshot.grid[y]?.[x] ?? 0;
        const tile = new UIButton({
          variant: 'ghost',
          size: 'sm',
          className: `pw-mine-tile${durability > 0 ? ` is-solid is-depth-${durability}` : ' is-dug'}`,
          text: durability > 0 ? String(durability) : '',
          disabled: durability <= 0,
          onClick: () => MineSystem.getInstance().digAt(x, y)
        });
        tile.setTooltip(t('mine_tile_hint', { x: x + 1, y: y + 1, durability }));
        tile.setAttribute('aria-label', t('mine_tile_hint', { x: x + 1, y: y + 1, durability }));
        grid.addChild(tile);
      }
    }
    return grid;
  }

  /** @private */
  _treasureList() {
    const save = SaveSystem.getInstance().getCurrentSave();
    const loot = save ? save.inventory.entries()
      .filter(({ id }) => MineLootDB.getInstance().has(id))
      .map(({ id, quantity }) => ({ id, quantity })) : [];
    const items = loot.length > 0
      ? loot.map(({ id, quantity }) => new UIText({
        className: 'pw-mine-treasure-item',
        text: t('mine_treasure_count', { item: t(`item.${id}.name`), count: TextFormatter.formatNumber(quantity) })
      }))
      : [new UIText({ className: 'pw-mine-empty-treasure', text: t('mine_treasure_empty') })];
    return new UIContainer({
      className: 'pw-mine-treasures',
      children: [new UIText({ tagName: 'h3', text: t('mine_treasure_title') }), ...items]
    });
  }

  /** @private */
  _refreshEnergy() {
    const snapshot = MineSystem.getInstance().getSnapshot();
    if (!snapshot || !this._energyText || !this._energyBar) return;
    this._energyText.setText(t('value_over_max', {
      value: Math.floor(snapshot.energy),
      max: TextFormatter.formatNumber(snapshot.maxEnergy)
    }));
    this._energyBar.setValue(snapshot.energy, snapshot.maxEnergy);
  }
}
