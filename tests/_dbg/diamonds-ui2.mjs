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
const r = await page.evaluate(() => {
  const loc = getLocObj('diglettscave');
  const info = { badgeReq: loc.badgeReq, gate: loc.gate || loc.unlock || loc.req || null, keys: Object.keys(loc).slice(0, 25) };
  // satisfy: badges
  G.badges = ['brock', 'misty', 'surge']; G.unlockedLocs = Object.assign({}, G.unlockedLocs || {}, { diglettscave: true }); if (Array.isArray(G.unlockedLocs)) G.unlockedLocs.push('diglettscave'); else if (G.unlockedLocs) G.unlockedLocs.diglettscave = true;
  const m1 = mineUnlocked();
  renderCurrencyWindow();
  const cols1 = [...document.querySelectorAll('#currency-window-body .pw-cur-col')].map((c) => c.dataset.cur + ':' + c.querySelector('.pw-cur-amount').textContent);
  return { info, m1, cols1 };
});
console.log(JSON.stringify(r, null, 1));
await page.screenshot({ path: 'tests/_dbg/shots/currency-window.png', clip: { x: 0, y: 0, width: 1280, height: 520 } });
console.log('errors', errors);
await browser.close();
