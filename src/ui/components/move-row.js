/**
 * PokéWorld UI — move row (ECS DS, rebuilt from zero)
 *
 * ONE move line shared by every move list (learnable-moves panel today,
 * the Pokémon-sheet move lists in a later sub-wave): type badge, name,
 * meta segment and an optional state pill. State is expressed with the
 * unified classes: no class / .known / .learnable / .learnable.locked /
 * .clickable / .selected…
 *
 * Right-click (long-press on mobile) opens the move info panel through
 * the DS context channel: data-context-call / data-context-args.
 * Left-click actions (sheet replace flow) can be layered via `action`
 * dataset entries, matching the existing classes.
 *
 * @module ui/components/move-row
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';

/**
 * @param {Object} row
 * @param {string} row.name         localized move name
 * @param {string} row.typeCls      type-class (type-fire…) for the badge
 * @param {string} row.typeName     localized type label
 * @param {string} [row.typeColor]  hex used by the type-tinted frame
 * @param {string} [row.meta]       right meta segment ("40 · …")
 * @param {string} [row.stateClass] extra state classes
 * @param {Object} [row.pill]       { label, class } state pill
 * @param {Object} [row.context]    { call, args } right-click channel
 * @param {Object} [row.action]     extra dataset entries (click flow)
 */
export function moveRowVNode(row) {
  const dataset = {};
  if (row.typeColor) dataset.typeColor = row.typeColor;
  if (row.context) {
    dataset.contextCall = row.context.call || '';
    dataset.contextArgs = row.context.args == null ? '' : String(row.context.args);
  }
  if (row.action) Object.assign(dataset, row.action);
  return h('div', {
    class: `poke-detail-move-row${row.stateClass ? ' ' + row.stateClass : ''}`,
    dataset,
    ...(row.title ? { title: row.title } : {}),
  },
    h('span', { class: `type-badge ${row.typeCls || ''}` }, row.typeName || '?'),
    h('span', { class: 'poke-detail-move-name' }, row.name || ''),
    h('span', { class: 'poke-detail-move-meta' }, row.meta || ''),
    row.pill
      ? h('span', { class: `poke-detail-pill ${row.pill.class || ''}`.trim(), style: { fontSize: '10px', marginLeft: 'auto' } }, row.pill.label)
      : null);
}

export function moveRowHTML(row) {
  return toHTMLString(moveRowVNode(row));
}
