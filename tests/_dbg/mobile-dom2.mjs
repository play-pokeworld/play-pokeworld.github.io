import { chromium, devices } from 'playwright';
const BASE = process.env.PWK_BASE_URL || 'http://localhost:4174/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 12'] });
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.evaluate(() => window.setMobileView('combat'));
await page.waitForTimeout(400);
console.log(await page.evaluate(() => {
  const chain = (el) => { const out = []; while (el && el.id !== 'main-dashboard') { out.push(el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ').slice(0,2).join('.') : '')); el = el.parentElement; } return out.join(' < '); };
  const dash = document.getElementById('main-dashboard');
  return {
    battle: chain(document.getElementById('win-battle')),
    pokeballs: chain(document.getElementById('win-pokeballs')),
    dashChildren: [...dash.children].map((c) => c.tagName + (c.id ? '#' + c.id : '') + '.' + String(c.className).split(' ')[0]),
    orderBattle: getComputedStyle(document.getElementById('win-battle')).order,
    orderBalls: getComputedStyle(document.getElementById('win-pokeballs')).order,
    debugWidgetDisplay: getComputedStyle(document.getElementById('debug-widget')).display,
    tutoTargets: [...document.querySelectorAll('.pw-tuto-target')].map((e) => e.tagName + '#' + e.id + ' ' + (e.getAttribute('data-call-args') || e.getAttribute('data-mobile-view') || '')),
  };
}));
await browser.close();
