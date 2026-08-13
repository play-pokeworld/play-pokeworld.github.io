/**
 * PokéWorld UI — ManagementMenuView (rebuilt from zero on the ECS DS)
 *
 * The ONE shell for the three machine management screens (day-care,
 * training, mine): modal title + sticky tab bar + scrollable content area,
 * rendered as ONE virtual tree. Content is a list of declarative blocks
 * (see ui/components/management.js): uniform upgrade grids and automation
 * toggle rows are fully ECS-native; the heavy per-machine panels (slot
 * cards, staff lists) arrive as staged "raw" fragments for now.
 *
 * Kept contracts (driven by the classic adapters + harness + tests):
 *   - renders into #poke-modal-inner (host lives in index.html);
 *   - .management-shell.management-{machine} wraps
 *     .management-tabs-host + .management-content — the PERSISTENT
 *     skeleton: adapters only rewrite tabs/content on re-render so the
 *     native scroll position survives (phases 15+16, scroll-preserve
 *     tests), with a deliberate back-to-top on real tab changes;
 *   - the title close control is data-action="close-poke-modal";
 *   - tab clicks stay routed through the legacy bridge
 *     (data-action="legacy-call", open{Machine}ManagementMenu).
 *
 * Model (shaped by the classic adapters, labels already localized):
 * {
 *   machine: 'hatchery'|'training'|'mine',
 *   title, titleIconHtml,
 *   tabs: [{ id, label, iconHtml, active, call, args }],
 *   blocks: [{ kind:'upgrades'|'toggles'|'raw', … }],
 * }
 *
 * @module ui/views/ManagementMenuView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { panelHeaderVNode } from '../components/panel-header.js';
import {
  managementTabBarVNode,
  managementTabBarHTML,
  managementBlockVNode,
  managementBlocksHTML,
} from '../components/management.js';

export class ManagementMenuView extends UIView {
  constructor(model) {
    super({ name: 'ManagementMenuView', model: model || {} });
  }

  titleVNode() {
    const m = this.model;
    // Wave 32: built by THE shared constructor (see components/panel-header).
    return panelHeaderVNode({
      class: 'management-title',
      iconHtml: m.titleIconHtml || null,
      title: m.title || '',
      close: { action: 'close-poke-modal', glyph: '✕' },
    });
  }

  shellVNode() {
    const m = this.model;
    return h('div', { class: `management-shell management-${m.machine}` },
      h('div', { class: 'management-tabs-host' }, managementTabBarVNode(m.tabs)),
      h('div', { class: 'management-content', dataset: { machine: m.machine || '' } },
        (m.blocks || []).map(managementBlockVNode).filter(Boolean)));
  }

  windowVNode() {
    // Array of roots: with .pw-view { display:contents } the title and the
    // shell become DIRECT flex children of #poke-modal-inner, exactly like
    // the pre-ECS markup (grid/flex sizing depends on it).
    return [this.titleVNode(), this.shellVNode()];
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:management-menu', []);
    this.windowEntity.addComponent(new UIRenderComponent({
      template: () => this.windowVNode(),
    }));
  }

  /** Full shell serialization for the classic adapters (first render). */
  static toHTML(model) {
    const view = new ManagementMenuView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }

  /** Tab bar only — rewritten on every render (active state follows). */
  static tabsHTML(model) {
    return managementTabBarHTML(model ? model.tabs : []);
  }

  /** Content blocks only — rewritten on every render. */
  static contentHTML(model) {
    return managementBlocksHTML(model ? model.blocks : []);
  }
}

