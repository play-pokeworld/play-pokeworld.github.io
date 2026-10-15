import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(600);
const shotEl = async (sel, path) => { const el = await page.$(sel); if (el) await el.screenshot({ path }); else console.log('missing', sel); };
// 1. Boutique : amélioration Relance automatique
await page.evaluate(() => { ensureWallet().questPoints = 3000; clickLocation('pallet'); openFullscreenPanel('shop'); selectShopItem('autoRelaunch'); });
await page.waitForTimeout(500);
await shotEl('#fullscreen-panel-overlay, #fullscreen-overlay, #fs-panel-content', 'docs/captures/v7-r2-shop-auto-relaunch.png');
await page.evaluate(() => { buySelectedFromShop(); });
await page.waitForTimeout(300);
await page.evaluate(() => { if (typeof closeFullscreenPanel === 'function') closeFullscreenPanel(); });
// 2. Défaite → compte à rebours dans la fenêtre Combat
await page.evaluate(() => { clickLocation('route1'); exploreArea(); });
await page.waitForTimeout(500);
await page.evaluate(() => { G.team.forEach((p) => { p.currentHP = 0; }); endBattle(); closeBattleSummary && closeBattleSummary(); });
await page.waitForTimeout(700);
await shotEl('#win-battle', 'docs/captures/v7-r2-auto-relaunch-countdown.png');
await page.evaluate(() => cancelAutoRelaunch());
// 3. Entraînement en direct (8 badges)
await page.evaluate(async () => {
  G.badges = ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni'];
  updateFeatureWindows && updateFeatureWindows();
  renderTrainingWindow && renderTrainingWindow();
});
await page.waitForTimeout(400);
await page.evaluate(async () => {
  ensureTrainingSlots();
  const p = G.team[0];
  setTrainingSlotPokemon(0, 'team', String(p.uid != null ? p.uid : 0), p);
  startTrainingBattle('level', 0);
});
await page.waitForTimeout(1500);
await shotEl('#win-battle', 'docs/captures/v7-r2-training-live.png');
await page.evaluate(() => { try { cancelTrainingSlot(0); } catch (_) {} if (battle.active) endBattle(); });
// 4. Réglages → Son
await page.evaluate(() => { openSettings(); const s = document.querySelector('.settings-sound'); if (s) s.scrollIntoView(); });
await page.waitForTimeout(400);
await shotEl('#settings-modal .modal-box, #settings-modal .pw-modal-box, #settings-inner', 'docs/captures/v7-r2-settings-sound.png');
await page.evaluate(() => closeSettings());
// 5. Récap AFK avec expédition de donjon (debug timeskip 3 h sur Mont Sélénite en mode récolte)
await page.evaluate(async () => {
  G.team.forEach((p) => { p.level = 90; if (typeof recalcPokeStats === 'function') recalcPokeStats(p); p.currentHP = p.maxHP; });
  ensureWallet().dungeonTokens = 5000; G.dungeonClears = { mtmoon: 10 }; G.badges = ['brock'];
  clickLocation('mtmoon'); startDungeonRun('mtmoon'); dungeonSetAuto('farm');
});
await page.waitForTimeout(800);
await page.evaluate(() => { if (battle.active) { /* laisser le pilote */ } });
await page.waitForTimeout(1500);
await page.evaluate(() => offlineSimulate(3 * 3600 * 1000, 'debug'));
await page.waitForSelector('#afk-result-modal', { state: 'visible', timeout: 60000 });
await page.waitForTimeout(600);
await shotEl('#afk-result-modal .modal-box, #afk-result-modal .pw-modal-box, #afk-result-modal', 'docs/captures/v7-r2-afk-dungeon-recap.png');
console.log('errors:', errors.slice(0, 5));
await browser.close();
