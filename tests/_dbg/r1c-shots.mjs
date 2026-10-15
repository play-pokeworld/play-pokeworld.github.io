import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(2500); // let the starter toast fade
// Monnaies with 💎 column (mine open) + title bar icon
await page.evaluate(() => { G.badges = ['brock', 'misty', 'surge']; G.unlockedLocs = Object.assign({}, G.unlockedLocs || {}, { diglettscave: true }); renderCurrencyWindow(); updateHeader && updateHeader(); });
await page.waitForTimeout(400);
await page.screenshot({ path: 'docs/captures/v7-r1c-currency-diamonds.png', clip: { x: 0, y: 0, width: 1280, height: 210 } });
// Guide → Économie → page Monnaies
await page.evaluate(() => window.openGuideSection('economy'));
await page.waitForTimeout(700);
await page.screenshot({ path: 'docs/captures/v7-r1c-guide-currencies.png' });
await page.evaluate(() => window.closeFullscreenPanel && window.closeFullscreenPanel());
console.log('errors', errors);
await browser.close();
