/**
 * PokéWorld UI — Containers (Window, Panel, Header, Footer)
 *
 * Structural base objects of the design system. Every container is an ECS
 * entity whose template renders a themed shell (token classes only) and
 * composes its child entities through renderChildren().
 *
 * Window behavior: overlay with "click outside to close" — clicking the
 * overlay itself (never its content) closes the window when `closable`.
 *
 * @module ui/components/containers
 */
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { UIInteractiveComponent } from '../../engine/components/UIInteractiveComponent.js';
import { h, cx, renderChildren } from './component-utils.js';

/**
 * Create a header entity (title row of a window/panel).
 * @param {import('../../engine/core/Scene.js').Scene} scene
 * @param {Object} props
 * @param {string} props.title Localized title.
 * @param {string} [props.icon] Trusted icon HTML.
 * @param {Object} [props.parent] Parent entity.
 * @param {boolean} [props.closable=false] Render a close button (×).
 * @param {(entity:*) => void} [props.onClose]
 * @param {string} [props.className]
 * @returns {import('../../engine/core/Entity.js').Entity}
 */
export function createHeader(scene, props) {
  const entity = scene.spawn('ui:header', [], props.parent || undefined);
  entity.addComponent(new UIRenderComponent({
    layer: 'ui',
    template: (e) => h('div', { class: cx('pw-header', props.className) },
      h('div', { class: 'pw-header-title' },
        props.icon ? h.raw(props.icon) : null,
        h('span', { class: 'pw-header-text' }, props.title || '')),
      props.closable
        ? h('button', {
            type: 'button',
            class: 'pw-header-close',
            'aria-label': props.closeLabel || 'Close',
            dataset: { action: 'pw-close' },
            onClick: () => props.onClose && props.onClose(e),
          }, '✕')
        : null,
      renderChildren(e)),
  }));
  return entity;
}

/**
 * Create a footer entity (pinned action row; hidden when empty).
 * @param {import('../../engine/core/Scene.js').Scene} scene
 * @param {Object} props
 * @param {Object} [props.parent]
 * @param {string} [props.className]
 * @returns {import('../../engine/core/Entity.js').Entity}
 */
export function createFooter(scene, props = {}) {
  const entity = scene.spawn('ui:footer', [], props.parent || undefined);
  entity.addComponent(new UIRenderComponent({
    layer: 'ui',
    template: (e) => {
      const children = renderChildren(e);
      if (children.every((c) => c === null)) return null; // empty footer ⇒ hidden
      return h('div', { class: cx('pw-footer', props.className) }, children);
    },
  }));
  return entity;
}

/**
 * Create a panel entity (themed surface with optional title).
 * @param {import('../../engine/core/Scene.js').Scene} scene
 * @param {Object} [props]
 * @param {string} [props.title]
 * @param {'default'|'soft'|'ghost'} [props.variant='default'] Surface variant.
 * @param {Object} [props.parent]
 * @param {string} [props.className]
 * @returns {import('../../engine/core/Entity.js').Entity}
 */
export function createPanel(scene, props = {}) {
  const entity = scene.spawn('ui:panel', [], props.parent || undefined);
  entity.addComponent(new UIRenderComponent({
    layer: 'ui',
    template: (e) => h('section', { class: cx('pw-panel', `pw-panel--${props.variant || 'default'}`, props.className) },
      props.title ? h('div', { class: 'pw-panel-title' }, props.title) : null,
      renderChildren(e)),
  }));
  return entity;
}

/**
 * Create a modal window entity with click-outside-to-close behavior.
 * Structure: overlay → window shell → [header entity] + body + [footer].
 * Children spawned with { parent: windowEntity } land in the body.
 * @param {import('../../engine/core/Scene.js').Scene} scene
 * @param {Object} props
 * @param {string} props.title Localized title.
 * @param {boolean} [props.closable=true] Show × and enable overlay-close.
 * @param {(entity:*) => void} [props.onClose] Called after the window closes.
 * @param {'sm'|'md'|'lg'|'xl'} [props.size='lg'] Width preset.
 * @param {Object} [props.parent]
 * @param {string} [props.className]
 * @param {string} [props.closeLabel] aria-label of the close button.
 * @returns {import('../../engine/core/Entity.js').Entity}
 */
export function createWindow(scene, props) {
  if (!props || !props.title) throw new Error('[ui] createWindow: title is required');
  const closable = props.closable !== false;

  const entity = scene.spawn('ui:window', [], props.parent || undefined);
  entity.addComponent(new UIInteractiveComponent({ disabled: false, hideWhenDisabled: false }));

  entity.addComponent(new UIRenderComponent({
    layer: 'modal',
    template: (e) => h('div', {
      class: cx('pw-window-overlay', props.className),
      dataset: { pwOverlay: 'true' },
      onClick: (ev) => {
        // Click-outside-to-close: only a direct hit on the overlay closes.
        if (!closable) return;
        const target = ev && ev.target;
        if (target === ev.currentTarget || (target && target.dataset && target.dataset.pwOverlay === 'true')) {
          scene.closeWindow ? scene.closeWindow(e) : (props.onClose && props.onClose(e));
        }
      },
    },
      h('div', { class: cx('pw-window', `pw-window--${props.size || 'lg'}`), role: 'dialog', 'aria-modal': 'true' },
        h('div', { class: 'pw-header' },
          h('div', { class: 'pw-header-title' }, h('span', { class: 'pw-header-text' }, props.title)),
          closable
            ? h('button', {
                type: 'button',
                class: 'pw-header-close',
                'aria-label': props.closeLabel || 'Close',
                onClick: () => (scene.closeWindow ? scene.closeWindow(e) : (props.onClose && props.onClose(e))),
              }, '✕')
            : null),
        h('div', { class: 'pw-window-body' }, renderChildren(e)))),
  }));
  return entity;
}

