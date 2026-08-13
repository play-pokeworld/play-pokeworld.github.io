/**
 * PokéWorld UI — machine-management building blocks (ECS DS, rebuilt from zero)
 *
 * Pure, DOM-free renderers shared by the three machine management screens
 * (day-care / training / mine). They cover the uniform parts of those
 * screens: the TAB BAR, the BUY/OWNED UPGRADE CARDS and the AUTOMATION
 * TOGGLE CARDS. The complex per-machine panels (automation slot cards,
 * staff lists) are still produced by classic fragment functions and are
 * wrapped in declarative "raw" blocks by the adapters — the same honest
 * staging used for the Pokémon sheet. Those fragments are scheduled for
 * component conversion in a later sub-wave.
 *
 * Colour language (user-approved, identical across the whole game):
 *   - purchase buttons stay the POSITIVE green family (.purchase-btn),
 *   - owned/maxed states render as INFORMATIONAL state rows (an unusable
 *     button is never shown),
 *   - automation toggles: FLAT green when ON (.is-on), dashed dark when
 *     OFF (.is-off), locked automations degrade to an informational
 *     .automation-locked-card (never a dead button),
 *   - slot-mode/priority toggles (hatchery): FLAT solid colours chosen
 *     for WCAG ≥ 4.5 contrast (DS2811) — no gradients on coloured
 *     controls, ever.
 *
 * Legacy class hooks (.upgrade-card, .purchase-btn, .automation-toggle-btn,
 * .management-tabs…) are kept on purpose: the click delegation of the
 * runtime bridge routes data-action="legacy-call" and the scroll-persistence
 * contract (.management-shell / .management-content) depends on them.
 *
 * Wave 11: the automation SLOT CARDS (training + day-care variants), their
 * rules grids and queue panels are now pure ECS components too — the last
 * "raw" fragments of the management screens are gone. A queue CHIP list
 * (sprite + name + remove button) intentionally stays a raw fragment: it is
 * already a shared, styled micro-pattern (.queue-chip) and the removal
 * route needs per-entry legacy args.
 *
 * @module ui/components/management
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from './component-utils.js';
import { staffListVNode } from './staff.js';

/** One management tab button. Routing stays on the legacy bridge. */
export function managementTabVNode(tab) {
  return h('button', {
    class: `hbtn management-tab${tab.active ? ' active' : ''}`,
    dataset: {
      action: 'legacy-call',
      call: tab.call || '',
      callArgs: tab.args == null ? '' : String(tab.args),
      tab: tab.id || '',
    },
  },
    tab.iconHtml ? h.raw(`${tab.iconHtml} `) : null,
    h('span', { class: 'management-tab-label' }, tab.label || ''));
}

/** The whole tab bar (uniform across the three machines). */
export function managementTabBarVNode(tabs) {
  return h('div', { class: 'management-tabs ui-management-tabs', dataset: { component: 'management-tabs' } },
    (tabs || []).map(managementTabVNode));
}

export function managementTabBarHTML(tabs) {
  return toHTMLString(managementTabBarVNode(tabs));
}

/**
 * One upgrade card (buy / owned / maxed all look the same shell).
 * model: { title, titleIconHtml, value, state: 'buy'|'owned'|'maxed'|'locked',
 *          buyLabel, stateLabel, call, args }
 */
export function upgradeCardVNode(card) {
  const state = card.state || 'buy';
  const info = h('div', null,
    h('b', null,
      card.titleIconHtml ? h.raw(`${card.titleIconHtml} `) : null,
      card.title || ''),
    h('span', null, card.value || ''));
  const action = state === 'buy'
    ? h('button', {
        class: 'hbtn purchase-btn',
        dataset: { action: 'legacy-call', call: card.call || '', callArgs: card.args == null ? '' : String(card.args) },
      }, card.buyLabel || '')
    // Unusable/purchased upgrades are INFORMATIONAL state rows — never a
    // dead or disabled button (user rule).
    : h('b', { class: 'upgrade-card-state' }, card.stateLabel || '');
  return h('div', {
    class: `upgrade-card pw-upgrade-card${state === 'buy' ? '' : ' is-owned'}`,
    dataset: { upgradeState: state },
  }, info, action);
}

/** Grid of upgrade cards. */
export function upgradeGridVNode(cards) {
  return h('div', { class: 'upgrade-grid', dataset: { component: 'upgrade-grid' } },
    (cards || []).map(upgradeCardVNode));
}

/**
 * One automation toggle card.
 * model: { label, iconHtml, purchased, enabled, call, args,
 *          onLabel, offLabel, lockedLabel }
 */
export function automationToggleCardVNode(card) {
  const label = h('span', null,
    card.iconHtml ? h.raw(`${card.iconHtml} `) : null,
    card.label || '');
  if (card.purchased === false) {
    // Locked automation: informational row, NO dead button (user rule).
    return h('div', { class: 'automation-locked-card' }, label, h('b', null, card.lockedLabel || ''));
  }
  const on = !!card.enabled;
  return h('button', {
    class: `hbtn automation-toggle-btn ${on ? 'is-on' : 'is-off'}`,
    dataset: { action: 'legacy-call', call: card.call || '', callArgs: card.args == null ? '' : String(card.args) },
  },
    label,
    h('b', null, on ? (card.onLabel || '') : (card.offLabel || '')));
}

/** Row of automation toggle cards. */
export function automationToggleRowVNode(cards) {
  return h('div', { class: 'automation-toggle-row', dataset: { component: 'automation-toggles' } },
    (cards || []).map(automationToggleCardVNode));
}

/* ── Automation rules grid (selects driven by the change bridge) ─────── */

/**
 * One automation rule field: label + <select> routed through the
 * data-change-call / data-change-args change delegation.
 * model: { label, changeCall, changeArgs, options:[{value,label,selected}] }
 */
export function automationFieldVNode(f) {
  return h('label', { class: 'automation-field' },
    h('span', null, f.label || ''),
    h('select', {
      dataset: { changeCall: f.changeCall || '', changeArgs: f.changeArgs == null ? '' : String(f.changeArgs) },
    },
      ...(f.options || []).map((o) => h('option', {
        value: o.value == null ? '' : String(o.value),
        ...(o.selected ? { selected: true } : {}),
      }, o.label))));
}

/** model: fields: [automationField…] */
export function automationRulesGridVNode(fields) {
  if (!fields || !fields.length) return null;
  return h('div', { class: 'automation-rules-grid' }, ...fields.map(automationFieldVNode));
}

/** String serialization for classic call sites. */
export function automationRulesGridHTML(fields) {
  return toHTMLString(automationRulesGridVNode(fields) || h('div'));
}

/* ── Queue panel (title + capacity + chips + actions) ────────────────── */

/**
 * queue model: { title, capacity, listHtml (trusted chips fragment),
 *   stop (legacy-call-stop when true), add: {label, iconHtml?, call, args},
 *   clear: {label, call, args} }
 */
export function queuePanelVNode(q) {
  const action = q.stop ? 'legacy-call-stop' : 'legacy-call';
  return h('div', { class: 'queue-panel' },
    h('div', { class: 'queue-panel-head' },
      h('b', null, q.title || ''),
      h('span', null, q.capacity || '')),
    h('div', { class: 'queue-list' }, h.raw(q.listHtml || '')),
    h('div', { class: 'queue-actions' },
      h('button', {
        class: 'hbtn queue-build-btn',
        dataset: { action, call: (q.add && q.add.call) || '', callArgs: q.add && q.add.args == null ? '' : String(q.add.args) },
      },
        q.add && q.add.iconHtml ? h.raw(`${q.add.iconHtml} `) : null,
        (q.add && q.add.label) || ''),
      h('button', {
        class: 'hbtn',
        dataset: { action, call: (q.clear && q.clear.call) || '', callArgs: q.clear && q.clear.args == null ? '' : String(q.clear.args) },
      }, (q.clear && q.clear.label) || '')));
}

/* ── Training-style automation slot card ─────────────────────────────── */

/**
 * model: {
 *   title,
 *   state: 'locked' | 'unpurchased' | 'owned',
 *   desc (locked info), lockedLabel (unpurchased info),
 *   enabled, onLabel, offLabel,
 *   toggle: { call, args }, rules: [automationField…], queue: queueModel,
 * }
 * Locked / unpurchased render as pure INFORMATIONAL cards — no dead
 * controls (user rule). The owned card keeps `.is-owned` when enabled.
 */
export function automationSlotCardVNode(m) {
  if (m.state === 'locked' || m.state === 'unpurchased') {
    return h('div', { class: cx('automation-card training-auto-slot-card', m.state === 'locked' && 'is-locked') },
      h('div', { class: 'automation-card-head' },
        h('span', null, m.title || ''),
        m.state === 'unpurchased' ? h('b', null, m.lockedLabel || '') : null),
      m.state === 'locked' ? h('div', { class: 'automation-card-desc' }, m.desc || '') : null);
  }
  const on = !!m.enabled;
  return h('div', { class: cx('automation-card training-auto-slot-card', on && 'is-owned') },
    h('button', {
      class: `hbtn automation-toggle-btn ${on ? 'is-on' : 'is-off'}`,
      dataset: { action: 'legacy-call', call: (m.toggle && m.toggle.call) || '', callArgs: m.toggle && m.toggle.args == null ? '' : String(m.toggle.args) },
    },
      h('span', null, m.title || ''),
      h('b', null, on ? (m.onLabel || '') : (m.offLabel || ''))),
    automationRulesGridVNode(m.rules),
    m.queue ? queuePanelVNode(m.queue) : null);
}

/* ── Day-care (hatchery) automation slot card ────────────────────────── */

/**
 * Richer variant: mode selector (day-care / incubation), fill-priority
 * selector (Pokémon/fossil), filter/sort grid and the queue panel. ALL
 * layout comes from dedicated classes (.pw-hatchery-auto-slot & co, DS2811)
 * — the old data-style-inline pattern is gone.
 * model: {
 *   title, mode: 'exp'|'breed', modeLabel, desc,
 *   pendingBadge: { text, title }?,
 *   priority: { label, currentLabel, current: 'pokemon'|'fossil', call, args }?,
 *   modeBtn: { label, mode, call, args } | { lockedLabel },
 *   rules: [automationField…], queue: queueModel,
 * }
 */
export function hatcherySlotCardVNode(m) {
  return h('div', { class: `pw-hatchery-auto-slot is-${m.mode || 'exp'}` },
    h('div', { class: 'pw-hatchery-auto-head' },
      h('h4', null,
        `${m.title || ''} · `,
        h('span', { class: 'pw-hatchery-auto-mode-label' }, m.modeLabel || ''),
        m.pendingBadge ? h('span', { class: 'pw-pending-badge', title: m.pendingBadge.title || '' }, m.pendingBadge.text || '') : null)),
    h('div', { class: 'pw-hatchery-auto-row' },
      h('span', { class: 'pw-hatchery-auto-desc' }, m.desc || ''),
      h('div', { class: 'pw-hatchery-auto-controls' },
        m.priority ? h('div', { class: 'pw-hatchery-auto-control' },
          h('span', null, m.priority.label || ''),
          h('button', {
            class: `hbtn hatchery-priority-toggle ${m.priority.current === 'fossil' ? 'is-fossil' : 'is-pokemon'}`,
            dataset: { action: 'legacy-call-stop', call: m.priority.call || '', callArgs: m.priority.args == null ? '' : String(m.priority.args) },
          }, m.priority.currentLabel || '')) : null,
        m.modeBtn && m.modeBtn.call
          ? h('div', { class: 'pw-hatchery-auto-control' },
            h('span', null, (m.modeLabelCtl && m.modeLabelCtl.label) || ''),
            h('button', {
              class: `hbtn hatchery-mode-toggle is-${m.modeBtn.mode || 'exp'}`,
              dataset: { action: 'legacy-call-stop', call: m.modeBtn.call || '', callArgs: m.modeBtn.args == null ? '' : String(m.modeBtn.args) },
            }, m.modeBtn.label || ''))
          : null)),
    automationRulesGridVNode(m.rules),
    m.queue ? queuePanelVNode(m.queue) : null);
}

/* ── Block dispatcher ────────────────────────────────────────────────── */

/**
 * Content block dispatcher used by ManagementMenuView:
 *   { kind:'upgrades', cards:[…] }            — uniform upgrade grid
 *   { kind:'toggles',  cards:[…] }            — automation toggle row
 *   { kind:'slots', class, variant, cards }   — automation slot cards
 *   { kind:'staff', class, staff }            — staff list (ui/components/staff)
 *   { kind:'raw', class, html }               — trusted fragment (queue chips…)
 */
export function managementBlockVNode(block) {
  if (!block) return null;
  if (block.kind === 'upgrades') return upgradeGridVNode(block.cards);
  if (block.kind === 'toggles') return automationToggleRowVNode(block.cards);
  if (block.kind === 'slots') {
    const card = block.variant === 'hatchery' ? hatcherySlotCardVNode : automationSlotCardVNode;
    return h('div', { class: block.class || 'management-slot-stack' }, ...(block.cards || []).map(card));
  }
  if (block.kind === 'staff') {
    return block.staff ? h('div', { class: block.class || 'management-staff-block' }, staffListVNode(block.staff)) : null;
  }
  if (block.kind === 'raw') {
    return h('div', { class: block.class || 'management-raw-block' }, h.raw(block.html || ''));
  }
  return null;
}

export function managementBlocksHTML(blocks) {
  return toHTMLString((blocks || []).map(managementBlockVNode).filter(Boolean));
}

