/**
 * PokéWorld UI — DashboardChromeView (rebuilt from zero on the ECS DS —
 * wave 14)
 *
 * The dashboard window headers: the classic adapter (dashboard.js
 * renderDashboardChrome) stamps each static #main-dashboard shell ONCE at
 * boot with this view's title cluster (grip + icon + label). Right-side
 * tool nodes (region selector, base controls, map "?" button) are LIVE
 * elements re-appended by the adapter — their state never resets.
 *
 * @module ui/views/DashboardChromeView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { toHTMLString } from '../../engine/render/vdom.js';
import { winHeaderTitleVNode } from '../components/win-chrome.js';

export class DashboardChromeView extends UIView {
  constructor(model) {
    super({ name: 'DashboardChromeView', model: model || {} });
  }

  onLoad() {
    this.titleEntity = this.spawn('ui:win-chrome', []);
    this.titleEntity.addComponent(new UIRenderComponent({
      template: () => [winHeaderTitleVNode(this.model)],
    }));
  }

  /** Header title cluster as an HTML string (shell already exists). */
  static titleHTML(model) {
    const view = new DashboardChromeView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}

