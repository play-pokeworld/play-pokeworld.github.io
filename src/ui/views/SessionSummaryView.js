/**
 * PokéWorld UI — SessionSummaryView (rebuilt from zero on the ECS DS)
 *
 * The battle-session summary ("Butin & résumé de session") opened after a
 * battle: ONE virtual tree per render — title bar (close contract kept),
 * scrollable content (stat grid, team damage, captures, found items) and
 * the two footer actions (restart / continue). The same view also
 * serializes the small INLINE loot strip (#battle-loot-inline) shown
 * under the battle window.
 *
 * A champion/gym battle has no loot: the whole content degrades to ONE
 * informational message (row) — never empty sections or dead controls
 * (user rule).
 *
 * Kept contracts:
 *   - #battle-summary-title id on the title text, close buttons with
 *     data-action="close-battle-summary" (title ✕ + footer continue),
 *   - footer: #loot-restart-btn[data-action="restart-last-battle"] and
 *     #loot-continue-btn, with their pw-static-* style classes,
 *   - #battle-summary-content wraps the body,
 *   - block contracts from ui/components/session-summary.js.
 *
 * Model (shaped by the classic adapter, labels localized there):
 * {
 *   title, isChamp, champMsg?,
 *   stats: [{ value, label }],
 *   damage:   { title, rows: [damageRow],   emptyLabel },
 *   captures: { title, entries: [capture],  emptyLabel },
 *   items:    { title, entries: [item],     emptyLabel },
 *   loot: { chips: [{ html, title, count }], emptyLabel },
 *   restartLabel, continueLabel,
 * }
 *
 * @module ui/views/SessionSummaryView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import {
  sessionStatGridVNode,
  summarySectionTitleVNode,
  summaryEmptyVNode,
  damageListVNode,
  captureListVNode,
  itemListVNode,
  lootChipVNode,
} from '../components/session-summary.js';

export class SessionSummaryView extends UIView {
  constructor(model) {
    super({ name: 'SessionSummaryView', model: model || {} });
  }

  titleVNode() {
    const m = this.model;
    return h('div', { class: 'modal-title' },
      h('div', { id: 'battle-summary-title' }, m.title || ''),
      h('button', {
        type: 'button',
        class: 'modal-close',
        dataset: { action: 'close-battle-summary' },
        'aria-label': m.closeLabel || '',
        'data-i18n-aria-label': 'modal_close_btn',
      }, '✕'));
  }

  contentVNode() {
    const m = this.model;
    if (m.isChamp) {
      return h('div', { id: 'battle-summary-content' },
        h('div', { class: 'pw-text-sm pw-light1' }, m.champMsg || ''));
    }
    const damage = m.damage || {};
    const captures = m.captures || {};
    const items = m.items || {};
    return h('div', { id: 'battle-summary-content' },
      sessionStatGridVNode(m.stats),
      summarySectionTitleVNode(damage.title),
      (damage.rows || []).length ? damageListVNode(damage.rows) : summaryEmptyVNode(damage.emptyLabel),
      summarySectionTitleVNode(captures.title),
      (captures.entries || []).length ? captureListVNode(captures.entries) : summaryEmptyVNode(captures.emptyLabel),
      summarySectionTitleVNode(items.title),
      (items.entries || []).length ? itemListVNode(items.entries) : summaryEmptyVNode(items.emptyLabel));
  }

  footerVNode() {
    const m = this.model;
    return h('div', { class: 'pw-static-063' },
      h('button', { id: 'loot-restart-btn', class: 'hbtn pw-static-064', dataset: { action: 'restart-last-battle' }, 'data-i18n': 'loot_restart_btn' }, m.restartLabel || ''),
      h('button', { id: 'loot-continue-btn', class: 'hbtn pw-static-065', dataset: { action: 'close-battle-summary' }, 'data-i18n': 'loot_continue_btn' }, m.continueLabel || ''));
  }

  windowVNode() {
    return [this.titleVNode(), this.contentVNode(), this.footerVNode()];
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:session-summary', []);
    this.windowEntity.addComponent(new UIRenderComponent({
      template: () => this.windowVNode(),
    }));
  }

  /** Full serialization for #battle-summary-inner (title + content + footer). */
  static toHTML(model) {
    const view = new SessionSummaryView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }

  /** Inline loot strip serialization for #battle-loot-inline. */
  static inlineHTML(model) {
    const loot = (model && model.loot) || {};
    if (loot.empty) return toHTMLString(h('div', { class: 'pw-text-sm pw-light1' }, loot.emptyLabel || ''));
    return toHTMLString((loot.chips || []).map(lootChipVNode));
  }
}
