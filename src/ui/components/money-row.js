/**
 * PokéWorld UI — MoneyRow (THE single money display for shop-like panels)
 *
 * HARD DESIGN RULE (user feedback, wave 15): every buy/sell panel must show
 * the player's money THE SAME WAY. The market had its own ad-hoc inline
 * span while the regular shop showed nothing at all — both now render THIS
 * component in the panel's fixed filter slot (#fs-panel-filters), so the
 * amount is always visible and always identical.
 *
 * Two usage modes:
 *   - moneyRowVNode(model) → virtual node (ECS views),
 *   - moneyRowHTML(model)  → HTML string (classic adapters through
 *                            window.PokeUI.components.moneyRowHTML).
 *
 * Model: { label, amount, suffix?, prefixHtml? }
 *   - amount pre-formatted (string|number)
 *   - suffix defaults to '₽' (Pokédollars) — pass '' for other currencies,
 *   - prefixHtml is an optional icon (e.g. currency sprite).
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';

/**
 * @param {Object} model
 * @returns {*} virtual node
 */
export function moneyRowVNode(model = {}) {
  const amount = (model.amount !== undefined && model.amount !== null) ? String(model.amount) : '0';
  const suffix = (model.suffix !== undefined && model.suffix !== null) ? String(model.suffix) : '₽';
  return h('div', { class: 'pw-money-row', role: 'status', 'aria-live': 'polite' },
    h('span', { class: 'pw-money-label' }, model.label || ''),
    h('b', { class: 'pw-money-amount' },
      model.prefixHtml ? h.raw(model.prefixHtml) : null,
      `${amount}${suffix}`));
}

/**
 * HTML string of the money row (classic adapters).
 * @param {Object} model
 * @returns {string}
 */
export function moneyRowHTML(model = {}) {
  return toHTMLString(moneyRowVNode(model));
}

