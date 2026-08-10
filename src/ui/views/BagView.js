/**
 * PokéWorld UI — BagView (rebuilt from zero on the ECS DS)
 *
 * Player inventory. Same fixed-toolbar contract as the PC box:
 *   - tabs (item families with counters) + sorts + global search live in
 *     the FIXED filters slot — identical ergonomics to the PC box, never
 *     scrolling with the items,
 *   - items are listed as interactive cells (left-click usage flow, right
 *     click info panel — attribute dispatch kept),
 *   - the "no usable but displayed button" defect is impossible: only the
 *     reset control exists, always usable.
 *
 * Model (shaped by the classic adapter):
 * {
 *   tabs: [{id,label,count,active}],
 *   sorts: [{id,label,active}], sortLabel, search: {value, placeholder},
 *   resetLabel, items: [{ key, name, qty, iconHtml, equippedName }],
 *   emptyLabel, noResultsLabel
 * }
 *
 * @module ui/views/BagView
 */
import { UIView } from './UIView.js';
import { createLayout } from '../components/layouts.js';
import { filterBarVNode } from '../components/filter-bar.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { UIInteractiveComponent } from '../../engine/components/UIInteractiveComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';

export class BagView extends UIView {
  constructor(model) {
    super({ name: 'BagView', model: model || {} });
  }

  onLoad() {
    const model = this.model;

    // Fixed toolbar entity: THE single FilterBar component — identical
    // skeleton/look to the PC box filter bar (chips + fields + search +
    // reset). Sort is a labeled dropdown, exactly like the box fields.
    this.toolbarEntity = this.spawn('ui:toolbar', []);
    this.toolbarEntity.addComponent(new UIRenderComponent({
      template: (e) => {
        const activeSort = (model.sorts || []).find((s) => s.active);
        return filterBarVNode({
          entityId: e.id,
          className: 'inv-toolbar',
          chipsRowClass: 'inv-tabs',
          chips: (model.tabs || []).map((tab) => ({
            label: tab.label,
            count: tab.count ?? 0,
            active: !!tab.active,
            call: 'setInvCat',
            callArgs: `'${tab.id}'`,
          })),
          fields: [{
            label: model.sortLabel || 'Tri',
            name: 'inv-sort',
            options: (model.sorts || []).map((s) => ({ value: s.id, label: s.label })),
            current: activeSort ? activeSort.id : undefined,
            changeCall: 'setInvSort',
          }],
          search: model.search ? { value: model.search.value, placeholder: model.search.placeholder, action: 'filter-bag' } : null,
          reset: model.resetLabel ? { label: model.resetLabel, call: 'resetInvFilters' } : null,
        });
      },
    }));

    // Scrollable item list entity (explicit gap: item rows carry no own
    // vertical margin, so the layout owns the spacing).
    this.listEntity = createLayout(this, {
      direction: 'vertical',
      cols: 0,
      gap: 12,
      className: 'inv-list-root',
      scrollable: true,
    });
    for (const item of model.items || []) {
      const cell = this.spawn('ui:bag-item', [], this.listEntity);
      cell.addComponent(new UIInteractiveComponent({
        action: 'legacy-call',
        call: 'handleInventoryClick',
        callArgs: `'${item.key}'`,
      }));
      cell.addComponent(new UIRenderComponent({
        template: (ce) => {
          const inter = ce.get(UIInteractiveComponent);
          if (inter.renderHidden) return null;
          return h('div', {
            class: 'inv-item pw-starter-chosen',
            dataset: {
              action: 'legacy-call',
              call: 'handleInventoryClick',
              callArgs: `'${item.key}'`,
              contextCall: 'openItemInfo',
              contextArgs: `'${item.key}'`,
              pwEid: String(ce.id),
            },
          },
            h('div', { class: 'inv-icon' }, item.iconHtml ? h.raw(item.iconHtml) : null),
            h('div', { class: 'pw-flex-1' },
              h('div', { class: 'inv-name pw-starter-chosen-label' }, item.name,
                item.equippedName ? h.raw(` <span data-style="color:var(--green);font-size:10px">✓ ${item.equippedName}</span>`) : null)),
            h('div', { class: 'inv-qty pw-starter-chosen-level' }, `×${item.qty}`));
        },
      }));
    }
  }

  /** @returns {*} Fixed toolbar vnode. */
  filtersVNode() {
    return this.toolbarEntity.get(UIRenderComponent).renderTemplate();
  }

  /** @returns {*} Scrollable content vnode (list or empty states). */
  contentVNode() {
    const model = this.model;
    if (model.emptyInventory) {
      // Wave 43 — emptyLabel: trusted localized markup (inv_empty: <br><br>).
      return h('div', { class: 'pw-empty-state-lg' }, model.emptyLabel ? h.raw(model.emptyLabel) : '');
    }
    if (!(model.items || []).length) {
      return h('div', { class: 'pw-empty-state-md' }, model.noResultsLabel || '');
    }
    return this.listEntity.get(UIRenderComponent).renderTemplate();
  }

  buildView() {
    return h('div', { class: 'pw-scene bag-panel-content', dataset: { scene: this.name } },
      this.filtersVNode(),
      this.contentVNode());
  }

  /**
   * DOM-free serialization for classic adapters and tests.
   * @param {Object} model
   * @returns {{filters: string, content: string, full: string}}
   */
  static toHTML(model) {
    const scene = new BagView(model);
    scene.enter();
    const filters = toHTMLString(scene.filtersVNode());
    const content = toHTMLString(scene.contentVNode());
    return { filters, content, full: filters + content };
  }
}
