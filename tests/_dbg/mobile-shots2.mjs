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
await page.waitForTimeout(5000);
for (const p of ['pokedex', 'inventory', 'guide', 'shop']) {
  await page.evaluate((p) => window.openFullscreenPanel && window.openFullscreenPanel(p), p);
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => {
    const panel = document.querySelector('#fullscreen-panel, .fullscreen-panel, [id*="fullscreen"]');
    const hdr = panel && panel.querySelector('.pw-win-hdr, .fs-head, header, .panel-head');
    return { id: panel && panel.id, cls: panel && panel.className, hdrText: hdr && hdr.textContent.trim().slice(0, 80), hdrHtml: hdr && hdr.outerHTML.slice(0, 400) };
  });
  console.log(p, JSON.stringify(info));
  await page.screenshot({ path: `tests/_dbg/shots/m21-${p}.png` });
  await page.evaluate(() => window.closeFullscreenPanel && window.closeFullscreenPanel());
  await page.waitForTimeout(200);
}
// Map header geometry
const geo = await page.evaluate(() => {
  window.setMobileView('adventure');
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right), Math.round(b.top), Math.round(b.bottom)]; };
  return { title: r('#win-map .pw-win-hdr-title'), select: r('#map-region-select'), help: r('#win-map .pw-win-help-btn'), tools: r('#win-map .pw-win-hdr-tools'), hdr: r('#win-map .pw-win-hdr') };
});
console.log('map geo', JSON.stringify(geo));
await browser.close();
