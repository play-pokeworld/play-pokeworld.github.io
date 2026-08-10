/**
 * PokéWorld UI — Pokémon sheet building blocks (ECS DS, rebuilt from zero)
 *
 * The inner blocks of the detailed Pokémon sheet (wave 10): stat rows with
 * painter bars, the rank panel, ability chips + the editable talent
 * selector, and the evolution-methods card. They replace the last classic
 * fragment builders of poke-modal.js — the adapter now shapes pure MODELS.
 *
 * Kept contracts:
 *   - stat fills carry data-pct / data-bg, the attributes read by the
 *     global bar painter,
 *   - the talent <select> keeps data-action="stop-propagation" plus either
 *     data-change-call="changePokeTalent" (bridge change delegation) or
 *     disabled + data-battle-edit-locked="true" (battle edit lock),
 *   - class hooks (.poke-detail-stat-row, .poke-rank-panel.rank-x,
 *     .poke-detail-ability-chip(.is-hidden), .pw-card-83, .pw-text-84,
 *     .pw-progress-card(-subtle), .pw-progress-row) — the existing theme
 *     rules style them.
 *
 * @module ui/components/poke-detail
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';

/* ── Stat row (base / IV / EV) ─────────────────────────────────────────── */
export function statRowVNode(row) {
  // Wave 13: the fill carries its width/colour INLINE (clamped 0-100) so
  // the bar renders with zero external painter; data-pct/data-bg stay as
  // the legacy painter contract (idempotent re-set).
  const pct = Math.max(0, Math.min(100, Math.round(Number(row.pct) || 0)));
  const fillStyle = { width: `${pct}%`, '--pct': `${pct}%` };
  if (row.color) { fillStyle.background = row.color; fillStyle['--bg'] = row.color; }
  return h('div', { class: 'poke-detail-stat-row' },
    h('span', { class: 'poke-detail-stat-name' }, row.name || ''),
    h('div', { class: 'poke-detail-stat-bar' },
      h('div', {
        class: 'poke-detail-stat-fill',
        dataset: { pct: String(pct), bg: row.color || '' },
        style: fillStyle,
      })),
    h('span', { class: 'poke-detail-stat-value' }, row.value == null ? '' : String(row.value)));
}

export function statRowsHTML(rows) {
  return toHTMLString((rows || []).map(statRowVNode));
}

/* ── Rank panel ────────────────────────────────────────────────────────── */
export function rankPanelVNode(m) {
  const rank = String(m.rank || '?');
  return h('div', { class: `poke-rank-panel rank-${rank.toLowerCase()}` },
    h('div', { class: 'poke-rank-letter' }, rank),
    h('div', null,
      h('b', null, m.label || ''),
      h('span', null, m.bst ? `BST ${m.bst}` : '')));
}

/* ── Ability chip (talent / hidden talent) ─────────────────────────────── */
export function abilityChipVNode(chip) {
  return h('div', {
    class: `poke-detail-ability-chip${chip.isHidden ? ' is-hidden' : ''}`,
    style: chip.isHidden ? { opacity: '0.7', border: '1px dashed var(--light1)' } : null,
  },
    h('span', null, chip.label || ''),
    chip.rarity ? h('small', null, chip.rarity) : null);
}

/**
 * Talent block — ONE panel, two flavours:
 *  - editable: battle-lock message (when locked) + <select> of unlocked
 *    talents + current talent description + hidden-ability chip,
 *  - readonly: ability chips + descriptions (no interactive control).
 */
export function talentBlockVNode(m) {
  const children = [];
  children.push(h('div', { class: 'pw-text-sm pw-light2 pw-bold' },
    ...(m.iconHtml ? [h.raw(`${m.iconHtml} `)] : []),
    m.title || ''));
  if (m.readonly) {
    (m.chips || []).forEach((chip) => {
      children.push(abilityChipVNode(chip));
      if (chip.desc) children.push(h('div', { class: 'poke-detail-subtle' }, chip.desc));
    });
    if (!(m.chips || []).length) {
      children.push(h('div', { class: 'poke-detail-subtle' }, m.emptyLabel || ''));
    }
  } else {
    if (m.locked && m.lockMsg) {
      children.push(h('div', { class: 'pw-text-sm pw-light1' }, m.lockMsg));
    }
    const selectProps = {
      class: 'extracted-bridge-style-024 pw-talent-select',
      dataset: { action: 'stop-propagation' },
    };
    if (m.locked) {
      selectProps.disabled = true;
      selectProps.dataset.battleEditLocked = 'true';
    } else {
      selectProps.dataset.changeCall = 'changePokeTalent';
      selectProps.dataset.changeArgs = m.changeArgs || '';
    }
    children.push(h('select', selectProps,
      (m.options || []).map((o) => h('option', {
        value: o.value == null ? '' : String(o.value),
        ...(o.selected ? { selected: true } : {}),
        ...(o.disabled ? { disabled: true } : {}),
      }, o.label))));
    children.push(h('div', { class: 'pw-text-84' }, m.desc || ''));
    if (m.hidden) {
      children.push(abilityChipVNode(m.hidden));
      if (m.hidden.desc) children.push(h('div', { class: 'poke-detail-subtle' }, m.hidden.desc));
    }
  }
  return h('div', { class: 'pw-card-83' }, ...children);
}

/* ── Shiny toggle (hero) — DS colours come from DS2809/DS2810 ──────────── */
export function shinyToggleVNode(m) {
  return h('button', {
    class: `hbtn poke-detail-shiny-toggle ${m.on ? 'is-on' : 'is-off'}`,
    dataset: { action: 'legacy-call', call: m.call || '', callArgs: m.args == null ? '' : String(m.args) },
  },
    h('span', { class: 'poke-detail-shiny-star' }, '★'),
    h('span', null, m.label || ''));
}

/* ── Protection bar (favorite / lock) — same state colour language ─────── */
export function protectionBarVNode(m) {
  const btn = (stateClass, model, iconHtml) => h('button', {
    class: `hbtn poke-protect-btn ${stateClass}`,
    dataset: { action: 'legacy-call', call: model.call || '', callArgs: model.args == null ? '' : String(model.args) },
  },
    iconHtml ? h('span', { class: 'poke-protect-icon' }, h.raw(iconHtml)) : null,
    h('span', { class: 'poke-protect-label' }, model.label || ''));
  return h('div', { class: 'poke-protection-actions' },
    btn(m.favorite.on ? 'is-on' : 'is-off', m.favorite, null),
    btn(m.lock.on ? 'is-locked' : 'is-off', m.lock, m.lock.iconHtml));
}

/* ── Evolution methods ─────────────────────────────────────────────────── */
export function evoMethodRowVNode(rowHtml) {
  return h('div', { class: 'pw-progress-row' }, h('span', null, h.raw(rowHtml || '')));
}

export function evoMethodsVNode(m) {
  if (!m || m.none) {
    return h('div', { class: 'pw-progress-card' }, h.raw((m && m.noneText) || ''));
  }
  return h('div', { class: 'pw-progress-card-subtle' },
    h('div', { class: 'pw-progress-section-title' }, m.title || ''),
    ...(m.rows || []).map(evoMethodRowVNode));
}

/** String serialization for classic call sites (pokédex detail). */
export function evoMethodsHTML(m) {
  return toHTMLString(evoMethodsVNode(m));
}
