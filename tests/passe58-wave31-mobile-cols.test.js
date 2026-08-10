// passe58 — textual locks for the wave-31 user-reported fix.
// (DOM-free: reads the sources and asserts the fix is in the shipped code.
//  Measured Chromium proof lives in tests/harness/visual-wave31.mjs — now
//  INSIDE the repo — which uses the REAL session path: genuine save →
//  startSaveById → real nav clicks. Run it manually with npx playwright.)
//
// Bug ("la fenêtre raccourcis se retrouve au milieu de l'écran… pareil pour
// entraînement, mine et base secrète", 4th+ report, Windows Chrome ~657px,
// file://): renderDashboardColumns() persists the desktop layout by writing
// an INLINE `display: flex` (+ `flex: 1|2`) on every non-empty .dash-col.
// The mobile rule `body.mobile-mode .dash-col { display: contents }` lost
// against that inline style, so empty columns kept generating flex boxes and
// GREW (the dashboard keeps flex:1 in the body flow) into several hundred
// pixels of void above the single visible window. Wave-29/30 probes missed
// it because they never ran the real boot path (no renderDashboardColumns).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const R = (rel) => readFileSync(path.join(new URL('..', import.meta.url).pathname, rel), 'utf8');
// The measured harness ships INSIDE the repo (tests/harness/) so the suite
// is self-contained on a clean checkout. It requires a real Chromium and is
// therefore excluded from `npm test` by naming (not a *.test.js file).
const RH = (rel) => readFileSync(path.join(new URL('./harness', import.meta.url).pathname, rel), 'utf8');

const css = R('src/assets/styles/design-system.css');
const dashboardJs = R('src/ui/game/dashboard.js');
const bridgeJs = [R('src/engine/input/action-dispatcher.js'), R('src/engine/runtime/classic-bridge.js')].join('\n');
const versionJs = R('src/version.js');
const visualW31 = RH('visual-wave31.mjs');

// 1) THE fix: the contents hammer must be !important or the inline
//    `display:flex` written by the layout restore silently wins again.
test('wave31 #1: mobile-mode .dash-col collapses with !important', () => {
  const block = css.match(/body\.mobile-mode \.dash-col \{[\s\S]*?\}/);
  assert.ok(block, 'body.mobile-mode .dash-col rule exists');
  assert.match(block[0], /display:\s*contents !important/);
});

// 2) The root cause is documented next to the rule (so no one "cleans up"
//    the !important and resurrects the bug a 5th time).
test('wave31 #2: the rule documents the inline-style conflict', () => {
  assert.match(css, /renderDashboardColumns\(\)[\s\S]{0,400}INLINE `display: flex`/);
});

// 3) Desktop layout restore is UNTOUCHED — renderDashboardColumns still
//    writes inline display/flex on columns (only mobile overrides it now).
test('wave31 #3: dashboard.js still writes the inline desktop layout', () => {
  assert.match(dashboardJs, /colEl\.style\.display = 'flex'/);
  assert.match(dashboardJs, /colEl\.style\.flex = '2'/);
});

// 4) applyMobileView semantics UNTOUCHED — it still owns per-window
//    mobile visibility (visible list + mobile-visible class + sub-nav).
test('wave31 #4: applyMobileView still owns window visibility', () => {
  assert.match(bridgeJs, /if \(view === 'shortcuts'\) visible = \['win-shortcuts'\]/);
  assert.match(bridgeJs, /win\.classList\.toggle\('mobile-visible', show\)/);
  assert.match(bridgeJs, /win\.style\.display = show \? 'flex' : 'none'/);
});

// 5) COVERAGE-GAP lock: the measured proof must exercise the user's REAL
//    session path (file:// bundle fallback, a genuine saved game loaded via
//    startSaveById, REAL clicks) — not the synthetic boot that masked this
//    bug for two waves.
test('wave31 #5: visual-wave31 reproduces the real session path', () => {
  assert.match(visualW31, /file:\/\/\/home\/user\/pokeworld\/index\.html/);
  assert.match(visualW31, /startSaveById/);
  assert.match(visualW31, /saveGame/);
  assert.match(visualW31, /page\.click\('\.mobile-nav-bar \[data-mobile-view="shortcuts"\]'\)/);
  assert.match(visualW31, /data-mobile-manage-view/);
});

// 6) The computed-collapse assertion itself is locked in the harness.
test('wave31 #6: harness asserts the columns compute to contents', () => {
  assert.match(visualW31, /getComputedStyle\(col(2|-2)\)\.display/);
  assert.match(visualW31, /'contents'/);
});

// 7) Build stamp bumped (the settings stamp is how the user proves which
//    copy they are really running — see MIGRATION_STATUS wave 30/31).
test('wave31 #7: PW_BUILD is bumped to w31', () => {
  assert.match(versionJs, /export const PW_BUILD = 'w31 · /);
});
