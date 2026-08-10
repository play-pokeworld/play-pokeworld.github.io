/**
 * PokéWorld UI — GuidePanelView & TutorialCardView (rebuilt from zero on
 * the ECS DS — wave 14)
 *
 *   - GuidePanelView: the "Guide" fullscreen panel — home (section cards)
 *     or detail (page cards), chosen by model.mode. The adapter owns the
 *     _guideSection state and re-renders on setGuideSection.
 *   - TutorialCardView: the current tutorial quest card rendered inside
 *     the story window (renderTutorialQuestBlock).
 *
 * @module ui/views/GuidePanelView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { toHTMLString } from '../../engine/render/vdom.js';
import { guideHomeVNode, guideDetailVNode, tutorialQuestCardVNode } from '../components/guide.js';

export class GuidePanelView extends UIView {
  constructor(model) {
    super({ name: 'GuidePanelView', model: model || {} });
  }

  onLoad() {
    // Spawn the panel entity UNDER the view root (renderChildren(root)).
    this.panelEntity = this.spawn('ui:guide-panel', []);
    this.panelEntity.addComponent(new UIRenderComponent({
      template: () => [this.model.mode === 'detail' ? guideDetailVNode(this.model) : guideHomeVNode(this.model)],
    }));
  }

  /** Full panel (home or detail) as an HTML string. */
  static panelHTML(model) {
    const view = new GuidePanelView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}

export class TutorialCardView extends UIView {
  constructor(model) {
    super({ name: 'TutorialCardView', model: model || {} });
  }

  onLoad() {
    this.cardEntity = this.spawn('ui:tutorial-card', []);
    this.cardEntity.addComponent(new UIRenderComponent({
      template: () => [tutorialQuestCardVNode(this.model)],
    }));
  }

  /** Tutorial quest card as an HTML string. */
  static cardHTML(model) {
    const view = new TutorialCardView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}
