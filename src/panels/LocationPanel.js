/**
 * @file LocationPanel.js
 * @brief Current location window: overview, actions and wild Pokémon list (C++: class LocationPanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { LocationDB } from '../data/LocationDB.js';
import { PokemonDB } from '../data/PokemonDB.js';
import { LocationSystem } from '../systems/LocationSystem.js';
import { BattleSystem } from '../systems/BattleSystem.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { t } from '../localization/LocalizationManager.js';

export class LocationPanel extends DraggablePanel {
  /**
   * @param {string} column - Starting dashboard column (DashboardColumns value)
   */
  constructor(column) {
    super({
      id: WindowIds.LOCATION,
      column,
      title: t('tab_info'),
      icon: 'mapPin',
      bodyId: 'right-panel',
      bodyClassName: 'pw-static-049',
      name: 'LocationPanel'
    });

    const infoTab = new UIButton({ className: 'tab', text: t('tab_info') });
    infoTab.setActive(true);
    this.addChild(new UIContainer({ id: 'tabs', className: 'pw-static-050 pw-win-tabs', children: [infoTab] }));

    this._content = new UIContainer({ id: 'tab-content', className: 'win-body pw-static-051' });
    this.addChild(this._content);

    this.listen(LocationChangedEvent, () => this._render());
    this._render();
  }

  /** @private */
  _render() {
    const locationId = LocationSystem.getInstance().getCurrentLocationId();
    const location = LocationDB.getInstance().getById(locationId);
    const encounters = LocationDB.getInstance().getEncounters(locationId);
    const notify = (key, tone) => NotificationSystem.getInstance().notifyTemporary(t(key), { channel: NotificationChannels.GAMEPLAY, tone });

    this._content.clearChildren();
    this._content.addChildren([
      new UIContainer({
        className: 'pw-loc-overview',
        children: [
          new UIContainer({
            className: 'pw-loc-title-row',
            children: [
              new UIText({ className: 'pw-loc-name', text: t(`location.${locationId}`) }),
              new UIText({ className: 'pw-badge-chip', text: t(`map_region_${location?.region ?? 'kanto'}`) })
            ]
          }),
          new UIText({ tagName: 'div', className: 'pw-loc-desc', text: t(location?.type === 'town' ? 'loc_desc_town' : 'loc_desc_wild') })
        ]
      }),
      new UIContainer({
        className: 'pw-loc-action-grid',
        children: [
          new UIButton({ variant: 'hbtn', className: 'pw-btn-primary', icon: 'swords', text: t('btn_explore'), onClick: () => BattleSystem.getInstance().startBattle(locationId) }),
          new UIButton({ variant: 'hbtn', icon: 'trophy', text: t('btn_challenge'), onClick: () => notify('gym_closed', NotificationTones.ACCENT) }),
          new UIButton({ variant: 'hbtn', icon: 'cart', text: t('btn_shop'), onClick: () => notify('shop_welcome', NotificationTones.INFO) }),
          new UIButton({ variant: 'hbtn', icon: 'chat', text: t('btn_talk'), onClick: () => notify('npc_greeting', NotificationTones.ACCENT) })
        ]
      }),
      new UIContainer({
        className: 'pw-loc-wild-meta',
        children: [
          new UIText({ text: t('loc_wild_pokemon') }),
          new UIText({ text: t('loc_species_count', { count: encounters.length }) })
        ]
      }),
      LocationPanel._wildGrid(encounters)
    ]);
  }

  /**
   * @private
   * @param {Array<{speciesId: number, minLvl: number, maxLvl: number}>} encounters
   */
  static _wildGrid(encounters) {
    const grid = new UIContainer({ className: 'pw-loc-wild-grid' });
    if (encounters.length === 0) {
      grid.addChild(new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1', text: t('loc_no_wild') }));
      return grid;
    }
    for (const encounter of encounters) {
      const species = PokemonDB.getInstance().getById(encounter.speciesId);
      if (!species) continue;
      const name = t(species.getNameKey());
      grid.addChild(new UIContainer({
        className: 'pw-loc-wild-card',
        children: [
          new UIPokemonSprite({ species: species.getSlug(), alt: name, size: PokemonSpriteSizes.CONTEXT }),
          new UIText({ className: 'pw-loc-wild-name', text: name }),
          new UIText({ className: 'pw-loc-wild-level', text: t('level_range', { min: encounter.minLvl, max: encounter.maxLvl }) })
        ]
      }));
    }
    return grid;
  }
}
