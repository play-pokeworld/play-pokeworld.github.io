/**
 * PokéWorld UI — MineWindowView (rebuilt from zero on the ECS DS)
 *
 * The mine window is NOT a slot-card machine (it is a digging board), so
 * it gets its own view — but follows the SAME contracts as the machine
 * windows:
 *   - one ECS entity renders ONE virtual tree (state → render),
 *   - colors are theme CLASSES (mine-tile--d*, mine-tile--item-*) defined
 *     on the design-system palette — zero hardcoded hex in JS,
 *   - live anchors preserved exactly: #mine-energy-val (text) and
 *     #mine-energy-bar.stat-fill (width painter, data-pct),
 *   - only usable controls render (locked tools are filtered upstream),
 *   - interactions keep flowing through the legacy data-action dispatcher.
 *
 * Model (shaped by the classic adapter):
 * {
 *   className?, header: { classes?, actions: [{label, iconHtml?, call, callArgs?}] } | null,
 *   title, subtitle,
 *   energy: { label, valueText, pct, hint },
 *   tools: [{ id, label, cost, selected, call, callArgs }],
 *   grid: { cols, tiles: [{ depth, itemKey?, itemCenter?, itemCollected?, clickable, x, y, name? }] },
 *   treasures: { label, found, total, rows: [{ collected, name }] },
 *   newLayerLabel,
 * }
 *
 * @module ui/views/MineWindowView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from '../components/component-utils.js';

export class MineWindowView extends UIView {
  constructor(model) {
    super({ name: 'MineWindowView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    const grid = m.grid || { cols: 8, tiles: [] };
    return h('div', { class: cx('pw-mine-window-root', m.className) },
      m.header && m.header.actions && m.header.actions.length
        ? h('div', { class: cx(m.header.classes, 'pw-mine-header') },
            ...m.header.actions.map((a) => h('button', {
              type: 'button', class: 'hbtn',
              dataset: { action: 'legacy-call', call: a.call, callArgs: a.callArgs != null ? String(a.callArgs) : '' },
            }, a.iconHtml ? h.raw(a.iconHtml + ' ') : null, a.label)))
        : null,
      m.title ? h('div', { class: 'loc-title' }, m.title) : null,
      // Wave 43 — trusted-markup contract: the subtitle is a localized string
      // that may contain tags (mine_sub: <b>Pierres…</b>) —
      // same template as InfoPanelView (h.raw), never user input.
      m.subtitle ? h('div', { class: 'loc-sub' }, h.raw(m.subtitle)) : null,
      m.energy
        ? h('div', { class: 'pw-actions-row' },
            h('div', { class: 'pw-action-flex' },
              h('div', { class: 'pw-field-row' },
                h('span', null, m.energy.label),
                h('span', { id: 'mine-energy-val', class: 'pw-mine-energy-val' }, m.energy.valueText)),
              h('div', { class: 'stat-bar pw-mine-energy-bar' },
                // Wave 13: inline width (self-contained bar) — the DS
                // painter only re-sets the same value (contract kept).
                h('div', {
                  id: 'mine-energy-bar',
                  class: 'stat-fill',
                  dataset: { pct: String(Math.max(0, Math.min(100, Math.round(Number(m.energy.pct) || 0)))) },
                  style: { width: `${Math.max(0, Math.min(100, Math.round(Number(m.energy.pct) || 0)))}%` },
                })),
              h('div', { class: 'pw-field-hint' }, m.energy.hint)),
            h('div', { class: 'pw-chip-group' },
              ...(m.tools || []).map((tool) => h('button', {
                type: 'button',
                class: cx('hbtn mine-tool-btn', tool.selected && 'active'),
                dataset: { action: 'legacy-call', call: tool.call, callArgs: tool.callArgs != null ? String(tool.callArgs) : '' },
              }, `${tool.label} · ${tool.cost}`))))
        : null,
      h('div', { class: 'mine-grid', dataset: { gridCols: String(grid.cols) } },
        ...grid.tiles.map((tile) => {
          const revealed = tile.depth === 0 && !!tile.itemKey;
          return h('div', {
            class: cx('mine-tile',
              `mine-tile--d${tile.depth}`,
              tile.clickable && 'mine-tile-clickable',
              revealed && 'mine-tile-revealed-item',
              revealed && (`mine-tile--item-${tile.itemKey}`)),
            dataset: tile.clickable
              ? { action: 'legacy-call', call: 'digMineTile', callArgs: `${tile.x},${tile.y}` }
              : undefined,
          },
            revealed
              ? h('div', { class: cx('mine-revealed-item', tile.itemCollected && 'is-collected', `mine-item--${tile.itemKey}`) },
                  tile.itemCenter && tile.iconHtml ? h.raw(tile.iconHtml) : null)
              : h('div', { class: 'pw-slot-label' }, String(tile.depth)));
        })),
      m.treasures
        ? h('div', { class: 'pw-trainer-head' },
            h('div', null,
              h('span', { class: 'pw-bold' }, `${m.treasures.label} `,
                h('span', { class: 'pw-light2' }, `${m.treasures.found} / ${m.treasures.total}`)),
              h('div', { class: 'pw-field-text' },
                ...(m.treasures.rows || []).map((row) => h('span', { class: cx('pw-mine-treasure', row.collected && 'is-collected') },
                  `${row.collected ? '' : '❓ '}${row.name}`)))),
            h('button', { type: 'button', class: 'hbtn', dataset: { action: 'generate-mine-layer' } }, m.newLayerLabel || ''))
        : null);
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:mine-window', []);
    this.windowEntity.addComponent(new UIRenderComponent({
      template: () => this.windowVNode(),
    }));
  }

  /**
   * DOM-free serialization for classic adapters and tests.
   * @param {Object} model
   * @returns {string} the whole window as one HTML string
   */
  static toHTML(model) {
    const view = new MineWindowView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}
