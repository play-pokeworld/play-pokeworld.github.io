/**
 * @file SoundSection.js
 * @brief Settings → one card per audio bus with a switch and a volume slider (C++: class SoundSection : public SettingsSection).
 */

import { SettingsSection } from './SettingsSection.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UISwitch } from '../../ui/UISwitch.js';
import { UISlider } from '../../ui/UISlider.js';
import { PreferencesSystem, AUDIO_BUSES } from '../../systems/PreferencesSystem.js';
import { t } from '../../localization/LocalizationManager.js';

export class SoundSection extends SettingsSection {
  constructor() {
    super({ titleKey: 'settings_sound_title', className: 'settings-sound', name: 'SoundSection' });
  }

  /** @override */
  build() {
    const preferences = PreferencesSystem.getInstance();
    for (const busId of AUDIO_BUSES) {
      const state = preferences.getAudioBus(busId);
      const card = new UIContainer({ className: 'settings-sound-card' });
      const output = new UIText({ tagName: 'output', text: t('percent_value', { value: state.volume }) });
      const slider = new UISlider({
        value: state.volume,
        onInput: (volume) => {
          preferences.setAudioBus(busId, { volume });
          output.setText(t('percent_value', { value: volume }));
        }
      });
      const applyOn = (on) => {
        card.toggleClass('is-on', on);
        card.toggleClass('is-off', !on);
        slider.setDisabled(!on);
      };
      const toggle = new UISwitch({
        checked: state.on,
        onLabel: t('settings_audio_on'),
        offLabel: t('settings_audio_off'),
        onChange: (on) => {
          preferences.setAudioBus(busId, { on });
          applyOn(on);
        }
      });
      applyOn(state.on);

      card.addChildren([
        new UIContainer({
          className: 'settings-sound-head',
          children: [new UIContainer({ tagName: 'span', className: 'settings-sound-name', children: [new UIText({ text: t(`settings_${busId}`) })] }), toggle]
        }),
        new UIContainer({
          tagName: 'label',
          className: 'settings-sound-volume',
          children: [new UIText({ className: 'settings-sound-volume-label', text: t('settings_volume') }), slider, output]
        })
      ]);
      this.addChild(card);
    }
  }
}
