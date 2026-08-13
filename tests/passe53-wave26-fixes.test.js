// Wave 26 — user-reported visual fixes (13 points). DOM-free locks for the
// exact contracts each fix established; the pixel-level before/after proof
// lives in harness/visual-wave26.mjs (Chromium, 22 checks).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const R = (rel) => fs.readFileSync(path.join(new URL('..', import.meta.url).pathname, rel), 'utf8');
const DS = R('src/assets/styles/design-system.css');
const DS1 = DS.replace(/\s+/g, ' ');
const IDX = R('index.html');
const MW = R('src/ui/components/machine-window.js');
const BV = R('src/ui/views/BaseViews.js');
const BUI = R('src/ui/game/battle-ui.js');

/* ── B (4th report): filter chips follow the theme tokens, no hard hex ── */
test('wave26 B: filter chips are theme-tokenized (zero dark-theme literal left)', () => {
  const strip = (t) => t.replace(/\/\*.*?\*\//g, ''); // comments honestly document the old values
  const chipRule = DS1.match(/\.pw-filterbar button\.pw-chip \{[^}]*\}/);
  const hoverRule = DS1.match(/\.pw-filterbar button\.pw-chip:hover \{[^}]*\}/);
  const activeRule = DS1.match(/\.pw-filterbar button\.pw-chip\.active \{[^}]*\}/);
  assert.ok(chipRule && hoverRule && activeRule, 'all three chip states styled');
  for (const [name, rule] of [['base', chipRule[0]], ['hover', hoverRule[0]], ['active', activeRule[0]]]) {
    assert.ok(!/#(?:2E2B25|3B372E|36342F|ECDEB7)/i.test(strip(rule)), `${name}: no hardcoded colour`);
    assert.ok(/var\(--/.test(strip(rule)), `${name}: uses theme tokens`);
  }
});

/* ── L: PC box shiny — no animation, no red ring, the ★ alone speaks ──── */
test('wave26 L: box shiny ring/pulse neutralized in the PC box only', () => {
  assert.ok(DS1.includes('.box-card.box-card--shiny .box-tile { border-color: transparent !important; box-shadow: none !important; }'),
    'shiny tile ring off inside the box');
  assert.ok(DS1.includes('.box-card .box-tile.shiny-spark, .box-card .box-tile.is-shiny { animation: none !important; box-shadow: none !important; }'),
    'shiny pulse animation off inside the box');
  // the general (non-box) shiny language is untouched
  assert.ok(DS1.includes('.pw-poke-card.box-card--shiny .box-tile {'), 'general shiny ring rule kept');
  const PC = R('src/ui/components/poke-card.js');
  assert.ok(PC.includes('box-card--shiny'), 'classes contract kept (scenes-and-views L93)');
});

/* ── A1: location wild disc hosts the 72px sprite — centred on the card ── */
test('wave26 A1: .pw-loc-wild-disc is 72x72 (the sprite size it contains)', () => {
  assert.ok(DS1.includes('.pw-loc-wild-disc { width: 72px; height: 72px; margin: 0 auto; }'), '72px slot');
  assert.ok(!DS1.includes('.pw-loc-wild-disc { width: 56px'), 'old 56px mismatch gone');
});

/* ── A2: the disc-fill hammer only applies INSIDE a real disc wrap ────── */
test('wave26 A2: the 100% fill rule is scoped to .pw-poke-circle-wrap children', () => {
  assert.ok(/\.pw-poke-circle-wrap img\.pw-poke-circle-img\s*\{[^}]*width:\s*100%\s*!important[^}]*height:\s*100%\s*!important/.test(DS1),
    'scoped hammer kept for real discs');
  // a loose (unwrapped) selector must NOT start a rule anymore
  assert.ok(!DS1.match(/(?:^|[};]\s*)img\.pw-poke-circle-img\s*\{/), 'loose img hammer removed — item icons honour their attributes');
});

/* ── C: machine slot disc — no nested wrap, one stretched disc ────────── */
test('wave26 C: machine-window never nests a second circle wrap around an adapter disc', () => {
  assert.ok(MW.includes("slot.pokemon.spriteHtml && slot.pokemon.spriteHtml.includes('pw-poke-circle-bg')"),
    'disc detection kept');
  assert.ok(MW.includes("? 'pw-machine-card-sprite'"), 'hook-only class when a disc is embedded');
  assert.ok(MW.includes(": 'pw-machine-card-sprite pw-poke-circle-wrap'"), 'wrap class only for bare sprites');
  assert.ok(/\.pw-machine-card-sprite:not\(\.pw-poke-circle-wrap\) > \.pw-poke-circle-wrap\s*\{\s*width:\s*100%\s*!important;\s*height:\s*100%\s*!important;/.test(DS1),
    'single helper disc stretches to the slot circle');
});

/* ── D: settings save-icon row centres the disc ────────────────────────── */
test('wave26 D: save-icon current row is centred', () => {
  const rule = DS1.match(/\.save-profile-icon-current \{[^}]*\}/);
  assert.ok(rule && rule[0].includes('justify-content: center'), 'justify-content: center');
});

/* ── E/F: modal sheets share the ONE canonical band ────────────────────
   Wave 33 supersedes the wave-26 intent. The per-shell full-bleed variants
   (negative margins + `11px 11px 0 0` / `17px 17px 0 0` top-only rounding)
   are what made these headers read as a different component from the
   reference panels (sac / marché / pokédex), which wear a band rounded on
   all four corners with a gap under it. The rules still exist — they now
   normalise every sheet ONTO the shared tokens instead of away from them. */
test('wave26/33 E/F: every sheet header resolves to the canonical band', () => {
  for (const needle of [
    '#battle-summary-inner > .pw-view > .modal-title:first-child',
    '.afk-result-card > .modal-title:first-child',
    '#poke-modal-inner.management-inner > .pw-view > .modal-title.management-title:first-child',
  ]) assert.ok(DS1.includes(needle), `band rule: ${needle}`);

  // The retired shapes must not come back on a HEADER. (`11px 11px 0 0` is
  // still legitimate elsewhere — .poke-card-top caps a 12px card.)
  for (const gone of [
    'margin: -20px -20px 16px !important',
    'margin: -16px -16px 12px !important',
    'margin: -20px -22px 12px !important',
    'border-radius: 17px 17px 0 0',
  ]) assert.ok(!DS1.includes(gone), `retired full-bleed shape must be gone: ${gone}`);
  const headerRules = DS1.match(/^[^{}]*\.modal-title[^{}]*\{[^}]*\}/gm) || [];
  for (const rule of headerRules) {
    assert.ok(!/border-radius:\s*\d+px \d+px 0 0/.test(rule),
      `no header may square its bottom corners: ${rule.split('\n')[0]}`);
  }

  // …and they must be replaced by the shared tokens.
  assert.ok(DS1.includes('margin: 0 0 var(--pw-header-gap) 0 !important'),
    'sheets keep the canonical gap under the band');
  assert.ok(DS1.includes('border-radius: var(--pw-header-radius)'),
    'sheets keep the canonical radius on all four corners');
});

/* ── G: NPC editor — middle scroller + pinned footer ───────────────────── */
test('wave26 G: BaseNpcEditorView wraps the form body in its own scroller', () => {
  assert.ok(BV.includes("h('div', { class: 'pw-base-npced-scroll' }"), 'scroller node in the view');
  assert.ok(BV.indexOf('pw-base-npced-scroll') < BV.indexOf('pw-base-npced-actions'),
    'footer is serialized AFTER the scroller');
  assert.ok(DS1.includes('.pw-base-npced-scroll {'), 'scroller CSS present');
  // Wave 30 (user feedback, documented movement #2): the wave-28 "whole
  // sheet scrolls" compromise let content show ABOVE the title and UNDER
  // the transparent actions. The ONE window template replaced it: frame
  // hidden, .pw-panel-body the only scroller, opaque .pw-panel-foot pinned
  // at the bottom OUT of the scroll flow.
  assert.ok(/overflow-y: hidden !important;[^}]*padding: 0 !important;/.test(DS1.slice(DS1.indexOf('DS2830'))),
    'wave 30: the modal frame is sealed while the panel is open');
  assert.ok(/\.pw-panel-body \{[^}]*flex:\s*1 1 auto[^}]*overflow-y: auto/.test(DS1),
    'wave 30: the panel body is the only scroller');
  assert.ok(/\.pw-panel-foot \{[^}]*position: static !important[^}]*background: var\(--pw-bg-header\) !important/.test(DS1),
    'wave 30: opaque footer pinned out of the scroll flow');
});

/* ── H: the battle move buttons host exists again ──────────────────────── */
test('wave26 H: #move-buttons exists in index.html and the bar CSS/render targets it', () => {
  // Wave 28 (user feedback, documented movement): the extra move-buttons
  // bar under the team row is REMOVED — the charge bars live directly on
  // the attack chips of the active card (as they always did). This wave-26
  // addition is now locked ABSENT; renderMoveButtons() keeps its
  // missing-host guard and the .am-bar CSS stays for other consumers.
  assert.ok(!IDX.includes('<div id="move-buttons"></div>'), 'wave 28: host div removed');
  assert.ok(IDX.includes('id="battle-team-row"'), 'team row kept');
  assert.ok(BUI.includes("document.getElementById('move-buttons')")
    && BUI.includes('if (!container) return;'), 'renderMoveButtons guards the missing host');
  assert.ok(DS1.includes('#move-buttons {') && DS1.includes('.am-bar-fill'), 'grid + charge fill styles present');
});

/* ── I: top/moves plaques hug the 12px card (1px border → 11px inner) ─── */
test('wave26 I: poke-card plaques share the card rounding', () => {
  assert.ok(DS1.includes('border-radius: 11px 11px 0 0; /* wave 26'), 'top plaque rounded');
  assert.ok(DS1.includes('border-radius: 0 0 11px 11px; /* wave 26'), 'moves plaque rounded');
});

/* ── J: management content gets the canonical 14px padding ─────────────── */
test('wave26 J: .management-content padding is the canonical 14px', () => {
  const rule = DS1.match(/\.management-content \{[^}]*\}/);
  assert.ok(rule && rule[0].includes('padding: 14px'), '14px, like #usm-grid');
  assert.ok(!rule[0].includes('padding-right: 4px'), 'edge-glued grids gone');
});

