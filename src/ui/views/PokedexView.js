/**
 * PokéWorld UI — PokedexView (rebuilt from zero on the ECS DS)
 *
 * Regional Pokédex grid. Hard rules honored:
 *   - the Chroma Charm banner is NOT part of the grid: it lives in the
 *     fixed info/filter slot together with the seen/caught/shiny stats,
 *   - every species sprite goes through the single PokemonSprite component
 *     (canonical beige circle, 2 clamped sizes — 'standard' here),
 *   - cells are interactive entities only when the species is seen.
 *
 * Model (shaped by the classic adapter):
 * {
 *   stats: [{label, valueHtml}...] (flat strings allowed),
 *   charm: { title, regions: [{name, caught, total, pct, done}] } | null,
 *   cells: [{ id, name, seen, caught, shiny, imgSrc, emoji }],
 *   spriteSize: 'standard'
 * }
 *
 * @module ui/views/PokedexView
 */
import { UIView } from './UIView.js';
import { createLayout } from '../components/layouts.js';
import { createToolbar } from '../components/toolbar.js';
import { filterBarVNode } from '../components/filter-bar.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { UIInteractiveComponent } from '../../engine/components/UIInteractiveComponent.js';
import { pokemonSpriteVNode } from '../components/sprite.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from '../components/component-utils.js';

export class PokedexView extends UIView {
  constructor(model) {
    super({ name: 'PokedexView', model: model || {} });
  }

  onLoad() {
    const model = this.model;

    // Fixed info bar entity: stats + Chroma Charm banner (outside the grid).
    this.toolbarEntity = createToolbar(this, {
      className: 'dex-info-bar',
      left: (model.stats || []).map((s) => h.raw(`<span class="pw-text-sm pw-light2">${s}</span>`)),
      right: model.charm ? PokedexView.charmVNode(model.charm) : null,
    });
    // Legacy class contract for the charm wrapper.
    this.toolbarEntity.get(UIRenderComponent).template = () => h('div', { class: 'dex-info-bar pw-ui-toolbar', dataset: { fixed: 'true' } },
      (model.stats || []).map((s) => h.raw(`<span class="pw-text-sm pw-light2">${s}</span>`)),
      model.charm ? h('div', { class: 'dex-charm-info' }, PokedexView.charmVNode(model.charm)) : null);

    // Scrollable grid of species cells.
    this.gridEntity = createLayout(this, {
      direction: 'grid',
      cols: 0, // responsive columns driven by the themed .dex-grid CSS
      className: 'dex-grid-root',
      bodyClassName: 'dex-grid',
      scrollable: true,
    });
    for (const cellModel of model.cells || []) {
      if (!cellModel) continue;
      const cell = this.spawn('ui:dex-cell', [], this.gridEntity);
      cell.addComponent(new UIInteractiveComponent({
        disabled: !cellModel.seen,       // unseen species are not actionable
        hideWhenDisabled: false,          // …but their (silhouette) cell stays visible
        action: 'legacy-call',
      }));
      cell.addComponent(new UIRenderComponent({
        template: (ce) => {
          const inter = ce.get(UIInteractiveComponent);
          if (inter.renderHidden) return null;
          const classes = cx('dex-entry',
            cellModel.caught ? 'caught' : cellModel.seen ? 'seen' : 'unknown');
          const dataset = { pwEid: String(ce.id) };
          if (cellModel.seen) {
            dataset.action = 'legacy-call';
            dataset.call = 'openDexEntry';
            dataset.callArgs = String(cellModel.id);
          }
          return h('div', { class: classes, dataset, title: cellModel.seen ? cellModel.name : '???' },
            h('div', { class: 'dex-sprite pw-manage-sprite' },
              pokemonSpriteVNode({
                imgSrc: cellModel.imgSrc,
                emoji: cellModel.emoji,
                shiny: cellModel.shiny,
                size: 'standard',
                imgClass: cellModel.caught ? '' : 'silhouette-img silhouette-filtered',
              })),
            h('div', { class: 'dex-number' }, `#${String(cellModel.id).padStart(3, '0')}`),
            h('div', { class: cx('dex-shiny', cellModel.shiny ? 'is-visible' : 'is-hidden') }, '★'));
        },
      }));
    }
  }

  /**
   * Chroma Charm banner (themed tokens — no hardcoded colors).
   * @param {Object} charm
   * @returns {*} vnode
   */
  static charmVNode(charm) {
    return h('div', { class: 'pw-panel dex-charm-panel' },
      h('div', { class: 'dex-charm-title' }, charm.title),
      h('div', { class: 'dex-charm-regions' }, (charm.regions || []).map((r) => h('span', {
        class: cx('pw-badge dex-charm-stat', r.done ? 'is-done' : 'is-todo'),
      }, `${r.done ? '✨' : '○'} ${r.name} ${r.caught}/${r.total} (${r.pct}%)`))));
  }

  /** @returns {*} Fixed region: stats/Charm info bar + unified FilterBar. */
  filtersVNode() {
    const infoBar = this.toolbarEntity.get(UIRenderComponent).renderTemplate();
    if (!this.model.filterBar) return infoBar;
    // Same DS FilterBar component as the bag / PC box (region, type, shiny,
    // rank, name search, sort, reset).
    return h('div', { class: 'dex-fixed-stack' },
      infoBar,
      filterBarVNode(this.model.filterBar));
  }

  /** @returns {*} Grid vnode (content). */
  contentVNode() {
    return this.gridEntity.get(UIRenderComponent).renderTemplate();
  }

  buildView() {
    return h('div', { class: 'pw-scene pokedex-panel-content', dataset: { scene: this.name } },
      this.filtersVNode(),
      this.contentVNode());
  }

  /**
   * DOM-free serialization for classic adapters and tests.
   * @param {Object} model
   * @returns {{filters: string, content: string, full: string}}
   */
  static toHTML(model) {
    const scene = new PokedexView(model);
    scene.enter();
    const filters = toHTMLString(scene.filtersVNode());
    const content = toHTMLString(scene.contentVNode());
    return { filters, content, full: filters + content };
  }
}

