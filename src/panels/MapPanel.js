/**
 * @file MapPanel.js
 * @brief World map window: region selector + interactive map (C++: class MapPanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIDropdown } from '../ui/UIDropdown.js';
import { UIMapView } from '../ui/UIMapView.js';
import { LocationDB } from '../data/world/LocationDB.js';
import { LocationSystem, LocationStates } from '../systems/LocationSystem.js';
import { FeatureAccessSystem } from '../systems/FeatureAccessSystem.js';
import { DungeonSystem } from '../systems/DungeonSystem.js';
import { BattleSystem } from '../systems/BattleSystem.js';
import { RoamingSystem } from '../systems/RoamingSystem.js';
import { TeamAmbushSystem } from '../systems/TeamAmbushSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { ContentAccessChangedEvent } from '../core/events/ContentAccessChangedEvent.js';
import { PokedexChangedEvent } from '../core/events/PokedexChangedEvent.js';
import { QuestActivatedEvent } from '../core/events/QuestActivatedEvent.js';
import { QuestProgressedEvent } from '../core/events/QuestProgressedEvent.js';
import { QuestClaimedEvent } from '../core/events/QuestClaimedEvent.js';
import { TeamAmbushChangedEvent } from '../core/events/TeamAmbushChangedEvent.js';
import { RoamingRotationTickEvent } from '../core/events/RoamingRotationTickEvent.js';
import { LanguageChangedEvent } from '../core/events/LanguageChangedEvent.js';
import { ModalIds } from '../config/ModalIds.js';
import { REGIONS, MAP_CANVAS } from '../config/Regions.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { AssetPaths } from '../config/AssetPaths.js';
import { t } from '../localization/LocalizationManager.js';

/** Default zone size when a location has no explicit dimensions. */
const DEFAULT_NODE_SIZE = 48;

export class MapPanel extends DraggablePanel {
  /**
   * @param {string} column - Starting dashboard column (DashboardColumns value)
   */
  constructor(column) {
    super({
      id: WindowIds.MAP,
      column,
      title: t('map_title'),
      icon: 'map',
      bodyId: 'map-panel',
      bodyClassName: 'pw-static-030 pw-map-body',
      name: 'MapPanel',
      // The legend is the only help of the map window: it takes the header help button.
      help: { modalId: ModalIds.MAP_HELP, labelKey: 'map_legend_modal_title' }
    });
    this._region = LocationSystem.getInstance().getCurrentRegion();

    this._regionSelect = new UIDropdown({
      id: 'map-region-select',
      className: 'map-region-wrap',
      options: REGIONS.map((r) => ({ value: r.id, label: t(r.labelKey), disabled: !r.available })),
      value: this._region,
      onChange: (regionId) => this._changeRegion(regionId)
    });
    this._regionSelect.setAttribute('data-stop-drag', 'true');
    this.addHeaderAction(this._regionSelect);

    this._map = new UIMapView({
      width: MAP_CANVAS.width,
      height: MAP_CANVAS.height,
      svgId: 'map-svg',
      onNodeClick: (id) => this._travel(id)
    });
    this.addChild(this._map);

    this._confirm = new ConfirmDialog({ id: 'pw-map-travel-confirm', name: 'MapTravelConfirm' });
    this.addChild(this._confirm);

    this.listen(LocationChangedEvent, (event) => {
      this._region = event.region;
      this._regionSelect.setValue(event.region);
      this._render();
    });
    this.listen(ContentAccessChangedEvent, () => this._render());
    this.listen(TeamAmbushChangedEvent, () => this._render());
    for (const eventClass of [PokedexChangedEvent, QuestActivatedEvent, QuestProgressedEvent, QuestClaimedEvent]) {
      this.listen(eventClass, () => this._render());
    }
    this.listen(LanguageChangedEvent, () => {
      this._syncHelpButtonLabel();
      this._render();
    });
    this._roamingWindow = RoamingSystem.getRotationWindow();
    this.listen(RoamingRotationTickEvent, (event) => {
      const nextWindow = RoamingSystem.getRotationWindow(event.timestamp);
      if (nextWindow === this._roamingWindow) return;
      this._roamingWindow = nextWindow;
      this._render();
    });
    this._render();
  }

  /** @private @param {string} regionId */
  _changeRegion(regionId) {
    const locations = LocationSystem.getInstance();
    if (regionId === locations.getCurrentRegion()) {
      this._region = regionId;
      this._render();
      return;
    }

    if (BattleSystem.getInstance().isActive() || DungeonSystem.getInstance().isActive()) {
      this._confirm.ask({
        title: t('leave_battle_btn'),
        message: t('travel_in_battle_confirm'),
        confirmLabel: t('travel_btn'),
        danger: true,
        onConfirm: () => {
          if (DungeonSystem.getInstance().isActive()) {
            DungeonSystem.getInstance().quitFromBattle();
          } else {
            BattleSystem.getInstance().endBattle(false);
          }
          this._executeChangeRegion(regionId);
        }
      });
      return;
    }
    this._executeChangeRegion(regionId);
  }

  /** @private @param {string} regionId */
  _executeChangeRegion(regionId) {
    const locations = LocationSystem.getInstance();
    if (!locations.travelToRegion(regionId)) {
      this._region = locations.getCurrentRegion();
      this._regionSelect.setValue(this._region);
      const status = FeatureAccessSystem.getInstance().getRegionAccessStatus(regionId);
      if (!status.unlocked) {
        const target = t(REGIONS.find((region) => region.id === regionId)?.labelKey || 'map_region_kanto');
        const previous = t(REGIONS.find((region) => region.id === status.previous)?.labelKey || 'map_region_kanto');
        const message = status.reason === 'league'
          ? t('region_locked_league', { target, region: previous })
          : status.reason === 'dex'
            ? t('region_locked_dex', { target, region: previous, caught: status.caught, total: status.total })
            : t('region_locked_generic', { target });
        NotificationSystem.getInstance().notifyTemporary(message, {
          channel: NotificationChannels.GAMEPLAY,
          tone: NotificationTones.DANGER
        });
      } else if (!DungeonSystem.getInstance().getRun()?.active) {
        NotificationSystem.getInstance().notifyTemporary(
          t('region_locked_generic', { target: t(REGIONS.find((region) => region.id === regionId)?.labelKey || 'map_region_kanto') }),
          { channel: NotificationChannels.GAMEPLAY, tone: NotificationTones.DANGER }
        );
      }
      this._render();
      return;
    }

    if (BattleSystem.getInstance().isActive()) {
      BattleSystem.getInstance().endBattle(false);
    }
    const locationId = locations.getCurrentLocationId();
    this._region = locations.getCurrentRegion();
    this._regionSelect.setValue(this._region);
    this._render();
    NotificationSystem.getInstance().notifyTemporary(t('map_current_loc', {
      name: t(`location.${locationId}`)
    }), { channel: NotificationChannels.GAMEPLAY, tone: NotificationTones.ACCENT });
  }

  /** @private */
  _render() {
    const locations = LocationSystem.getInstance();
    this.setTitle(t('map_title_name', { region: t(`region_${this._region}`) }));
    this._map.setBackground(AssetPaths.regionMap(this._region));
    this._map.setNodes(LocationDB.getInstance().getByRegion(this._region).filter((loc) => loc.layout).map((loc) => {
      const state = locations.getState(loc.id);
      const label = t(`location.${loc.id}`);
      return {
        id: loc.id,
        x: loc.layout.x,
        y: loc.layout.y,
        w: loc.layout.w ?? DEFAULT_NODE_SIZE,
        h: loc.layout.h ?? DEFAULT_NODE_SIZE,
        label,
        state,
        mapColorStatus: locations.getMapColorStatus(loc.id),
        tooltip: state === LocationStates.LOCKED ? this._lockMessage(loc, label) : label
      };
    }));

    const currentLocId = locations.getCurrentLocationId();
    const currentLoc = LocationDB.getInstance().getById(currentLocId);
    if (currentLoc && currentLoc.region === this._region && currentLoc.layout) {
      const save = SaveSystem.getInstance().getCurrentSave();
      const playerSprite = save?.player?.trainerSprite || 'trainer-0';
      this._map.setPlayer({
        x: currentLoc.layout.x,
        y: currentLoc.layout.y,
        spriteUrl: AssetPaths.trainerSprite(playerSprite),
        tooltip: t('map_you_are_here')
      });
    } else {
      this._map.setPlayer(null);
    }

    const ambushes = TeamAmbushSystem.getInstance().getAmbushesForRegion(this._region);
    const ambushMarkers = ambushes.map((ambush) => {
      const loc = LocationDB.getInstance().getById(ambush.locationId);
      if (!loc || !loc.layout) return null;
      return {
        x: loc.layout.x,
        y: loc.layout.y,
        spriteUrl: AssetPaths.trainerSprite(ambush.sprite),
        tooltip: t('team_ambush_tooltip', { team: t(ambush.teamNameKey) }),
        locationId: ambush.locationId
      };
    }).filter(Boolean);
    this._map.setAmbushMarkers(ambushMarkers);
  }

  /** @private @param {Object|null} location @param {string} name */
  _lockMessage(location, name) {
    if (!location) return t('map_location_locked_unreachable', { name });
    const status = FeatureAccessSystem.getInstance().getLocationAccessStatus(location.id);
    switch (status.reason) {
      case 'badges':
        return t('map_location_locked_badges', { name, need: status.need, have: status.have });
      case 'item':
        return t('map_location_locked_item', { name, item: t(`item.${status.itemId}.name`) });
      case 'quest':
        return t('map_location_locked_quest', { name, quest: t(`quests.${status.questKey}.title`) });
      case 'champion':
        return t('map_location_locked_champion', { name });
      case 'starter':
        return t('map_location_locked_starter', {
          name,
          region: t(REGIONS.find((region) => region.id === status.starterRegion)?.labelKey || 'map_region_kanto')
        });
      case 'rotation':
        return t('map_location_locked_rotation', { name });
      case 'wins':
        return t('map_location_locked_wins', {
          name,
          location: t(`location.${status.blockingLocationId}`),
          remaining: status.remainingWins
        });
      default:
        return t('map_location_locked_unreachable', { name });
    }
  }

  /**
   * @private
   * @param {string} locationId
   */
  _travel(locationId) {
    const locations = LocationSystem.getInstance();
    const currentLocId = locations.getCurrentLocationId();
    if (locationId === currentLocId) return;

    if (BattleSystem.getInstance().isActive() || DungeonSystem.getInstance().isActive()) {
      this._confirm.ask({
        title: t('leave_battle_btn'),
        message: t('travel_in_battle_confirm'),
        confirmLabel: t('travel_btn'),
        danger: true,
        onConfirm: () => {
          if (DungeonSystem.getInstance().isActive()) {
            DungeonSystem.getInstance().quitFromBattle();
          } else {
            BattleSystem.getInstance().endBattle(false);
          }
          this._executeTravel(locationId);
        }
      });
      return;
    }
    this._executeTravel(locationId);
  }

  /**
   * @private
   * @param {string} locationId
   */
  _executeTravel(locationId) {
    const locations = LocationSystem.getInstance();
    const currentLocId = locations.getCurrentLocationId();
    const ambushSystem = TeamAmbushSystem.getInstance();
    if (ambushSystem.hasAmbush(locationId)) {
      ambushSystem.triggerAmbush(locationId, currentLocId);
      return;
    }

    const name = t(`location.${locationId}`);
    if (!locations.travelTo(locationId)) {
      NotificationSystem.getInstance().notifyTemporary(
        this._lockMessage(LocationDB.getInstance().getById(locationId), name),
        { channel: NotificationChannels.GAMEPLAY, tone: NotificationTones.DANGER }
      );
      return;
    }
    NotificationSystem.getInstance().notifyTemporary(
      t('map_current_loc', { name }),
      { channel: NotificationChannels.GAMEPLAY, tone: NotificationTones.ACCENT }
    );
  }
}
