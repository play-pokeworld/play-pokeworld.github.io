/**
 * PokéWorld UI — panel header (Wave 32, user feedback)
 *
 * THE single constructor for every panel header in the game.
 *
 * ── Why this module exists ──────────────────────────────────────────────
 * Until Wave 32 the game had a shared header *look* (the `.modal-title` /
 * `.pw-modal-header` CSS rule) but NO shared header *builder*. Exactly one
 * site emitted the reference markup — `fullscreen-panel.js` for the
 * `openFullscreenPanel()` family (bag, market, pokédex, dictionary, guide,
 * shop) — and 25 other sites hand-rolled their own `<div class="modal-title">`
 * with slightly different innards:
 *
 *   - some wrapped the text in `.pw-row > .pw-info-icon + .pw-info-head-text`,
 *     others in a bare `<div>`;
 *   - some wrote the ✕ glyph as text, others relied on the CSS `::before`;
 *   - some used `<span class="modal-close">`, others `<button>`;
 *   - some added their own modifier class (`management-title`, `pw-info-head`).
 *
 * A shared stylesheet cannot rescue divergent markup: that is why the user
 * kept seeing "some headers are right, others are not". The fix is to make
 * the *structure* shared too — every panel now calls `panelHeaderVNode()`
 * and physically cannot drift again.
 *
 * ── Canonical structure ─────────────────────────────────────────────────
 *   .modal-title[extraClass]
 *     ├─ .pw-row                       (icon + text cluster; always present)
 *     │    ├─ .pw-info-icon            (optional — emoji, <img> or raw HTML)
 *     │    └─ .pw-info-head-text
 *     │         ├─ .pw-info-name       the title
 *     │         └─ .pw-text-sm.pw-light1   the optional subtitle
 *     └─ .modal-close                  (optional — omitted when no close)
 *
 * The wrapper keeps the `.modal-title` class so the canonical CSS rule and
 * every existing selector/test keep matching; only the innards are unified.
 *
 * @module ui/components/panel-header
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from './component-utils.js';

/**
 * Normalize the many close-button shapes used across the codebase into the
 * one canonical control.
 *
 * @param {Object|null} close
 *   `{ action, call, callArgs, dataset, tag, glyph, ariaLabel, i18nAriaLabel,
 *      class }` — everything optional. `dataset` is merged last so callers can
 *   pass extra hooks (e.g. `resetMoveEditor`).
 * @returns {Object|null} vnode or null when the panel has no close control.
 */
function closeVNode(close) {
  if (!close) return null;
  const ds = {};
  if (close.call) {
    ds.action = close.action || 'legacy-call';
    ds.call = close.call;
    ds.callArgs = close.callArgs != null ? String(close.callArgs) : '';
  } else if (close.action) {
    ds.action = close.action;
  }
  Object.assign(ds, close.dataset || {});

  const props = { class: cx('modal-close', close.class), dataset: ds };
  if (close.tag === 'button') props.type = 'button';
  if (close.ariaLabel) props['aria-label'] = close.ariaLabel;
  if (close.i18nAriaLabel) props['data-i18n-aria-label'] = close.i18nAriaLabel;

  // The CSS draws '✕' via ::before for an empty .modal-close. Callers that
  // historically wrote the glyph inline keep doing so (identical output),
  // callers that relied on the pseudo-element pass glyph:false.
  const glyph = close.glyph === false ? null : (close.glyph || null);
  return h(close.tag === 'button' ? 'button' : 'span', props, glyph);
}

/**
 * Build a canonical panel header.
 *
 * @param {Object} opts
 * @param {string|Object} [opts.title]        text, vnode, or raw-HTML via `titleHtml`
 * @param {string} [opts.titleHtml]           trusted HTML title (game-built only)
 * @param {string|Object} [opts.subtitle]     secondary line under the title
 * @param {string} [opts.subtitleHtml]        trusted HTML subtitle
 * @param {string} [opts.subtitleClass]       tone class for the subtitle (default pw-light1)
 * @param {string} [opts.iconHtml]            trusted HTML icon (sprite/svg/emoji)
 * @param {string|Object} [opts.icon]         plain-text icon or ready vnode
 * @param {Object} [opts.close]               see closeVNode()
 * @param {string} [opts.class]               extra class on `.modal-title`
 * @param {string} [opts.id]                  id on the header band (legacy hooks)
 * @param {Object} [opts.titleProps]          extra props for the title node (id…)
 * @param {*} [opts.titleExtra]               appended inside the title line
 * @returns {Object} vnode
 */
export function panelHeaderVNode(opts = {}) {
  const o = opts || {};

  const iconNode = o.iconHtml
    ? h('span', { class: 'pw-info-icon' }, h.raw(o.iconHtml))
    : (o.icon ? h('span', { class: 'pw-info-icon' }, o.icon) : null);

  const titleChild = o.titleHtml != null ? h.raw(o.titleHtml) : (o.title != null ? o.title : '');
  const subtitleChild = o.subtitleHtml != null
    ? h.raw(o.subtitleHtml)
    : (o.subtitle != null && o.subtitle !== '' ? o.subtitle : null);

  const textCluster = h('div', { class: 'pw-info-head-text' },
    h('div', Object.assign({ class: 'pw-info-name' }, o.titleProps || {}), titleChild, o.titleExtra || null),
    subtitleChild != null
      ? h('div', { class: cx('pw-text-sm', o.subtitleClass || 'pw-light1') }, subtitleChild)
      : null);

  const props = { class: cx('modal-title', o.class) };
  if (o.id) props.id = o.id;

  return h('div', props,
    h('div', { class: 'pw-row' }, iconNode, textCluster),
    closeVNode(o.close));
}

/**
 * String flavour for the classic adapters that build panels with template
 * literals instead of vnodes (preset editor, item/talent info sheets…).
 * @param {Object} opts same as panelHeaderVNode
 * @returns {string} HTML
 */
export function panelHeaderHTML(opts) {
  return toHTMLString(panelHeaderVNode(opts));
}
