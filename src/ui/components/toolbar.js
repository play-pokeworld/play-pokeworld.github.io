/**
 * PokéWorld UI — Toolbar (fixed filters & sorts)
 *
 * Filters/sorts toolbar entity of the design system. Hard contract: the
 * toolbar is ALWAYS fixed — it is rendered above the scrollable body of a
 * layout (or into the dedicated fixed slot of a fullscreen shell) and can
 * never scroll away with the content.
 *
 * @module ui/components/toolbar
 */
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { UIStateComponent } from '../../engine/components/UIStateComponent.js';
import { h, cx, entityDataset } from './component-utils.js';

/**
 * Create a toolbar entity.
 * @param {import('../../engine/core/Scene.js').Scene} scene
 * @param {Object} [props]
 * @param {Array<{id:string,label:string,active?:boolean,action?:string,call?:string,callArgs?:string}>} [props.tabs]
 * @param {{value?:string,placeholder?:string,action?:string}} [props.search]
 * @param {Array<{id:string,label:string,active?:boolean,action?:string,call?:string,callArgs?:string}>} [props.sorts]
 * @param {*} [props.left] Extra vnode rendered on the left cluster.
 * @param {*} [props.right] Extra vnode rendered on the right cluster (charm banners, counters...).
 * @param {string} [props.className]
 * @param {Object} [props.parent]
 * @returns {import('../../engine/core/Entity.js').Entity}
 */
export function createToolbar(scene, props = {}) {
  const entity = scene.spawn('ui:toolbar', [], props.parent || undefined);
  entity.addComponent(new UIStateComponent({ query: props.search && props.search.value || '' }));
  entity.addComponent(new UIRenderComponent({
    layer: 'ui',
    template: (e) => h('div', {
      class: cx('pw-toolbar pw-toolbar--fixed', props.className),
      dataset: { ...entityDataset(e), fixed: 'true' },
    },
      props.tabs && props.tabs.length
        ? h('div', { class: 'pw-toolbar-tabs', role: 'tablist' }, props.tabs.map((tab) => h('button', {
            type: 'button', role: 'tab',
            class: cx('pw-toolbar-tab', tab.active && 'is-active'),
            'aria-selected': String(!!tab.active),
            dataset: tabDataset(tab),
          }, tab.label)))
        : null,
      props.search
        ? h('input', {
            type: 'search',
            class: 'pw-toolbar-search',
            value: props.search.value || '',
            placeholder: props.search.placeholder || 'Search…',
            'aria-label': props.search.placeholder || 'Search',
            dataset: props.search.action ? { action: props.search.action } : {},
          })
        : null,
      props.sorts && props.sorts.length
        ? h('div', { class: 'pw-toolbar-sorts' }, props.sorts.map((sort) => h('button', {
            type: 'button',
            class: cx('pw-toolbar-sort', sort.active && 'is-active'),
            dataset: sortDataset(sort),
          }, sort.label)))
        : null,
      props.left ? h('div', { class: 'pw-toolbar-cluster pw-toolbar-cluster--left' }, props.left) : null,
      props.right ? h('div', { class: 'pw-toolbar-cluster pw-toolbar-cluster--right' }, props.right) : null)
  }));
  return entity;
}

function tabDataset(tab) {
  const dataset = {};
  if (tab.action) dataset.action = tab.action;
  if (tab.call) dataset.call = tab.call;
  if (tab.callArgs != null) dataset.callArgs = tab.callArgs;
  if (tab.id) dataset.tabId = tab.id;
  return dataset;
}

function sortDataset(sort) {
  const dataset = {};
  if (sort.action) dataset.action = sort.action;
  if (sort.call) dataset.call = sort.call;
  if (sort.callArgs != null) dataset.callArgs = sort.callArgs;
  if (sort.id) dataset.sortId = sort.id;
  return dataset;
}
