/**
 * PokéWorld UI — unified-selector swap footer (ECS DS, rebuilt from zero)
 *
 * The footer strip shown at the bottom of the fullscreen unified selector
 * while a team Pokémon is pending for swap: the selected-Pokémon label and
 * two actions (cancel / remove). It mounts inside the existing #usm-footer
 * host (index.html): the classic adapter decides visibility and feeds the
 * model, this component only renders.
 *
 * Kept contracts: .usm-swap-footer > .usm-swap-footer-label +
 * .usm-swap-footer-actions, the cancel button routed via data-action
 * "legacy-call" and the remove button via "call-close-selector" (closing
 * the selector after the action, exactly like before).
 *
 * Model: { label, iconHtml, cancelLabel, removeLabel, removeArgs }
 *
 * @module ui/components/swap-footer
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';

export function swapFooterVNode(m) {
  return h('div', { class: 'usm-swap-footer' },
    h('div', { class: 'usm-swap-footer-label' }, m.label || ''),
    h('div', { class: 'usm-swap-footer-actions' },
      h('button', {
        class: 'hbtn usm-cancel-btn',
        dataset: { action: 'legacy-call', call: 'cancelTeamSwap', callArgs: '' },
      },
        m.iconHtml ? h.raw(`${m.iconHtml} `) : null,
        m.cancelLabel || ''),
      h('button', {
        class: 'hbtn usm-remove-btn',
        dataset: { action: 'call-close-selector', call: 'removeFromTeam', callArgs: m.removeArgs == null ? '' : String(m.removeArgs) },
      },
        m.iconHtml ? h.raw(`${m.iconHtml} `) : null,
        m.removeLabel || '')));
}

/** String serialization for the classic adapter (box-selector.js). */
export function swapFooterHTML(m) {
  return toHTMLString(swapFooterVNode(m));
}

