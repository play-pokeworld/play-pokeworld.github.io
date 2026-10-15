import { chromium, devices } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 12'] });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(600);
await page.screenshot({ path: 'tests/_dbg/shots/r3/m4-game.png' });
// open the pokeball window picker
const pb = await page.evaluate(() => {
  const out = {};
  try { if (typeof openBallPicker === 'function') { out.hasPicker = true; } } catch (_) {}
  out.fns = Object.keys(window).filter((k) => /ball/i.test(k) && typeof window[k] === 'function').slice(0, 40);
  return out;
});
console.log('pb', JSON.stringify(pb));
// reload to menu with a save
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.waitForTimeout(800);
await page.screenshot({ path: 'tests/_dbg/shots/r3/m5-menu-with-save.png' });
const info = await page.evaluate(() => {
  const out = { docW: document.documentElement.scrollWidth, vw: innerWidth };
  const card = document.querySelector('.save-card, .pw-save-card, [class*="save-card"]');
  if (card) { const r = card.getBoundingClientRect(); out.card = { cls: card.className, w: r.width, x: r.x, sw: card.scrollWidth }; }
  const scr = document.querySelector('#save-menu-screen, .save-menu-screen');
  if (scr) { out.screen = { sw: scr.scrollWidth, cw: scr.clientWidth, sh: scr.scrollHeight, ch: scr.clientHeight }; const inner = scr.firstElementChild; if (inner) out.inner = { cls: inner.className, w: inner.getBoundingClientRect().width, sw: inner.scrollWidth, sh: inner.scrollHeight }; }
  const wide = []; document.querySelectorAll('#save-menu-screen *').forEach((el) => { const r = el.getBoundingClientRect(); if (r.right > innerWidth + 1 || r.width > innerWidth) wide.push({ tag: el.tagName, cls: String(el.className).slice(0, 60), w: Math.round(r.width), right: Math.round(r.right) }); });
  out.wide = wide.slice(0, 12);
  return out;
});
console.log('menu+save', JSON.stringify(info, null, 0));
console.log('errors', errors);
await browser.close();
