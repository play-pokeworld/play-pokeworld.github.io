// smoke-roam-offline.mjs — V7 · ROAM-01 (D24) in a REAL browser.
//
// MANUAL RUN (built app served over HTTP + Chromium):
//   npm run build && npx vite preview --host 0.0.0.0 --port 4173 &
//   node tests/harness/smoke-roam-offline.mjs
//
// A roaming legendary shows up DURING the offline catch-up, the strong team
// beats it, the return recap shows the « Errants croisés » row and the note.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal.open, #starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => {
  const btn = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button');
  if (btn) btn.click();
});
await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
assert.deepEqual(errors, [], '0 — clean boot');

const r = await page.evaluate(async () => {
  const G = window.G;
  G.location = 'route1';
  G.team = [window.createPoke(6, 100, false), window.createPoke(9, 100, false)];
  G.team.forEach((p) => { p.currentHP = p.maxHP; });
  G.wildSessionActive = true; // the player was exploring when the tab closed
  window.getRoamingLegendaryForRoute = () => 144; // Articuno on route1 whatever the clock
  const real = Math.random; let n = 0;
  Math.random = () => (++n <= 3 ? 0.005 : real()); // first free spawn = the roamer
  const result = await window.offlineSimulate(300000, 'return'); // 5 min away
  Math.random = real;
  const modal = document.querySelector('.afk-result-grid') ? document.querySelector('.afk-result-grid').closest('.modal, [id]') : null;
  const text = document.body.innerText || '';
  return {
    roamers: result.roamers, roamer: result.roamer, wins: result.wins, lost: result.lost,
    seen: !!(G.pokedex[144] && G.pokedex[144].seen),
    rowShown: /Errants croisés/.test(text), noteShown: /apparus? pendant votre absence/.test(text),
    modalId: modal && modal.id,
  };
});
assert.ok(r.roamers >= 1, `1 — roamer met offline (got ${r.roamers})`);
assert.equal(r.roamer && r.roamer.id, 144, '2 — Articuno named');
assert.equal(r.seen, true, '3 — dex: seen');
assert.equal(r.lost, false, '4 — Lv. 100 duo survives');
assert.ok(r.wins >= 1, `5 — catch-up continued (${r.wins} wins)`);
assert.equal(r.rowShown, true, '6 — recap row « Errants croisés »');
assert.equal(r.noteShown, true, '7 — recap note');
await page.screenshot({ path: 'docs/captures/roam-01-recap-errant-hors-ligne.png' });
assert.deepEqual(errors, [], '8 — no page errors');
await browser.close();
console.log(`smoke-roam-offline: OK — ${r.roamers} roamer(s) met in 5 min offline, ${r.wins} wins, recap row + note shown.`);
