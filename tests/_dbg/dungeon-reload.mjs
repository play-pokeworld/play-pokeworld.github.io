import { chromium } from 'playwright';
const BASE = process.env.PWK_BASE_URL || 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
async function bootToGame() {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
}
await bootToGame();
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(500);
const before = await page.evaluate(async () => {
  G.unlockedLocs = G.unlockedLocs || {};
  G.unlockedLocs.viridianforest = true;
  ensureWallet().dungeonTokens = 5000;
  window.clickLocation('viridianforest');
  await new Promise((r) => setTimeout(r, 300));
  const run = window.startDungeonRun('viridianforest');
  await new Promise((r) => setTimeout(r, 300));
  // move one step to a neighbour tile (reveal) to have a non-trivial state
  const here = run.map.tiles[run.pos];
  const out = { loc: G.location, floor: run.floor, pos: run.pos, auto: run.auto, flag: document.documentElement.getAttribute('data-dungeon-run'),
    barHidden: document.getElementById('battle-dungeon-bar').hidden, barLen: document.getElementById('battle-dungeon-bar').innerHTML.length,
    idleDisplay: getComputedStyle(document.getElementById('battle-idle-screen')).display };
  window.saveGame();
  return out;
});
console.log('BEFORE reload', before);
// ── reload ──
await bootToGame();
const saves = await page.evaluate(() => window.getSaveSummaries().map((s) => s.id));
await page.evaluate((id) => window.startSaveById(id), saves[0]);
await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(1500);
const after = await page.evaluate(async () => {
  const run = window.currentDungeonRun();
  const bar = document.getElementById('battle-dungeon-bar');
  const res = { runActive: !!run, loc: G.location, floor: run && run.floor, pos: run && run.pos, pendingNode: run && run.pendingNode,
    flag: document.documentElement.getAttribute('data-dungeon-run'), barHidden: bar.hidden, barDisplay: getComputedStyle(bar).display, barLen: bar.innerHTML.length,
    idleDisplay: getComputedStyle(document.getElementById('battle-idle-screen')).display,
    exploreBtn: !!document.querySelector('#win-tabs [data-call="exploreArea"]'), exploreLabel: (document.querySelector('#win-tabs [data-call="exploreArea"]') || {}).textContent };
  // try to continue: click explore
  window.exploreArea();
  await new Promise((r) => setTimeout(r, 800));
  res.battleAfterExplore = !!battle.active;
  // try to move on the map elsewhere
  window.clickLocation('route2');
  await new Promise((r) => setTimeout(r, 300));
  res.locAfterClick = G.location;
  res.gridCells = document.querySelectorAll('#battle-dungeon-bar [data-call="dungeonMoveTo"]').length;
  return res;
});
console.log('AFTER reload', after);
await page.screenshot({ path: 'tests/_dbg/shots/dungeon-reload.png' });
console.log('errors', errors);
await browser.close();
