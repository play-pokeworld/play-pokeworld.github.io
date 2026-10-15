import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(500);
const r = await page.evaluate(async () => {
  // strong team, tokens, unlock pilot
  G.team.forEach((p) => { p.level = 60; recalcPokeStats && recalcPokeStats(p); p.currentHP = p.maxHP; });
  ensureWallet().dungeonTokens = 100000;
  G.dungeonClears = { viridianforest: 10 };
  G.unlockedLocs = Object.assign({}, G.unlockedLocs || {}, { viridianforest: true });
  clickLocation('viridianforest');
  await new Promise((r) => setTimeout(r, 300));
  const run = startDungeonRun('viridianforest');
  if (!run) return { err: 'no run' };
  dungeonSetAuto('farm');
  _dgAutoStep();
  const samples = [];
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const rr = currentDungeonRun();
    if (!rr) { samples.push({ t: i * 0.5, ended: true }); break; }
    const tiles = Object.values(rr.map.tiles);
    samples.push({ t: i * 0.5, floor: rr.floor, pos: rr.pos, pending: rr.pendingNode, active: battle.active, enemy: battle.enemyPoke && battle.enemyPoke.name, wins: rr.wins, done: tiles.filter((x) => x.done).length, revealed: tiles.filter((x) => x.revealed).length, total: tiles.length });
  }
  return { depth: run.depth, samples };
});
console.log(JSON.stringify(r, null, 0).slice(0, 6000));
console.log('errors', errors);
await browser.close();
