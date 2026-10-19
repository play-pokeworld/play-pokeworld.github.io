/**
 * @file MapPanel.js
 * @brief World map window: region selector + interactive map (C++: class MapPanel : public DraggablePanel).
 */

import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIDropdown } from '../ui/UIDropdown.js';
import { UIMapView } from '../ui/UIMapView.js';
import { LocationDB } from '../data/LocationDB.js';
import { LocationSystem, LocationStates } from '../systems/LocationSystem.js';
import { NotificationSystem } from '../systems/NotificationSystem.js';
import { NotificationChannels, NotificationTones } from '../config/NotificationConfig.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
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
    this._render();
  }

  /** @private */
  _render() {
    const locations = LocationSystem.getInstance();
    this._map.setBackground(AssetPaths.regionMap(this._region));
    this._map.setNodes(LocationDB.getInstance().getByRegion(this._region).map((loc) => {
      const state = locations.getState(loc.id);
      const label = t(`location.${loc.id}`);
      return {
        id: loc.id,
        x: loc.x,
        y: loc.y,
        w: loc.w ?? DEFAULT_NODE_SIZE,
        h: loc.h ?? DEFAULT_NODE_SIZE,
        label,
        state,
        tooltip: state === LocationStates.LOCKED ? t('map_location_locked', { name: label, badges: loc.badgeReq ?? 0 }) : label
      };
    }));
  }

  /**
   * @private
   * @param {string} locationId
   */
  _travel(locationId) {
    const name = t(`location.${locationId}`);
    if (!LocationSystem.getInstance().travelTo(locationId)) {
      NotificationSystem.getInstance().notifyTemporary(
        t('map_location_locked', { name, badges: LocationDB.getInstance().getById(locationId)?.badgeReq ?? 0 }),
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
