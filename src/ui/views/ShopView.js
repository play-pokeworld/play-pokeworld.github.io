/**
 * PokéWorld UI — ShopView (rebuilt from zero on the ECS DS)
 *
 * The item shop panel (fullscreen panel content). THREE states, all owned
 * by the view (the classic adapter only shapes the model + localizes the
 * labels): normal listing / empty location / Indigo-Plateau lock.
 *
 * Kept contracts (classic layer + harness drive them):
 *   - one row per stocked item: `.shop-item` with data-action="legacy-call",
 *     data-call="buyItem", data-call-args="'<itemKey>'",
 *   - `.pw-empty-state-lg` empty / `.pw-choice-*` locked states,
 *   - the money row lives OUTSIDE (fs-panel-filters slot, DS MoneyRow).
 *
 * Model (labels pre-localized by the adapter):
 * {
 *   state: 'ok' | 'empty' | 'locked',
 *   emptyLabel?: string,
 *   locked?: { title, desc },
 *   items?: [{ key, name, desc, stockLabel, maxLabel|null, priceLabel, spriteHtml }],
 * }
 *
 * @module ui/views/ShopView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';

export class ShopView extends UIView {
  constructor(model) {
    super({ name: 'ShopView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    if (m.state === 'locked') {
      return h('div', { class: 'pw-empty-state-lg' },
        h('div', { class: 'pw-big-icon' }),
        h('div', { class: 'pw-choice-title' }, (m.locked && m.locked.title) || ''),
        h('div', { class: 'pw-choice-desc' }, (m.locked && m.locked.desc) || ''));
    }
    if (m.state !== 'ok' || !Array.isArray(m.items) || !m.items.length) {
      return h('div', { class: 'pw-empty-state-lg' }, m.emptyLabel || '');
    }
    return h('div', { class: 'pw-shop-list' },
      ...m.items.filter(Boolean).map((it) => h('div', {
        class: 'shop-item pw-choice-card pw-shop-row',
        dataset: { action: 'legacy-call', call: 'buyItem', callArgs: `'${it.key}'` },
      },
        h('div', { class: 'pw-choice-icon' }, h.raw(it.spriteHtml || '')),
        h('div', { class: 'pw-flex-1' },
          h('div', { class: 'pw-manage-name' }, it.name || ''),
          h('div', { class: 'pw-choice-sub' }, it.desc || ''),
          h('div', { class: 'pw-choice-sub' },
            it.stockLabel || '',
            it.maxLabel ? h('span', { class: 'pw-red' }, ` ${it.maxLabel}`) : null)),
        h('div', { class: 'pw-manage-level pw-shop-price' }, it.priceLabel || ''))));
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:shop', []);
    this.windowEntity.addComponent(new UIRenderComponent({
      template: () => this.windowVNode(),
    }));
  }

  /**
   * DOM-free serialization for the classic adapter (shop.js).
   * @param {Object} model
   * @returns {string}
   */
  static toHTML(model) {
    const view = new ShopView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}
