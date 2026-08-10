/**
 * PokéWorld UI — HatcheryWindowView (rebuilt from zero on the ECS DS)
 *
 * The day care / hatchery window is a MACHINE window (see
 * components/machine-window): a column of stateful slot cards (occupant
 * progress rows + full-card offers for empty slots) layered over the
 * GameScene. All interactivity keeps flowing through the legacy
 * data-action dispatcher (same delegation model as the training window).
 *
 * Model (shaped by the classic adapter): see machine-window.js.
 *
 * @module ui/views/HatcheryWindowView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { machineWindowVNode } from '../components/machine-window.js';
import { toHTMLString } from '../../engine/render/vdom.js';

export class HatcheryWindowView extends UIView {
  constructor(model) {
    super({ name: 'HatcheryWindowView', model: model || {} });
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:machine-window', []);
    this.windowEntity.addComponent(new UIRenderComponent({
      template: (e) => machineWindowVNode(Object.assign({ entityId: e.id }, this.model)),
    }));
  }

  /**
   * DOM-free serialization for classic adapters and tests.
   * @param {Object} model
   * @returns {string} the whole window as one HTML string
   */
  static toHTML(model) {
    const view = new HatcheryWindowView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}
