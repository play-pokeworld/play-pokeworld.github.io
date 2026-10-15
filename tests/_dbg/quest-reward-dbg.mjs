import { chromium } from 'playwright';
const targets = [['p1', 'http://localhost:4176/'], ['p2', 'http://localhost:4174/']];
const browser = await chromium.launch();
for (const [tag, base] of targets) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
  await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
  await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); if (b) b.click(); });
  await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const el = document.querySelector('#win-story #story-panel .pw-quest-card .pw-quest-reward');
    return el ? { html: el.outerHTML.slice(0, 600), spans: Array.from(el.querySelectorAll('span')).map((s) => ({ cls: s.className, text: s.textContent.slice(0, 40), display: getComputedStyle(s).display })) } : null;
  });
  console.log(tag, JSON.stringify(info, null, 1).slice(0, 1500));
  await page.close();
}
await browser.close();
