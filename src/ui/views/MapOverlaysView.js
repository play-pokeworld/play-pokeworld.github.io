/**
 * PokéWorld UI — MapOverlaysView (rebuilt from zero on the ECS DS)
 *
 * The map-window help overlay (dressing only): the "?" help modal — the
 * legend of the map node colours — serialized as the CONTENT of
 * #map-help-modal (the adapter owns the shell element and the .open
 * toggling).
 *
 * Wave 14 (user feedback): the separate visited/reachable/locked "legend"
 * panel was REMOVED — the colour help above is the only legend that must
 * exist. Kept contracts: #map-help-modal id, toggle-map-help action,
 * swatch state classes.
 *
 * @module ui/views/MapOverlaysView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { toHTMLString } from '../../engine/render/vdom.js';
import { mapHelpCardVNode } from '../components/map-dressing.js';

export class MapOverlaysView extends UIView {
  constructor(model) {
    super({ name: 'MapOverlaysView', model: model || {} });
  }

  onLoad() {
    // Spawn the card entity UNDER the view root (renderChildren(root)).
    this.cardEntity = this.spawn('ui:map-overlays', []);
    this.cardEntity.addComponent(new UIRenderComponent({
      template: () => [mapHelpCardVNode(this.model)],
    }));
  }

  /** Content of #map-help-modal (adapter owns shell + .open). */
  static helpHTML(model) {
    const view = new MapOverlaysView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}
