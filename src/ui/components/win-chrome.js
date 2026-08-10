/**
 * PokéWorld UI — dashboard window chrome (ECS DS, rebuilt from zero —
 * wave 14)
 *
 * ONE grip affordance per draggable window header: the legacy markup
 * stacked a ::before glyph AND a 6-dot span grid on every header; the
 * rebuild keeps only the real dot grid. The title icon arrives as trusted
 * raw SVG in the model (the classic adapter lifts it from the static
 * shell before stamping); the title label keeps its id + data-i18n hook
 * so runtime re-localization keeps working.
 *
 * @module ui/components/win-chrome
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';

const GRIP_DOTS = 6;

/** 6-dot drag grip (decorative — the header itself is the drag handle). */
export function winGripVNode() {
  return h('span', { class: 'pw-win-hdr-grip', 'aria-hidden': 'true' },
    Array.from({ length: GRIP_DOTS }, () => h('span')));
}

/**
 * Title cluster of a dashboard window header (left side): grip + icon +
 * label. Right-side tools (region selector, base controls, "?" button)
 * are LIVE nodes re-appended by the adapter, so their state survives.
 */
export function winHeaderTitleVNode(m) {
  const labelAttrs = { class: 'pw-win-hdr-label' };
  if (m.labelId) labelAttrs.id = m.labelId;
  if (m.labelKey) labelAttrs.dataset = { i18n: m.labelKey };
  return h('span', { class: 'pw-win-hdr-title' },
    winGripVNode(),
    h('span', { class: 'pw-win-hdr-icon', 'aria-hidden': 'true' }, h.raw(m.iconHtml || '')),
    h('span', labelAttrs, m.labelText || ''));
}

/* ── String helpers (DOM-free, classic adapters / preview) ─────────────── */
export function winHeaderTitleHTML(model) { return toHTMLString(winHeaderTitleVNode(model)); }
