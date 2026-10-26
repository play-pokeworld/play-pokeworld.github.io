/**
 * @file LocationPanel.js
 * @brief Current location window: overview, actions and wild Pokémon list (C++: class LocationPanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { UIIcon } from '../ui/UIIcon.js';
import { UIItemSprite } from '../ui/UIItemSprite.js';
import { PokemonGridEntry } from './components/PokemonGridEntry.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { NpcDirectory } from '../data/world/NpcDirectory.js';
import { PokemonDB } from '../data/pokemon/PokemonDB.js';
import { ItemDB } from '../data/items/ItemDB.js';
import { LocationKinds, EncounterRarities } from '../data/world/LocationKinds.js';
import { ROUTE_DROPS } from '../data/world/RouteDrops.js';
import { CaughtStatus } from '../data/save/PokedexData.js';
import { RoamingRules } from '../config/RoamingRules.js';
import { BattleConfig } from '../config/BattleConfig.js';
import { LocationSystem } from '../systems/LocationSystem.js';
import { RoamingSystem } from '../systems/RoamingSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { SecretBaseChangedEvent } from '../core/events/SecretBaseChangedEvent.js';
import { BadgesChangedEvent } from '../core/events/BadgesChangedEvent.js';
import { TrainerDefeatedEvent } from '../core/events/TrainerDefeatedEvent.js';
import { PokemonDefeatedEvent } from '../core/events/PokemonDefeatedEvent.js';
import { PokemonCaughtEvent } from '../core/events/PokemonCaughtEvent.js';
import { PokedexChangedEvent } from '../core/events/PokedexChangedEvent.js';
import { DungeonRunChangedEvent } from '../core/events/DungeonRunChangedEvent.js';
import { NpcTalkedEvent } from '../core/events/NpcTalkedEvent.js';
import { QuestActivatedEvent } from '../core/events/QuestActivatedEvent.js';
import { QuestClaimedEvent } from '../core/events/QuestClaimedEvent.js';
import { QuestProgressedEvent } from '../core/events/QuestProgressedEvent.js';
import { RoamingRotationTickEvent } from '../core/events/RoamingRotationTickEvent.js';
import { LanguageChangedEvent } from '../core/events/LanguageChangedEvent.js';
import { FeatureAccessSystem } from '../systems/FeatureAccessSystem.js';
import { LocationAlcoves } from './components/LocationAlcoves.js';
import { LocationActions } from './components/LocationActions.js';
import { EventBus } from '../core/EventBus.js';
import { ModalOpenRequestedEvent } from '../core/events/ModalOpenRequestedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
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
    this._alcoves=new LocationAlcoves();this._content.addChild(this._alcoves);this._info=null;

    this.listen(LocationChangedEvent, () => this._render());
    this.listen(SecretBaseChangedEvent, () => this._render());
    this.listen(BadgesChangedEvent, () => this._render());
    this.listen(TrainerDefeatedEvent, () => this._render());
    this.listen(PokemonDefeatedEvent, () => this._render());
    this.listen(PokemonCaughtEvent, () => this._render());
    this.listen(PokedexChangedEvent, () => this._render());
    this.listen(DungeonRunChangedEvent, () => this._render());
    this.listen(NpcTalkedEvent, () => this._render());
    this.listen(QuestActivatedEvent, () => this._render());
    this.listen(QuestClaimedEvent, () => this._render());
    this.listen(QuestProgressedEvent, () => this._render());
    this.listen(RoamingRotationTickEvent, (event) => this._updateRoamingCountdown(event.timestamp));
    this.listen(LanguageChangedEvent, () => this._render());
    this._render();
  }

  /** @private */
  _render() {
    const locationId = LocationSystem.getInstance().getCurrentLocationId();
    const locations = LocationDB.getInstance();
    const location = locations.getById(locationId);
    const locationTitle = location ? t(`location.${locationId}`) : t('tab_info');
    this.setTitle(locationTitle);
    const encounters = locations.getEncountersForGroup(locationId);
    const roamingSpecies = RoamingSystem.getSpeciesAt(locationId);
    this._roamingSpeciesId = roamingSpecies;
    const save = SaveSystem.getInstance().getCurrentSave();
    const pokedex = save?.pokedex ?? null;
    const uniqueSpecies = [...new Set(encounters.map((entry) => entry.species))];
    const caughtLocalSpecies = uniqueSpecies.filter((species) => pokedex?.isCaught(species)).length;
    const localQuestBattle = QuestSystem.getInstance().getLocalDefeatBattleState(locationId);

    const stats = location && location.kind !== LocationKinds.TOWN && new UIContainer({
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

    const lore = LocationPanel._lore(locationId);
    const unlockProgress = LocationPanel._unlockProgress(location, save);
    const roaming = roamingSpecies ? PokemonDB.getInstance().getById(roamingSpecies) : null;
    const roamingName = roaming ? t(roaming.getNameKey()) : null;
    this._roamingTimerText = roaming
      ? new UIText({ className: 'pw-loc-timer', text: t('roaming_rotation_timer', { time: RoamingSystem.formatCountdown() }) })
      : null;
    const roamingTimer = roaming
      ? new UIContainer({
        className: 'pw-loc-timer-chip',
        children: [
          new UIContainer({
            tagName: 'span',
            className: 'pw-loc-timer-label',
            children: [
              new UIText({ tagName: 'strong', text: t('roaming_legendary_rotation') }),
              new UIText({ tagName: 'span', text: ` ${roamingName} ${t('can_appear_here')}` })
            ]
          }),
          this._roamingTimerText
        ]
      })
      : null;

    const hasMirageTimer = locationId === 'mirage_island' || !!location?.connections?.includes('mirage_island');
    this._mirageRotationWindow = RoamingSystem.getRotationWindow();
    this._mirageTimerText = hasMirageTimer
      ? new UIText({ className: 'pw-loc-timer', text: t('mirage_rotation_timer', { time: RoamingSystem.formatCountdown() }) })
      : null;
    const mirageTimer = hasMirageTimer
      ? new UIContainer({
        className: 'pw-loc-timer-chip',
        children: [
          new UIContainer({
            tagName: 'span',
            className: 'pw-loc-timer-label',
            children: [
              new UIIcon({ name: 'fog', size: 'sm', className: 'pw-loc-mirage-icon' }),
              new UIText({
                tagName: 'span',
                text: ` ${t(this._mirageRotationWindow % 2 === 0 ? 'mirage_island_present' : 'mirage_island_absent')}`
              })
            ]
          }),
          this._mirageTimerText
        ]
      })
      : null;
    let wildSection = null;
    if (encounters.length > 0) {
      const wildMeta = [new UIText({ tagName: 'span', text: t('value_over_max', { value: caughtLocalSpecies, max: uniqueSpecies.length }) })];
      const shinyLocalSpecies = uniqueSpecies.filter((species) => pokedex?.getCaughtStatus(species) === CaughtStatus.SHINY).length;
      if (shinyLocalSpecies > 0) {
        wildMeta.push(new UIText({ tagName: 'span', className: 'pw-loc-shiny-meta', text: t('loc_shiny_species_count', { count: shinyLocalSpecies, total: uniqueSpecies.length }) }));
      }
      wildSection = new UIContainer({
        className: 'pw-loc-wild-section',
        children: [
          new UIText({ tagName: 'div', className: 'pw-loc-section-title', text: t('loc_wild_pokemon') }),
          new UIContainer({ className: 'pw-loc-wild-meta', children: wildMeta }),
          LocationPanel._wildGrid(encounters, pokedex, roamingSpecies)
        ]
      });
    }

    const info = new UIContainer({ className: 'pw-loc-info' });
    info.addChildren([
      new UIContainer({
        className: 'pw-loc-overview',
        children: [
          new UIText({ tagName: 'div', className: 'pw-loc-overview-title', text: locationTitle })
        ]
      }),
      stats,
      lore,
      new LocationActions(location, encounters.length, !!roamingSpecies, localQuestBattle),
      unlockProgress,
      roamingTimer,
      mirageTimer,
      wildSection,
      LocationPanel._dropsGrid(locationId)
    ]);
    if(this._info){this._content.removeChild(this._info);this._info.destroy();}
    this._info=info;this._content.insertChildBefore(info,this._alcoves);this._alcoves.setLocation(locationId);
  }

  /** @private @param {number} [now=Date.now()] */
  _updateRoamingCountdown(now = Date.now()) {
    const locationId = LocationSystem.getInstance().getCurrentLocationId();
    const activeSpecies = RoamingSystem.getSpeciesAt(locationId, now);
    const rotationWindow = RoamingSystem.getRotationWindow(now);
    if (activeSpecies !== this._roamingSpeciesId || (this._mirageTimerText && rotationWindow !== this._mirageRotationWindow)) {
      this._render();
      return;
    }
    const time = RoamingSystem.formatCountdown(now);
    if (this._roamingTimerText) this._roamingTimerText.setText(t('roaming_rotation_timer', { time }));
    if (this._mirageTimerText) this._mirageTimerText.setText(t('mirage_rotation_timer', { time }));
  }

  /** @private @param {string} locationId */
  static _lore(locationId) {
    const speakerKey = `lore.${locationId}.speaker`;
    const textKey = `lore.${locationId}.text`;
    const speaker = t(speakerKey);
    const text = t(textKey);
    if (!text || text === textKey) return null;
    return new UIContainer({
      className: 'pw-panel pw-loc-lore',
      children: [
        new UIText({ tagName: 'div', className: 'pw-bold pw-light2 pw-loc-lore-speaker', text: `${speaker === speakerKey ? '' : speaker} :` }),
        new UIText({ tagName: 'div', className: 'pw-italic pw-text-sm pw-loc-lore-text', text: `« ${text} »` })
      ]
    });
  }

  /**
   * @private
   * @param {Readonly<Object>|null} location
   * @param {import('../data/save/SaveData.js').SaveData|null} save
   */
  static _unlockProgress(location, save) {
    if (!location || location.kind === LocationKinds.TOWN || location.winsToClear <= 0 || location.encounters.length === 0) return null;
    const required = Math.max(0, Number(location.winsToClear) || 0);
    const wins = save?.statistics.wildWinsInGroup(location.id) ?? 0;
    if (required <= 0 || wins >= required) return null;

    const locations = LocationDB.getInstance();
    const group = locations.getGroup(location.id);
    const groupConnections = locations.getGroupLocations(location.id)
      .flatMap((member) => member.connections);
    const nextIds = [...new Set(groupConnections.filter((targetId) => {
      const status = FeatureAccessSystem.getInstance().getLocationAccessStatus(targetId);
      if (status.reason !== 'wins' || !status.blockingLocationId) return false;
      return locations.getGroup(status.blockingLocationId) === group;
    }))];
    if (nextIds.length === 0) return null;

    const nextNames = nextIds.slice(0, 2).map((id) => t(`location.${id}`)).join(', ');
    const label = t('win_battles_to_unlock', {
      need: required,
      from: t(`location.${location.id}`),
      to: nextNames,
      have: wins
    });
    const progress = new UIContainer({ className: 'pw-panel pw-loc-unlock-tip' });
    progress.setAttribute('data-current-wins', wins);
    progress.setAttribute('data-required-wins', required);
    progress.addChild(new UIText({ tagName: 'div', className: 'pw-text-sm pw-light2 pw-bold', text: label }));
    const bar = new UIContainer({ className: 'pw-loc-unlock-bar' });
    const fill = new UIContainer({ className: 'pw-loc-unlock-fill' });
    fill._setCssVariable('--pct', `${Math.max(0, Math.min(100, (wins / required) * 100))}%`);
    fill.setAttribute('data-progress-percent', Math.round((wins / required) * 100));
    bar.addChild(fill);
    progress.addChild(bar);
    return progress;
  }

  /**
   * @private
   * @param {Array<{species: string, minLevel: number, maxLevel: number, rarity?: string}>} encounters
   * @param {import('../data/save/PokedexData.js').PokedexData|null} pokedex
   * @param {string|null} roamingSpecies
   */
  static _wildGrid(encounters, pokedex, roamingSpecies = null) {
    const grid = new UIContainer({ className: 'pw-loc-wild-grid' });
    if (encounters.length === 0 && !roamingSpecies) {
      grid.addChild(new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1', text: t('loc_no_wild') }));
      return grid;
    }

    const roamingChance = roamingSpecies ? RoamingRules.ENCOUNTER_CHANCE : 0;
    const remainingChance = 1 - roamingChance;
    const weightOf = (entry) => BattleConfig.RARITY_WEIGHTS[entry.rarity] ?? BattleConfig.RARITY_WEIGHTS.common;
    const totalWeight = encounters.reduce((sum, entry) => sum + weightOf(entry), 0);

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
      const disc = LocationPanel._speciesTile(species, name, status);
      const rarity = ({
        [EncounterRarities.COMMON]: EncounterRarities.COMMON,
        [EncounterRarities.UNCOMMON]: EncounterRarities.UNCOMMON,
        [EncounterRarities.RARE]: EncounterRarities.RARE
      })[encounter.rarity] || EncounterRarities.COMMON;
      const rarityKey = ({
        [EncounterRarities.COMMON]: 'rarity_common_label',
        [EncounterRarities.UNCOMMON]: 'rarity_uncommon_label',
        [EncounterRarities.RARE]: 'rarity_rare_label'
      })[rarity] || 'rarity_common_label';

      const weight = weightOf(encounter);
      const ratePct = totalWeight > 0 ? Math.round((weight / totalWeight) * remainingChance * 1000) / 10 : 0;

      const card = new UIContainer({
        className: `pw-loc-wild-card ${stateClass}`,
        children: [
          disc,
          new UIText({ className: 'pw-loc-wild-name', text: name }),
          new UIText({ className: 'pw-loc-wild-level', text: t('level_range', { min: encounter.minLevel, max: encounter.maxLevel }) }),
          new UIText({ className: 'pw-loc-wild-rarity', text: `${t(rarityKey)} · ${ratePct}%` })
        ]
      });
      grid.addChild(card);
    }
    if (roamingSpecies && !encounters.some((entry) => entry.species === roamingSpecies)) {
      const species = PokemonDB.getInstance().getById(roamingSpecies);
      if (species) {
        const name = t(species.getNameKey());
        const status = pokedex?.getCaughtStatus(species.id) ?? CaughtStatus.NOT_CAUGHT;
        const stateClass = status === CaughtStatus.SHINY
          ? 'is-owned is-shiny-owned'
          : status === CaughtStatus.CAUGHT
            ? 'is-owned'
            : pokedex?.isSeen(species.id)
              ? 'is-seen'
              : 'is-missing';
        const disc = LocationPanel._speciesTile(species, name, status);
        const percent = Math.round(RoamingRules.ENCOUNTER_CHANCE * 1000) / 10;
        grid.addChild(new UIContainer({
          className: `pw-loc-wild-card pw-loc-wild-card--roaming ${stateClass}`,
          children: [
            disc,
            new UIText({ className: 'pw-loc-wild-name', text: name }),
            new UIText({ className: 'pw-loc-wild-level', text: `${t('level_abbrev')}${RoamingRules.ENCOUNTER_LEVEL}` }),
            new UIText({ className: 'pw-loc-wild-rarity', text: t('roaming_short', { pct: percent }) })
          ]
        }));
      }
    }
    return grid;
  }

  /** @private @param {Object} species @param {string} name @param {string} status */
  static _speciesTile(species, name, status) {
    return new PokemonGridEntry({
      species: species.id,
      alt: name,
      shiny: status === CaughtStatus.SHINY,
      className: 'dex-entry pw-grid-media',
      title: name,
      caughtStatus: status,
      ariaLabel: name,
      onClick: () => EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.POKEDEX, {
        speciesId: species.id
      }))
    });
  }

  /** @private @param {string} locationId */
  static _dropsGrid(locationId) {
    const locationIds = LocationDB.getInstance().getGroupLocations(locationId).map((location) => location.id);
    const itemIds = [...new Set(locationIds.flatMap((id) => ROUTE_DROPS[id] || []))];
    if (itemIds.length === 0) return null;
    const grid = new UIContainer({ className: 'pw-loc-wild-grid pw-loc-drop-grid' });
    for (const itemId of itemIds) {
      const nameKey = `item.${itemId}.name`;
      const localizedName = t(nameKey);
      const name = localizedName === nameKey ? itemId : localizedName;
      const icon = new UIItemSprite({ itemId, alt: name, className: 'pw-grid-media' });
      const card = new UIContainer({
        className: 'pw-loc-wild-card pw-loc-drop-card',
        children: [
          icon,
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
