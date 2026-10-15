import { chromium } from 'playwright';
const BASE = process.env.PWK_BASE_URL || 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 820 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
async function boot() {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
}
await boot();
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(500);
await page.evaluate(async () => {
  G.unlockedLocs = G.unlockedLocs || {}; G.unlockedLocs.viridianforest = true; G.unlockedLocs.route2 = true;
  ensureWallet().dungeonTokens = 5000;
  window.clickLocation('viridianforest'); await new Promise((r) => setTimeout(r, 200));
  window.startDungeonRun('viridianforest'); await new Promise((r) => setTimeout(r, 200));
  G.team.forEach((p) => { p.currentHP = 0; });
  window.saveGame();
});
await boot();
const saves = await page.evaluate(() => window.getSaveSummaries().map((s) => s.id));
await page.evaluate((id) => window.startSaveById(id), saves[0]);
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(1200);
const r = await page.evaluate(async () => {
  const out = { run: !!window.currentDungeonRun(), loc0: G.location, flag: document.documentElement.getAttribute('data-dungeon-run') };
  window.clickLocation('route2'); await new Promise((r) => setTimeout(r, 300)); out.afterRoute2 = G.location;
  return out;
});
console.log(r, errors);
await browser.close();
