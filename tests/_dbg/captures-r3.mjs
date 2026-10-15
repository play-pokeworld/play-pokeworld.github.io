import { chromium, devices } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const boot = async (p) => {
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
  await p.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
  await p.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
  await p.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
  await p.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
  await p.waitForTimeout(600);
};
await boot(page);
const shotEl = async (sel, path) => {
  const el = await page.$(sel);
  if (!el) { console.log('missing', sel); return; }
  const vis = await el.isVisible();
  if (vis) { await el.screenshot({ path, timeout: 8000 }).catch((e) => console.log('shot fail', path, e.message.split('\n')[0])); return; }
  const info = await el.evaluate((n) => ({ cls: n.className, hidden: n.hidden, disp: getComputedStyle(n).display, rect: n.getBoundingClientRect().toJSON() }));
  console.log('not visible', sel, JSON.stringify(info));
  await page.screenshot({ path });
};

// 0. Audio fonctionnel sur le bundle de production : geste → manifeste → cri décodé
await page.mouse.click(700, 450);
await page.waitForTimeout(400);
const audio = await page.evaluate(async () => {
  const st0 = audioState();
  if (typeof audioLoadManifest === 'function') await audioLoadManifest();
  audioPlayCry(25);
  await new Promise((r) => setTimeout(r, 1500));
  const st = audioState();
  return { ctx: st.contextState || st.context || st.unlocked, manifest: st.manifestState, music: st.musicContext, cries: st.cries, fileSfx: st.fileSfx, before: st0.manifestState, keys: Object.keys(st) };
});
console.log('audio', JSON.stringify(audio));

// 1. Boutique : amélioration Relance auto des donjons (5 000 PQ)
await page.evaluate(() => { ensureWallet().questPoints = 20000; clickLocation('pallet'); openFullscreenPanel('shop'); selectShopItem('autoDungeonRelaunch'); });
await page.waitForTimeout(500);
await shotEl('#fullscreen-panel-overlay, #fullscreen-overlay, #fs-panel-content', 'docs/captures/v7-r3-shop-dungeon-relaunch.png');
await page.evaluate(() => { buySelectedFromShop(); });
await page.waitForTimeout(300);
const shopAfter = await page.evaluate(() => { const m = shopItemsModel('pallet', { badgeReq: 0 }); return (m.items || m).map ? (m.items || m).map((i) => i.id || i.key).filter((k) => /auto/i.test(String(k))) : m; });
console.log('shop after buy (auto items left):', JSON.stringify(shopAfter));
await page.evaluate(() => { if (typeof closeFullscreenPanel === 'function') closeFullscreenPanel(); });

// 2. Réglages → Automatisation — coûts
await page.evaluate(() => { openSettings(); const s = document.querySelector('.settings-automation'); if (s) s.scrollIntoView(); });
await page.waitForTimeout(400);
await shotEl('#settings-modal .modal-box, #settings-modal .pw-modal-box, #settings-inner', 'docs/captures/v7-r3-settings-automation.png');
await page.evaluate(() => closeSettings());

// 3. Guide → Donjons → page « Chiffres clés »
await page.evaluate(() => { openGuideSection('dungeons'); });
await page.waitForTimeout(600);
await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('#fullscreen-panel-overlay h3, #fullscreen-panel-overlay h4, #fullscreen-panel-overlay .guide-page-title, #fullscreen-panel-overlay [class*="guide"] h3'));
  const el = all.reverse().find((h) => /Chiffres clés/i.test(h.textContent || ''));
  if (el) el.scrollIntoView({ block: 'start' });
});
await page.waitForTimeout(300);
await shotEl('#fullscreen-panel-overlay, #fullscreen-overlay, #fs-panel-content', 'docs/captures/v7-r3-guide-key-numbers.png');
await page.evaluate(() => { if (typeof closeFullscreenPanel === 'function') closeFullscreenPanel(); });

// 4. Mine : outil courant + aperçu de la zone
await page.evaluate(() => { G.location = 'diglettscave'; if (typeof unlockLocation === 'function') try { unlockLocation('diglettscave'); } catch (_) {} updateFeatureWindows(); renderMineWindow(); });
await page.waitForTimeout(400);
await page.evaluate(() => { const chip = document.querySelector('#win-mine [data-tool="hammer"]'); if (chip) chip.click(); });
await page.waitForTimeout(300);
const tile = await page.$('#win-mine .mine-tile:nth-child(12), #win-mine .mine-grid > *:nth-child(12)');
if (tile) await tile.hover();
await page.waitForTimeout(300);
await shotEl('#win-mine', 'docs/captures/v7-r3-mine-tool.png');
const mineInfo = await page.evaluate(() => ({ pressed: Array.from(document.querySelectorAll('#win-mine [aria-pressed="true"]')).map((c) => c.dataset.tool), hint: (document.querySelector('#win-mine .mine-tool-hint') || {}).textContent, aim: document.querySelectorAll('#win-mine .is-aim').length }));
console.log('mine', JSON.stringify(mineInfo));

// 5. Immunité ×0 : combat sauvage, adversaire Lévitation, attaque Sol
await page.evaluate(() => { clickLocation('route1'); exploreArea(); });
await page.waitForFunction(() => battle && battle.active && battle.enemyPoke, null, { timeout: 15000 });
await page.waitForTimeout(400);
const imm = await page.evaluate(() => {
  const p = getActivePlayerPoke();
  p.moves = [{ id: 'earthquake' }, { id: 'tackle' }, { id: 'vinewhip' }];
  const e = battle.enemyPoke;
  e.talent = 'levitate';
  e.type1 = 'Electric'; e.type2 = null; e.types = ['Electric'];
  battle.pMoveIdx = 0;
  renderMoveButtons();
  updateBattleUI();
  const txt = (document.getElementById('move-buttons') || {}).textContent || '';
  return { active: battle.active, txt: txt.replace(/\s+/g, ' ').slice(0, 300), eff: battleDisplayedEff('Ground', e), effBase: typeEff('Ground', 'Electric', null) };
});
console.log('immunity', JSON.stringify(imm));
await page.waitForTimeout(300);
await shotEl('#win-battle', 'docs/captures/v7-r3-immunity-x0.png');
await page.evaluate(() => { if (battle.active) endBattle(); });
await page.waitForTimeout(300);

// 6. Relance auto des donjons : expédition, équipe K.O. → compte à rebours
await page.evaluate(() => {
  ensureWallet().dungeonTokens = 5000; G.dungeonClears = { mtmoon: 10 }; G.badges = ['brock']; G.unlockedLocs = Object.assign(G.unlockedLocs || {}, { mtmoon: true });
  clickLocation('mtmoon'); startDungeonRun('mtmoon'); dungeonSetAuto('farm');
});
for (let i = 0; i < 12; i++) {
  const st = await page.evaluate(() => { const r = G.dungeonRun; return { battle: !!(battle && battle.active), auto: r && r.auto, pos: r && (r.pos || [r.x, r.y]), pending: r && r.pending, floor: r && r.floor }; });
  if (st.battle) break;
  if (i % 3 === 0) console.log('dg poll', JSON.stringify(st));
  await page.waitForTimeout(1500);
}
const dg = await page.evaluate(async () => {
  if (battle.active) { G.team.forEach((p) => { p.currentHP = 0; }); await onPlayerPokeFaint(); }
  await new Promise((r) => setTimeout(r, 700));
  if (typeof closeBattleSummary === 'function') closeBattleSummary();
  await new Promise((r) => setTimeout(r, 250));
  const bar = document.getElementById('dungeon-auto-relaunch');
  return { battle: battle.active, run: !!(G.dungeonRun), bar: bar ? bar.textContent.replace(/\s+/g, ' ').slice(0, 200) : null, vis: bar ? bar.offsetHeight : -1 };
});
console.log('dungeon relaunch', JSON.stringify(dg));
await shotEl('#win-battle', 'docs/captures/v7-r3-dungeon-relaunch-countdown.png');
await page.waitForTimeout(6000);
const fired = await page.evaluate(() => ({ summaryOpen: document.getElementById('battle-summary-modal').classList.contains('open'), run: !!G.dungeonRun, auto: G.dungeonRun && G.dungeonRun.auto, loc: G.dungeonRun && G.dungeonRun.loc, tokens: ensureWallet().dungeonTokens, remaining: autoDungeonRelaunchRemainingMs() }));
console.log('relaunch fired', JSON.stringify(fired));
await page.evaluate(() => { if (typeof cancelAutoDungeonRelaunch === 'function') cancelAutoDungeonRelaunch(); });
console.log('desktop errors', errors);

// 7. Mobile (iPhone 12) : starter, Poké Balls, écran des sauvegardes
const mctx = await browser.newContext({ ...devices['iPhone 12'] });
const m = await mctx.newPage();
const merr = []; m.on('pageerror', (e) => merr.push(e.message));
await m.goto(BASE, { waitUntil: 'domcontentloaded' });
await m.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await m.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await m.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await m.waitForTimeout(500);
await m.screenshot({ path: 'docs/captures/v7-r3-mobile-starter.png' });
await m.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await m.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await m.waitForTimeout(600);
await m.evaluate(() => { const b = ensurePokeballs(); openBallPicker(b.filters[0].id); });
await m.waitForTimeout(500);
const pb = await m.evaluate(() => { const box = document.querySelector('.pw-ball-box'); if (!box) return null; const r = box.getBoundingClientRect(); return { w: Math.round(r.width), right: Math.round(r.right), vw: innerWidth, sw: box.scrollWidth }; });
console.log('mobile pokeball box', JSON.stringify(pb));
await m.screenshot({ path: 'docs/captures/v7-r3-mobile-pokeball.png' });
await m.goto(BASE, { waitUntil: 'domcontentloaded' });
await m.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await m.waitForTimeout(800);
await m.screenshot({ path: 'docs/captures/v7-r3-mobile-saves.png' });
console.log('mobile errors', merr);
await browser.close();
