import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://127.0.0.1:4174/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(500);
const r = await page.evaluate(async () => {
  const panel = document.getElementById('map-panel');
  const svg = document.getElementById('map-svg');
  const rect = svg.getBoundingClientRect();
  const fire = (type, id, x, y) => panel.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' }));
  // simulate a pinch-out at the center: two fingers moving apart
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  // dispatch on svg so e.target.closest('#map-svg') matches
  const fireOn = (type, id, x, y) => svg.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' }));
  fireOn('pointerdown', 1, cx - 20, cy); fireOn('pointerdown', 2, cx + 20, cy);
  for (let i = 1; i <= 10; i++) { fireOn('pointermove', 1, cx - 20 - i * 8, cy); fireOn('pointermove', 2, cx + 20 + i * 8, cy); }
  fireOn('pointerup', 1, cx - 100, cy); fireOn('pointerup', 2, cx + 100, cy);
  const vbZoomed = svg.getAttribute('viewBox');
  await new Promise((r) => setTimeout(r, 250));
  G.unlockedLocs = G.unlockedLocs || {}; G.unlockedLocs.route1 = true;
  window.clickLocation('route1');
  await new Promise((r) => setTimeout(r, 300));
  const vbAfterClick = svg.getAttribute('viewBox');
  window.renderMap();
  const vbAfterRender = svg.getAttribute('viewBox');
  return { rect: { w: rect.width | 0, h: rect.height | 0 }, vbZoomed, vbAfterClick, vbAfterRender, loc: G.location };
});
console.log(r, errors);
await browser.close();
