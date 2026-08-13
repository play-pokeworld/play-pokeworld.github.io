/**
 * PokéWorld UI — automation staff list (ECS DS, rebuilt from zero)
 *
 * The "personnel" tab of the three machine management screens (training,
 * day-care, mine): the sector summary + fee tip, then a grid of staff
 * cards. A card is:
 *  - owned → whole card is the ACTIVE/INACTIVE toggle (routed click),
 *    with bonus lines (raw fragment), an XP bar (data-pct painter contract)
 *    and a level pill,
 *  - unowned and unlocked → ONE routed buy button,
 *  - unowned and locked → an INFORMATIONAL row, never a dead button
 *    (user rule: unusable controls are not rendered).
 *
 * Kept contracts: .staff-summary, .staff-list.staff-card-grid,
 * .staff-card(.is-owned/.is-unowned)(.is-active) with data-action on the
 * card, .staff-card-sprite/.staff-card-head/.staff-card-desc,
 * .staff-xp(.staff-xp-bar > div[data-pct]), .staff-level-pill,
 * button.automation-buy-btn (flattened green by DS2805).
 *
 * Model (shaped by automation.js staffListModel, labels localized there):
 * {
 *   activeCount, max, activeLabel,
 *   tipLines: [rawHtml, rawHtml],
 *   cards: [{ id, owned, active, spriteHtml, name, location, desc,
 *             bonusHtml?, xp: { label, pct }?, levelLabel?,
 *             toggleCall, toggleArgs,
 *             hire: { label, call, args } | { lockedLabel } }],
 * }
 *
 * @module ui/components/staff
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from './component-utils.js';

export function staffSummaryVNode(m) {
  return [
    h('div', { class: 'staff-summary' },
      h('b', null, m.activeLabel || ''), ` ${m.activeCount ?? 0}/${m.max ?? 1}`),
    h('div', { class: 'staff-summary-tip' }, ...(m.tipLines || []).map((line) => [
      h.raw(line || ''), h('br'),
    ]).flat(Infinity).slice(0, -1)),
  ];
}

export function staffCardVNode(c) {
  const children = [
    h('div', { class: 'staff-card-sprite' }, h.raw(c.spriteHtml || '')),
    h('div', { class: 'staff-card-head' },
      h('b', null, c.name || ''),
      h('span', null, c.location || '')),
    h('div', { class: 'staff-card-desc' }, c.desc || ''),
  ];
  if (c.owned) {
    if (c.bonusHtml) children.push(h.raw(c.bonusHtml));
    if (c.xp) {
      children.push(h('div', { class: 'staff-xp' },
        h('div', { class: 'staff-xp-label' }, c.xp.label || ''),
        h('div', { class: 'staff-xp-bar' },
          // Wave 13: inline width (self-contained bar), data-pct contract kept.
          h('div', {
            dataset: { pct: String(Math.max(0, Math.min(100, Math.round(Number(c.xp.pct) || 0)))) },
            style: { width: `${Math.max(0, Math.min(100, Math.round(Number(c.xp.pct) || 0)))}%` },
          }))));
    }
    if (c.levelLabel) children.push(h('div', { class: 'staff-level-pill' }, c.levelLabel));
  } else if (c.hire && c.hire.lockedLabel) {
    // Locked location: informational row, NO dead button (user rule).
    children.push(h('div', { class: 'staff-hire-locked' }, h.raw(c.hire.lockedLabel)));
  } else if (c.hire) {
    children.push(h('button', {
      class: 'hbtn automation-buy-btn',
      dataset: {
        action: 'legacy-call',
        call: c.hire.call || '',
        callArgs: c.hire.args == null ? '' : String(c.hire.args),
      },
    }, c.hire.label || ''));
  }
  return h('div', {
    class: cx('staff-card', c.owned ? 'is-owned' : 'is-unowned', c.active && 'is-active'),
    ...(c.owned ? { dataset: { action: 'legacy-call', call: c.toggleCall || '', callArgs: c.toggleArgs == null ? '' : String(c.toggleArgs) } } : {}),
  }, ...children);
}

export function staffListVNode(m) {
  return [
    ...staffSummaryVNode(m || {}),
    h('div', { class: 'staff-list staff-card-grid' }, ...((m && m.cards) || []).map(staffCardVNode)),
  ];
}

/** String serialization for classic call sites (window.renderStaffList). */
export function staffListHTML(m) {
  return toHTMLString(staffListVNode(m));
}

