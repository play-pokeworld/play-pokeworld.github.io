/**
 * @file SettingsModal.js
 * @brief Settings dialog: a stack of SettingsSection blocks (C++: class SettingsModal : public UIModal).
 * Rebuilt on every opening and on language change, so every section always reflects the current state.
 * Opened through `new ModalOpenRequestedEvent(ModalIds.SETTINGS)`; owns its confirmation dialog.
 */

import { UIModal } from '../../ui/UIModal.js';
import { ConfirmDialog } from '../../ui/ConfirmDialog.js';
import { LanguageSection } from './LanguageSection.js';
import { ThemeSection } from './ThemeSection.js';
import { SoundSection } from './SoundSection.js';
import { SaveProfileSection } from './SaveProfileSection.js';
import { SaveManagementSection } from './SaveManagementSection.js';
import { CommunitySection } from './CommunitySection.js';
import { AdvancedSection } from './AdvancedSection.js';
import { CombatSettingsSection } from './CombatSettingsSection.js';
import { DiagnosticsSection } from './DiagnosticsSection.js';
import { LanguageChangedEvent } from '../../core/events/LanguageChangedEvent.js';
import { Engine } from '../../core/Engine.js';
import { PageIds } from '../../pages/PageIds.js';
import { ModalIds } from '../../config/ModalIds.js';
import { t } from '../../localization/LocalizationManager.js';

export class SettingsModal extends UIModal {
  constructor() {
    super({
      id: ModalIds.SETTINGS,
      title: t('settings_title'),
      size: 'md',
      className: 'pw-settings-modal-window',
      overlayClassName: 'pw-settings-modal-backdrop',
      name: 'SettingsModal'
    });
    this.setBodyClass('pw-settings-root');

    /** @private @type {ConfirmDialog} */
    this._confirmDialog = new ConfirmDialog({ id: 'settings-confirm-modal' });
    this.addOverlayChild(this._confirmDialog);
    const leaveGame = () => {
      this.close();
      Engine.getInstance().getPageManager().openPage(PageIds.SAVE_MENU);
    };

    /** @private @type {import('./SettingsSection.js').SettingsSection[]} */
    this._sections = [
      new LanguageSection(),
      new ThemeSection(),
      new CombatSettingsSection(),
      new SoundSection(),
      new SaveProfileSection(),
      new SaveManagementSection({ onLeaveGame: leaveGame, confirmDialog: this._confirmDialog }),
      new CommunitySection(),
      new AdvancedSection(),
      new DiagnosticsSection()
    ];
    this.addChildren(this._sections);

    this.listen(LanguageChangedEvent, () => this._refresh());
  }

  /** @override */
  onEnter() {
    super.onEnter();
    this._refresh();
  }

  /** @private */
  _refresh() {
    this.setTitle(t('settings_title'));
    for (const section of this._sections) section.refresh();
  }
}
