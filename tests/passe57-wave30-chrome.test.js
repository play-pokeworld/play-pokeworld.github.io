// passe57 — textual locks for the wave-30 user-reported fixes.
// (DOM-free: reads the sources and asserts the fix is in the shipped code.
//  Measured Chromium proof lives in harness/visual-wave30.mjs.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const R = (rel) => readFileSync(path.join(new URL('..', import.meta.url).pathname, rel), 'utf8');

const css = R('src/assets/styles/design-system.css');
const chromeJs = R('src/ui/components/window-chrome.js');
const mainJs = R('src/main.js');
const versionJs = R('src/version.js');
const settingsJs = R('src/application/save/settings.js');
const itemsJs = R('src/data/items-helpers.js');
const pokeModalJs = R('src/ui/game/poke-modal.js');
const fsPanelJs = R('src/ui/game/fullscreen-panel.js');
const baseDialogJs = R('src/ui/game/base/base-dialog.js');
const baseNpcJs = R('src/ui/game/base/base-npc-editor.js');
const presetMgrJs = R('src/ui/game/preset-manager.js');

// §30 stylesheet block
test('wave30 DS2830 block exists in the stylesheet', () => {
  assert.match(css, /DS2830 — WAVE 30/);
});

// 1) ONE shared window chrome module
test('wave30 #1: pwApplyWindowChrome module exists, exported, self-registered', () => {
  assert.match(chromeJs, /export function pwApplyWindowChrome\(inner\)/);
  assert.match(chromeJs, /window\.pwApplyWindowChrome = pwApplyWindowChrome/);
  assert.match(chromeJs, /pw-panel-shell/);
  assert.match(chromeJs, /pw-panel-body/);
  assert.match(chromeJs, /pw-panel-foot/);
});

// 2) close control normalized to a real <button> (the bare span rendered a
//    different, unframed ✕ than settings/quest)
test('wave30 #1: the chrome turns span.modal-close into <button class="modal-close">', () => {
  assert.match(chromeJs, /document\.createElement\('button'\)/);
  assert.match(chromeJs, /oldBtn\.replaceWith\(btn\)/);
  assert.match(chromeJs, /modal-close/);
});

// 3) every opener of the reported families calls the chrome AFTER setting html
test('wave30 #1: all 8 chrome call sites wired', () => {
  for (const [src, name] of [
    [itemsJs, 'openItemInfo'], [pokeModalJs, 'openMoveInfo'], [fsPanelJs, 'openAbilityInfo'],
    [baseDialogJs, '_bdOpen'], [baseNpcJs, 'renderBaseNpcEditor'],
  ]) assert.match(src, /window\.pwApplyWindowChrome\(inner\)/, `chrome call missing in ${name}`);
  const n = (presetMgrJs.match(/pwApplyWindowChrome\(inner\)/g) || []).length;
  assert.ok(n >= 3, `preset editor should chrome its 3 sheets (editor/poke-picker/item-picker) — found ${n}`);
});

// 4) the frame gate locks the modal inner while a chromed panel is open
test('wave30 CSS: frame rule (2-ID gate, hidden overflow, zero padding)', () => {
  assert.match(css, /#poke-modal\.pw-info-modal #poke-modal-inner:has\(\.pw-panel-shell\)/);
  assert.match(css, /#poke-modal\.preset-editor-modal #poke-modal-inner:has\(\.pw-panel-shell\)/);
  const i = css.indexOf('#poke-modal.pw-info-modal #poke-modal-inner:has(.pw-panel-shell)');
  const block = css.slice(i, i + 400);
  assert.match(block, /overflow-y: hidden !important;/);
  assert.match(block, /padding: 0 !important;/);
});

// 5) template geometry: shell column / body the only scroller / opaque foot
test('wave30 CSS: shell + body + foot template rules', () => {
  assert.match(css, /\.pw-panel-shell \{[\s\S]*?display: flex;[\s\S]*?height: 100%;/);
  assert.match(css, /\.pw-panel-body \{[\s\S]*?flex: 1 1 auto;[\s\S]*?overflow-y: auto;/);
  const i = css.indexOf('.pw-panel-foot {');
  const foot = css.slice(i, i + 400);
  assert.match(foot, /background: var\(--pw-bg-header\) !important;/);
  assert.match(foot, /border-top: 1px solid var\(--pw-border-color\);/);
  assert.match(foot, /position: static !important;/);
});

// 6) wave-26 ghost bands excluded for chromed panels
test('wave30 CSS: negative-margin ghost bands skip .pw-panel-shell', () => {
  const hits = css.match(/:not\(\.pw-panel-shell\) > \.modal-title:first-child/g) || [];
  assert.ok(hits.length >= 3, `ghost-band exclusions missing (found ${hits.length})`);
});

// 7) the retired whole-sheet-scroll architecture is really gone
test('wave30 CSS: whole-sheet-scroll !important rules retired', () => {
  assert.ok(!/flex: 0 0 auto !important;\s*\n\s*min-height: 0 !important;\s*\n\s*overflow: visible !important;/.test(css),
    'the wave-28 body overflow:visible !important block must be gone');
  assert.match(css, /SUPERSEDED by DS2830/);
});

// 8) NPC editor team: natural 2-column grid (the 58vh cap squeezed cards to 88px)
test('wave30 CSS: NPC editor team is a 2-col grid with no nested scroller', () => {
  assert.match(css, /\.pw-base-npced #base-npced-team \{[\s\S]*?display: grid !important;/);
  assert.match(css, /grid-template-columns: repeat\(auto-fill, minmax\(min\(300px, 100%\), 1fr\)\) !important;/);
  assert.match(css, /\.pw-base-npced #base-npced-team \{[\s\S]*?max-height: none !important;/);
});

// 9) build stamp — the stale-local-copy trap killer
test('wave30 #3: build stamp shipped (version.js + window.PW_BUILD + settings line)', () => {
  // documented supersede (wave 31): PW_BUILD is bumped at EVERY delivery —
  // the lock now asserts the stamp mechanism itself, not a frozen tag.
  assert.match(versionJs, /export const PW_BUILD = 'w\d+ · \d{4}-\d{2}-\d{2}/);
  assert.match(versionJs, /window\.PW_BUILD = PW_BUILD/);
  assert.match(mainJs, /import "\.\/version\.js";/);
  assert.match(mainJs, /import "\.\/ui\/components\/window-chrome\.js";/);
  assert.match(settingsJs, /pw-build-stamp/);
  assert.match(settingsJs, /window\.PW_BUILD/);
});

// 10) mobile filing fixes from wave 29 are still in place (the AGAIN point)
test('wave30 #3 kept: mobile gates (coarse pointer MQ + scroll reset) intact', () => {
  assert.match(css, /@media \(max-width: 850px\), \(pointer: coarse\)/);
  const bridge = [R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n');
  assert.match(bridge, /function pwScrollTopForMobileView\(\)/);
  assert.match(bridge, /matchMedia\('\(max-width: 850px\), \(pointer: coarse\)'\)/);
});

