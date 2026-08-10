/**
 * PokéWorld UI — AtollPanelView (rebuilt from zero on the ECS DS)
 *
 * The Battle Atoll fullscreen panel: hero (title + tokens/streak box),
 * the uniform tab bar and the current tab's content — home hub, mode
 * lists (Tower / Factory / Arena / Dome, each with the group description
 * and the 12 h rotation meta), the Factory run status card and the token
 * shop. A locked Atoll degrades to ONE hero + explanatory text (no dead
 * controls — user rule).
 *
 * Kept contracts: block contracts from ui/components/atoll.js
 * (data-rotation-timer="atoll" span, legacy-call routing names/args).
 *
 * Model (shaped by the classic adapter, labels localized there):
 * {
 *   locked, lockedTitle, lockedDesc,
 *   hero, nav, tab,
 *   groupDesc?, rotation?, home?, modeCards?, runCard?, shopTitle?, shopCards?,
 * }
 *
 * @module ui/views/AtollPanelView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import {
  atollHeroVNode,
  atollNavVNode,
  atollRotationMetaVNode,
  atollGroupDescVNode,
  atollHomeGridVNode,
  atollModeGridVNode,
  atollRunCardVNode,
  atollShopGridVNode,
} from '../components/atoll.js';

export class AtollPanelView extends UIView {
  constructor(model) {
    super({ name: 'AtollPanelView', model: model || {} });
  }

  tabContentVNode() {
    const m = this.model;
    if (m.tab === 'menu') {
      return atollHomeGridVNode(m.home);
    }
    if (m.tab === 'shop') {
      return [
        h('div', { class: 'pw-atoll-section-title' }, m.shopTitle || ''),
        atollShopGridVNode(m.shopCards),
      ];
    }
    // tower / factory / arena / dome
    return [
      m.groupDesc ? atollGroupDescVNode(m.groupDesc) : null,
      m.rotation ? atollRotationMetaVNode(m.rotation) : null,
      m.runCard ? atollRunCardVNode(m.runCard) : null,
      atollModeGridVNode(m.modeCards),
    ];
  }

  panelVNode() {
    const m = this.model;
    if (m.locked) {
      return h('div', { class: 'pw-atoll-panel' },
        atollHeroVNode({ title: m.lockedTitle, desc: m.lockedDesc }));
    }
    return h('div', { class: 'pw-atoll-panel' },
      atollHeroVNode(m.hero),
      atollNavVNode(m.nav),
      this.tabContentVNode());
  }

  onLoad() {
    // Spawn the panel entity UNDER the view root (renderChildren(root)).
    this.panelEntity = this.spawn('ui:atoll-panel', []);
    this.panelEntity.addComponent(new UIRenderComponent({
      template: () => [this.panelVNode()],
    }));
  }

  static toHTML(model) {
    const view = new AtollPanelView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}
