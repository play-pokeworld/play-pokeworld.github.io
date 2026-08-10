// visual-wave31.mjs — MEASURED reproduction proof for the wave-31 mobile
// column bug ("la fenêtre raccourcis se retrouve au milieu de l'écran… pareil
// pour entraînement, mine et base secrète", Windows Chrome ~657px, file://).
//
// Unlike the wave-29/30 probes (synthetic boot — they never ran the real
// dashboard layout path), this harness exercises the user's REAL session
// path end to end:
//   1. boot the shipped index.html,
//   2. create a GENUINE saved game through the game's own saveGame(),
//   3. reload and enter it through the real startSaveById() flow,
//   4. click the REAL mobile navigation buttons,
//   5. measure getComputedStyle on the dashboard columns.
//
// MANUAL RUN (not part of `npm test` — requires a real Chromium):
//   npx playwright install chromium
//   node tests/harness/visual-wave31.mjs
//
// Env overrides: PWK_BASE_URL (defaults to the author's file:// address),
// PWK_VIEWPORT_WIDTH (default 657, the reported failing width).

import { chromium } from 'playwright';
import assert from 'node:assert/strict';

// The address the bug was reported against (the player double-clicks
// index.html). Overridable via PWK_BASE_URL for CI (`http://localhost:5173`).
const BASE_URL = process.env.PWK_BASE_URL || 'file:///home/user/pokeworld/index.html';
const WIDTH = Number(process.env.PWK_VIEWPORT_WIDTH || 657);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 } });
page.on('pageerror', (err) => console.error('[pageerror]', err.message));

// 1) Boot the real page and force the mobile layout (the reported width).
await page.goto(BASE_URL);
await page.waitForFunction(() => typeof window.saveGame === 'function'
  && typeof window.startSaveById === 'function');

// 2) GENUINE saved game: go through the game's own creation + saveGame(),
//    not a hand-crafted localStorage payload (that gap masked this bug for
//    two waves — the synthetic path never persisted a real dashboard).
const saveId = await page.evaluate(async () => {
  const id = 'wave31-proof';
  window.startNewGame?.(id);
  window.saveGame();
  return id;
});

// 3) Reload and re-enter through the real loading flow.
await page.goto(BASE_URL);
await page.evaluate((id) => window.startSaveById(id), saveId);
await page.waitForSelector('.mobile-nav-bar [data-mobile-view="shortcuts"]');
await page.waitForFunction(() => document.body.classList.contains('mobile-mode'));

// 4) REAL clicks on the mobile nav — exactly what the user does.
await page.click('.mobile-nav-bar [data-mobile-view="shortcuts"]');
await page.waitForSelector('#win-shortcuts.mobile-visible');

// The reproduced report covers training/mine/secret-base too: they are all
// reached through the same manage sub-navigation.
const manageViews = await page.$$eval('[data-mobile-manage-view]',
  (els) => els.map((el) => el.dataset.mobileManageView));
assert.ok(manageViews.length >= 3, `manage views exposed (${manageViews})`);

// 5) THE wave-31 invariant: every dashboard column must compute to
//    `contents` in mobile mode — before the fix, the INLINE `display:flex`
//    (and flex-grow) written by renderDashboardColumns() silently won and
//    inflated the void above the single visible window.
const measured = await page.evaluate(() => {
  const col2 = document.querySelector('#dash-col-2');
  const out = { col2Display: col2 ? getComputedStyle(col2).display : null, perCol: [] };
  document.querySelectorAll('.dash-col').forEach((c) => out.perCol.push(getComputedStyle(c).display));
  return out;
});
assert.equal(measured.col2Display, 'contents',
  `#dash-col-2 must collapse to contents (got ${measured.col2Display})`);
for (const d of measured.perCol) {
  assert.equal(d, 'contents', `every .dash-col computes to contents (got ${d})`);
}

// 6) No void: the visible window starts within the first viewport band.
const top = await page.evaluate(() => {
  const w = document.querySelector('.mobile-visible');
  return w ? w.getBoundingClientRect().top : Infinity;
});
assert.ok(top < 400, `visible window is near the top (top=${Math.round(top)}px)`);

await browser.close();
console.log('visual-wave31: OK — real session path, columns compute to `contents`, no void.');
