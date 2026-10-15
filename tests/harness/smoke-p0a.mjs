// smoke-p0a.mjs — V7 · P0a end-to-end verification in a REAL browser.
//
// MANUAL RUN (requires the built app served over HTTP + Chromium):
//   npm run build && npx vite preview --host 0.0.0.0 --port 4173 &
//   node tests/harness/smoke-p0a.mjs
//
// Verifies, against the REAL served build:
//   A. BUG-01 — a legendary encounter starts in the live game (quest #31
//      Poké Flute → Snorlax through claimQuest, then a direct Articuno call);
//   B. OBS-01 — the hooks are installed, a deliberate action error lands in
//      G.diag.errors, the Settings modal shows the Diagnostic section;
//   C. FAE-01 — the live window.typeEff is the domain chart (Dragon → Fairy = 0,
//      Ice → Fire = 0.5, Ghost → Fighting = 1);
//   D. zero page error / zero failed HTTP resource across the whole run.

import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const errors = [];
const httpFailures = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });
page.on('response', (res) => { if (res.status() >= 400 && !/favicon/.test(res.url())) httpFailures.push(`${res.status()} ${res.url()}`); });

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

// ── A — BUG-01: quest #31 reward encounter through the shipped claim flow ──
const claimResult = await page.evaluate(() => {
  window.G.inventory.pokeflute = 1;
  window.ensureQuestState();
  const idx = window.getRegionChain('kanto').findIndex((q) => q.id === 31);
  window.G.mainStep.kanto = idx;
  window.syncActiveMain();
  const active = window.G.activeQuests.some((i) => i.cat === 'main' && Number(i.qid) === 31);
  window.claimQuest(31, 'main');
  const b = window.battle;
  return { active, battleActive: !!(b && b.active), enemyId: b && b.enemyPoke ? b.enemyPoke.id : (b && b.enemy ? b.enemy.id : null), legendaryCatch: !!(b && (b.legendaryQuest || b.questGift)), questRewardQuestId: b && b.questRewardQuestId };
});
assert.equal(claimResult.active, true, 'A1 — quest #31 active');
assert.equal(claimResult.battleActive, true, 'A2 — the reward battle is running (was: ReferenceError enemy is not defined)');
assert.equal(claimResult.enemyId, 143, 'A3 — Snorlax is the opponent');
assert.equal(claimResult.legendaryCatch, true, 'A4 — reward-encounter flag set (V7 · LEG-01: legendaryQuest | questGift)');
assert.equal(claimResult.questRewardQuestId, 31, 'A5 — quest id attached to the battle');
await page.evaluate(() => { try { window.endBattle(); } catch (_) {} });
const direct = await page.evaluate(() => {
  const ok = window.startLegendaryEncounter(144, 65, { shiny: true });
  const b = window.battle;
  const e = b.enemyPoke || b.enemy;
  const r = { ok, id: e && e.id, shiny: !!(e && e.shiny), hp: e && e.maxHP };
  try { window.endBattle(); } catch (_) {}
  return r;
});
assert.equal(direct.ok, true, 'A6 — direct legendary encounter starts');
assert.equal(direct.id, 144, 'A7 — Articuno');
assert.equal(direct.shiny, true, 'A8 — forced shiny applied to the created Pokémon');
assert.deepEqual(errors, [], 'A9 — no page errors during the encounters');

// ── B — OBS-01 ─────────────────────────────────────────────────────────────
const diag = await page.evaluate(async () => {
  const before = (window.G.diag && window.G.diag.errors ? window.G.diag.errors.length : 0);
  window.__pwBoomAction = () => { throw new Error('smoke-p0a deliberate failure'); };
  let thrown = false;
  try { window.callGlobal('__pwBoomAction'); } catch (_) { thrown = true; }
  const after = window.G.diag.errors.length;
  const last = window.G.diag.errors[after - 1];
  window.openSettings();
  const section = document.getElementById('diag-section');
  const btn = document.getElementById('diag-copy-btn');
  const report = window.buildErrorReport();
  window.closeSettings();
  return { before, after, thrown, lastMsg: last && last.msg, lastCtx: last && last.ctx, hasSection: !!section, btnText: btn && btn.textContent, reportHasIt: /deliberate failure/.test(report), hooks: typeof window.pwReportError };
});
assert.equal(diag.hooks, 'function', 'B1 — pwReportError exposed');
assert.equal(diag.thrown, true, 'B2 — behaviour unchanged: the action error still propagates');
assert.equal(diag.after, diag.before + 1, 'B3 — exactly one entry recorded');
assert.equal(diag.lastMsg, 'Error: smoke-p0a deliberate failure', 'B4 — message recorded');
assert.match(diag.lastCtx, /__pwBoomAction/, 'B5 — action name in context');
assert.equal(diag.hasSection, true, 'B6 — Settings → Diagnostic section rendered');
assert.match(diag.btnText || '', /rapport/i, 'B7 — copy button labelled in French');
assert.equal(diag.reportHasIt, true, 'B8 — report text contains the error');
// The deliberate console.error from pwReportError is expected: drop it.
const unexpected = errors.filter((e) => !/deliberate failure/.test(e));
assert.deepEqual(unexpected, [], 'B9 — no other page errors');

// ── C — FAE-01 live chart ──────────────────────────────────────────────────
const chart = await page.evaluate(() => ({
  dragonFairy: window.typeEff('Dragon', 'Psychic', 'Fairy'),
  fairyDragon: window.typeEff('Fairy', 'Dragon', 'Flying'),
  iceFire: window.typeEff('Ice', 'Fire'),
  iceSteel: window.typeEff('Ice', 'Steel'),
  ghostFighting: window.typeEff('Ghost', 'Fighting'),
  ghostDark: window.typeEff('Ghost', 'Dark'),
  bugPoison: window.typeEff('Bug', 'Poison'),
  gardevoir: window.PD[282].slice(0, 3),
}));
assert.equal(chart.dragonFairy, 0, 'C1 — Dragon → Fairy immune');
assert.equal(chart.fairyDragon, 2, 'C2 — Fairy → Dragon ×2');
assert.equal(chart.iceFire, 0.5, 'C3 — Ice → Fire ×0.5 (old bridge copy said ×2)');
assert.equal(chart.iceSteel, 0.5, 'C4 — Ice → Steel ×0.5');
assert.equal(chart.ghostFighting, 1, 'C5 — Ghost → Fighting neutral (old copy said ×0)');
assert.equal(chart.ghostDark, 0.5, 'C6 — Ghost → Dark ×0.5');
assert.equal(chart.bugPoison, 0.5, 'C7 — Bug → Poison ×0.5');
assert.deepEqual(chart.gardevoir, ['Gardevoir', 'Psychic', 'Fairy'], 'C8 — Gardevoir is Psychic/Fairy from the start');

// ── D — integrity ──────────────────────────────────────────────────────────
assert.deepEqual(httpFailures, [], 'D1 — zero failed HTTP resource');
await browser.close();
console.log('smoke-p0a: OK — BUG-01 encounter live, OBS-01 report live, FAE-01 single chart live, 0 failed HTTP resource.');
