import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(500);
await page.evaluate(() => { G.badges = ['brock','misty','surge','erika','koga','sabrina','blaine','giovanni']; G.location = 'diglettscave'; try { unlockLocation('diglettscave'); } catch (_) {} ensureWallet().diamonds = 5000; updateFeatureWindows(); renderMineWindow(); });
await page.waitForTimeout(300);
const probe = () => page.evaluate(() => {
  const q = (sel) => { const el = document.querySelector(sel); if (!el) return null; const cs = getComputedStyle(el); return { cls: el.className.slice(0, 60), bg: cs.backgroundColor, color: cs.color, shadow: cs.boxShadow, outline: cs.outlineStyle }; };
  return { toolActive: q('#win-mine .mine-tool-btn.active'), toolIdle: q('#win-mine .mine-tool-btn:not(.active)'), header: q('#win-mine .pw-mine-header .hbtn'), light2: getComputedStyle(document.documentElement).getPropertyValue('--light2').trim(), accent: getComputedStyle(document.documentElement).getPropertyValue('--pw-btn-active-bg').trim() };
});
console.log('mine', JSON.stringify(await probe()));
await page.evaluate(() => { buyMineAutomation(); });
console.log('modal after buy', await page.evaluate(() => document.getElementById('poke-modal').classList.contains('open')));
await page.waitForTimeout(200);
console.log('mine after buy', JSON.stringify(await probe()));
const hover = await page.$('#win-mine .mine-grid > *:nth-child(12), #win-mine .mine-tile:nth-child(12)');
if (hover) await hover.hover();
await page.waitForTimeout(200);
await (await page.$('#win-mine')).screenshot({ path: 'docs/captures/v7-r3c-mine-panel.png' });
// management modal tabs
await page.evaluate(() => { openMineManagementMenu('automation'); });
await page.waitForTimeout(400);
const mg = await page.evaluate(() => {
  const tabs = Array.from(document.querySelectorAll('.management-tabs .hbtn'));
  const root = tabs[0] ? tabs[0].closest('.modal-box, .pw-modal-box, [role=dialog], .management-modal, .ui-management, .modal') : null;
  return { tabs: tabs.map((t) => ({ cls: t.className, bg: getComputedStyle(t).backgroundColor })), root: root ? (root.id || root.className) : null };
});
console.log('management', JSON.stringify(mg));
const rootSel = await page.evaluate(() => { const t = document.querySelector('.management-tabs .hbtn'); const r = t && t.closest('.modal-box, .pw-modal-box, [role=dialog]'); if (!r) return null; r.setAttribute('data-shot', '1'); return '[data-shot="1"]'; });
if (rootSel) await (await page.$(rootSel)).screenshot({ path: 'docs/captures/v7-r3c-automation-buy-card.png' });
// dictionary tabs
await page.evaluate(() => { if (typeof closeManagementMenu === 'function') closeManagementMenu(); else document.querySelectorAll('[data-shot]').forEach((e) => e.remove()); openFullscreenPanel('dictionary'); });
await page.waitForTimeout(500);
const dict = await page.evaluate(() => Array.from(document.querySelectorAll('.dict-tab')).slice(0, 3).map((t) => ({ cls: t.className, bg: getComputedStyle(t).backgroundColor })));
console.log('dict', JSON.stringify(dict));
await browser.close();
