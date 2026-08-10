/**
 * PokéWorld UI — Layouts (Vertical, Horizontal, Grid + fixed regions)
 *
 * Layout container factories, each an ECS entity carrying a
 * UILayoutComponent. HARD DESIGN RULE of the design system: a layout MAY
 * declare fixed regions (`fixedTop` / `fixedBottom`) — typically the
 * filters/sorts toolbar — rendered OUTSIDE the scrollable body; they never
 * scroll away with the content.
 *
 * @module ui/components/layouts
 */
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { UILayoutComponent } from '../../engine/components/UILayoutComponent.js';
import { h, cx, renderChildren } from './component-utils.js';

/**
 * Create a layout entity (generic).
 * @param {import('../../engine/core/Scene.js').Scene} scene
 * @param {Object} [props]
 * @param {'vertical'|'horizontal'|'grid'} [props.direction='vertical']
 * @param {number} [props.cols=3]
 * @param {number|string} [props.gap=12]
 * @param {boolean} [props.scrollable=true]
 * @param {*} [props.fixedTop] vnode rendered above the body, never scrolling.
 * @param {*} [props.fixedBottom] vnode rendered below the body, never scrolling.
 * @param {Object} [props.parent]
 * @param {string} [props.className]
 * @param {string} [props.bodyClassName]
 * @returns {import('../../engine/core/Entity.js').Entity}
 */
export function createLayout(scene, props = {}) {
  const entity = scene.spawn('ui:layout', [], props.parent || undefined);
  entity.addComponent(new UILayoutComponent(props));
  entity.addComponent(new UIRenderComponent({
    layer: 'ui',
    template: (e) => {
      const layout = e.get(UILayoutComponent);
      const fixedRegions = [];
      if (layout.fixedRegions.includes('top')) fixedRegions.push('top');
      if (layout.fixedRegions.includes('bottom')) fixedRegions.push('bottom');
      return h('div', {
        class: cx('pw-layout', `pw-layout--${layout.direction}`, layout.hasFixedRegions && 'pw-layout--fixed-regions', props.className),
        style: { display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: '0' },
      },
        props.fixedTop ? h('div', { class: 'pw-layout-fixed pw-layout-fixed--top' }, props.fixedTop) : null,
        h('div', { class: cx('pw-layout-body', props.bodyClassName), style: layout.bodyStyle() }, renderChildren(e)),
        props.fixedBottom ? h('div', { class: 'pw-layout-fixed pw-layout-fixed--bottom' }, props.fixedBottom) : null);
    },
  }));
  return entity;
}

/**
 * Vertical layout (stacked children, optional fixed regions).
 * @param {import('../../engine/core/Scene.js').Scene} scene @param {Object} [props]
 */
export function createVerticalLayout(scene, props = {}) {
  return createLayout(scene, { ...props, direction: 'vertical' });
}

/**
 * Horizontal layout (inline children).
 * @param {import('../../engine/core/Scene.js').Scene} scene @param {Object} [props]
 */
export function createHorizontalLayout(scene, props = {}) {
  return createLayout(scene, { ...props, direction: 'horizontal' });
}

/**
 * Grid layout (N columns). With `fixedTop` (filters/sorts toolbar), this
 * IS the mandated "filters fixed above a scrolling grid" combo.
 * @param {import('../../engine/core/Scene.js').Scene} scene
 * @param {Object} [props]
 * @param {number} [props.cols=3]
 */
export function createGridLayout(scene, props = {}) {
  return createLayout(scene, { cols: 3, ...props, direction: 'grid' });
}
