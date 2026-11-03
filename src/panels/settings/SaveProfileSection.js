/**
 * @file SaveProfileSection.js
 * @brief Settings → live save card preview + trainer name / save-card Pokémon / card theme
 *        (C++: class SaveProfileSection : public SettingsSection).
 *
 * The card portrait is an OWNED POKÉMON chosen from the PC box (main-game behaviour), never an NPC
 * portrait: the selector opens the shared picker and only the draft changes until "Apply".
 */

import { SettingsSection } from './SettingsSection.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIButton } from '../../ui/UIButton.js';
import { UIDropdown } from '../../ui/UIDropdown.js';
import { UITextInput } from '../../ui/UITextInput.js';
import { SaveCard } from '../../ui/SaveCard.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../../ui/UIPokemonSprite.js';
import { SaveSystem } from '../../systems/SaveSystem.js';
import { NotificationSystem } from '../../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../../config/NotificationConfig.js';
import { GameConfig } from '../../config/GameConfig.js';
import { ModalIds } from '../../config/ModalIds.js';
import { SaveThemes, SAVE_THEMES } from '../../data/save/SaveThemes.js';
import { EventBus } from '../../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../../core/events/ModalOpenRequestedEvent.js';
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
    const draft = {
      trainerName: save.player.trainerName,
      avatarPokemonUid: save.player.avatarPokemonUid || '',
      background: save.background
    };
    const previewSave = () => ({
      ...save,
      background: draft.background,
      player: { ...save.player, trainerName: draft.trainerName, avatarPokemonUid: draft.avatarPokemonUid }
    });
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

    // Save-card portrait: the owner's Pokémon (team or PC box), picked in the shared picker.
    const portraitName = new UIText({ className: 'pw-text-sm pw-light2', text: '' });
    const portraitSprite = new UIContainer({ className: 'save-profile-portrait-slot' });
    const currentPortrait = () => SaveCard.resolveAvatarPokemon(previewSave());
    const renderPortrait = () => {
      portraitSprite.clearChildren();
      const pokemon = currentPortrait();
      if (pokemon) {
        portraitSprite.addChild(new UIPokemonSprite({
          species: pokemon.species,
          form: pokemon.form || '',
          shiny: pokemon.shiny === true,
          alt: typeof pokemon.getDisplayName === 'function' ? pokemon.getDisplayName() : pokemon.species,
          size: PokemonSpriteSizes.STANDARD
        }));
        portraitName.setText(typeof pokemon.getDisplayName === 'function' ? pokemon.getDisplayName() : pokemon.species);
        return;
      }
      portraitName.setText(t('save_icon_no_box'));
    };
    renderPortrait();

    const portraitPicker = new UIContainer({
      className: 'save-profile-portrait',
      children: [
        portraitSprite,
        new UIContainer({
          className: 'save-profile-portrait-text',
          children: [
            portraitName,
            new UIButton({
              className: 'hbtn pw-btn-secondary',
              text: t('save_profile_choose_icon'),
              onClick: () => EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.SAVE_ICON_PICKER, {
                selectedUid: draft.avatarPokemonUid,
                onSelect: (uid) => {
                  draft.avatarPokemonUid = uid;
                  renderPortrait();
                  updatePreview();
                }
              }))
            })
          ]
        })
      ]
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
          field('save_profile_icon', portraitPicker),
          field('save_profile_background', themeSelect),
          new UIContainer({
            className: 'save-profile-apply-row',
            children: [new UIButton({
              className: 'hbtn pw-btn-primary',
              text: t('save_profile_apply'),
              onClick: () => {
                save.player.trainerName = draft.trainerName;
                save.player.avatarPokemonUid = draft.avatarPokemonUid;
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
