// passe56 — textual locks for the wave-29 user-reported fixes.
// (DOM-free, same pattern as the other passes: read the sources, assert the
//  fix is present in the shipped code. Measured Chromium proof lives in
//  harness/visual-wave29.mjs + harness/measure-wave29.mjs — 14 assertions.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const R = (rel) => readFileSync(path.join(new URL('..', import.meta.url).pathname, rel), 'utf8');

const css = R('src/assets/styles/design-system.css');
const bridge = [R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n');
const pokeModalJs = R('src/ui/game/poke-modal.js');
const baseNpcJs = R('src/ui/game/base/base-npc-editor.js');
const baseDialogJs = R('src/ui/game/base/base-dialog.js');
const presetMgrJs = R('src/ui/game/preset-manager.js');

// §29 block present
test('wave29 DS block exists at the end of the stylesheet', () => {
  assert.match(css, /DS2829 — WAVE 29/);
});

// 1) NPC editor header: sticky canonical pill + natural-height chain
// WAVE 30 (documented supersede): the sticky pill + natural-height chain
// delivered here were REPLACED by the ONE window template (DS2830 + the
// pwApplyWindowChrome re-rooter) after the user reported the pill still
// read as "different from the other menus" and let content show above the
// title / under the footer. The wave-29 block keeps its honest retirement
// note; the pill rules themselves are gone — these two locks now assert
// THE RETIREMENT, not the pill.
test('wave29 #1→wave30: the sticky pill is RETIRED, retirement noted in DS2829', () => {
  const i = css.indexOf('DS2829 — WAVE 29');
  const block = css.slice(i);
  assert.match(block, /SUPERSEDED BY DS2830/);
  assert.ok(!/#poke-modal\.pw-info-modal #poke-modal-inner > \.pw-view > \.modal-title:first-child,\s*\n#poke-modal\.preset-editor-modal[^}]*position: sticky/.test(block),
    'the wave-29 sticky pill selectors must be gone');
});
test('wave29 #1→wave30: natural-height chain retired with it (DS2830 owns the frame)', () => {
  const i = css.indexOf('DS2829 — WAVE 29');
  const block = css.slice(i);
  assert.ok(!/overflow-y: auto !important;\s*\/\* wave 26 pinned it; wave 28 scrolls the whole page \*\//.test(css),
    'the whole-sheet-scroll override must be retired');
  assert.match(css, /DS2830 — WAVE 30/);
});

// 2) stale management-shell class is cleared by every editor opener
test('wave29 editor shell: no stale management-inner padding leaks into editors', () => {
  assert.ok(baseNpcJs.includes("classList.remove('management-inner')"), 'npc editor clears the stale management class');
  assert.ok(baseDialogJs.includes("classList.remove('management-inner')"), 'pc dialog clears the stale management class');
  assert.ok(presetMgrJs.includes("classList.remove('management-inner')"), 'preset editor clears the stale management class');
  assert.ok(bridge.includes("classList.remove('management-inner')"), 'pwModalInfo clears it for every info sheet');
});

// 3) battle: inactive cards keep their bottom rounding
test('wave29 #3: .poke-card-top rounds the bottom ONLY when no moves follow', () => {
  assert.match(css, /\.poke-card > \.poke-card-top:not\(:has\(~ \.poke-moves\)\) \{\s*border-radius: 11px;/);
});

// 4a) mobile chrome follows the SAME gate as applyMobileView
test('wave29 #4: the main mobile media query matches the JS mobile gate', () => {
  // applyMobileView gates on (max-width: 850px) OR (pointer: coarse) — the
  // CSS chrome must cover the SAME set (tablets were the reported victim).
  assert.match(bridge, /matchMedia\('\(max-width: 850px\), \(pointer: coarse\)'\)/);
  assert.match(css, /@media \(max-width: 850px\), \(pointer: coarse\) \{\s*\n?\s*body\.mobile-mode \{/);
});

// 4b) switching the mobile view lands at the top
test('wave29 #4: setMobileView / setMobileManageView scroll back to the top', () => {
  assert.match(bridge, /function pwScrollTopForMobileView\(\) \{[\s\S]*?window\.scrollTo\(0, 0\);[\s\S]*?\}/);
  assert.match(bridge, /setMobileView\(view\) \{[^}]*pwScrollTopForMobileView\(\);/);
  assert.match(bridge, /setMobileManageView\(view\) \{[^}]*pwScrollTopForMobileView\(\);/);
});

// REGRESSION (found by the wave-29 recon): move-info crash on badge effects
test('wave29 regression: effContent is DECLARED (ES-module strict crash gone)', () => {
  const i = pokeModalJs.indexOf("getBadgeHtml === 'function' ? getBadgeHtml(e) : null");
  assert.ok(i > 0);
  assert.ok(pokeModalJs.indexOf('let effContent;') > 0, 'effContent must be declared');
  assert.ok(!/var badge =[\s\S]{0,120}\beffContent = badge;[\s\S]{0,80}var effContentVar = typeof effContent/.test(pokeModalJs),
    'the old undeclared-assignment + typeof-guard pattern must be gone');
});
