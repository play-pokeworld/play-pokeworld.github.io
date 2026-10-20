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
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { ContentAccessChangedEvent } from '../core/events/ContentAccessChangedEvent.js';
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
      name: 'MapPanel'
    });
    this._region = LocationSystem.getInstance().getCurrentRegion();

    const regionSelect = new UIDropdown({
      id: 'map-region-select',
      className: 'map-region-wrap',
      options: REGIONS.map((r) => ({ value: r.id, label: t(r.labelKey), disabled: !r.available })),
      value: this._region,
      onChange: (regionId) => {
        this._region = regionId;
        this._render();
      }
    });
    regionSelect.setAttribute('data-stop-drag', 'true');
    this.addHeaderAction(regionSelect);

    this._map = new UIMapView({
      width: MAP_CANVAS.width,
      height: MAP_CANVAS.height,
      svgId: 'map-svg',
      onNodeClick: (id) => this._travel(id)
    });
    this.addChild(this._map);

    this.listen(LocationChangedEvent, () => this._render());
    this.listen(ContentAccessChangedEvent, () => this._render());
    this._render();
  }

  /** @private */
  _render() {
    const locations = LocationSystem.getInstance();
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
        tooltip: state === LocationStates.LOCKED ? this._lockMessage(loc, label) : label
      };
    }));
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
    const name = t(`location.${locationId}`);
    if (!LocationSystem.getInstance().travelTo(locationId)) {
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
