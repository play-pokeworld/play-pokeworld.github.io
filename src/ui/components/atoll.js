/**
 * PokéWorld UI — Battle Atoll building blocks (ECS DS, rebuilt from zero)
 *
 * Visual language (user rules):
 *   - FLAT solid colours only (no gradients on cards/controls),
 *   - unusable controls are NOT rendered: an unaffordable shop entry shows
 *     an informational chip instead of a dead buy button,
 *   - uniform tab bar (managementTabBarVNode) across machines & the Atoll.
 *
 * Kept contracts:
 *   - span[data-rotation-timer="atoll"] refreshed 1×/s by the rotation
 *     ticker (textContent only — the span must keep existing),
 *   - legacy routing: data-action="legacy-call" with data-call setAtollTab
 *     / startAtollBattle / prepareAtollFactoryBattle / buyAtollItem /
 *     openAtollFactoryPrep / abandonAtollFactoryRunUI (+ data-call-args),
 *   - sprite fragments (spriteImg / itemSpriteHtml) remain produced by the
 *     classic adapter and are injected as trusted raw html.
 *
 * Model (shaped by the classic adapter, labels localized there):
 *   hero:      { title, desc, tokens, tokensLabel, streakLabel }
 *   nav:       [{ id, label, active, call, args }]   (management tab model)
 *   rotation:  { timerText, cycleText }
 *   groupDesc: { title, desc }
 *   home:      [{ label, args }]
 *   modeCard:  { rankClass, badgeLabel, badgeCls, title, ruleText,
 *                previewLabel, previewChips: [{ title, spriteHtml }],
 *                banRow: { label, chips: [...] }|null, freeNote,
 *                cta: { label, call, args } }
 *   runCard:   { title, streakText, chips, prepLabel, abandonLabel, hint }
 *   shopCard:  { iconHtml, name, priceText, affordable, buyLabel, call,
 *                args, missingText }
 *
 * @module ui/components/atoll
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from './component-utils.js';
import { managementTabBarVNode } from './management.js';

/* ── Hero (title + description + token box) ────────────────────────────── */
export function atollHeroVNode(m) {
  return h('div', { class: 'pw-atoll-hero' },
    h('div', { class: 'pw-atoll-hero-text' },
      h('h2', null, m.title || ''),
      m.desc ? h('p', null, m.desc) : null),
    m.tokens != null
      ? h('div', { class: 'pw-atoll-token-box' },
          h('b', null, String(m.tokens)),
          h('span', null, m.tokensLabel || ''),
          m.streakLabel ? h('small', null, m.streakLabel) : null)
      : null);
}

/* ── Navigation tabs (uniform bar reused) ──────────────────────────────── */
export function atollNavVNode(tabs) {
  return managementTabBarVNode(tabs);
}

/* ── Rotation meta (live countdown chip + cycle chip) ──────────────────── */
export function atollRotationMetaVNode(m) {
  return h('div', { class: 'pw-atoll-rotation-meta' },
    h('span', { class: 'pw-atoll-timer-chip', dataset: { rotationTimer: 'atoll' } }, m.timerText || ''),
    m.cycleText ? h('span', { class: 'pw-atoll-cycle-chip' }, m.cycleText) : null);
}

/* ── Group description (top of each mode page) ─────────────────────────── */
export function atollGroupDescVNode(m) {
  return h('div', { class: 'pw-atoll-group-desc' },
    h('b', null, m.title || ''),
    m.desc ? h('p', null, m.desc) : null);
}

/* ── Sprite chip (trusted sprite fragment in a flat dark chip) ─────────── */
export function atollSpriteChipVNode(c) {
  return h('span', { class: 'pw-atoll-chip', title: c.title || '' }, h.raw(c.spriteHtml || ''));
}
export function atollSpriteRowVNode(chips, cls) {
  return h('div', { class: cx('pw-atoll-chip-row', cls) }, (chips || []).map(atollSpriteChipVNode));
}

/* ── Rank badge pill ───────────────────────────────────────────────────── */
export function atollRankBadgeVNode(m) {
  return h('span', { class: cx('pw-atoll-rank-badge', m.badgeCls) }, m.badgeLabel || '');
}

/* ── Rotating legendary bans row ───────────────────────────────────────── */
export function atollBanRowVNode(m) {
  return h('div', { class: 'pw-atoll-ban-row' },
    h('span', { class: 'pw-text-sm' }, m.label || ''),
    atollSpriteRowVNode(m.chips, 'pw-atoll-ban-chips'));
}

/* ── One mode card (rank, rules, team preview, bans, ONE CTA) ──────────── */
export function atollModeCardVNode(m) {
  return h('div', { class: cx('pw-atoll-mode-card', m.rankClass) },
    h('div', { class: 'pw-atoll-mode-info' },
      atollRankBadgeVNode(m),
      h('b', { class: 'pw-atoll-mode-title' }, m.title || ''),
      m.ruleText ? h('span', { class: 'pw-atoll-mode-rule' }, m.ruleText) : null,
      m.previewLabel ? h('small', { class: 'pw-text-sm pw-light1' }, m.previewLabel) : null,
      atollSpriteRowVNode(m.previewChips),
      m.banRow ? atollBanRowVNode(m.banRow) : null,
      m.freeNote ? h('span', { class: 'pw-atoll-free-note' }, m.freeNote) : null),
    h('button', {
      type: 'button',
      class: 'hbtn pw-atoll-mode-cta',
      dataset: { action: 'legacy-call', call: m.cta.call || '', callArgs: m.cta.args == null ? '' : String(m.cta.args) },
    }, m.cta.label || ''));
}

export function atollModeGridVNode(cards) {
  return h('div', { class: 'pw-atoll-mode-grid' }, (cards || []).map(atollModeCardVNode));
}

/* ── Home hub (one large card per league) ──────────────────────────────── */
export function atollHomeCardVNode(c) {
  return h('button', {
    type: 'button',
    class: 'pw-atoll-home-card',
    dataset: { action: 'legacy-call', call: 'setAtollTab', callArgs: c.args == null ? '' : String(c.args) },
  },
    h('span', { class: 'pw-atoll-home-icon', 'aria-hidden': 'true' }, c.icon || '🏟️'),
    h('b', null, c.label || ''),
    c.sub ? h('small', { class: 'pw-text-sm pw-light1' }, c.sub) : null);
}
export function atollHomeGridVNode(cards) {
  return h('div', { class: 'pw-atoll-home-grid' }, (cards || []).map(atollHomeCardVNode));
}

/* ── Factory run status card ───────────────────────────────────────────── */
export function atollRunCardVNode(m) {
  return h('div', { class: 'pw-atoll-run-card' },
    h('div', { class: 'pw-atoll-run-head' },
      h('b', null, m.title || ''),
      h('span', { class: 'pw-text-sm pw-light1' }, m.streakText || '')),
    atollSpriteRowVNode(m.chips),
    h('div', { class: 'pw-atoll-run-actions' },
      h('button', {
        type: 'button', class: 'hbtn',
        dataset: { action: 'legacy-call', call: 'openAtollFactoryPrep', callArgs: '' },
      }, m.prepLabel || ''),
      h('button', {
        type: 'button', class: 'hbtn pw-btn-danger',
        dataset: { action: 'legacy-call', call: 'abandonAtollFactoryRunUI', callArgs: '' },
      }, m.abandonLabel || '')),
    m.hint ? h('small', { class: 'pw-text-sm pw-light1' }, m.hint) : null);
}

/* ── Token shop ────────────────────────────────────────────────────────── */
export function atollShopCardVNode(m) {
  return h('div', { class: 'pw-atoll-shop-card' },
    h('div', { class: 'pw-atoll-shop-info' },
      h.raw(m.iconHtml || ''),
      h('div', { class: 'pw-atoll-shop-text' },
        h('b', null, m.name || ''),
        h('span', { class: 'pw-text-sm pw-light1' }, m.priceText || ''))),
    m.affordable
      ? h('button', {
          type: 'button', class: 'hbtn pw-btn-positive',
          dataset: { action: 'legacy-call', call: 'buyAtollItem', callArgs: m.args == null ? '' : String(m.args) },
        }, m.buyLabel || '')
      // User rule: an unusable control is NOT rendered — informational chip.
      : h('span', { class: 'pw-atoll-shop-locked' }, m.missingText || ''));
}
export function atollShopGridVNode(cards) {
  return h('div', { class: 'pw-atoll-shop-grid' }, (cards || []).map(atollShopCardVNode));
}

export function atollPanelHTML(model) {
  return toHTMLString(atollHeroVNode(model && model.hero || {}));
}
