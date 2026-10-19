/**
 * @file SaveManagementSection.js
 * @brief Settings → save / change save / export / delete (C++: class SaveManagementSection : public SettingsSection).
 */

import { SettingsSection } from './SettingsSection.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIButton } from '../../ui/UIButton.js';
import { FileDownload } from '../../ui/FileDownload.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { NotificationSystem } from '../../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../../config/NotificationConfig.js';
import { GameConfig } from '../../config/GameConfig.js';
import { t } from '../../localization/LocalizationManager.js';

export class SaveManagementSection extends SettingsSection {
  /**
   * @param {Object} options
   * @param {Function} options.onLeaveGame - Goes back to the save menu
   * @param {import('../../ui/ConfirmDialog.js').ConfirmDialog} options.confirmDialog
   */
  constructor(options) {
    super({ titleKey: 'save_title', name: 'SaveManagementSection' });
    this._onLeaveGame = options.onLeaveGame;
    this._confirmDialog = options.confirmDialog;
  }

  /** @override */
  build() {
    const saves = SaveSystem.getInstance();
    const notify = (key, tone) => NotificationSystem.getInstance().notify(t(key), { channel: NotificationChannels.SYSTEM, tone });

    this.addChild(new UIContainer({
      className: 'pw-settings-save-rows',
      children: [
        new UIContainer({
          className: 'pw-settings-row',
          children: [
            new UIButton({ className: 'hbtn', icon: 'save', text: t('save_btn'), onClick: () => {
              saves.saveCurrent();
              notify('save_success', NotificationTones.SUCCESS);
            } }),
            new UIButton({ className: 'hbtn', icon: 'refresh', text: t('load_btn'), onClick: () => {
              saves.saveCurrent();
              this._onLeaveGame();
            } }),
            new UIButton({ className: 'hbtn', icon: 'download', text: t('export_btn'), onClick: () => {
              const save = saves.getCurrentSave();
              const json = save ? saves.exportSlotAsJson(save.id) : null;
              if (!json) return;
              FileDownload.saveText(GameConfig.SAVE_EXPORT_FILENAME.replace('{id}', save.id), json);
              notify('save_exported_success', NotificationTones.ACCENT);
            } })
          ]
        }),
        new UIContainer({
          className: 'pw-settings-row',
          children: [new UIButton({ className: 'hbtn pw-btn-danger', icon: 'trash', text: t('delete_save_btn'), onClick: () => this._askDelete() })]
        })
      ]
    }));
  }

  /** @private */
  _askDelete() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;
    this._confirmDialog.ask({
      title: t('save_delete_title'),
      message: t('save_delete_prompt', { id: save.id, name: save.player.trainerName }),
      confirmLabel: t('btn_delete'),
      danger: true,
      onConfirm: () => {
        SaveSystem.getInstance().deleteSlot(save.id);
        this._onLeaveGame();
      }
    });
  }
}
