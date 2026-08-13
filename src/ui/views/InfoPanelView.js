/**
 * PokéWorld UI — InfoPanelView (rebuilt from zero on the ECS DS)
 *
 * The ONE shared info panel (move / item / talent details) shown inside
 * #poke-modal-inner: canonical header (icon + name + subtitle + contextual
 * back cross), optional stat cards, framed sections, optional label/value
 * rows and the contextual BACK button. Replaces the hand-grown HTML string
 * builder — the classic bridge adapter (pwBuildInfoPanel) now delegates to
 * this view.
 *
 * Kept contracts (tests info-panel-navigation + contextual navigation):
 *   - the header cross AND the footer button are the ONLY two
 *     `[data-action="pw-info-back"]` elements in the output,
 *   - class hooks: .modal-title.pw-info-head, .pw-row, .pw-info-icon,
 *     .pw-info-head-text, .pw-info-name, .pw-info-stat-cards,
 *     .pw-card-dark.pw-center, .pw-panel.pw-info-section,
 *     .pw-section-title, .pw-info-section-body, .pw-info-row-between,
 *     .pw-info-actions > button.hbtn.pw-info-back-btn,
 *   - section BODIES stay trusted adapter HTML (descriptions enriched
 *     with coloured weather/status badges).
 *
 * Model: { iconHtml, title, subtitle, statCards: [{label, value}],
 *          sections: [{title, body}], rows: [{label, value, valueClass}],
 *          rowsTitle, backLabel }
 *
 * @module ui/views/InfoPanelView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { panelHeaderVNode } from '../components/panel-header.js';

export class InfoPanelView extends UIView {
  constructor(model) {
    super({ name: 'InfoPanelView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    const nodes = [];
    // ── Header (cross = contextual back) ────────────────────────────
    nodes.push(panelHeaderVNode({
      class: 'pw-info-head',
      iconHtml: m.iconHtml || null,
      titleHtml: m.title || '',
      subtitleHtml: m.subtitle || null,
      close: { action: 'pw-info-back' },
    }));
    // ── Stat cards ──────────────────────────────────────────────────
    if (m.statCards && m.statCards.length) {
      nodes.push(h('div', { class: 'pw-info-stat-cards' },
        m.statCards.map((c) => h('div', { class: 'pw-card-dark pw-center' },
          h('div', { class: 'pw-text-sm pw-light1' }, h.raw(c.label || '')),
          h('div', { class: 'pw-text-lg pw-bold' }, h.raw(String(c.value == null ? '' : c.value)))))));
    }
    // ── Framed sections ─────────────────────────────────────────────
    (m.sections || []).forEach((s) => {
      nodes.push(h('div', { class: 'pw-panel pw-info-section' },
        s.title ? h('div', { class: 'pw-section-title' }, h.raw(s.title)) : null,
        h('div', { class: 'pw-info-section-body' }, h.raw(s.body || ''))));
    });
    // ── Label/value rows ────────────────────────────────────────────
    if (m.rows && m.rows.length) {
      nodes.push(h('div', { class: 'pw-panel pw-info-section' },
        m.rowsTitle ? h('div', { class: 'pw-section-title' }, h.raw(m.rowsTitle)) : null,
        m.rows.map((r) => h('div', { class: 'pw-info-row-between' },
          h('span', { class: 'pw-text-sm pw-light1' }, h.raw(r.label || '')),
          h('span', { class: r.valueClass || 'pw-light2 pw-bold' }, h.raw(r.value || ''))))));
    }
    // ── Contextual back button ──────────────────────────────────────
    nodes.push(h('div', { class: 'pw-flex-center pw-gap-sm pw-info-actions' },
      h('button', { class: 'hbtn pw-info-back-btn', dataset: { action: 'pw-info-back' } }, m.backLabel || '')));
    return nodes;
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:info-panel', []);
    this.windowEntity.addComponent(new UIRenderComponent({
      template: () => this.windowVNode(),
    }));
  }

  /**
   * DOM-free serialization for the classic adapter (pwBuildInfoPanel).
   * @param {Object} model
   * @returns {string}
   */
  static toHTML(model) {
    const view = new InfoPanelView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}

