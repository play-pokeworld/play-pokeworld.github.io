/**
 * PokéWorld UI — Guide & tutorial building blocks (ECS DS, rebuilt from
 * zero — wave 14)
 *
 * Every label arrives LOCALIZED in the model (the classic adapter in
 * game/display/tutorial.js owns t()/tr()); these components own only the
 * shape. Visual language (user rules):
 *   - flats only, theme via --pw-* tokens,
 *   - the progress bar carries its width INLINE (self-contained bars),
 *   - routing stays on the legacy-call delegation (setGuideSection,
 *     tutorialEnable/tutorialDisable, openFullscreenPanel, step actions).
 *
 * @module ui/components/guide
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from './component-utils.js';

/* ── Shared guide button (legacy-call contract) ────────────────────────── */
export function guideBtnVNode(a) {
  return h('button', {
    type: 'button',
    class: cx('pw-guide-btn', a.primary ? 'pw-guide-btn-cta' : '', a.cls),
    dataset: { action: 'legacy-call', call: a.call || '', callArgs: a.callArgs == null ? '' : String(a.callArgs) },
  }, a.label || '');
}

/* ── Guide home: header + actions + section cards grid ─────────────────── */
export function guideSectionCardVNode(c) {
  return h('button', {
    type: 'button',
    class: 'pw-guide-card',
    dataset: { action: 'legacy-call', call: 'setGuideSection', callArgs: `'${c.id}'` },
  },
    h('span', { class: 'pw-guide-card-head' },
      h('span', { class: 'pw-guide-card-icon', 'aria-hidden': 'true' }, h.raw(c.iconHtml || '')),
      h('span', { class: 'pw-guide-card-title' }, c.title || '')),
    h('span', { class: 'pw-guide-card-meta' }, c.meta || ''));
}

export function guideHomeVNode(m) {
  return h('div', { class: 'pw-guide' },
    h('div', { class: 'pw-guide-head' },
      h('div', { class: 'pw-guide-head-text' },
        h('h2', { class: 'pw-guide-title' }, m.title || ''),
        m.sub ? h('p', { class: 'pw-guide-sub' }, m.sub) : null)),
    (m.actions && m.actions.length)
      ? h('div', { class: 'pw-guide-actions' }, m.actions.map(guideBtnVNode))
      : null,
    h('div', { class: 'pw-guide-grid' }, (m.cards || []).map(guideSectionCardVNode)));
}

/* ── Guide detail: one section (header + back + page cards) ────────────── */
export function guidePageCardVNode(p) {
  return h('article', { class: 'pw-guide-page' },
    h('h3', { class: 'pw-guide-page-title' }, p.title || ''),
    h('p', { class: 'pw-guide-page-text' }, p.text || ''));
}

export function guideDetailVNode(m) {
  return h('div', { class: 'pw-guide' },
    h('div', { class: cx('pw-guide-head', 'pw-guide-head-detail') },
      h('div', { class: 'pw-guide-head-text' },
        h('h2', { class: 'pw-guide-title' },
          h('span', { class: 'pw-guide-title-icon', 'aria-hidden': 'true' }, h.raw(m.iconHtml || '')),
          m.title || ''),
        m.sub ? h('p', { class: 'pw-guide-sub' }, m.sub) : null),
      guideBtnVNode({ label: m.backLabel || '←', cls: 'pw-guide-back', call: 'setGuideSection', callArgs: 'null' })),
    h('div', { class: 'pw-guide-pages' }, (m.pages || []).map(guidePageCardVNode)));
}

/* ── Tutorial quest card (story window) ────────────────────────────────── */
export function tutorialQuestCardVNode(m) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(m.pct) || 0)));
  return h('div', { class: 'pw-tut-card' },
    h('div', { class: 'pw-tut-head' },
      h('span', { class: 'pw-tut-bulb', 'aria-hidden': 'true' }, '\uD83D\uDCA1'),
      h('span', { class: 'pw-tut-step' }, m.badge || '')),
    h('div', { class: 'pw-tut-title' }, m.title || ''),
    m.desc ? h('p', { class: 'pw-tut-desc' }, m.desc) : null,
    h('div', { class: 'pw-tut-how' },
      h('div', { class: 'pw-tut-how-label' }, m.howLabel || ''),
      h('div', { class: 'pw-tut-how-text' }, m.how || '')),
    h('div', { class: 'pw-tut-bar' },
      h('div', {
        class: 'pw-tut-bar-fill',
        dataset: { pct: String(pct) },
        style: { width: `${pct}%`, '--pct': `${pct}%` },
      })),
    h('div', { class: 'pw-tut-actions' }, (m.actions || []).map(guideBtnVNode)));
}

/* ── String helpers (DOM-free, classic adapters / preview) ─────────────── */
export function guideHomeHTML(model) { return toHTMLString(guideHomeVNode(model)); }
export function guideDetailHTML(model) { return toHTMLString(guideDetailVNode(model)); }
export function tutorialQuestCardHTML(model) { return toHTMLString(tutorialQuestCardVNode(model)); }
