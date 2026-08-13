/**
 * PokéWorld UI — battle-session summary building blocks (ECS DS, rebuilt
 * from zero)
 *
 * The "Butin & résumé de session" modal content and the small inline loot
 * strip under the battle window: stat cells, the team damage rows with
 * their painter bars, captured-Pokémon entries, found-item entries and the
 * loot chips. Labels and sprite fragments (spriteImg / itemSpriteHtml /
 * itemSpriteHtml) are still produced by the classic adapter — these
 * components only reshape the DATA into ONE virtual tree.
 *
 * Kept contracts:
 *   - .battle-session-summary-grid > .battle-session-summary-stat (b+span),
 *   - .battle-summary-section-title, .battle-summary-empty,
 *   - .battle-damage-summary-list > .battle-damage-row with
 *     .battle-damage-fill[data-pct] (painter attribute),
 *   - .battle-summary-entry.is-shiny/.is-normal with .pw-summary-*,
 *   - .loot-item[title] with sprite + .loot-count,
 *   - pw helper classes reused (pw-col, pw-row-wrap, pw-card-bordered…).
 *
 * @module ui/components/session-summary
 */
import { h } from '../../engine/render/vdom.js';

export function sessionStatGridVNode(stats) {
  return h('div', { class: 'battle-session-summary-grid' },
    ...(stats || []).map((s) => h('div', { class: 'battle-session-summary-stat' },
      h('b', null, s.value == null ? '' : String(s.value)),
      h('span', null, s.label || ''))));
}

export function summarySectionTitleVNode(label) {
  return h('div', { class: 'battle-summary-section-title' }, label || '');
}

export function summaryEmptyVNode(label) {
  return h('div', { class: 'battle-summary-empty' }, label || '');
}

/**
 * One team-damage row (name sprite + value + contribution bar).
 * Wave 13 fix: the fill carries its width INLINE (+ the --pct var) so the
 * bar renders correctly with ZERO external painter — game first paint,
 * static preview and vm tests alike. data-pct stays as the legacy painter
 * contract (the bridge re-sets the same values, idempotent).
 */
export function damageRowVNode(row) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(row.pct) || 0)));
  return h('div', { class: 'battle-damage-row' },
    h('div', { class: 'battle-damage-head' },
      h('div', { class: 'battle-damage-poke' },
        h.raw(row.spriteHtml || ''),
        h('b', null, row.name || '')),
      h('div', { class: 'battle-damage-values' },
        h('span', null, row.valueText || ''),
        h('small', null, `${pct}%${row.koCount ? ` · ${row.koCount} KO` : ''}`))),
    h('div', { class: 'battle-damage-bar' },
      h('div', { class: 'battle-damage-fill', dataset: { pct: String(pct) }, style: { width: `${pct}%`, '--pct': `${pct}%` } })));
}

export function damageListVNode(rows) {
  return h('div', { class: 'battle-damage-summary-list' }, ...(rows || []).map(damageRowVNode));
}

/** One captured-Pokémon entry (shiny variant by class). */
export function captureEntryVNode(e) {
  return h('div', { class: `battle-summary-entry ${e.shiny ? 'is-shiny' : 'is-normal'}` },
    h('div', { class: 'pw-summary-sprite' }, h.raw(e.spriteHtml || '')),
    h('div', { class: 'pw-flex-1' },
      h('div', { class: 'pw-summary-name' },
        e.shiny ? h('span', { class: 'pw-shiny-star' }, '★') : null,
        e.name || ''),
      h('div', { class: 'pw-text-sm pw-light1' }, e.subLabel || '')),
    h('div', { class: 'pw-summary-count' }, `×${e.count == null ? 1 : e.count}`));
}

export function captureListVNode(entries) {
  return h('div', { class: 'pw-col pw-gap-sm' }, ...(entries || []).map(captureEntryVNode));
}

/** One found-item entry. */
export function itemEntryVNode(e) {
  return h('div', { class: 'pw-card-bordered pw-row pw-gap-sm battle-summary-entry is-normal' },
    h.raw(e.iconHtml || ''),
    h('div', null,
      h('div', { class: 'pw-bold pw-text-sm pw-light2' }, e.name || ''),
      h('div', { class: 'pw-text-sm pw-light1' }, `×${e.qty == null ? 1 : e.qty}`)));
}

export function itemListVNode(entries) {
  return h('div', { class: 'pw-row-wrap pw-gap-sm' }, ...(entries || []).map(itemEntryVNode));
}

/** One inline loot chip (sprite fragment + absolute ×N counter). */
export function lootChipVNode(c) {
  return h('div', { class: 'loot-item', title: c.title || '' },
    h.raw(c.html || ''),
    c.count > 1 ? h('span', { class: 'loot-count' }, `×${c.count}`) : null);
}

