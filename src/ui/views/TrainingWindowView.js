/**
 * PokéWorld UI — TrainingWindowView (rebuilt from zero on the ECS DS)
 *
 * The training window is a MACHINE window (see components/machine-window):
 * a grid of stateful slot cards layered over the GameScene. This view owns
 * ONE entity whose render component produces the whole parametrized window
 * — every interactive element inside keeps flowing through the legacy
 * data-action dispatcher (same delegation model as the FilterBar chips).
 *
 * The live training battle (training-battle-live-panel) is a DIFFERENT
 * surface with its own tick patch contract — not covered by this view.
 *
 * Model (shaped by the classic adapter): see machine-window.js.
 *
 * @module ui/views/TrainingWindowView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { machineWindowVNode } from '../components/machine-window.js';
import { toHTMLString } from '../../engine/render/vdom.js';

export class TrainingWindowView extends UIView {
  constructor(model) {
    super({ name: 'TrainingWindowView', model: model || {} });
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
    const view = new TrainingWindowView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}
