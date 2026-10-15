import { chromium, devices } from 'playwright';
const BASE = process.env.PWK_BASE_URL || 'http://localhost:4174/';
const browser = await chromium.launch();
const errors = [];
async function boot(ctx) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
  return page;
}
async function startGame(page) {
  await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
  await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
  await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
  await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
  await page.waitForTimeout(1800);
}
// ── Desktop ───────────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await boot(ctx);
  await page.screenshot({ path: 'docs/captures/v7-r1-savemenu-discord.png' });
  await startGame(page);
  await page.screenshot({ path: 'docs/captures/v7-r1-tuto-highlight.png' });
  // Guide → Capture & IV
  await page.evaluate(() => window.openGuideSection('capture'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/captures/v7-r1-guide-capture.png' });
  await page.evaluate(() => window.closeFullscreenPanel && window.closeFullscreenPanel());
  // Settings → scroll to the bottom (Communauté + Avancé)
  await page.evaluate(() => window.openSettings && window.openSettings());
  await page.waitForTimeout(500);
  await page.evaluate(() => { const el = document.querySelector('#community-section'); el && el.scrollIntoView({ block: 'start' }); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/captures/v7-r1-settings-community.png' });
  // Unlock debug via code
  await page.fill('#debug-code-input', 'PWDEBUG');
  await page.click('#debug-code-submit');
  await page.waitForTimeout(500);
  const dbg1 = await page.evaluate(() => ({ cls: document.body.classList.contains('pw-debug-on'), disp: getComputedStyle(document.getElementById('debug-widget')).display, hideBtn: !!document.getElementById('debug-hide-btn') }));
  await page.evaluate(() => { const el = document.querySelector('#advanced-section'); el && el.scrollIntoView({ block: 'start' }); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/captures/v7-r1-settings-debug-on.png' });
  await page.click('#debug-hide-btn');
  await page.waitForTimeout(400);
  const dbg2 = await page.evaluate(() => ({ cls: document.body.classList.contains('pw-debug-on'), disp: getComputedStyle(document.getElementById('debug-widget')).display }));
  const dbg3 = await page.evaluate(() => { const r = window.pwDebug.on(); const d = getComputedStyle(document.getElementById('debug-widget')).display; window.pwDebug.off(); return { r, d, status: window.pwDebug.status() }; });
  console.log('debug', dbg1, dbg2, dbg3);
  await page.evaluate(() => window.closeSettings && window.closeSettings());
  // Heal after battle: KO the team member then run a battle to its end
  const heal = await page.evaluate(async () => {
    const p = G.team[0];
    p.currentHP = 1; p.status = 'brn';
    const links = [...document.querySelectorAll('.save-menu-community a, #community-section a')].map((a) => a.href);
    return { hpBefore: p.currentHP, links };
  });
  console.log('heal pre', heal);
  await ctx.close();
}
// ── Mobile ────────────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ ...devices['iPhone 12'] });
  const page = await boot(ctx);
  await startGame(page);
  await page.evaluate(() => window.setMobileView('adventure'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/captures/v7-r1-mobile-map-header.png' });
  await page.evaluate(() => window.setMobileView('combat'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/captures/v7-r1-mobile-pokeballs.png', fullPage: true });
  // scrollToWin switches the view on mobile
  await page.evaluate(() => window.setMobileView('adventure'));
  await page.evaluate(() => window.scrollToWin('win-currency'));
  await page.waitForTimeout(300);
  console.log('scrollToWin → view', await page.evaluate(() => ({ cur: document.querySelector('.mobile-nav-bar [aria-current="true"]')?.getAttribute('data-mobile-view'), vis: document.getElementById('win-currency').classList.contains('mobile-visible') })));
  await page.evaluate(() => window.setMobileView('adventure'));
  await page.evaluate(() => window.scrollToWin('win-mine'));
  await page.waitForTimeout(300);
  console.log('scrollToWin(mine) → view', await page.evaluate(() => ({ cur: document.querySelector('.mobile-nav-bar [aria-current="true"]')?.getAttribute('data-mobile-view'), vis: document.getElementById('win-mine').classList.contains('mobile-visible') })));
  await page.evaluate(() => window.openSettings && window.openSettings());
  await page.waitForTimeout(400);
  await page.evaluate(() => { const el = document.querySelector('#community-section'); el && el.scrollIntoView({ block: 'start' }); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/_dbg/shots/m31-settings-bottom.png' });
  await ctx.close();
}
console.log('errors', errors);
await browser.close();
