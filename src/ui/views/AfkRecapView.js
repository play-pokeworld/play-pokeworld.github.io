/**
 * PokéWorld UI — AfkRecapView (rebuilt from zero on the ECS DS)
 *
 * The offline fast-forward panel (#afk-result-modal): two modes.
 *  - progress: the live fast-forward bar (painted while the catch-up
 *    grinds — the classic engine rewrites the content on a real-clock
 *    cadence),
 *  - result: the "gains while you were away" recap: status pill, shared
 *    stat grid and the captured-Pokémon / found-item rows — the VERY SAME
 *    session-summary components as the battle summary (ONE visual
 *    language — wave 20: afk-loot-card tiles are gone).
 *
 * Kept contracts (tests passe28-offline-engine, harness probe-wave20):
 *  - progress paints contain `.afk-ff-bar` with an inline `width:N%`
 *    fill (croissant regex /width:(\d+)%/),
 *  - the result paint contains `.afk-result-grid`,
 *  - `.afk-result-status` + success/danger variants, `.afk-ff-stage`,
 *    `.modal-title`,
 *  - the close cross keeps `.afk-modal-close` and BOTH close controls
 *    carry data-action="legacy-call" data-call="closeAfkResultPanel"
 *    data-call-args="".
 *
 * Model (shaped and localized by the classic adapter, offline-engine.js):
 *   progress: { mode:'progress', title, statusText, pct, stageText }
 *   result:   { mode:'result', title, statusText, statusKind:
 *               'success'|'danger'|'info',
 *               stats: [{value, label}],
 *               capturesTitle, captures: [{spriteHtml,name,subLabel,count,shiny}],
 *               itemsTitle, items: [{iconHtml,name,qty}],
 *               emptyLabel, noteText, closeLabel }
 *
 * @module ui/views/AfkRecapView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import {
  sessionStatGridVNode,
  summarySectionTitleVNode,
  summaryEmptyVNode,
  captureListVNode,
  itemListVNode,
} from '../components/session-summary.js';

const CLOSE_DS = { action: 'legacy-call', call: 'closeAfkResultPanel', callArgs: '' };

export class AfkRecapView extends UIView {
  constructor(model) {
    super({ name: 'AfkRecapView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    if (m.mode === 'progress') {
      const pct = Math.max(0, Math.min(100, Math.round(Number(m.pct) || 0)));
      return [h('div', { class: 'afk-result-card' },
        h('div', { class: 'modal-title' }, h('div', null, m.title || '')),
        h('div', { class: 'afk-result-status' }, m.statusText || ''),
        h('div', { class: 'afk-ff-bar' }, h('i', { style: { width: `${pct}%` } })),
        m.stageText ? h('div', { class: 'afk-ff-stage' }, m.stageText) : null)];
    }

    const statusCls = m.statusKind === 'success' ? ' success' : (m.statusKind === 'danger' ? ' danger' : '');
    return [h('div', { class: 'afk-result-card' },
      h('div', { class: 'modal-title' },
        h('div', null, m.title || ''),
        h('span', { class: 'afk-modal-close', dataset: CLOSE_DS }, '✕')),
      h('div', { class: `afk-result-status${statusCls}` }, m.statusText || ''),
      // .afk-result-grid is a kept needle (passe28); the real grid is the
      // shared battle-session one (same b/span cells).
      h('div', { class: 'afk-result-grid' }, sessionStatGridVNode(m.stats || [])),
      h('div', { class: 'pw-panel pw-info-section' },
        summarySectionTitleVNode(m.capturesTitle || ''),
        (m.captures && m.captures.length) ? captureListVNode(m.captures) : summaryEmptyVNode(m.emptyLabel || '')),
      h('div', { class: 'pw-panel pw-info-section' },
        summarySectionTitleVNode(m.itemsTitle || ''),
        (m.items && m.items.length) ? itemListVNode(m.items) : summaryEmptyVNode(m.emptyLabel || '')),
      m.noteText ? h('div', { class: 'pw-text-sm pw-light1 pw-afk-note' }, m.noteText) : null,
      h('div', { class: 'afk-result-actions' },
        h('button', { class: 'hbtn', dataset: CLOSE_DS }, m.closeLabel || '')))];
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:afk-recap', []);
    this.windowEntity.addComponent(new UIRenderComponent({
      template: () => this.windowVNode(),
    }));
  }

  /**
   * DOM-free serialization for the classic adapter (offline-engine.js).
   * @param {Object} model
   * @returns {string}
   */
  static toHTML(model) {
    const view = new AfkRecapView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}
