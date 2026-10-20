/**
 * @file LocationPanel.js
 * @brief Current location window: overview, actions and wild Pokémon list (C++: class LocationPanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIImage } from '../ui/UIImage.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../ui/UIPokemonSprite.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { LocationKinds, EncounterRarities } from '../data/world/LocationKinds.js';
import { ROUTE_DROPS } from '../data/world/RouteDrops.js';
import { CaughtStatus } from '../data/save/PokedexData.js';
import { REGIONS } from '../config/Regions.js';
import { LocationSystem } from '../systems/LocationSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { resolveLocationScene } from '../config/LocationBackgrounds.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { BadgesChangedEvent } from '../core/events/BadgesChangedEvent.js';
import { TrainerDefeatedEvent } from '../core/events/TrainerDefeatedEvent.js';
import { PokemonDefeatedEvent } from '../core/events/PokemonDefeatedEvent.js';
import { PokemonCaughtEvent } from '../core/events/PokemonCaughtEvent.js';
import { PokedexChangedEvent } from '../core/events/PokedexChangedEvent.js';
import { DungeonRunChangedEvent } from '../core/events/DungeonRunChangedEvent.js';
import { LocationActions } from './components/LocationActions.js';
import { CaughtStatusBall } from './components/CaughtStatusBall.js';
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
    this.listen(PokemonDefeatedEvent, () => this._render());
    this.listen(PokemonCaughtEvent, () => this._render());
    this.listen(PokedexChangedEvent, () => this._render());
    this.listen(DungeonRunChangedEvent, () => this._render());
    this._render();
  }

  /** @private */
  _render() {
    const locationId = LocationSystem.getInstance().getCurrentLocationId();
    const location = LocationDB.getInstance().getById(locationId);
    const encounters = LocationDB.getInstance().getEncounters(locationId);
    const save = SaveSystem.getInstance().getCurrentSave();
    const pokedex = save?.pokedex ?? null;
    const scene = resolveLocationScene(locationId, location?.kind ?? null);
    const uniqueSpecies = [...new Set(encounters.map((entry) => entry.species))];
    const caughtLocalSpecies = uniqueSpecies.filter((species) => pokedex?.isCaught(species)).length;
    const region = REGIONS.find((entry) => entry.id === location?.region);
    const metaLabels = [
      region ? t(region.labelKey) : location?.region,
      location?.kind ? t(`loc_kind_${location.kind}`) : null,
      encounters.length > 0
        ? t('loc_species_count', { count: uniqueSpecies.length })
        : t('loc_no_wild'),
      location?.shop ? t('tab_shop') : null
    ].filter(Boolean);
    const overviewMeta = new UIContainer({
      className: 'pw-loc-overview-meta',
      children: metaLabels.map((label) => new UIText({ tagName: 'span', className: 'pw-loc-meta-chip', text: label }))
    });

    const stats = encounters.length > 0 && new UIContainer({
      className: 'pw-panel pw-loc-play-stats',
      children: [
        new UIText({ tagName: 'div', className: 'pw-loc-play-stats-title', text: t('loc_stats_title') }),
        new UIContainer({
          className: 'pw-loc-play-stats-row',
          children: [
            new UIContainer({
              className: 'pw-loc-play-stat',
              children: [
                new UIText({ tagName: 'span', className: 'pw-loc-play-stat-val', text: save?.statistics.wildWinsInGroup(locationId) ?? 0 }),
                new UIText({ tagName: 'span', className: 'pw-loc-play-stat-lbl', text: t('loc_stat_beaten') })
              ]
            }),
            new UIContainer({
              className: 'pw-loc-play-stat',
              children: [
                new UIText({ tagName: 'span', className: 'pw-loc-play-stat-val', text: save?.statistics.capturesInLocation(locationId) ?? 0 }),
                new UIText({ tagName: 'span', className: 'pw-loc-play-stat-lbl', text: t('loc_stat_captured') })
              ]
            })
          ]
        })
      ]
    });

    const wildSection = new UIContainer({ className: 'pw-loc-wild-section' });
    wildSection.addChildren([
      new UIText({ tagName: 'div', className: 'pw-loc-section-title', text: t('loc_wild_pokemon') }),
      new UIContainer({
        className: 'pw-loc-wild-meta',
        children: [
          new UIText({ tagName: 'span', text: t('loc_species_count', { count: uniqueSpecies.length }) }),
          new UIText({ tagName: 'span', text: t('value_over_max', { value: caughtLocalSpecies, max: uniqueSpecies.length }) })
        ]
      }),
      LocationPanel._wildGrid(encounters, pokedex)
    ]);

    const info = new UIContainer({ className: 'pw-loc-info' });
    info.addChildren([
      new UIContainer({
        className: `pw-loc-overview pw-loc-overview--${scene}`,
        children: [
          new UIText({ tagName: 'div', className: 'pw-loc-overview-title', text: t(`location.${locationId}`) }),
          overviewMeta
        ]
      }),
      stats,
      new LocationActions(location, encounters.length),
      wildSection,
      LocationPanel._dropsGrid(locationId)
    ]);
    this._content.clearChildren();
    this._content.addChild(info);
  }

  /**
   * @private
   * @param {Array<{species: string, minLevel: number, maxLevel: number, rarity?: string}>} encounters
   * @param {import('../data/save/PokedexData.js').PokedexData|null} pokedex
   */
  static _wildGrid(encounters, pokedex) {
    const grid = new UIContainer({ className: 'pw-loc-wild-grid' });
    if (encounters.length === 0) {
      grid.addChild(new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1', text: t('loc_no_wild') }));
      return grid;
    }
    for (const encounter of encounters) {
      const species = PokemonDB.getInstance().getById(encounter.species);
      if (!species) continue;
      const name = t(species.getNameKey());
      const status = pokedex?.getCaughtStatus(species.id) ?? CaughtStatus.NOT_CAUGHT;
      const stateClass = status === CaughtStatus.SHINY
        ? 'is-owned is-shiny-owned'
        : status === CaughtStatus.CAUGHT
          ? 'is-owned'
          : pokedex?.isSeen(species.id)
            ? 'is-seen'
            : 'is-missing';
      const sprite = new UIPokemonSprite({
        species: species.id,
        alt: name,
        shiny: status === CaughtStatus.SHINY,
        size: PokemonSpriteSizes.CONTEXT
      });
      const disc = new UIContainer({ className: 'pw-loc-wild-disc', children: [sprite] });
      const caughtBall = new CaughtStatusBall();
      caughtBall.setSpecies(species.id);
      caughtBall.addClass('pw-caught-ball');
      disc.addChild(caughtBall);
      const rarityKey = ({
        [EncounterRarities.COMMON]: 'rarity_common_label',
        [EncounterRarities.UNCOMMON]: 'rarity_uncommon_label',
        [EncounterRarities.RARE]: 'rarity_rare_label'
      })[encounter.rarity] || 'rarity_common_label';
      const card = new UIContainer({
        className: `pw-loc-wild-card ${stateClass}`,
        children: [
          disc,
          new UIText({ className: 'pw-loc-wild-name', text: name }),
          new UIText({ className: 'pw-loc-wild-level', text: t('level_range', { min: encounter.minLevel, max: encounter.maxLevel }) }),
          new UIText({ className: 'pw-loc-wild-rarity', text: t(rarityKey) })
        ]
      });
      grid.addChild(card);
    }
    return grid;
  }

  /** @private @param {string} locationId */
  static _dropsGrid(locationId) {
    const itemIds = ROUTE_DROPS[locationId] || [];
    if (itemIds.length === 0) return null;
    const grid = new UIContainer({ className: 'pw-loc-wild-grid pw-loc-drop-grid' });
    for (const itemId of itemIds) {
      const nameKey = `item.${itemId}.name`;
      const localizedName = t(nameKey);
      const name = localizedName === nameKey ? itemId : localizedName;
      const icon = new UIImage({
        src: ItemDB.getInstance().getImagePath(itemId),
        alt: name,
        className: 'pw-loc-drop-icon',
        pixelated: true
      });
      const card = new UIContainer({
        className: 'pw-loc-wild-card pw-loc-drop-card',
        children: [
          new UIContainer({ className: 'pw-loc-wild-disc pw-loc-drop-disc', children: [icon] }),
          new UIText({ className: 'pw-loc-drop-name', text: name })
        ]
      });
      card.setTooltip(name);
      grid.addChild(card);
    }
    return new UIContainer({
      className: 'pw-loc-drops-section',
      children: [
        new UIText({ tagName: 'div', className: 'pw-loc-section-title', text: t('drop_items_lbl') }),
        grid
      ]
    });
  }
}
