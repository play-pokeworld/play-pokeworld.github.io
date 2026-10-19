/**
 * @file TeamModal.js
 * @brief Team management dialog: member list + "set as lead" (C++: class TeamModal : public StaticModalPanel).
 */

import { StaticModalPanel } from '../ui/StaticModalPanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { TeamSystem } from '../systems/TeamSystem.js';
import { TeamChangedEvent } from '../core/events/TeamChangedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels } from '../config/NotificationConfig.js';
import { t } from '../localization/LocalizationManager.js';

export class TeamModal extends StaticModalPanel {
  /** Opened through `new ModalOpenRequestedEvent(ModalIds.TEAM)`. */
  constructor() {
    super({ id: ModalIds.TEAM, title: t('team_modal_title'), size: 'lg', name: 'TeamModal' });
    this.setBodyClass('pw-team-modal-root');
    this.listen(TeamChangedEvent, () => {
      if (this.isOpen()) this._render();
    });
  }

  /** Rebuilt on every opening so that it always reflects the save. @override */
  onEnter() {
    super.onEnter();
    this._render();
  }

  /** @private */
  _render() {
    this.clearChildren();
    const team = TeamSystem.getInstance().getTeam();
    const grid = new UIContainer({ className: 'pw-team-modal-grid' });

    team.forEach((pokemon, index) => {
      const name = pokemon.getDisplayName();
      grid.addChild(new UIContainer({
        className: 'pw-team-modal-card',
        children: [
          new UIContainer({
            className: 'pw-team-modal-header',
            children: [
              new UIPokemonSprite({ species: pokemon.species, form: pokemon.form, alt: name, size: PokemonSpriteSizes.STANDARD, className: 'pw-team-modal-img' }),
              new UIContainer({
                children: [
                  new UIText({ tagName: 'div', className: 'pw-team-modal-name', text: name }),
                  new UIText({ tagName: 'div', className: 'pw-team-modal-lvl', text: t('level_short_value', { level: pokemon.level }) })
                ]
              })
            ]
          }),
          new UIText({ tagName: 'div', className: 'pw-team-modal-hp', text: t('hp_value_over_max', { value: pokemon.hp, max: pokemon.getMaxHp() }) }),
          new UIText({ tagName: 'div', className: 'pw-team-modal-exp', text: t('exp_value_over_max', { value: pokemon.getExpInLevel(), max: pokemon.getExpLevelSpan() }) }),
          index > 0 && new UIButton({
            text: t('team_set_lead_btn'),
            variant: 'secondary',
            size: 'sm',
            onClick: () => this._setLead(index)
          })
        ]
      }));
    });
    this.addChild(grid);
  }

  /**
   * @private
   * @param {number} index
   */
  _setLead(index) {
    const teams = TeamSystem.getInstance();
    if (!teams.setLead(index)) return;
    NotificationSystem.getInstance().notifyTemporary(
      t('team_new_lead', { name: teams.getTeam()[0].getDisplayName() }),
      { channel: NotificationChannels.GAMEPLAY }
    );
  }
}
