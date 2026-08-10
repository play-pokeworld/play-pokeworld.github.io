/**
 * PokéWorld UI — Save extras (rebuilt from zero)
 *
 * The three small save surfaces that were still raw template literals in
 * save.js:
 *   1. the save-card right-click CONTEXT MENU (one coloured item per
 *      action — user feedback: distinct colours, dl blue / import green /
 *      delete red),
 *   2. the profile-icon GRID (box Pokémon offered as save icons),
 *   3. the CURRENT icon display.
 *
 * The classic adapter (save.js) shapes the models (localization + escArg
 * stay THERE); these components own 100% of the markup.
 *
 * Two usage modes (same idiom as filter-bar/money-row):
 *   - *VNode(model) → virtual node (ECS views),
 *   - *HTML(model)  → HTML string (classic adapters through
 *                     window.PokeUI.components.*).
 *
 * @module ui/components/save-extras
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from './component-utils.js';

/* ── 1. Context menu ───────────────────────────────────────────────────── */

/**
 * Model: { items: [{ label, icon?, intent?: 'dl'|'imp'|'danger'|null,
 *                    call, callArgs }] }
 * @param {Object} model
 * @returns {*} virtual node
 */
export function saveContextMenuVNode(model = {}) {
  return (model.items || []).filter(Boolean).map((it) => h('button', {
    type: 'button',
    class: cx('save-context-item',
      it.intent === 'dl' && 'dl-item',
      it.intent === 'imp' && 'imp-item',
      it.intent === 'danger' && 'danger'),
    dataset: { action: 'legacy-call', call: it.call, callArgs: it.callArgs || '' },
  }, it.icon ? `${it.icon} ` : '', it.label || ''));
}

/** HTML string of the context menu items (classic adapter). @returns {string} */
export function saveContextMenuHTML(model = {}) {
  return toHTMLString(saveContextMenuVNode(model));
}

/* ── 2. Profile-icon grid ──────────────────────────────────────────────── */

/**
 * Model: {
 *   choices: [{ key, id, name, level, shiny, active, iconHtml,
 *               levelLabel }],
 *   emptyLabel: string|null,
 * }
 * @param {Object} model
 * @returns {*} virtual node
 */
export function saveIconGridVNode(model = {}) {
  if (!Array.isArray(model.choices) || !model.choices.length) {
    return h('div', { class: 'save-icon-empty' }, model.emptyLabel || '');
  }
  return model.choices.filter(Boolean).map((opt) => h('button', {
    type: 'button',
    class: cx('save-icon-choice', opt.active && 'active'),
    dataset: {
      action: 'legacy-call',
      call: 'selectSaveProfileIcon',
      callArgs: `'${opt.key}',${opt.id}`,
    },
  },
    h('span', { class: 'save-icon-sprite' }, h.raw(opt.iconHtml || '')),
    h('span', { class: 'save-icon-name' }, opt.name || ''),
    h('small', null,
      `#${opt.id} · ${opt.levelLabel || ''}${opt.level ?? ''}`,
      opt.shiny ? ' ★' : '')));
}

/** HTML string of the icon grid (classic adapter). @returns {string} */
export function saveIconGridHTML(model = {}) {
  return toHTMLString(saveIconGridVNode(model));
}

/* ── 3. Current icon display ───────────────────────────────────────────── */

/**
 * Model: { id: number|null, name, iconHtml, noIdLabel }
 * @param {Object} model
 * @returns {*} virtual node
 */
export function saveProfileCurrentIconVNode(model = {}) {
  return [
    h('span', { class: 'save-slot-icon' }, h.raw(model.iconHtml || '')),
    h('span', { class: 'save-profile-icon-current-label' },
      h('span', null, model.name || ''),
      h('small', null, model.id ? `#${model.id}` : (model.noIdLabel || ''))),
  ];
}

/** HTML string of the current-icon display (classic adapter). @returns {string} */
export function saveProfileCurrentIconHTML(model = {}) {
  return toHTMLString(saveProfileCurrentIconVNode(model));
}
