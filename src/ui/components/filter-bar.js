/**
 * PokéWorld UI — FilterBar (THE single filter/sort toolbar)
 *
 * HARD DESIGN RULE (user requirement): ONE filter toolbar component exists.
 * The bag AND the PC box (tab + fullscreen selector) render through THIS
 * component, so both bars share the exact same skeleton and look:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ [chip][chip][chip]  [Tri▾][Région▾]…        [search] [Reset] │
 *   │  ← chips (quick) →   ← labeled selects →     ← end zone →    │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * - chips   : quick 1-click filters (bag categories, box shiny/fav/lock)
 * - fields  : labeled dropdowns (bag sort, box region/type/evo/IV/EV/rank)
 * - search  : text search (bag items / box Pokémon names)
 * - reset   : resets every filter of the bar
 *
 * Two usage modes:
 *   - filterBarVNode(model) → virtual node (ECS views),
 *   - filterBarHTML(model)  → HTML string (classic adapters through
 *                             window.PokeUI.components.filterBarHTML).
 *
 * Model:
 * {
 *   entityId?, className?,
 *   chipsRowClass?,                                  // e.g. legacy marker 'inv-tabs'
 *   chips: [{ label, count?, active?, call, callArgs?, extraClass? }],
 *   fields: [{ label, name?, options: [{ value, label }], current?, changeCall, changeArgs? }],
 *   search: { value?, placeholder?, action, extraClass? } | null,
 *   reset: { label, call } | null,
 * }
 *
 * @module ui/components/filter-bar
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from './component-utils.js';

/**
 * @param {Object} model
 * @returns {*} virtual node of the unified filter toolbar
 */
export function filterBarVNode(model = {}) {
  const chips = Array.isArray(model.chips) ? model.chips.filter(Boolean) : [];
  const fields = Array.isArray(model.fields) ? model.fields.filter(Boolean) : [];
  const endzone = model.search || model.reset;
  const dataset = { fixed: 'true' };
  if (model.entityId != null) dataset.pwEid = String(model.entityId);

  return h('div', {
    class: cx('box-filter-panel ui-control-toolbar ui-control-toolbar--box pw-ui-toolbar pw-filterbar', model.className),
    dataset,
  },
    h('button', {
      type: 'button',
      class: 'hbtn pw-drawer-toggle',
      title: 'Tiroir de filtres',
      dataset: { action: 'legacy-call', call: 'toggleMobileDrawer', callArgs: "''" },
    }, ''),
    chips.length
      ? h('div', { class: cx('pw-chip-row', model.chipsRowClass || 'inv-tabs') },
          ...chips.map((chip) => h('button', {
            type: 'button',
            class: cx('inv-tab pw-chip', chip.active && 'active', chip.extraClass),
            dataset: { action: 'legacy-call', call: chip.call, callArgs: chip.callArgs != null ? chip.callArgs : '', ...(chip.data || {}) },
          }, chip.label,
            chip.count != null ? h('span', { class: 'inv-tab-count pw-chip-count' }, String(chip.count)) : null)))
      : null,
    fields.length
      ? h('div', { class: 'pw-filter-fields' },
          ...fields.map((field) => h('label', { class: 'pw-filter-field' },
            h('span', { class: 'pw-filter-label' }, field.label || ''),
            h('select', {
              class: 'pw-filter-select',
              name: field.name || undefined,
              dataset: {
                action: 'select-self',
                changeCall: field.changeCall,
                changeArgs: field.changeArgs != null ? field.changeArgs : 'this.value',
              },
            }, ...(field.options || []).map((opt) => h('option', {
              value: opt.value,
              selected: String(opt.value) === String(field.current) ? true : undefined,
            }, opt.label))))))
      : null,
    endzone
      ? h('div', { class: 'pw-filter-end' },
          model.search
            ? h('input', {
                type: 'search',
                class: cx('dict-search box-filter-search pw-filter-input', model.search.extraClass),
                value: model.search.value || '',
                placeholder: model.search.placeholder || '',
                dataset: { action: model.search.action },
              })
            : null,
          model.reset
            ? h('button', {
                type: 'button',
                class: 'pw-btn pw-btn--secondary pw-filter-reset',
                dataset: { action: 'legacy-call', call: model.reset.call, callArgs: '' },
              }, model.reset.label || 'Reset')
            : null)
      : null);
}

/**
 * HTML string of the unified filter toolbar (classic adapters).
 * @param {Object} model
 * @returns {string}
 */
export function filterBarHTML(model = {}) {
  return toHTMLString(filterBarVNode(model));
}

