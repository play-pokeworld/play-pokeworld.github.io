/** @file RelaunchControls.js @brief One owned-module switch; purchase belongs to the shop, not the combat surface. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UISwitch } from '../../ui/UISwitch.js';
import { RelaunchSystem } from '../../systems/RelaunchSystem.js';
import { RelaunchRules } from '../../config/RelaunchRules.js';
import { RelaunchChangedEvent } from '../../core/events/RelaunchChangedEvent.js';
import { BattleStartedEvent } from '../../core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../../core/events/BattleEndedEvent.js';
import { DungeonRunChangedEvent } from '../../core/events/DungeonRunChangedEvent.js';
import { LocationChangedEvent } from '../../core/events/LocationChangedEvent.js';
import { TrainingBattleChangedEvent } from '../../core/events/TrainingBattleChangedEvent.js';
import { SaveCreatedEvent } from '../../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../../core/events/SaveDeletedEvent.js';
import { LanguageChangedEvent } from '../../core/events/LanguageChangedEvent.js';
import { t } from '../../localization/LocalizationManager.js';
export class RelaunchControls extends UIContainer {
  /** @param {string} kind @param {string} scope */
  constructor(kind, scope) {
    super({ className: 'pw-relaunch-controls', name: 'RelaunchControls' });
    this._kind = kind;
    this.setData('relaunchKind', kind);
    this.setData('relaunchScope', scope);
    this._switch = new UISwitch({
      onLabel: t(RelaunchRules.UPGRADES[this._kind].toggleLabelKey),
      offLabel: t(RelaunchRules.UPGRADES[this._kind].toggleLabelKey),
      onChange: (enabled) =>
        RelaunchSystem.getInstance().setEnabledFor(kind, enabled),
    });
    this.addChild(this._switch);
    for (const type of [
      RelaunchChangedEvent,
      BattleStartedEvent,
      BattleEndedEvent,
      DungeonRunChangedEvent,
      LocationChangedEvent,
      TrainingBattleChangedEvent,
      SaveCreatedEvent,
      SaveLoadedEvent,
      SaveDeletedEvent,
      LanguageChangedEvent,
    ])
      this.listen(type, () => this.refresh());
    this.refresh();
  }
  /** Stable switch, no countdown/purchase prose, extra button or saving during refresh. */
  refresh() {
    const model = RelaunchSystem.getInstance().getSnapshot(this._kind);
    this.setVisible(!!model?.visible && model.purchased);
    this._switch.setChecked(!!model?.enabled);
    const key = RelaunchRules.UPGRADES[this._kind].labelKey;
    this._switch.setAriaLabel(t(key));
    this._switch.setTooltip(t(key));
    this._switch.setLabels(
      t(RelaunchRules.UPGRADES[this._kind].toggleLabelKey),
      t(RelaunchRules.UPGRADES[this._kind].toggleLabelKey),
    );
  }
}
