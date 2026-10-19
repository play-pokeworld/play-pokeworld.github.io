/**
 * @file SaveProfileSection.js
 * @brief Settings → live save card preview + trainer name / portrait / card theme (C++: class SaveProfileSection : public SettingsSection).
 */

import { SettingsSection } from './SettingsSection.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIDropdown } from '../../ui/UIDropdown.js';
import { UITextInput } from '../../ui/UITextInput.js';
import { SaveCard } from '../../ui/SaveCard.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { NotificationSystem } from '../../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../../config/NotificationConfig.js';
import { GameConfig } from '../../config/GameConfig.js';
import { TRAINER_AVATARS } from '../../data/TrainerAvatars.js';
import { SaveThemes, SAVE_THEMES } from '../../data/SaveThemes.js';
import { t } from '../../localization/LocalizationManager.js';

export class SaveProfileSection extends SettingsSection {
  constructor() {
    super({ id: 'save-profile-section', titleKey: 'save_profile_title', name: 'SaveProfileSection' });
  }

  /** @override */
  build() {
    const save = SaveSystem.getInstance().getCurrentSave();
    if (!save) return;

    // Edits go to a draft so that "Apply" is the only way to change the save.
    const draft = { trainerName: save.player.trainerName, trainerSprite: save.player.trainerSprite, background: save.background };
    const previewSave = () => ({ ...save, background: draft.background, player: { ...save.player, ...draft } });
    const preview = new SaveCard({ save: previewSave(), mode: 'preview' });
    const updatePreview = () => preview.updateSave(previewSave());

    const field = (labelKey, widget) => new UIContainer({
      className: 'save-profile-field',
      children: [new UIText({ className: 'save-profile-label', text: t(labelKey) }), widget]
    });

    const nameInput = new UITextInput({
      id: 'save-profile-name',
      value: draft.trainerName,
      maxLength: GameConfig.TRAINER_NAME_MAX_LENGTH,
      placeholder: t('save_profile_name_placeholder'),
      onInput: (value) => {
        draft.trainerName = value || save.player.trainerName;
        updatePreview();
      }
    });
    const avatarSelect = new UIDropdown({
      id: 'save-profile-avatar-select',
      options: TRAINER_AVATARS.map((avatar) => ({ value: avatar.sprite, label: t(avatar.labelKey) })),
      value: draft.trainerSprite,
      onChange: (sprite) => {
        draft.trainerSprite = sprite;
        updatePreview();
      }
    });
    const themeSelect = new UIDropdown({
      id: 'save-profile-background-select',
      options: SAVE_THEMES.map((theme) => ({ value: theme, label: t(SaveThemes.labelKey(theme)) })),
      value: draft.background,
      onChange: (theme) => {
        draft.background = theme;
        updatePreview();
      }
    });

    this.addChildren([
      new UIContainer({ className: 'save-profile-preview', children: [preview] }),
      new UIContainer({
        className: 'save-profile-form',
        children: [
          field('save_profile_name', nameInput),
          field('save_profile_avatar', avatarSelect),
          field('save_profile_background', themeSelect),
          new UIContainer({
            className: 'save-profile-apply-row',
            children: [new UIButton({
              className: 'hbtn pw-btn-primary',
              text: t('save_profile_apply'),
              onClick: () => {
                save.player.trainerName = draft.trainerName;
                save.player.trainerSprite = draft.trainerSprite;
                save.background = draft.background;
                SaveSystem.getInstance().saveCurrent();
                NotificationSystem.getInstance().notify(t('save_profile_updated'), { channel: NotificationChannels.SYSTEM, tone: NotificationTones.SUCCESS });
              }
            })]
          })
        ]
      })
    ]);
  }
}
