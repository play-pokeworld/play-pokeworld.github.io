/**
 * PokéWorld UI — map dressing & location-info building blocks (ECS DS,
 * rebuilt from zero)
 *
 * User-confirmed scope: the map WINDOW DRESSING (help/legend overlays,
 * region selector styling) and the whole "info lieu" panel — the map
 * scene itself (SVG nodes) is explicitly OUT of scope.
 *
 * Visual language (user rules):
 *   - sprite discs = the ONE canonical .pw-poke-circle-wrap >
 *     .pw-poke-circle-bg backdrop, sized by class (no inline styles),
 *   - progress bars carry their width INLINE (self-contained, wave 13),
 *   - locks are INFORMATIONAL rows, never disabled buttons.
 *
 * Kept contracts:
 *   - span[data-rotation-timer="roam"|"mirage"] (rotation ticker target),
 *   - .loc-caught-badge.is-owned/.is-missing and the is-owned/is-shiny-
 *     owned/is-seen state classes on wild entries (tests + completion
 *     recolouring hooks),
 *   - legacy routing: openNpc / exploreArea / openPuzzleListForLocation /
 *     startQuestDefeatBattle / openFullscreenPanel / startChampBattle /
 *     baseWindowVisitAlcove / baseWindowConfirmEstablish (data-call-args
 *     unchanged), toggle-map-help on the help modal buttons,
 *   - #map-help-modal.open visibility model.
 *
 * @module ui/components/map-dressing
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from './component-utils.js';

/* ── Overview card (place name + meta chips) ───────────────────────────── */
export function locOverviewVNode(m) {
  return h('div', { class: 'pw-loc-overview' },
    h('div', { class: 'pw-loc-overview-title' }, m.title || ''),
    h('div', { class: 'pw-loc-overview-meta' }, (m.metas || []).map((t) => h('span', { class: 'pw-loc-meta-chip' }, t || ''))));
}

export function locPlayStatsVNode(m) {
  if (!m) return null;
  return h('div', { class: 'pw-panel pw-loc-play-stats' },
    m.title ? h('div', { class: 'pw-loc-play-stats-title' }, m.title) : null,
    h('div', { class: 'pw-loc-play-stats-row' },
      h('div', { class: 'pw-loc-play-stat' },
        h('span', { class: 'pw-loc-play-stat-val' }, String(m.beaten == null ? 0 : m.beaten)),
        h('span', { class: 'pw-loc-play-stat-lbl' }, m.beatenLabel || '')),
      h('div', { class: 'pw-loc-play-stat' },
        h('span', { class: 'pw-loc-play-stat-val' }, String(m.captured == null ? 0 : m.captured)),
        h('span', { class: 'pw-loc-play-stat-lbl' }, m.capturedLabel || ''))));
}

/* ── Lore tip (speaker quote) ──────────────────────────────────────────── */
export function locLoreVNode(m) {
  return h('div', { class: 'pw-loc-lore' },
    h('div', { class: 'pw-bold pw-light2' }, `${m.speaker || ''} :`),
    h('div', { class: 'pw-italic pw-text-sm' }, `« ${m.text || ''} »`));
}

/* ── Action grid (buttons + informational locked rows) ─────────────────── */
export function locActionVNode(a) {
  if (a.kind === 'info') {
    return h('div', { class: cx('pw-loc-action-row', a.cls) },
      h('span', { class: 'pw-loc-action-icon', 'aria-hidden': 'true' }, h.raw(a.iconHtml || '')),
      h('span', { class: 'pw-loc-action-label pw-text-sm' }, a.label || ''));
  }
  return h('button', {
    type: 'button',
    class: cx('pw-loc-action-btn', a.cls),
    dataset: { action: 'legacy-call', call: a.call || '', callArgs: a.callArgs == null ? '' : String(a.callArgs) },
  },
    h('span', { class: 'pw-loc-action-icon', 'aria-hidden': 'true' }, h.raw(a.iconHtml || '')),
    h('span', { class: 'pw-loc-action-label pw-text-sm' }, a.label || ''));
}
export function locActionGridVNode(actions) {
  return h('div', { class: 'pw-loc-action-grid' }, (actions || []).map(locActionVNode));
}

/* ── Unlock progress tip (self-contained bar, inline width) ────────────── */
export function locUnlockTipVNode(m) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(m.pct) || 0)));
  return h('div', { class: 'pw-loc-unlock-tip' },
    h('div', { class: 'pw-text-sm pw-light2 pw-bold' }, m.text || ''),
    h('div', { class: 'pw-loc-unlock-bar' },
      h('div', { class: 'pw-loc-unlock-fill', dataset: { pct: String(pct) }, style: { width: `${pct}%`, '--pct': `${pct}%` } })));
}

/* ── Rotation chips (roaming legendary / Mirage Island) ────────────────── */
export function locTimerChipVNode(m) {
  return h('div', { class: 'pw-loc-timer-chip' },
    h('span', null, h.raw(m.labelHtml || '')),
    h('span', { class: 'pw-loc-timer', dataset: { rotationTimer: m.timerKind || 'roam' } }, m.timerText || ''));
}

/* ── Wild section header (progress + shiny tag) ────────────────────────── */
export function locWildMetaVNode(m) {
  return h('div', { class: 'pw-loc-wild-meta' },
    h('span', null, m.label || ''),
    m.progress ? h('span', null, m.progress) : null,
    m.shinyTag ? h('span', { class: 'pw-loc-shiny-tag' }, m.shinyTag) : null);
}

/* ── One wild entry (canonical disc + state badges) ────────────────────── */
export function locWildCardVNode(e) {
  return h('div', {
    class: cx('pw-loc-wild-card',
      e.owned ? 'is-owned' : 'is-missing',
      e.shinyOwned && 'is-shiny-owned',
      e.seen ? 'is-seen' : 'is-unseen',
      e.roaming && 'is-roaming'),
  },
    h('div', { class: cx('loc-caught-badge', e.owned ? 'is-owned' : 'is-missing') }, e.owned ? '✓' : '?'),
    // Wave 18 (user feedback): e.spriteHtml (spriteImg) ALREADY carries the
    // canonical disc (.pw-poke-circle-wrap > .pw-poke-circle-bg + img) —
    // wrapping it in a SECOND wrap+bg painted two offset discs over the
    // sprite ("double ronds", sprite invisible on some themes). Keep ONE.
    h('div', { class: 'pw-loc-wild-disc' }, h.raw(e.spriteHtml || '')),
    h('div', { class: cx('pw-bold pw-text-sm', e.accentCls) },
      e.name || '',
      e.shinyOwned ? h('span', { class: 'pw-shiny-star' }, '★') : null),
    h('div', { class: 'pw-text-sm pw-light1' }, e.levelText || ''),
    e.roaming
      ? h('div', { class: 'pw-loc-roaming-badge' }, e.rarityText || '')
      : h('div', { class: 'pw-text-sm pw-light1' }, e.rarityText || ''));
}
export function locWildGridVNode(entries) {
  return h('div', { class: 'pw-loc-wild-grid' }, (entries || []).map(locWildCardVNode));
}

/* ── Route drop cards ────────────────────────────────────────────────────
   Wave 28 (user feedback): the findable items use the SAME display as the
   wild entries — the canonical disc with the name BELOW it, not a small
   inline chip (the 24px chip read as "too small to recognize"). */
export function locDropsVNode(m) {
  return [
    h('div', { class: 'pw-loc-section-title' }, m.title || ''),
    h('div', { class: 'pw-loc-wild-grid pw-loc-drop-grid' },
      (m.chips || []).map((c) => h('div', { class: 'pw-loc-wild-card pw-loc-drop-card' },
        h('div', { class: 'pw-loc-wild-disc' }, h.raw(c.discHtml || c.iconHtml || '')),
        h('div', { class: 'pw-bold pw-text-sm' }, c.name || '')))),
  ];
}

/* ── Secret-base alcoves (Hoenn) ───────────────────────────────────────── */
export function locAlcovesVNode(m) {
  return [
    h('div', { class: 'pw-loc-section-title' }, m.title || ''),
    m.subText ? h('div', { class: cx('pw-text-sm', m.subCls || 'pw-light1') }, m.subText) : null,
    h('div', { class: 'pw-loc-alcove-list' },
      ...(m.rows || []).map((r) => h('div', { class: 'pw-loc-alcove-row' },
        // Wave 15 (user feedback): no leading emoji before alcove names.
        h('span', { class: 'pw-text-sm pw-loc-alcove-name' }, r.label || ''),
        r.current
          ? [
              h('span', { class: 'pw-text-sm pw-text-positive' }, `${r.currentLabel || ''} ✓`),
              // Wave 35 (user): the current row was TEXT ONLY — no way to
              // enter your own base from its location. Direct entry button,
              // dispatched to the engine action baseWindowVisitOwnBase.
              h('button', {
                type: 'button', class: 'hbtn',
                dataset: { action: 'legacy-call', call: 'baseWindowVisitOwnBase', callArgs: '' },
              }, r.enterLabel || ''),
            ]
          : [
              h('button', {
                type: 'button', class: 'hbtn',
                dataset: { action: 'legacy-call', call: 'baseWindowVisitAlcove', callArgs: r.visitArgs == null ? '' : String(r.visitArgs) },
              }, r.visitLabel || ''),
              h('button', {
                type: 'button', class: 'hbtn',
                dataset: { action: 'legacy-call', call: 'baseWindowConfirmEstablish', callArgs: r.establishArgs == null ? '' : String(r.establishArgs) },
              }, r.establishLabel || ''),
            ]))),
  ];
}

/* ── Map help modal (legend of node colours) ───────────────────────────── */
export function mapHelpCardVNode(m) {
  return h('div', { class: 'pw-map-help-card' },
    h('div', { class: 'pw-map-help-head' },
      h('b', null, m.title || ''),
      h('button', {
        type: 'button', class: 'modal-close',
        dataset: { action: 'toggle-map-help' },
        'aria-label': m.closeLabel || '',
      }, '✕')),
    h('div', { class: 'pw-map-help-body' },
      (m.rows || []).map((r) => h('div', { class: 'pw-map-help-row' },
        h('span', { class: cx('pw-map-help-swatch', r.swatchCls) }),
        h('span', { class: 'pw-text-sm' },
          r.title ? h('b', { class: 'pw-map-help-strong' }, `${r.title} — `) : null,
          r.desc !== undefined ? r.desc : (r.label || ''))))));
}

export function mapHelpCardHTML(model) { return toHTMLString(mapHelpCardVNode(model)); }

