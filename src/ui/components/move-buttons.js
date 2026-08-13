/**
 * PokéWorld UI — MoveButtonsBar (auto-battle move buttons, rebuilt)
 *
 * The player's move buttons row under the battle team row (`#move-buttons`).
 * Rebuilt from zero on the design system while PRESERVING the live anchors
 * the 60 fps ticker mutates (updateMoveBars):
 *   - `.auto-move` order == moves order (queried via querySelectorAll idx),
 *   - `.am-bar-fill` child per button (width/background per frame),
 *   - `data-move-id` / `data-idx` attributes,
 *   - context sheet wiring (right click / long press = move info).
 *
 * Model (shaped by the classic adapter renderMoveButtons):
 * {
 *   moves: [{
 *     moveId, idx, name, effHint, typeLabel, typeCls, next, title,
 *     contextArgs
 *   }],
 * }
 *
 * @module ui/components/move-buttons
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from './component-utils.js';

/**
 * @param {Object} model
 * @returns {*} virtual node list (the container stays game-owned)
 */
export function moveButtonsBarVNode(model = {}) {
  return (model.moves || []).filter(Boolean).map((mv) => h('div', {
    class: cx('auto-move', mv.next && 'next-up', `type-${mv.typeCls}`),
    dataset: {
      moveId: String(mv.moveId),
      idx: String(mv.idx),
      contextCall: 'openMoveInfo',
      contextArgs: mv.contextArgs,
    },
    title: mv.title || '',
  },
    h('div', { class: 'am-top' },
      h('span', null, `${mv.idx + 1}. ${mv.name} ${mv.effHint || ''}`),
      h('span', { class: `am-type type-${mv.typeCls}` }, mv.typeLabel || '')),
    h('div', { class: 'am-bar-bg' },
      h('div', { class: 'am-bar-fill' }))));
}

/**
 * HTML string of the move buttons (classic adapters via window.PokeUI).
 * @param {Object} model
 * @returns {string}
 */
export function moveButtonsBarHTML(model = {}) {
  return toHTMLString(moveButtonsBarVNode(model));
}

