// Scénario AUTO-01 : achat en boutique (PQ) → défaite d'une chaîne sauvage →
// compte à rebours → relance automatique.
import { chromium } from 'playwright';
const BASE = process.env.PWK_BASE_URL || 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(500);
// Boutique de Jadielle : l'amélioration est listée, prix PQ, pas achetée.
const shop1 = await page.evaluate(() => {
  clickLocation('viridian');
  const loc = getLocObj(G.location);
  const model = typeof shopItemsModel === 'function' ? null : null;
  const el = document.createElement('div');
  renderShop(el);
  const card = [...el.querySelectorAll('.pw-shop-item')].find((c) => /autoRelaunch/.test(c.getAttribute('data-call-args') || ''));
  return { shopId: loc && loc.shopId, hasCard: !!card, text: card && card.textContent.replace(/\s+/g, ' ').trim(), priceHtml: card && card.querySelector('.pw-shop-price').innerHTML.slice(0, 120) };
});
console.log('shop before:', shop1);
// Achat sans PQ → refus ; avec PQ → ok.
const buy = await page.evaluate(() => {
  const out = {};
  ensureWallet().questPoints = 100;
  selectShopItem('autoRelaunch');
  buySelectedFromShop();
  out.ownedPoor = !!(G.automationUpgrades && G.automationUpgrades.autoRelaunch);
  out.pqPoor = ensureWallet().questPoints;
  ensureWallet().questPoints = 3000;
  selectShopItem('autoRelaunch');
  buySelectedFromShop();
  out.owned = !!(G.automationUpgrades && G.automationUpgrades.autoRelaunch);
  out.pqAfter = ensureWallet().questPoints;
  out.enabled = isAutoRelaunchEnabled();
  const el = document.createElement('div');
  renderShop(el);
  const card = [...el.querySelectorAll('.pw-shop-item')].find((c) => /autoRelaunch|Relance/.test(c.textContent));
  out.cardAfter = card && card.className + ' | ' + card.textContent.replace(/\s+/g, ' ').trim();
  renderAutoRelaunchBar();
  const host = document.getElementById('battle-auto-relaunch');
  out.bar = host && { hidden: host.hidden, text: host.textContent.replace(/\s+/g, ' ').trim() };
  return out;
});
console.log('buy:', buy);
// Défaite : équipe faible face à un adversaire boosté → chaîne perdue → compte à rebours.
await page.evaluate(() => {
  clickLocation('route1');
  G.team.forEach((p) => { p.currentHP = 1; });
  exploreArea();
});
await page.waitForTimeout(600);
await page.evaluate(() => {
  // Force la défaite : tous K.O. puis fin de combat via le chemin standard.
  G.team.forEach((p) => { p.currentHP = 0; });
  endBattle();
});
await page.waitForTimeout(1200);
const st1 = await page.evaluate(() => {
  const host = document.getElementById('battle-auto-relaunch');
  return { battleActive: !!(battle && battle.active), remaining: autoRelaunchRemainingMs(), bar: host && host.textContent.replace(/\s+/g, ' ').trim(), teamHp: G.team.map((p) => p.currentHP + '/' + p.maxHP) };
});
console.log('after defeat:', st1);
await page.screenshot({ path: 'tests/_dbg/shots/auto-relaunch-countdown.png' });
await page.waitForTimeout(5500);
const st2 = await page.evaluate(() => ({ battleActive: !!(battle && battle.active), chill: battle && battle.chill, enemy: battle && battle.enemyPoke && battle.enemyPoke.name, remaining: autoRelaunchRemainingMs(), log: (document.getElementById('battle-log') || {}).textContent?.slice(-200) }));
console.log('after countdown:', st2);
// Annulation : nouvelle défaite puis clic Annuler.
await page.evaluate(() => { G.team.forEach((p) => { p.currentHP = 0; }); endBattle(); });
await page.waitForTimeout(800);
const cancelBtn = await page.$('#battle-auto-relaunch .pw-auto-relaunch-cancel');
console.log('cancel button present:', !!cancelBtn);
if (cancelBtn) await cancelBtn.click();
await page.waitForTimeout(5500);
const st3 = await page.evaluate(() => ({ battleActive: !!(battle && battle.active), remaining: autoRelaunchRemainingMs(), bar: document.getElementById('battle-auto-relaunch').textContent.replace(/\s+/g, ' ').trim() }));
console.log('after cancel:', st3);
// Interrupteur OFF → défaite → rien.
await page.evaluate(() => { toggleAutoRelaunch(); exploreArea(); });
await page.waitForTimeout(500);
await page.evaluate(() => { G.team.forEach((p) => { p.currentHP = 0; }); endBattle(); });
await page.waitForTimeout(800);
const st4 = await page.evaluate(() => ({ enabled: isAutoRelaunchEnabled(), remaining: autoRelaunchRemainingMs(), bar: document.getElementById('battle-auto-relaunch').textContent.replace(/\s+/g, ' ').trim() }));
console.log('toggle off:', st4);
console.log('errors:', errors.slice(0, 5));
await browser.close();
