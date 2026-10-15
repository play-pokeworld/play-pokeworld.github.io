import { chromium, devices } from 'playwright';
const BASE = process.env.PWK_BASE_URL || 'http://localhost:4174/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 12'] });
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); if (b) b.click(); });
await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(1000);
await page.evaluate(() => window.openFullscreenPanel('pokedex'));
await page.waitForTimeout(600);
const info = await page.evaluate(() => {
  const m = document.getElementById('fullscreen-panel-modal');
  const head = m.querySelector('[class*="head"], [class*="hdr"], [class*="title"]');
  const out = { html: m.innerHTML.slice(0, 1500) };
  const t = m.querySelector('#fullscreen-panel-title, .fs-panel-title, [id*="title"]');
  if (t) { const b = t.getBoundingClientRect(); out.title = { text: t.textContent, rect: [b.left, b.right, b.top, b.bottom], cs: (({ display, visibility, opacity, fontSize, color, position, left, transform }) => ({ display, visibility, opacity, fontSize, color, position, left, transform }))(getComputedStyle(t)) }; }
  return out;
});
console.log(JSON.stringify(info, null, 1).slice(0, 3000));
await browser.close();
