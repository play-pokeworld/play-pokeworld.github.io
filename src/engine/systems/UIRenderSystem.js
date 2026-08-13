/**
 * PokeEngine — UIRenderSystem
 *
 * Reconciles UIRenderComponent templates with the live display each frame:
 *   - component dirty  → re-materialize the virtual tree through the
 *     injected renderer and swap the element in place (parent preserved),
 *   - component hidden → element gets display:none,
 *   - interactive disabled with hideWhenDisabled → element gets
 *     display:none (the strict "unusable ⇒ invisible" design rule).
 *
 * The system itself is DOM-free: every materialization goes through the
 * renderer callback carried by the component (dependency injection).
 *
 * @module engine/systems/UIRenderSystem
 */
import { System } from '../core/System.js';
import { UIRenderComponent } from '../components/UIRenderComponent.js';
import { UIInteractiveComponent } from '../components/UIInteractiveComponent.js';

export class UIRenderSystem extends System {
  static get systemName() { return 'UIRenderSystem'; }

  get components() { return [UIRenderComponent]; }

  /**
   * @param {import('../core/Entity.js').Entity} _entity
   * @param {[UIRenderComponent]} components
   * @param {number} _dt
   */
  process(_entity, components, _dt) {
    const render = components[0];
    const el = render.element;
    const interactive = render.entity ? render.entity.get(UIInteractiveComponent) : undefined;

    // Non-usable control rule: completely hidden, whatever the visibility flag.
    if (interactive && interactive.renderHidden) {
      if (el && el.style) el.style.display = 'none';
      return;
    }

    if (!render.visible) {
      if (el && el.style) el.style.display = 'none';
      return;
    }

    if (render.dirty && render.template && render.renderer) {
      const vnode = render.renderTemplate();
      const fresh = render.renderer(vnode);
      if (fresh && el && el.parentNode) {
        el.parentNode.replaceChild(fresh, el);
        render.element = fresh;
      } else if (fresh) {
        // No parent yet: the scene compositor places the element.
        render.element = fresh;
      }
      render.dirty = false;
    }

    const current = render.element;
    if (current && current.style && current.style.display === 'none') {
      current.style.display = '';
    }
  }
}

