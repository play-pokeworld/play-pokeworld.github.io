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
// before mine: diamonds column hidden
const before = await page.evaluate(() => { renderCurrencyWindow(); return { mine: mineUnlocked(), cols: [...document.querySelectorAll('#currency-window-body .pw-cur-col')].map((c) => c.dataset.cur) }; });
console.log('before', JSON.stringify(before));
// unlock diglett's cave by force (unlockedLocs) and check column
const after = await page.evaluate(() => {
  G.unlockedLocs = G.unlockedLocs || [];
  if (Array.isArray(G.unlockedLocs)) G.unlockedLocs.push('diglettscave'); else G.unlockedLocs.diglettscave = true;
  G.badges = G.badges || [];
  const mine = mineUnlocked();
  renderCurrencyWindow();
  return { mine, cols: [...document.querySelectorAll('#currency-window-body .pw-cur-col')].map((c) => c.dataset.cur + ':' + c.querySelector('.pw-cur-amount').textContent + ' [' + c.title + ']') };
});
console.log('after', JSON.stringify(after, null, 1));
// treasure sale panel
const sale = await page.evaluate(async () => {
  G.inventory.nugget = 3; G.inventory.star_piece = 1;
  showTab('inventory');
  await new Promise((r) => setTimeout(r, 200));
  onInventoryClick('nugget');
  await new Promise((r) => setTimeout(r, 200));
  const el = document.querySelector('#tab-content .loc-sub, .tab-content .loc-sub, .loc-sub');
  const btns = [...document.querySelectorAll('[data-call="sellTreasure"]')].map((b) => b.textContent.trim());
  const title = document.querySelector('.loc-title') && document.querySelector('.loc-title').textContent.trim();
  const d0 = ensureWallet().diamonds;
  sellTreasure('nugget', 1);
  await new Promise((r) => setTimeout(r, 300));
  const d1 = ensureWallet().diamonds;
  const toasts = [...document.querySelectorAll('.notif, .notification, .pw-toast, #notif-host *')].map((n) => n.textContent.trim()).filter(Boolean).slice(-3);
  return { title, sub: el && el.textContent, btns, d0, d1, inv: G.inventory.nugget, toasts, descNugget: getItemDesc ? getItemDesc('nugget') : null, descStar: typeof getItemDesc === 'function' ? getItemDesc('star_piece') : null };
});
console.log('sale', JSON.stringify(sale, null, 1));
await page.screenshot({ path: 'tests/_dbg/shots/treasure-sale.png' });
// guide page
const guide = await page.evaluate(() => { const s = guideSections().economy; return { first: s.pages[0][0], txt: s.pages[0][1].slice(0, 700) }; });
console.log('guide', JSON.stringify(guide, null, 1));
console.log('errors', errors);
await browser.close();
