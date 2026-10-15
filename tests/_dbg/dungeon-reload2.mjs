import { chromium } from 'playwright';
const BASE = process.env.PWK_BASE_URL || 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
async function boot() {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
}
async function loadFirstSave() {
  await boot();
  const saves = await page.evaluate(() => window.getSaveSummaries().map((s) => s.id));
  await page.evaluate((id) => window.startSaveById(id), saves[0]);
  await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 15000 });
  await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
  await page.waitForTimeout(1200);
}
await boot();
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(500);
// ── case A : reload MID-FIGHT (pendingNode set, battle active at save time)
const a0 = await page.evaluate(async () => {
  G.unlockedLocs = G.unlockedLocs || {};
  G.unlockedLocs.viridianforest = true;
  ensureWallet().dungeonTokens = 5000;
  G.team.forEach((p) => { p.level = 60; p.maxHP = 300; p.currentHP = 300; });
  window.clickLocation('viridianforest');
  await new Promise((r) => setTimeout(r, 200));
  const run = window.startDungeonRun('viridianforest');
  await new Promise((r) => setTimeout(r, 200));
  // click the location-panel button « Combattre au palier 1 »
  const btn = document.querySelector('#win-tabs [data-call="dungeonFight"]');
  btn && btn.click();
  await new Promise((r) => setTimeout(r, 900));
  const out = { btn: !!btn, battleActive: !!battle.active, pendingNode: run.pendingNode, pos: run.pos };
  window.saveGame();
  return out;
});
console.log('A0 before reload (mid-fight)', a0);
await loadFirstSave();
const a1 = await page.evaluate(async () => {
  const run = window.currentDungeonRun();
  const bar = document.getElementById('battle-dungeon-bar');
  const res = { runActive: !!run, pos: run.pos, pendingNode: run.pendingNode, flag: document.documentElement.getAttribute('data-dungeon-run'),
    barDisplay: getComputedStyle(bar).display, gridCells: bar.querySelectorAll('[data-call="dungeonMoveTo"]').length, battleActive: !!battle.active,
    idle: getComputedStyle(document.getElementById('battle-idle-screen')).display };
  // the pending tile must still be fightable: click the first non-done combat tile adjacent/visible
  const tiles = [...bar.querySelectorAll('[data-call="dungeonMoveTo"]')];
  res.tileCount = tiles.length;
  const btn = document.querySelector('#win-tabs [data-call="dungeonFight"]');
  res.locBtn = btn ? btn.textContent.trim() : null;
  btn && btn.click();
  await new Promise((r) => setTimeout(r, 900));
  res.battleAfterBtn = !!battle.active;
  res.pendingAfterBtn = run.pendingNode;
  return res;
});
console.log('A1 after reload', a1);
// ── case B : auto pilot (needs clears) + reload
const b0 = await page.evaluate(async () => {
  window.dungeonAbandon();
  await new Promise((r) => setTimeout(r, 300));
  G.dungeonClears = G.dungeonClears || {};
  G.dungeonClears.viridianforest = 99;
  ensureWallet().dungeonTokens = 5000;
  const run = window.startDungeonRun('viridianforest');
  await new Promise((r) => setTimeout(r, 200));
  window.dungeonSetAuto('farm');
  await new Promise((r) => setTimeout(r, 100));
  const out = { auto: run.auto };
  window.saveGame();
  if (battle.active) window.dungeonAbandon; // noop
  return out;
});
console.log('B0', b0);
await loadFirstSave();
await page.waitForTimeout(1500);
const b1 = await page.evaluate(() => { const run = window.currentDungeonRun(); return { auto: run && run.auto, battleActive: !!battle.active, pos: run && run.pos, pending: run && run.pendingNode, revealed: run && Object.values(run.map.tiles).filter((t) => t.revealed).length }; });
console.log('B1 after reload (auto)', b1);
// ── case C : team all K.O. at reload → wipe (not locked)
const c0 = await page.evaluate(async () => {
  if (battle.active) { battle.active = false; }
  const run = window.currentDungeonRun();
  run.auto = false;
  run.bag.tokens = 100;
  G.team.forEach((p) => { p.currentHP = 0; });
  const jd = ensureWallet().dungeonTokens;
  window.saveGame();
  return { jd, bag: run.bag.tokens, floor: run.floor, toll: run.toll };
});
console.log('C0', c0);
await loadFirstSave();
const c1 = await page.evaluate(() => ({ run: !!window.currentDungeonRun(), flag: document.documentElement.getAttribute('data-dungeon-run'), jd: ensureWallet().dungeonTokens, hp: G.team.map((p) => p.currentHP > 0), idle: getComputedStyle(document.getElementById('battle-idle-screen')).display, loc: G.location }));
console.log('C1 after reload (wipe)', c1);
// can travel now?
const c2 = await page.evaluate(async () => { window.clickLocation('route2'); await new Promise((r) => setTimeout(r, 300)); return G.location; });
console.log('C2 travel after wipe →', c2);
await page.screenshot({ path: 'tests/_dbg/shots/dungeon-reload2.png' });
console.log('errors', errors);
await browser.close();
