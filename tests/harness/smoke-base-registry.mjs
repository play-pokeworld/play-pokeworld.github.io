// smoke-base-registry.mjs — end-to-end proof of the wave-34 T2-B migration:
// the base-scope entry points no longer live on window, they are ENGINE
// actions resolved by the dispatcher through PokeActions (Unity-style
// command table).
//
// MANUAL RUN (requires the built app served over HTTP + a real Chromium):
//   npx vite build && npx vite preview --host 0.0.0.0 --port 4173 &
//   node tests/harness/smoke-base-registry.mjs          (PWK_BLOCK_MEDIA=1 on
//   degraded sandboxes — see tests/harness/README.md)
//
// Verifies, against the REAL served build:
//   A. boot with zero page errors, then the deferred screen-base chunk
//      streams in and REGISTERS its actions (PokeActions.size measured);
//   B. window no longer carries the base functions (legacy surface removed);
//   C. the dispatcher resolves base actions through the registry — calling
//      callGlobal('baseWindowRender') / a data-call name produces NO
//      "Missing global action handler" warning, while an unknown name still
//      warns through the intact fallback path.

import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const errors = [];
const missingHandlerWarns = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// Degraded-sandbox escape hatch (opt-in) — identical to smoke-boot: aborts
// media requests, never touches HTTP integrity (no responses => no 404/500
// filtering side effects).
if (process.env.PWK_BLOCK_MEDIA === '1') await page.route(/\.(png|jpe?g|webp|gif|mp3|ogg|wav|mp4|woff2?)$/, (route) => route.abort());
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('console', (msg) => {
  if (process.env.PWK_BLOCK_MEDIA === '1' && /Failed to load resource: net::ERR_FAILED/.test(msg.text())) return;
  if (msg.text().includes('Missing global action handler')) { missingHandlerWarns.push(msg.text()); return; }
  if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
});

// ── A — boot + deferred registration ───────────────────────────────────────
await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
// New game through the shipped flow (same as smoke-boot section B).
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal.open, #starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => {
  const btn = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button');
  if (btn) btn.click();
});
await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
// Deferred screens stream right after the first paint.
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForFunction(() => window.PokeActions && window.PokeActions.get('baseDialogNpc'), null, { timeout: 15000 });
const reg = await page.evaluate(() => ({
  size: window.PokeActions.size(),
  render: typeof window.PokeActions.get('baseWindowRender'),
  dialog: typeof window.PokeActions.get('baseDialogNpc'),
  pick: typeof window.PokeActions.get('baseNpcEditorPick'),
  sprite: typeof window.PokeActions.get('base2dDrawSprite'),
  place: typeof window.PokeActions.get('basePlace'),
}));
assert.equal(reg.render, 'function', 'A1 — baseWindowRender registered in the engine action table');
assert.equal(reg.dialog, 'function', 'A2 — baseDialogNpc registered');
assert.equal(reg.pick, 'function', 'A3 — baseNpcEditorPick registered');
assert.equal(reg.sprite, 'function', 'A4 — base2dDrawSprite registered');
assert.equal(reg.place, 'function', 'A5 — basePlace registered');
assert.ok(reg.size >= 150, `A6 — registry holds the migrated base actions (measured size = ${reg.size})`);
console.log('registry:', JSON.stringify(reg));

// ── B — the legacy window surface is gone for migrated functions ───────────
const leftovers = await page.evaluate(() => ['baseWindowRender', 'baseDialogNpc', 'baseNpcEditorPick', 'base2dDrawSprite', 'basePlace', 'baseWindowSelectSlug']
  .filter((n) => typeof window[n] === 'function'));
assert.deepEqual(leftovers, [], `B1 — no migrated base function remains on window (left: ${leftovers.join(',')})`);
// Data constants are NOT actions: they stay shared (documented exception).
assert.equal(await page.evaluate(() => typeof window.BASE_NPC_MAX), 'number', 'B2 — documented exception: data constants stay shared');

// ── C — dispatch through the registry, fallback intact ─────────────────────
missingHandlerWarns.length = 0;
await page.evaluate(() => { window.callGlobal('baseWindowRender'); window.callGlobal('baseDialogNpc', {}); });
await page.waitForTimeout(600);
assert.deepEqual(missingHandlerWarns, [], 'C1 — registry dispatch: zero "Missing global action handler" warning');
await page.evaluate(() => window.callGlobal('__definitely_unknown_action__'));
await page.waitForTimeout(200);
assert.equal(missingHandlerWarns.length, 1, 'C2 — fallback path intact: unknown names still warn exactly once');
assert.deepEqual(errors, [], 'C3 — no page errors during the whole flow');

await browser.close();
console.log(`smoke-base-registry: OK — ${reg.size} engine actions, zero legacy window base fn, fallback intact, no errors.`);
