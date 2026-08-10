/**
 * PokéWorld UI — StarterModalView (rebuilt from zero on the ECS DS)
 *
 * The starter-picking overlay shown right after creating a save (Kanto /
 * Johto / Hoenn): welcome line, title + subtitle, three starter cards and
 * the "required" footer note — rendered as ONE virtual tree at open time,
 * labels from t() in the CURRENT language.
 *
 * Kept contracts (the classic layer + click delegation drive them):
 *   - #starter-modal host is static in index.html (display flex/none);
 *     this view renders the CONTENT of #starter-modal-inner,
 *   - one .starter-card.starter-card--custom per starter carrying
 *     data-starter-id / data-starter-region (inner.onclick delegation in
 *     starter.js reads them to call pickStarter),
 *   - sprite markup (.poke-sprite wrapper + single-sprite-helper HTML,
 *     unified dark disc DS2807), .poke-name with #id, .pw-text-glow desc,
 *   - the modal stays in the outside-close DENYLIST (a starter MUST be
 *     picked, clicking the backdrop does nothing).
 *
 * Model (shaped by the classic adapter):
 * {
 *   welcome, title, subtitle, required, chooseLabel, region,
 *   starters: [{ id, name, desc, spriteHtml }],
 * }
 *
 * @module ui/views/StarterModalView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';

export class StarterModalView extends UIView {
  constructor(model) {
    super({ name: 'StarterModalView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    return h('div', null,
      h('div', { class: 'pw-text-sm pw-light1 pw-center' }, m.welcome || ''),
      h('div', { class: 'pw-center' },
        h('div', { class: 'pw-text-md pw-bold pw-light2' }, m.title || ''),
        h('div', { class: 'pw-text-sm pw-light1' }, m.subtitle || '')),
      h('div', null,
        ...(m.starters || []).map((st) => h('div', {
          class: 'starter-card starter-card--custom',
          dataset: { starterId: String(st.id), starterRegion: m.region || 'kanto' },
        },
          h('div', { class: 'poke-sprite' }, st.spriteHtml ? h.raw(st.spriteHtml) : null),
          h('div', { class: 'pw-flex-1' },
            h('div', { class: 'poke-name pw-text-md' }, st.name || '?', h('span', { class: 'pw-text-sm' }, ` #${st.id}`)),
            h('div', { class: 'pw-text-glow' }, st.desc || '')),
          h('div', null, m.chooseLabel || '')))),
      h('div', { class: 'pw-text-sm pw-light1 pw-center' }, m.required || ''));
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:starter-modal', []);
    this.windowEntity.addComponent(new UIRenderComponent({
      template: () => this.windowVNode(),
    }));
  }

  /**
   * DOM-free serialization for the classic adapter (starter.js).
   * @param {Object} model
   * @returns {string}
   */
  static toHTML(model) {
    const view = new StarterModalView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}
