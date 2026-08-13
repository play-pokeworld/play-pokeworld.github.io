/**
 * PokéWorld UI — Component composition helpers
 *
 * Shared utilities used by every ECS UI base object: children traversal for
 * template composition and policy evaluation (visibility, hidden-disabled).
 *
 * @module ui/components/component-utils
 */
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { UIInteractiveComponent } from '../../engine/components/UIInteractiveComponent.js';
import { h } from '../../engine/render/vdom.js';

/**
 * Render the virtual trees of every child entity (in hierarchy order),
 * skipping inactive entities and controls hidden by the strict
 * "unusable ⇒ not rendered" rule.
 * @param {import('../../engine/core/Entity.js').Entity} entity
 * @returns {*[]} Array of vnodes (may contain nulls — h() filters them).
 */
export function renderChildren(entity) {
  return entity.children.map((child) => {
    if (!child.active) return null;
    const interactive = child.get(UIInteractiveComponent);
    if (interactive && interactive.renderHidden) return null;
    const render = child.get(UIRenderComponent);
    if (!render || !render.visible) return null;
    return render.renderTemplate();
  });
}

/**
 * Dataset fragment pointing to an entity (used by the delegated interaction
 * routing of UIScene).
 * @param {import('../../engine/core/Entity.js').Entity} entity
 * @returns {Object} dataset props.
 */
export function entityDataset(entity) {
  return { pwEid: String(entity.id) };
}

/**
 * Merge class fragments into a single class string.
 * @param {...*} parts
 * @returns {string}
 */
export function cx(...parts) {
  return parts.flat(Infinity).filter(Boolean).join(' ');
}

export { h };

