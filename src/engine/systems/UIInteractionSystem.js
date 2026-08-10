/**
 * PokeEngine — UIInteractionSystem
 *
 * Keeps the interaction affordances of rendered controls in sync with their
 * UIInteractiveComponent state:
 *   - interactable → pointer cursor + listeners attachment marker,
 *   - disabled + hideWhenDisabled → display:none (defense in depth: the
 *     render system applies the same rule; controls that are never
 *     re-rendered still disappear),
 *   - disabled without hide policy → data-disabled attribute only.
 *
 * Click routing itself is delegated (one listener on the scene root) by the
 * UIScene host in the UI design system layer.
 *
 * @module engine/systems/UIInteractionSystem
 */
import { System } from '../core/System.js';
import { UIInteractiveComponent } from '../components/UIInteractiveComponent.js';
import { UIRenderComponent } from '../components/UIRenderComponent.js';

export class UIInteractionSystem extends System {
  static get systemName() { return 'UIInteractionSystem'; }

  get components() { return [UIInteractiveComponent, UIRenderComponent]; }

  /**
   * @param {import('../core/Entity.js').Entity} _entity
   * @param {[UIInteractiveComponent, UIRenderComponent]} components
   * @param {number} _dt
   */
  process(_entity, components, _dt) {
    const [interactive, render] = components;
    const el = render.element;
    if (!el || !el.style) return;

    if (interactive.renderHidden) {
      el.style.display = 'none';
      return;
    }
    if (interactive.cursor) el.style.cursor = interactive.interactable ? interactive.cursor : '';
    if (interactive.disabled) {
      el.dataset = el.dataset || {};
      el.dataset.disabled = 'true';
    } else if (el.dataset && el.dataset.disabled === 'true') {
      delete el.dataset.disabled;
    }
  }
}
