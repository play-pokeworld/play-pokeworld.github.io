/** @file DungeonPilotControls.js @brief Stable free pilot controls use the canonical three-clear unlock query. */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { DungeonSystem } from '../../systems/DungeonSystem.js';
import { DungeonAutoRules } from '../../config/DungeonAutoRules.js';
import { DungeonRunChangedEvent } from '../../core/events/DungeonRunChangedEvent.js';
import { SaveLoadedEvent } from '../../core/events/SaveLoadedEvent.js';
import { t } from '../../localization/LocalizationManager.js';
export class DungeonPilotControls extends UIContainer {
  constructor() {
    super({ className: 'pw-dungeon-pilot', name: 'DungeonPilotControls' });
    this._locked = new UIText({ className: 'pw-dungeon-pilot-locked' });
    this._buttons = new Map();
    const choices = new UIContainer({ className: 'pw-dungeon-pilot-choices' });
    for (const mode of ['off', ...DungeonAutoRules.MODES]) {
      const button = new UIButton({
        className: 'hbtn',
        text: t(`relaunch_pilot_${mode}`),
        onClick: () =>
          DungeonSystem.getInstance().setAuto(mode === 'off' ? false : mode),
      });
      button.setData('pilotMode', mode);
      this._buttons.set(mode, button);
      choices.addChild(button);
    }
    this.addChildren([
      new UIText({ tagName: 'b', text: t('relaunch_pilot_title') }),
      this._locked,
      choices,
    ]);
    for (const type of [DungeonRunChangedEvent, SaveLoadedEvent])
      this.listen(type, () => this.refresh());
    this.refresh();
  }
  refresh() {
    const model = DungeonSystem.getInstance().getAutoSnapshot();
    this.setVisible(!!model);
    if (!model) return;
    this._locked.setVisible(!model.unlocked);
    this._locked.setText(
      t('relaunch_pilot_locked', { have: model.clears, need: model.required }),
    );
    for (const [mode, button] of this._buttons) {
      button.setVisible(model.unlocked);
      button.setActive((model.mode || 'off') === mode);
      button.setAttribute(
        'aria-pressed',
        String((model.mode || 'off') === mode),
      );
    }
  }
}
