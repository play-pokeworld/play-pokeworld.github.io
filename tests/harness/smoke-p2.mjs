// smoke-p2.mjs — V7 · P2 (dette technique) end-to-end verification in a REAL browser.
//
// MANUAL RUN (requires the built app served over HTTP + Chromium):
//   npm run build && npx vite preview --host 0.0.0.0 --port 4173 &
//   node tests/harness/smoke-p2.mjs            (PWK_BASE_URL=http://localhost:4174/ to change the port)
//
// P2 changes no gameplay: this harness proves the REAL BUNDLE still boots and
// that every refactored seam is live after chunking (which unit tests cannot see):
//   A. clean boot — every deferred screen chunk loads (no "[screens] deferred
//      module failed" warning), 0 page error;
//   B. DBT-03 — the engine bridge and the classic code share ONE game state;
//      DBT-08 — PW_VERSION is the package.json version (generated version.js);
//   C. DBT-05 — the canonical sinks/helpers are live: pwSetHtml/_pwSetHtmlSafe,
//      escapeHtml, the single type chart, the single Pokémon factory;
//   D. DBT-04 — combat / world code wired through pwLateLink() runs in the
//      bundle: a real wild battle starts, ticks and ends, exploration works;
//   E. DBT-09 — the split helpers (region.js / rewards.js / dupes.js /
//      box-filters.js) are reachable through their historical globals;
//   F. deferred screens render without throwing (mine, hatchery, training,
//      pokédex, puzzles, atoll, base) — guards the chunk-order regression
//      found during P2 (screen-atoll statically importing `gameplay`);
//   G. save → load round-trip in the real localStorage;
//   H. zero page error / zero failed HTTP resource across the whole run.

import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'package.json'), 'utf8'));
const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const errors = [];
const warnings = [];
const httpFailures = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
  if (msg.type() === 'warning') warnings.push(msg.text());
});
page.on('response', (res) => { if (res.status() >= 400 && !/favicon/.test(res.url())) httpFailures.push(`${res.status()} ${res.url()}`); });

// ── A — boot + deferred screens ────────────────────────────────────────────
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
assert.deepEqual(errors, [], 'A1 — clean boot (0 page error)');
const failedScreens = warnings.filter((w) => /deferred module failed/i.test(w));
assert.deepEqual(failedScreens, [], 'A2 — every deferred screen chunk loaded');
const screens = await page.evaluate(() => ({
  mine: typeof window.renderMineWindow, hatchery: typeof window.renderHatcheryWindow,
  training: typeof window.renderTrainingWindow, pokedex: typeof window.renderPokedex,
  puzzles: typeof window.openPuzzleExploration,
  // the base window registers its entry points in the action registry (PokeActions), not on window
  base: typeof (window.PokeActions && window.PokeActions.get('baseWindowRender')),
}));
for (const [k, v] of Object.entries(screens)) assert.equal(v, 'function', `A3 — deferred screen « ${k} » exposed its entry point`);

// ── B — one state (DBT-03) · generated version (DBT-08) ────────────────────
const b = await page.evaluate(() => ({
  sameState: !!(window.PokeWorldState && window.PokeWorldState.gameState === window.G),
  version: window.PW_VERSION,
  hasTeam: Array.isArray(window.G.team) && window.G.team.length === 1,
  saveVersion: window.SAVE_VERSION,
}));
assert.equal(b.sameState, true, 'B1 — PokeWorldState.gameState IS window.G (single initial state wiring)');
assert.equal(b.version, pkg.version, `B2 — PW_VERSION equals package.json version (${pkg.version})`);
assert.equal(b.hasTeam, true, 'B3 — the starter landed in the single state');

// ── C — canonical helpers (DBT-05) ─────────────────────────────────────────
const c = await page.evaluate(() => {
  const div = document.createElement('div');
  window._pwSetHtmlSafe(div, '<b>ok</b>');
  const p = window.createPoke(25, 10);
  return {
    pwSetHtml: typeof window.pwSetHtml, sinkHtml: div.innerHTML,
    esc: window.escHtml('<a&"'), fairyDragon: window.typeEff('Fairy', 'Dragon'), dragonFairy: window.typeEff('Dragon', 'Fairy'),
    poke: !!(p && p.id === 25 && p.level === 10 && p.maxHP > 0 && Array.isArray(p.moves)),
    v43Link: typeof window.__pwV43Link,
  };
});
assert.equal(c.pwSetHtml, 'function', 'C1 — pwSetHtml sink live');
assert.equal(c.sinkHtml, '<b>ok</b>', 'C2 — _pwSetHtmlSafe writes through the sink');
assert.equal(c.esc, '&lt;a&amp;&quot;', 'C3 — single HTML escaper (escHtml → vdom esc)');
assert.equal(c.fairyDragon, 2, 'C4 — single type chart: Fairy → Dragon ×2');
assert.equal(c.dragonFairy, 0, 'C5 — single type chart: Dragon → Fairy ×0');
assert.equal(c.poke, true, 'C6 — single Pokémon factory (createPoke)');
assert.equal(c.v43Link, 'undefined', 'C7 — __pwV43Link bridge retired (DBT-05)');

// ── D — combat / world through late links (DBT-04) ─────────────────────────
const d = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  window.G.team = [window.createPoke(25, 40)];
  window.G.location = 'route1';
  window.G.inventory = window.G.inventory || {};
  window.G.inventory.pokeball = 0;
  window.startWildBattle();
  const b0 = window.battle;
  const started = !!(b0 && b0.active && b0.enemyPoke);
  const enemyId = started ? b0.enemyPoke.id : null;
  let ticks = 0;
  while (window.battle && window.battle.active && ticks < 400) { await sleep(25); ticks++; }
  const chained = !!(window.battle && window.battle.active); // PokéChill chains spawn the next wild
  try { window.endBattle(); } catch (_) {}
  await sleep(50);
  const closed = !(window.battle && window.battle.active);
  let explored = null;
  try { explored = typeof window.exploreArea === 'function' ? (window.exploreArea(), true) : null; } catch (e) { explored = 'ERR ' + e.message; }
  try { window.endBattle(); } catch (_) {}
  return { started, enemyId, ticks, chained, closed, explored, wins: window.G.wildWinsByLoc && window.G.wildWinsByLoc.route1 };
});
assert.equal(d.started, true, 'D1 — a real wild battle starts from the bundle (startWildBattle → startBattle)');
assert.ok(d.enemyId > 0, 'D2 — a wild Pokémon was spawned by the encounter system');
assert.equal(d.closed, true, 'D3 — endBattle() closes the battle');
assert.ok(d.explored !== null && !String(d.explored).startsWith('ERR'), 'D4 — exploreArea() runs without throwing: ' + d.explored);

// ── E — DBT-09 split helpers reachable through their historical globals ────
const e = await page.evaluate(() => {
  const before = (window.G.inventory.rarecandy || 0);
  window.grantRewardItems({ rarecandy: 2 });
  return {
    kanto: window.isRegionUnlocked ? window.isRegionUnlocked('kanto') : window.canAccessRegion('kanto'),
    total: window.getRegionPokedexTotal('kanto'),
    meta: typeof window.getRegionMeta,
    candies: (window.G.inventory.rarecandy || 0) - before,
    dupe: typeof window.getDuplicateItemPayout === 'function' ? window.getDuplicateItemPayout('rarecandy', 1) : null,
    stack: typeof window.getItemStackLimit,
    boxFilters: typeof window.ensureBoxFilters,
  };
});
assert.equal(e.kanto, true, 'E1 — region.js: Kanto accessible');
assert.equal(e.total, 151, 'E2 — region.js: Kanto dex total 151');
assert.equal(e.meta, 'function', 'E3 — region.js: getRegionMeta live');
assert.equal(e.candies, 2, 'E4 — rewards.js: grantRewardItems credited 2 Rare Candies');
assert.ok(typeof e.dupe === 'number' && e.dupe >= 0, 'E5 — dupes.js: getDuplicateItemPayout live');
assert.equal(e.stack, 'function', 'E6 — dupes.js: getItemStackLimit live');
assert.equal(e.boxFilters, 'function', 'E7 — box-filters.js: ensureBoxFilters live');

// ── F — deferred screens render ────────────────────────────────────────────
const f = await page.evaluate(async () => {
  const out = {};
  const run = async (name, fn) => { try { await fn(); out[name] = 'ok'; } catch (err) { out[name] = 'ERR ' + (err && err.message); } };
  await run('mine', () => window.renderMineWindow());
  await run('hatchery', () => window.renderHatcheryWindow());
  await run('training', () => window.renderTrainingWindow());
  await run('pokedex', () => { window.openFullscreenPanel('pokedex'); window.closeFullscreenPanel(); });
  await run('puzzles', () => { window.openFullscreenPanel('puzzles'); window.closeFullscreenPanel(); });
  await run('atoll', () => { window.openFullscreenPanel('atoll'); window.closeFullscreenPanel(); });
  await run('base', () => window.PokeActions.get('baseWindowRender')());
  await run('dashboard', () => window.renderDashboardColumns());
  return out;
});
for (const [k, v] of Object.entries(f)) assert.equal(v, 'ok', `F — deferred screen « ${k} » renders (${v})`);

// ── G — save / load round-trip (real localStorage) ─────────────────────────
const g = await page.evaluate(() => {
  window.G.money = 123456;
  window.saveGame(true);
  window.G.money = 0;
  window.loadGame(true);
  return { money: window.G.money, sameState: window.PokeWorldState.gameState === window.G };
});
assert.equal(g.money, 123456, 'G1 — saveGame → loadGame restores the state');
assert.equal(g.sameState, true, 'G2 — the bridge still points to the (re)loaded state');

// ── H — global hygiene ─────────────────────────────────────────────────────
assert.deepEqual(errors, [], 'H1 — 0 page error over the whole run');
assert.deepEqual(httpFailures, [], 'H2 — 0 failed HTTP resource');

await browser.close();
console.log(`smoke-p2: OK — version ${b.version} single state, DBT-05 helpers live, wild battle ${d.enemyId} ran ${d.ticks} ticks, DBT-09 helpers live, 8 deferred screens render, save/load OK, 0 error.`);
