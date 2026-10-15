import { chromium, devices } from 'playwright';
const BASE = process.env.PWK_BASE_URL || 'http://localhost:4174/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 12'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.screenshot({ path: 'tests/_dbg/shots/m00-savemenu.png' });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.screenshot({ path: 'tests/_dbg/shots/m01-starter.png' });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); if (b) b.click(); });
await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(800);
const views = ['adventure', 'combat', 'team', 'shortcuts', 'manage'];
for (const v of views) {
  await page.evaluate((v) => window.setMobileView(v), v);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `tests/_dbg/shots/m10-${v}.png`, fullPage: false });
  await page.screenshot({ path: `tests/_dbg/shots/m11-${v}-full.png`, fullPage: true });
}
const panels = ['pokedex', 'inventory', 'guide', 'shop', 'market'];
for (const p of panels) {
  await page.evaluate((p) => window.openFullscreenPanel && window.openFullscreenPanel(p), p);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `tests/_dbg/shots/m20-${p}.png` });
  await page.evaluate(() => window.closeFullscreenPanel && window.closeFullscreenPanel());
  await page.waitForTimeout(200);
}
await page.evaluate(() => window.openSettings && window.openSettings());
await page.waitForTimeout(500);
await page.screenshot({ path: 'tests/_dbg/shots/m30-settings.png' });
console.log('errors', errors);
console.log(await page.evaluate(() => ({ mobile: document.body.classList.contains('mobile-mode'), w: innerWidth, h: innerHeight })));
await browser.close();
