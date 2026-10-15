import { chromium, devices } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 12'] });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.waitForTimeout(800);
await page.screenshot({ path: 'tests/_dbg/shots/r3/m1-menu.png' });
const menuInfo = await page.evaluate(() => {
  const out = { vw: innerWidth, vh: innerHeight, docW: document.documentElement.scrollWidth, bodyMode: document.body.className };
  const cand = ['#save-menu', '#menu-screen', '#save-screen', '.save-menu', '#main-menu', '#screen-menu'];
  for (const s of cand) { const el = document.querySelector(s); if (el) { const r = el.getBoundingClientRect(); out[s] = { w: r.width, h: r.height, x: r.x, y: r.y, sw: el.scrollWidth }; } }
  return out;
});
console.log('menu', JSON.stringify(menuInfo));
// go to new save (the "enter save" page)
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForTimeout(800);
await page.screenshot({ path: 'tests/_dbg/shots/r3/m2-after-create.png' });
const st = await page.evaluate(() => {
  const m = document.querySelector('#starter-modal');
  const hdr = document.querySelector('header, #header, .pw-header, #top-header');
  const r = m && m.getBoundingClientRect();
  const z = (el) => el && getComputedStyle(el).zIndex;
  return { starterVisible: !!(m && m.offsetParent !== null), rect: r && { x: r.x, y: r.y, w: r.width, h: r.height }, zModal: z(m), header: hdr && { id: hdr.id, cls: hdr.className, z: z(hdr), pos: getComputedStyle(hdr).position, rect: (() => { const q = hdr.getBoundingClientRect(); return { y: q.y, h: q.height }; })() }, docW: document.documentElement.scrollWidth };
});
console.log('starter', JSON.stringify(st));
await page.waitForTimeout(300);
await page.screenshot({ path: 'tests/_dbg/shots/r3/m3-starter.png', fullPage: false });
console.log('errors', errors);
await browser.close();
