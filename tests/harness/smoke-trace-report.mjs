// smoke-trace-report.mjs — ANTIFRAGILE measurement wave (v36), act III.
//
// Live proof of the PokeTrace beacons: boots the REAL built app in Chromium,
// starts a fresh save through the shipped flow, runs a handful of measured
// UI actions, then dumps window.PokeTrace.report() to
// reports/trace-live.json and asserts the expected kinds were observed.
//
// MANUAL RUN (requires the built app served over HTTP + a real Chromium):
//   npx vite build && npx vite preview --host 0.0.0.0 --port 4173 &
//   node tests/harness/smoke-trace-report.mjs          (PWK_BLOCK_MEDIA=1 on
//   degraded sandboxes — see tests/harness/README.md)
//
// The smoke only MEASURES: it never repairs, never migrates, never fixes.

import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const REPORTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'reports');
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// Degraded-sandbox escape hatch (opt-in) — identical to smoke-boot: aborts
// media requests, never touches HTTP integrity.
if (process.env.PWK_BLOCK_MEDIA === '1') await page.route(/\.(png|jpe?g|webp|gif|mp3|ogg|wav|mp4|woff2?)$/, (route) => route.abort());
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('console', (msg) => {
  if (process.env.PWK_BLOCK_MEDIA === '1' && /Failed to load resource: net::ERR_FAILED/.test(msg.text())) return;
  if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
});

// ── A — boot: service present, boot beacons fire through the real flow ────
await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.PokeTrace, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal.open, #starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => {
  const btn = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button');
  if (btn) btn.click();
});
await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });

const boot = await page.evaluate(() => window.PokeTrace.report());
assert.equal(boot.service, 'PokeTrace', 'A1 — trace service identity');
assert.equal(boot.enabled, true, 'A2 — trace enabled by default');
for (const n of ['boot|stream:start', 'boot|screens:ready', 'boot|stream:done']) {
  assert.ok(boot.summary.names[n] && boot.summary.names[n].n >= 1, `A3 — boot beacon observed: ${n}`);
}
assert.ok(boot.summary.names['boot|stream:done'].firstAt >= boot.summary.names['boot|stream:start'].firstAt,
  'A4 — stream completes after it starts (timestamps coherent)');

// ── B — measured UI actions: dispatcher → registry, renders, save ─────────
await page.evaluate(() => {
  window.callGlobal('showTab', 'map');
  window.callGlobal('showTab', 'inventory');
  window.callGlobal('showTab', 'team');
});
await page.waitForTimeout(400);
await page.evaluate(() => { window.callGlobal('saveGame', true); window.callGlobal('baseWindowRender'); });
await page.waitForTimeout(600);

// ── C — dump + assertions on the full report ──────────────────────────────
const report = await page.evaluate(() => window.PokeTrace.report());
fs.mkdirSync(REPORTS, { recursive: true });
fs.writeFileSync(path.join(REPORTS, 'trace-live.json'), JSON.stringify(report, null, 2) + '\n');

const { kinds, names } = report.summary;
assert.ok(kinds.action && kinds.action.n >= 5, `C1 — action beacon counted every callGlobal (measured ${kinds.action && kinds.action.n})`);
assert.ok(names['action|showTab'] && names['action|showTab'].n === 3, `C2 — showTab dispatched 3 times (measured ${names['action|showTab'] && names['action|showTab'].n})`);
// Exposure split (the wave's point, not a fix): some actions are already
// engine-registry entries (base actions, wave T2-B), the rest still ride
// the classic window fallback. Measure the split, assert the registry
// channel exists and that nothing we called is actually missing.
const viaCount = {};
for (const e of report.tail) if (e.kind === 'action') viaCount[e.via || 'none'] = (viaCount[e.via || 'none'] || 0) + 1;
assert.ok((viaCount.registry || 0) >= 1, `C3 — engine registry serves part of the dispatch (via split: ${JSON.stringify(viaCount)})`);
assert.ok(!viaCount.missing, `C3b — none of our calls hit the missing-handler path (via split: ${JSON.stringify(viaCount)})`);
assert.ok(names['state|save:write'] && names['state|save:write'].n >= 1, 'C4 — save:write observed');
const lastSave = [...report.tail].reverse().find((e) => e.kind === 'state' && e.name === 'save:write');
assert.equal(lastSave && lastSave.via, 'manual', 'C5 — save origin recorded (manual)');
assert.ok(kinds.render && kinds.render.n >= 1, 'C6 — render beacon counted at least once');
assert.ok(names['render|ui:base-window'] && names['render|ui:base-window'].n >= 1, 'C7 — base window render observed');
assert.ok(kinds.boot.gapMs === undefined, 'C8 — boot is not an interval kind (pure counter)');
if (kinds.render.gapMs) {
  assert.ok(kinds.render.gapMs.max >= kinds.render.gapMs.min, 'C9 — render interval stats coherent');
}
assert.ok(report.summary.ringFill > 0 && report.tail.length > 0, 'C10 — event ring populated');
assert.deepEqual(errors, [], 'C11 — no page errors during the whole flow');

await browser.close();
console.log(`smoke-trace-report: OK — ${report.summary.total} events, kinds=[${Object.keys(kinds).join(',')}], action via=${JSON.stringify(viaCount)}, dump → reports/trace-live.json`);
