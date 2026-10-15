import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
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
  G.unlockedLocs = G.unlockedLocs || {}; G.unlockedLocs.viridianforest = true;
  ensureWallet().dungeonTokens = 5000;
  G.team.forEach((p) => { p.level = 60; p.maxHP = 300; p.currentHP = 300; });
  window.clickLocation('viridianforest'); await new Promise((r) => setTimeout(r, 200));
  window.startDungeonRun('viridianforest'); await new Promise((r) => setTimeout(r, 200));
  window.saveGame();
});
await boot();
const saves = await page.evaluate(() => window.getSaveSummaries().map((s) => s.id));
await page.evaluate((id) => window.startSaveById(id), saves[0]);
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
  const out = { mobile: document.body.classList.contains('mobile-mode'), view: document.body.dataset.mobileView || [...document.body.classList].filter((c) => c.includes('view')).join(','),
    flag: document.documentElement.getAttribute('data-dungeon-run'), run: !!window.currentDungeonRun() };
  const btn = document.querySelector('#win-tabs [data-call="dungeonFight"]');
  out.btn = btn ? btn.textContent.trim() : null;
  out.btnVisible = btn ? btn.getBoundingClientRect().height > 0 : false;
  btn && btn.click();
  await new Promise((r) => setTimeout(r, 900));
  out.battle = !!battle.active;
  out.viewAfter = document.body.dataset.mobileView || [...document.body.classList].filter((c) => c.includes('view')).join(',');
  const bar = document.getElementById('battle-dungeon-bar');
  out.barVisible = bar.getBoundingClientRect().height > 0;
  return out;
});
console.log(r, errors);
await page.screenshot({ path: 'tests/_dbg/shots/dungeon-reload-mobile.png' });
await browser.close();
