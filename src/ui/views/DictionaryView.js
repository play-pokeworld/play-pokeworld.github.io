/**
 * PokéWorld UI — DictionaryView (rebuilt from zero on the ECS DS)
 *
 * Item/move/ability dictionary. Structure produced by design-system base
 * objects (Toolbar + Grid layout with the toolbar in the FIXED region):
 *   - the tabs/search toolbar is fixed: it lives in the panel's fixed
 *     filters slot, never in the scroller (no empty gap where the grid
 *     bleeds through),
 *   - the grid lists dictionary entries as interactive cells.
 *
 * The screen consumes a view-model shaped by the classic adapter, so the
 * very same markup serves the browser (mount) and vm/test contexts
 * (toHTML, fully DOM-free).
 *
 * Model:
 * {
 *   tabs: [{id,label,active}], search: {value, placeholder},
 *   entries: [{ key, iconHtml, title, subtitle, owned, dataset }]
 *   emptyLabel: string
 * }
 *
 * @module ui/views/DictionaryView
 */
import { UIView } from './UIView.js';
import { createToolbar } from '../components/toolbar.js';
import { createLayout } from '../components/layouts.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { UIInteractiveComponent } from '../../engine/components/UIInteractiveComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from '../components/component-utils.js';

export class DictionaryView extends UIView {
  constructor(model) {
    super({ name: 'DictionaryView', model: model || {} });
  }

  onLoad() {
    const model = this.model;

    // Fixed toolbar entity (tabs + global search) — fixed region, never scrolls.
    this.toolbarEntity = createToolbar(this, {
      className: 'dict-toolbar pw-ui-toolbar',
      tabs: (model.tabs || []).map((tab) => ({
        id: tab.id,
        label: tab.label,
        active: !!tab.active,
        action: 'legacy-call',
        call: 'setDictionaryTab',
        callArgs: `'${tab.id}'`,
      })),
      search: {
        value: model.search ? model.search.value : '',
        placeholder: model.search ? model.search.placeholder : 'Search...',
        action: 'filter-dictionary',
      },
    });
    // Compat: legacy markup expects .dict-tabs > hbtn.dict-tab wrappers.
    this.toolbarEntity.get(UIRenderComponent).template = (e) => h('div', { class: 'dict-toolbar pw-ui-toolbar', dataset: { fixed: 'true', pwEid: String(e.id) } },
      h('div', { class: 'dict-tabs' }, (model.tabs || []).map((tab) => h('button', {
        type: 'button',
        class: cx('hbtn dict-tab', tab.active && 'active'),
        dataset: { action: 'legacy-call', call: 'setDictionaryTab', callArgs: `'${tab.id}'` },
      }, tab.label))),
      h('input', {
        type: 'search',
        class: 'dict-search pw-ui-toolbar-search',
        value: model.search ? (model.search.value || '') : '',
        placeholder: model.search ? model.search.placeholder : 'Search...',
        dataset: { action: 'filter-dictionary' },
      }));

    // Scrollable grid entity of entry cells (interactive entities).
    this.gridEntity = createLayout(this, {
      direction: 'grid',
      cols: 0, // columns driven by the themed .dict-grid CSS (responsive auto-fill)
      className: 'dict-grid-root',
      bodyClassName: 'dict-grid',
      scrollable: true,
    });
    for (const entry of model.entries || []) {
      const cell = this.spawn('ui:dict-entry', [], this.gridEntity);
      cell.addComponent(new UIInteractiveComponent({
        disabled: !!entry.disabled,
        hideWhenDisabled: true,
        action: 'legacy-call',
      }));
      cell.addComponent(new UIRenderComponent({
        template: (ce) => {
          const inter = ce.get(UIInteractiveComponent);
          if (inter.renderHidden) return null;
          return h('div', {
            class: cx('dict-entry', entry.owned && 'owned'),
            dataset: { ...entry.dataset, pwEid: String(ce.id) },
            attrs: undefined,
          },
            h('div', { class: 'dict-entry-icon' }, entry.iconHtml ? h.raw(entry.iconHtml) : null),
            h('div', null, h('b', null, entry.title), h('span', null, entry.subtitle || '')));
        },
      }));
    }
  }

  /** @returns {*} Toolbar vnode (fixed slot content). */
  filtersVNode() {
    return this.toolbarEntity.get(UIRenderComponent).renderTemplate();
  }

  /** @returns {*} Grid vnode (scrollable content). */
  contentVNode() {
    const tpl = this.gridEntity.get(UIRenderComponent).renderTemplate();
    if (!(this.model.entries || []).length) {
      return h('div', { class: 'dict-grid' },
        h('div', { class: 'dict-muted' }, this.model.emptyLabel || 'No results.'));
    }
    return tpl;
  }

  buildView() {
    return h('div', { class: 'pw-scene dictionary-panel-content', dataset: { scene: this.name } },
      this.filtersVNode(),
      this.contentVNode());
  }

  /**
   * DOM-free serialization for classic adapters and tests.
   * @param {Object} model
   * @returns {{filters: string, content: string, full: string}}
   */
  static toHTML(model) {
    const scene = new DictionaryView(model);
    scene.enter();
    const filters = toHTMLString(scene.filtersVNode());
    const content = toHTMLString(scene.contentVNode());
    return { filters, content, full: filters + content };
  }
}
