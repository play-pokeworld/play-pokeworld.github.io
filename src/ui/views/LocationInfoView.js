/**
 * PokéWorld UI — LocationInfoView (rebuilt from zero on the ECS DS)
 *
 * The "info lieu" panel of the map window: overview card, lore quote,
 * the action grid (NPCs, explore, puzzles, quest battle, shop, arena —
 * locked entries are INFORMATIONAL rows, never dead buttons), the zone-
 * unlock progress tip, the roaming/Mirage rotation chips, the wild
 * encounters grid (canonical sprite discs), the route drops and the
 * Hoenn secret-base alcoves.
 *
 * Kept contracts: block contracts from ui/components/map-dressing.js.
 *
 * Model (shaped by the classic adapter, labels localized there):
 * {
 *   overview?, playStats?, lore?, actions: [], unlockTip?, timerChips: [],
 *   wild: { meta, entries }|null, drops?|null, alcoves?|null,
 * }
 *
 * @module ui/views/LocationInfoView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import {
  locOverviewVNode,
  locPlayStatsVNode,
  locLoreVNode,
  locActionGridVNode,
  locUnlockTipVNode,
  locTimerChipVNode,
  locWildMetaVNode,
  locWildGridVNode,
  locDropsVNode,
  locAlcovesVNode,
} from '../components/map-dressing.js';

export class LocationInfoView extends UIView {
  constructor(model) {
    super({ name: 'LocationInfoView', model: model || {} });
  }

  panelVNode() {
    const m = this.model;
    return h('div', { class: 'pw-loc-info' },
      m.overview ? locOverviewVNode(m.overview) : null,
      m.playStats ? locPlayStatsVNode(m.playStats) : null,
      m.lore ? locLoreVNode(m.lore) : null,
      (m.actions || []).length ? locActionGridVNode(m.actions) : null,
      m.unlockTip ? locUnlockTipVNode(m.unlockTip) : null,
      ...(m.timerChips || []).map(locTimerChipVNode),
      m.wild ? [locWildMetaVNode(m.wild.meta), locWildGridVNode(m.wild.entries)] : null,
      m.drops ? locDropsVNode(m.drops) : null,
      m.alcoves ? locAlcovesVNode(m.alcoves) : null);
  }

  onLoad() {
    // Spawn the panel entity UNDER the view root (renderChildren(root)).
    this.panelEntity = this.spawn('ui:location-info', []);
    this.panelEntity.addComponent(new UIRenderComponent({
      template: () => [this.panelVNode()],
    }));
  }

  static toHTML(model) {
    const view = new LocationInfoView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}

