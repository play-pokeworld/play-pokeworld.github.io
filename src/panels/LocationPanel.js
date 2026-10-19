/**
 * @file LocationPanel.js
 * @brief Current location window: overview, actions and wild Pokémon list (C++: class LocationPanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { LocationKinds } from '../data/world/LocationKinds.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { LocationSystem } from '../systems/LocationSystem.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { BadgesChangedEvent } from '../core/events/BadgesChangedEvent.js';
import { TrainerDefeatedEvent } from '../core/events/TrainerDefeatedEvent.js';
import { LocationActions } from './components/LocationActions.js';
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
    this.listen(BadgesChangedEvent, () => this._render());
    this.listen(TrainerDefeatedEvent, () => this._render());
    this._render();
  }

  /** @private */
  _render() {
    const locationId = LocationSystem.getInstance().getCurrentLocationId();
    const location = LocationDB.getInstance().getById(locationId);
    const encounters = LocationDB.getInstance().getEncounters(locationId);

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
          new UIText({ tagName: 'div', className: 'pw-loc-desc', text: t(location?.kind === LocationKinds.TOWN ? 'loc_desc_town' : 'loc_desc_wild') })
        ]
      }),
      new LocationActions(location, encounters.length),
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
   * @param {Array<{species: string, minLevel: number, maxLevel: number}>} encounters
   */
  static _wildGrid(encounters) {
    const grid = new UIContainer({ className: 'pw-loc-wild-grid' });
    if (encounters.length === 0) {
      grid.addChild(new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1', text: t('loc_no_wild') }));
      return grid;
    }
    for (const encounter of encounters) {
      const species = PokemonDB.getInstance().getById(encounter.species);
      if (!species) continue;
      const name = t(species.getNameKey());
      grid.addChild(new UIContainer({
        className: 'pw-loc-wild-card',
        children: [
          new UIPokemonSprite({ species: species.id, alt: name, size: PokemonSpriteSizes.CONTEXT }),
          new UIText({ className: 'pw-loc-wild-name', text: name }),
          new UIText({ className: 'pw-loc-wild-level', text: t('level_range', { min: encounter.minLevel, max: encounter.maxLevel }) })
        ]
      }));
    }
    return grid;
  }
}
