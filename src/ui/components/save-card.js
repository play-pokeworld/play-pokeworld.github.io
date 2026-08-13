/**
 * PokéWorld UI — SaveCard (THE single save-game card)
 *
 * Exactly ONE way to render a save-game card in the game (main menu save
 * library AND read-only previews): icon wrapped in the canonical sprite
 * disc (the adapter passes the sprite HTML built by the single sprite
 * helper), name, save id, stats row (badges / pokédex / play time).
 *
 * Kept contracts (the classic layer + harness drive them):
 *   - root root class `save-slot save-bg-<background>` (themed card hues),
 *   - menu mode renders a <button> with
 *       data-action="legacy-call" data-call="startSaveById"
 *       data-call-args="'<id>'" data-context-call="openSaveCardContextMenu"
 *       data-context-args="'<id>',event"
 *   - preview mode renders a plain <div class="save-slot save-slot-preview …">,
 *   - `.save-slot-main > .save-slot-icon + .save-slot-title(.name,.id)`,
 *   - `.save-slot-stats > span > b+small` ×3, `.save-slot-bottom` (menu only),
 *   - unknown backgrounds fall back to `classic` (same rule as the old
 *     classic adapter: normalizeBackground()).
 *
 * Model:
 * {
 *   mode: 'menu' | 'preview',
 *   id, name, background,                    // raw data (escaped here)
 *   spriteHtml,                              // canonical sprite/disc HTML or ''
 *   badges, caught, playTimeText,            // stats (numbers / formatted)
 *   idLabel, badgesLabel, pokedexLabel,
 *   playtimeLabel, clickHintLabel,
 * }
 *
 * Two usage modes:
 *   - saveCardVNode(model) → virtual node (ECS views),
 *   - saveCardHTML(model)  → HTML string (classic adapters through
 *                            window.PokeUI.components.saveCardHTML).
 *
 * @module ui/components/save-card
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from './component-utils.js';

/** Same background vocabulary as the classic save library. */
export const SAVE_CARD_BACKGROUNDS = Object.freeze(['classic', 'goldsilver', 'emerald', 'diamondpearl', 'blackwhite', 'xy', 'forest']);
const SAVE_BACKGROUND_ALIASES = Object.freeze({ blue: 'classic', red: 'classic', green: 'emerald', purple: 'xy', gold: 'goldsilver', silver: 'goldsilver' });

/**
 * @param {string} value
 * @returns {string} a known background key ('classic' when unknown)
 */
export function normalizeSaveCardBackground(value) {
  const raw = String(value || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '');
  const mapped = SAVE_BACKGROUND_ALIASES[raw] || raw;
  return SAVE_CARD_BACKGROUNDS.includes(mapped) ? mapped : 'classic';
}

/** Escape a value for a legacy data-call-args single-quoted argument. */
function escArg(value) {
  return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * @param {Object} model
 * @returns {*} virtual node of the canonical save card
 */
export function saveCardVNode(model = {}) {
  const mode = model.mode === 'preview' ? 'preview' : 'menu';
  const bg = normalizeSaveCardBackground(model.background);
  const dataset = {};
  if (mode === 'menu') {
    dataset.action = 'legacy-call';
    dataset.call = 'startSaveById';
    dataset.callArgs = `'${escArg(model.id)}'`;
    dataset.contextCall = 'openSaveCardContextMenu';
    dataset.contextArgs = `'${escArg(model.id)}',event`;
  }
  return h(mode === 'menu' ? 'button' : 'div', {
    class: cx('save-slot', `save-bg-${bg}`, mode === 'preview' && 'save-slot-preview'),
    dataset,
  },
    h('span', { class: 'save-slot-main' },
      h('span', { class: 'save-slot-icon' },
        model.spriteHtml ? h.raw(model.spriteHtml) : h('span', { class: 'save-slot-icon-missing' }, '?')),
      h('span', { class: 'save-slot-title' },
        h('span', { class: 'save-slot-name' }, model.name || ''),
        h('span', { class: 'save-slot-id' }, (model.idLabel || '') + ' ' + (model.id || '')))),
    h('span', { class: 'save-slot-stats' },
      h('span', null, h('b', null, String(model.badges != null ? model.badges : 0)), h('small', null, model.badgesLabel || '')),
      h('span', null, h('b', null, String(model.caught != null ? model.caught : 0)), h('small', null, model.pokedexLabel || '')),
      h('span', null, h('b', null, model.playTimeText || ''), h('small', null, model.playtimeLabel || ''))),
    mode === 'menu'
      ? h('span', { class: 'save-slot-bottom' }, h('span', null, model.clickHintLabel || ''))
      : null);
}

/**
 * HTML string of the canonical save card (classic adapters).
 * @param {Object} model
 * @returns {string}
 */
export function saveCardHTML(model = {}) {
  return toHTMLString(saveCardVNode(model));
}

