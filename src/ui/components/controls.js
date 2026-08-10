/**
 * PokéWorld UI — Controls (Button, Toggle)
 *
 * Unified control factories. Every control is an ECS entity:
 *   UIRenderComponent     (template → vdom, themed by token classes only)
 *   UIInteractiveComponent (click, disabled → hidden rule)
 *   UIStateComponent       (checked/toggled state)
 *
 * HARD RULES enforced here:
 *   - one single button shape for the whole game (variants change the
 *     tinted token, never the geometry),
 *   - a disabled (unusable right now) control is NEVER rendered,
 *   - colors come from --pw-btn-* tokens => themes always apply.
 *
 * @module ui/components/controls
 */
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { UIInteractiveComponent } from '../../engine/components/UIInteractiveComponent.js';
import { UIStateComponent } from '../../engine/components/UIStateComponent.js';
import { h, cx, entityDataset } from './component-utils.js';

export const BUTTON_VARIANTS = ['primary', 'secondary', 'danger', 'ghost'];

/**
 * Create a unified button entity.
 * @param {import('../../engine/core/Scene.js').Scene} scene
 * @param {Object} props
 * @param {string} props.label Button text (required, localized upstream).
 * @param {string} [props.icon] Trusted icon HTML (game-built SVG/emoji).
 * @param {'primary'|'secondary'|'danger'|'ghost'} [props.variant='secondary']
 * @param {boolean} [props.disabled=false] Unusable ⇒ not rendered at all.
 * @param {boolean} [props.hideWhenDisabled=true]
 * @param {boolean} [props.toggle=false] Toggle mode (checked state in UIState).
 * @param {boolean} [props.toggled=false]
 * @param {(event:*, entity:*) => void} [props.onClick]
 * @param {string} [props.action] Legacy attribute-dispatch action name.
 * @param {string[]} [props.actionArgs]
 * @param {string} [props.title] Tooltip.
 * @param {string} [props.className] Extra classes.
 * @returns {import('../../engine/core/Entity.js').Entity}
 */
export function createButton(scene, props) {
  if (!props || !props.label) throw new Error('[ui] createButton: label is required');
  const variant = BUTTON_VARIANTS.includes(props.variant) ? props.variant : 'secondary';

  const entity = scene.spawn('ui:button', [], props.parent || undefined);
  entity.addComponent(new UIStateComponent({ toggled: !!props.toggled }));
  entity.addComponent(new UIInteractiveComponent({
    onClick: props.onClick || null,
    disabled: !!props.disabled,
    hideWhenDisabled: props.hideWhenDisabled !== false,
    action: props.action || null,
    actionArgs: props.actionArgs || null,
  }));
  entity.addComponent(new UIRenderComponent({
    layer: 'ui',
    template: (e) => {
      const interactive = e.get(UIInteractiveComponent);
      if (interactive.renderHidden) return null; // strict rule: not rendered
      const state = e.get(UIStateComponent);
      const toggled = state ? state.get('toggled') : false;
      const dataset = { ...entityDataset(e) };
      if (interactive.action) dataset.action = interactive.action;
      if (interactive.action === 'legacy-call' && props.call) dataset.call = props.call;
      if (interactive.action === 'legacy-call' && props.callArgs != null) dataset.callArgs = props.callArgs;
      return h('button', {
        type: 'button',
        class: cx(
          'pw-btn',
          `pw-btn--${variant}`,
          props.toggle && 'pw-btn--toggle',
          toggled && 'is-toggled',
          props.className
        ),
        'aria-pressed': props.toggle ? String(toggled) : null,
        title: props.title || null,
        dataset,
      }, props.icon ? h.raw(props.icon) : null, h('span', { class: 'pw-btn-label' }, props.label));
    },
  }));
  return entity;
}

/**
 * Create a toggle switch entity (filter/option semantics).
 * @param {import('../../engine/core/Scene.js').Scene} scene
 * @param {Object} props
 * @param {string} props.label
 * @param {boolean} [props.checked=false]
 * @param {boolean} [props.disabled=false] Unusable ⇒ not rendered at all.
 * @param {(checked:boolean, entity:*) => void} [props.onChange]
 * @param {string} [props.className]
 * @returns {import('../../engine/core/Entity.js').Entity}
 */
export function createToggle(scene, props) {
  if (!props || !props.label) throw new Error('[ui] createToggle: label is required');

  const entity = scene.spawn('ui:toggle', [], props.parent || undefined);
  entity.addComponent(new UIStateComponent({ checked: !!props.checked }));
  entity.addComponent(new UIInteractiveComponent({
    disabled: !!props.disabled,
    hideWhenDisabled: props.hideWhenDisabled !== false,
    onClick: () => {
      const state = entity.get(UIStateComponent);
      const next = !state.get('checked');
      state.setState({ checked: next });
      if (props.onChange) props.onChange(next, entity);
    },
  }));
  entity.addComponent(new UIRenderComponent({
    layer: 'ui',
    template: (e) => {
      const interactive = e.get(UIInteractiveComponent);
      if (interactive.renderHidden) return null;
      const checked = e.get(UIStateComponent).get('checked');
      return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': String(checked),
        class: cx('pw-toggle', checked && 'is-on', props.className),
        dataset: entityDataset(e),
      },
        h('span', { class: 'pw-toggle-track' }, h('span', { class: 'pw-toggle-thumb' })),
        h('span', { class: 'pw-toggle-label' }, props.label));
    },
  }));
  return entity;
}
