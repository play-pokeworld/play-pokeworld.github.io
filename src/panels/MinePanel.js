/** @file MinePanel.js @brief Stable energy/tools/rock board/current-layer treasures and management controls. */
import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIKeyedList } from '../ui/UIKeyedList.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIProgressBar } from '../ui/UIProgressBar.js';
import { MineToolButton } from './facilities/MineToolButton.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';
import { TextFormatter } from '../core/TextFormatter.js';
import { MineTileButton } from './facilities/MineTileButton.js';
import { MineTreasurePill } from './facilities/MineTreasurePill.js';
import { PriceTag } from './components/PriceTag.js';
import { MineUiRules } from '../config/MineUiRules.js';
import { MineRules } from '../config/MineRules.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { ModalIds } from '../config/ModalIds.js';
import { MineSystem } from '../systems/MineSystem.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { MineChangedEvent } from '../core/events/MineChangedEvent.js';
import { FacilityStaffChangedEvent } from '../core/events/FacilityStaffChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { ContentAccessChangedEvent } from '../core/events/ContentAccessChangedEvent.js';
import { t } from '../localization/LocalizationManager.js';

export class MinePanel extends DraggablePanel {
  /** @param {string} column */
  constructor(column) {
    super({
      id: WindowIds.MINE,
      column,
      title: t('facility_mine_panel_title'),
      icon: 'pickaxe',
      bodyId: 'mine-window-body',
      bodyClassName: 'pw-static-022 pw-mine-body machine-window-body',
      name: 'MinePanel',
    });
    this._aim = null;
    this._auto = new UIButton({
      text: t('mine_auto_title'),
      icon: 'pickaxe',
      className: 'hbtn pw-mine-auto-header',
      onClick: () => {
        const system = MineSystem.getInstance();
        if (system.getSnapshot()?.autoPurchased) system.toggleAutomation();
        else system.buyAutomation();
      },
    });
    this._autoPrice = new PriceTag(
      MineRules.CURRENCY_ID,
      MineRules.AUTOMATION_COST,
    );
    this._auto.addChild(this._autoPrice);
    const manage = new UIButton({
      icon: 'settings',
      text: t('mine_management_button'),
      className: 'hbtn pw-facility-manage',
      onClick: () =>
        EventBus.getInstance().dispatch(
          new ModalOpenRequestedEvent(ModalIds.MINE_MANAGEMENT),
        ),
    });
    manage.setAriaLabel(t('mine_management_button'));
    manage.setTooltip(t('mine_management_button'));

    this._energy = new UIText();
    this._energyBar = new UIProgressBar({
      trackClassName: 'stat-bar pw-mine-energy-bar',
      fillClassName: 'stat-fill',
    });
    this._toolHint = new UIText({
      tagName: 'div',
      className: 'pw-facility-subtle mine-tool-hint',
    });
    this._tools = new UIContainer({ className: 'pw-chip-group pw-mine-tools' });
    this._toolButtons = new Map();
    for (const id of Object.keys(MineRules.TOOLS)) {
      const button = new MineToolButton(id, () =>
        MineSystem.getInstance().setTool(id),
      );
      this._toolButtons.set(id, button);
      this._tools.addChild(button);
    }
    this._grid = new UIContainer({
      className: 'mine-grid pw-mine-grid',
      name: 'MineGrid',
    });
    this._grid.setData('gridCols', MineRules.WIDTH);
    this._tiles = [];
    this._grid.setAttribute('aria-label', t('mine_title'));
    for (let y = 0; y < MineRules.HEIGHT; y++)
      for (let x = 0; x < MineRules.WIDTH; x++) {
        const tile = new MineTileButton({
          x,
          y,
          onDig: () => MineSystem.getInstance().digAt(x, y),
          onAim: (tx, ty) => this._setAim(tx, ty),
        });
        this._tiles.push(tile);
        this._grid.addChild(tile);
      }
    this._treasures = new UIKeyedList({
      className: 'pw-mine-treasure-list',
      key: (entry) => entry.index,
      create: () => new MineTreasurePill(),
      update: (pill, entry) => pill.setEntry(entry),
    });
    this._confirm = new ConfirmDialog({ id: MineUiRules.SURVEY_CONFIRM_ID });
    this._nextLayer = new UIButton({
      id: MineUiRules.SURVEY_BUTTON_ID,
      text: t('mine_new_layer'),
      className: 'hbtn',
      size: 'sm',
      onClick: () =>
        this._confirm.ask({
          title: t('mine_new_layer'),
          message: t('facility_mine_discard_confirm'),
          danger: true,
          onConfirm: () =>
            MineSystem.getInstance().startNextLayer({ discardCurrent: true }),
        }),
    });
    this._found = new UIText({ tagName: 'b' });
    const subtitle = new UIText({ tagName: 'div', className: 'loc-sub' });
    subtitle.setRichText(t('mine_sub'));
    const energy = new UIContainer({
      className: 'pw-action-flex',
      children: [
        new UIContainer({
          className: 'pw-field-row',
          children: [new UIText({ text: t('mine_energy') }), this._energy],
        }),
        this._energyBar,
        new UIText({
          tagName: 'div',
          className: 'pw-field-hint',
          text: t('mine_energy_hint', {
            regen: MineRules.ENERGY_REGEN_PER_SECOND,
            perBattle: MineRules.ENERGY_PER_WILD_WIN,
          }),
        }),
      ],
    });
    this.addChildren([
      new UIContainer({
        className: 'pw-mine-window-root',
        children: [
          new UIContainer({
            className: 'pw-mine-header',
            children: [this._auto, manage],
          }),
          new UIText({
            tagName: 'div',
            className: 'loc-title',
            text: t('mine_title'),
          }),
          subtitle,
          new UIContainer({
            className: 'pw-actions-row',
            children: [energy, this._tools, this._toolHint],
          }),
          this._grid,
          new UIContainer({
            className: 'pw-trainer-head',
            children: [
              new UIContainer({ children: [this._found, this._treasures] }),
              this._nextLayer,
            ],
          }),
        ],
      }),
      this._confirm,
    ]);
    for (const event of [
      MineChangedEvent,
      FacilityStaffChangedEvent,
      SaveCreatedEvent,
      SaveLoadedEvent,
      SaveDeletedEvent,
      ContentAccessChangedEvent,
    ])
      this.listen(event, () => {
        if (
          [SaveCreatedEvent, SaveLoadedEvent, SaveDeletedEvent].includes(event)
        )
          this._confirm.close();
        this._refresh();
      });
    this._refresh();
  }
  /** @override */
  onEnter() {
    super.onEnter();
    this._refresh();
  }
  /** @override @param {number} dt */
  onUpdate(dt) {
    super.onUpdate(dt);
    if (MineSystem.getInstance().isUnlocked()) {
      this._refreshEnergy();
      this._refreshSurvey();
    }
  }
  /** @private */
  _refresh() {
    const system = MineSystem.getInstance();
    this.toggleClass('pw-progression-hidden', !system.isUnlocked());
    if (!system.isUnlocked()) return;
    const state = system.getSnapshot();
    if (!state) return;
    this._state = state;
    this._refreshEnergy();
    this._auto.setActive(state.autoEnabled);
    this._auto.setText(
      state.autoPurchased
        ? t('mine_auto_toggle', {
            state: t(
              state.autoEnabled ? 'automation_enabled' : 'automation_disabled',
            ),
          })
        : t('mine_auto_title'),
    );
    this._autoPrice.setAmount(
      state.autoPurchased
        ? MineRules.AUTOMATION_FEE
        : MineRules.AUTOMATION_COST,
    );
    this._auto.setTooltip(
      t(
        state.autoPurchased
          ? 'facility_mine_auto_header'
          : 'facility_mine_auto_buy_hint',
        {
          cost: state.autoPurchased
            ? MineRules.AUTOMATION_FEE
            : MineRules.AUTOMATION_COST,
        },
      ),
    );
    this._auto.setAttribute('aria-pressed', state.autoEnabled);
    for (const tool of state.tools) {
      this._toolButtons.get(tool.id).setTool(tool, state.tool);
    }
    this._grid.setData('mineTool', state.tool);
    for (const row of state.tiles)
      for (const tile of row) {
        this._tiles[tile.y * MineRules.WIDTH + tile.x].setTile(
          tile,
          tile.canDig,
        );
      }
    this._treasures.setEntries(
      state.items.map((item, index) => ({ ...item, index })),
    );
    this._found.setText(
      t('mine_current_layer_found', {
        found: state.items.filter((item) => item.collected).length,
        total: state.items.length,
      }),
    );

    const selectedTool = state.tools.find((tool) => tool.id === state.tool);
    this._toolHint.setText(
      t('mine_tool_hint', {
        tool: t(`mine_tool_${state.tool}`),
        cost: selectedTool.energyCost,
        power: selectedTool.power,
        area: t(`mine_tool_area_${MineUiRules.TOOL_AREAS[state.tool]}`),
      }),
    );
    this._refreshSurvey();
    if (this._aim) this._setAim(this._aim.x, this._aim.y);
  }
  /** @private */
  _refreshEnergy() {
    const state = MineSystem.getInstance().getEnergySnapshot();
    if (!state) return;
    this._energy.setText(
      t('value_over_max', {
        value: Math.floor(state.energy),
        max: state.maxEnergy,
      }),
    );
    this._energyBar.setValue(state.energy, state.maxEnergy);
  }
  /** Read-only wall-time display: never rebuild the button or write a save while it ticks. */
  _refreshSurvey() {
    const survey = MineSystem.getInstance().getManualSurveySnapshot();
    if (!survey) return;
    const time = TextFormatter.formatMinutesSeconds(
      survey.remainingSeconds * 1000,
    );
    this._nextLayer.setText(
      survey.ready ? t('mine_new_layer') : t('mine_survey_timer', { time }),
    );
    this._nextLayer.setTooltip(
      survey.ready ? t('mine_survey_ready') : t('mine_survey_wait', { time }),
    );
    this._nextLayer.toggleClass('hbtn', survey.ready);
    this._nextLayer.toggleClass('pw-mine-survey-clock', !survey.ready);
    this._nextLayer.setEnabled(survey.ready);
  }

  /** @private @param {number|null} x @param {number|null} y */
  _setAim(x, y) {
    this._aim = x == null ? null : { x, y };
    const tool = this._state?.tools.find(
      (entry) => entry.id === this._state.tool,
    );
    const keys = new Set(
      x == null
        ? []
        : (tool?.offsets || []).map(([dx, dy]) => `${x + dx},${y + dy}`),
    );
    this._tiles.forEach((tile, index) =>
      tile.toggleClass(
        'is-aim',
        keys.has(
          `${index % MineRules.WIDTH},${Math.floor(index / MineRules.WIDTH)}`,
        ),
      ),
    );
  }
}
