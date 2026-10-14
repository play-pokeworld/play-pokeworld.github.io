// smoke-p0c.mjs — PokéClicker-style shop flow in a real Chromium:
//  click-to-select, qty input + Reset/+10/+100/Max, single Buy at bottom,
//  progressive ball unlock incl. Master Ball controls at the League.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });

await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 }).catch(() => {});
const picked = await page.evaluate(() => {
  const btn = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button');
  if (btn) { btn.click(); return true; } return false;
});
if (picked) {
  await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
} else {
  await page.evaluate(() => { window.G.starter = true; window.G.team.push(window.createPoke(4, 5, false)); window.saveGame(); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.startSaveById(window.currentSaveId || localStorage.getItem('pokeworld_active_save')));
  await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
}
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
// Neutralize tutorial rewards so they cannot shift money during assertions.
await page.evaluate(() => {
  try {
    const st = window.ensureTutorialState();
    if (window.tutorialSteps) for (const s of window.tutorialSteps()) st.rewards[s.id] = true;
  } catch (_) {}
});

const openShop = (loc, extra) => page.evaluate(([l, x]) => {
  G.location = l;
  Object.assign(G, x || {});
  const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  window.renderShop(el);
}, [loc, extra || {}]);

// ── 1. Pallet: footer appears once an item is selected ─────────────────────
await page.evaluate(() => { G.money = 10000; });
await openShop('pallet');
const gridOnly = await page.evaluate(() => {
  const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  const items = [...el.querySelectorAll('.pw-shop-item')];
  return { hasFooter: !!el.querySelector('.pw-shop-footer'), itemNames: items.map(i => i.querySelector('.pw-shop-name').textContent.trim()) };
});
assert.equal(gridOnly.hasFooter, false, 'S1 — no buy bar before selecting an item');
assert.ok(gridOnly.itemNames.includes('Poké Ball'), 'S2 — pallet sells the Poké Ball');
assert.ok(!gridOnly.itemNames.includes('Super Ball') && !gridOnly.itemNames.includes('Hyper Ball'), 'S3 — pallet does NOT sell Super/Hyper Ball');

// Select the Poké Ball → the buy bar appears.
await page.evaluate(() => { window.selectShopItem('pokeball'); });
const footer = await page.evaluate(() => {
  const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  const f = el.querySelector('.pw-shop-footer');
  return { hasFooter: !!f, footerText: f ? f.textContent : '', selected: el.querySelector('.pw-shop-item.selected .pw-shop-name')?.textContent?.trim(), qty: el.querySelector('.pw-shop-qty')?.value };
});
assert.equal(footer.hasFooter, true, 'S4 — buy bar appears after selecting');
assert.equal(footer.selected, 'Poké Ball', 'S5 — clicking selects the item');
assert.equal(footer.qty, '1', 'S6 — qty starts at 1');
assert.ok(/Reset/.test(footer.footerText) && /\+10/.test(footer.footerText) && /\+100/.test(footer.footerText) && /Max/.test(footer.footerText) && /Acheter/.test(footer.footerText), 'S7 — Reset/+10/+100/Max/Acheter buttons');

// ── 2. Select + qty + buy flow ─────────────────────────────────────────────
await page.evaluate(() => { window.shopAddQty(10); });
assert.equal(await page.evaluate(() => { const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content'); return el.querySelector('.pw-shop-qty').value; }), '11', 'S8 — +10 → 11');
await page.evaluate(() => { window.shopAddQty(100); });
assert.equal(await page.evaluate(() => { const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content'); return el.querySelector('.pw-shop-qty').value; }), '100', 'S9 — +100 clamped by money (10000/100 = 100)');
await page.evaluate(() => { window.shopResetQty(); });
assert.equal(await page.evaluate(() => { const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content'); return el.querySelector('.pw-shop-qty').value; }), '1', 'S10 — Reset → 1');
await page.evaluate(() => { window.shopMaxQty(); });
const maxQty = await page.evaluate(() => { const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content'); return Number(el.querySelector('.pw-shop-qty').value); });
assert.equal(maxQty, 100, 'S11 — Max → affordable (10000/100 = 100)');

// Buy 5 balls.
await page.evaluate(() => { window.shopResetQty(); window.shopAddQty(4); window.buySelectedFromShop(); });
const afterBuy = await page.evaluate(() => ({ money: G.money, balls: G.pokeballs.pokeball, bought: G.totalBallsBought }));
assert.equal(afterBuy.balls, 10 + 5, 'S12 — 5 balls bought (10 starter + 5)');
assert.equal(afterBuy.money, 10000 - 500, 'S13 — money deducted (5 × 100 ₽)');
assert.equal(afterBuy.bought, 5, 'S14 — totalBallsBought counter incremented');
// The counter resets to 1 after each purchase.
assert.equal(await page.evaluate(() => { const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content'); return el.querySelector('.pw-shop-qty')?.value; }), '1', 'S15 — qty resets to 1 after purchase');

// ── 2b. Bulk item buy: exact quantity received AND exact money deducted ────
await openShop('pewter', { money: 1000000 });
await page.evaluate(() => { window.selectShopItem('occa_berry'); window.shopAddQty(4); window.buySelectedFromShop(); });
const bulkItem = await page.evaluate(() => ({ money: G.money, inv: G.inventory.occa_berry || 0 }));
assert.equal(bulkItem.inv, 5, 'S24 — bulk item buy gives exactly 5 (not 1)');
assert.equal(bulkItem.money, 1000000 - 5 * 20000, 'S25 — exactly 5 × 20,000 ₽ deducted');

// ── 2c. Bag cap clamp (held items capped at 25) ────────────────────────────
await openShop('pewter', { money: 100000000, inventory: { occa_berry: 24 } });
await page.evaluate(() => { window.selectShopItem('occa_berry'); window.shopMaxQty(); });
const clamped = await page.evaluate(() => { const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content'); return Number(el.querySelector('.pw-shop-qty').value); });
assert.equal(clamped, 1, 'S16 — Max clamped by bag cap (25 − 24 owned = 1)');
await page.evaluate(() => { window.shopResetQty(); window.shopAddQty(100); });
assert.equal(await page.evaluate(() => { const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content'); return Number(el.querySelector('.pw-shop-qty').value); }), 1, 'S17 — +100 clamped by bag cap (cannot buy more than fits)');

// ── 3. Master Ball at the League (badgeReq 8): 4 entries, one per currency ─
await openShop('indigo', { championTitle: true, money: 20000000 });
const master = await page.evaluate(() => {
  const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  const cards = [...el.querySelectorAll('.pw-shop-item')].filter(c => /Master Ball/.test(c.querySelector('.pw-shop-name')?.textContent || ''));
  return { n: cards.length, names: cards.map(c => c.querySelector('.pw-shop-name').textContent.trim()), prices: cards.map(c => c.querySelector('.pw-shop-price').textContent.trim()) };
});
assert.equal(master.n >= 4, true, 'S18 — Master Ball listed 4 times at the League (one per currency)');
assert.ok(master.prices.some(p => /10M|10,000,000|10 000 000/.test(p)), 'S19 — money price shown');
assert.ok(master.names.some(n => /Pokédollars/.test(n)) && master.names.some(n => /Jetons de donjon/.test(n)) && master.names.some(n => /Points de quête/.test(n)) && master.names.some(n => /Diamants/.test(n)), 'S20 — the 4 currencies are labeled');

// Select the money Master Ball → buy bar with qty (batch) in ₽.
await page.evaluate(() => { window.selectShopItem('masterball_money'); });
const mbBuy = await page.evaluate(() => {
  const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  const f = el.querySelector('.pw-shop-footer');
  return { hasQty: !!el.querySelector('.pw-shop-qty'), total: f ? f.textContent : '', buyBtn: f ? !!f.querySelector('.pw-shop-buy') : false };
});
assert.equal(mbBuy.hasQty, true, 'S21 — Master Ball can be bought in batch (qty input)');
assert.ok(/Acheter/.test(mbBuy.total) && /10M|10,000,000|10 000 000/.test(mbBuy.total), 'S22 — buy bar shows the money total');

// Buy 1 Master Ball with money → counter increments.
await page.evaluate(() => { G.money = 20000000; window.shopResetQty(); window.buySelectedFromShop(); });
assert.equal(await page.evaluate(() => G.pokeballs.masterball), 1, 'S23 — 1 Master Ball bought with money');
assert.equal(await page.evaluate(() => G.masterBallsBought), 1, 'S24 — masterBallsBought counter');

// ── 4. Staff: recruit one, then it shows "Acheté" in red in the grid ───────
await openShop('cerulean', { money: 1000000 });
const staffBefore = await page.evaluate(() => {
  const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  const card = [...el.querySelectorAll('.pw-shop-item')].find(c => !/(Ball)/.test(c.querySelector('.pw-shop-name')?.textContent || '') && c.querySelector('.pw-shop-name') && c.querySelector('.pw-shop-price')?.textContent);
  return card ? card.querySelector('.pw-shop-name').textContent.trim() : null;
});
assert.ok(staffBefore, 'S25 — a recruitable staff member appears in the shop grid');
// Recruit via buyStaff then re-render.
await page.evaluate(() => {
  const defs = window.staffDefsForLocation && window.staffDefsForLocation('cerulean');
  const first = (defs && defs[0]) || null;
  if (first && typeof window.buyStaff === 'function') window.buyStaff(first.id);
  const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  window.renderShop(el);
});
const staffAfter = await page.evaluate(() => {
  const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  const sold = [...el.querySelectorAll('.pw-shop-item.soldout')].map(c => c.textContent);
  return { sold };
});
assert.ok(staffAfter.sold.some(t => /Acheté/.test(t)), 'S26 — owned staff shows "Acheté" (red) in the grid');

// ── 5. Pokémon market works like the shop (select → bottom buy bar, PQ) ─────
await page.evaluate(() => {
  G.region = 'kanto';
  G.team = [];
  G.pokedex = {};
  const w = window.ensureWallet(); w.questPoints = 100000;
  const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  window.renderMarket(el);
});
const market = await page.evaluate(() => {
  const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  const cards = [...el.querySelectorAll('.pw-market-row')];
  cards[0].click();
  const footer = el.querySelector('.pw-market-footer');
  return {
    nCards: cards.length,
    hasFooter: !!footer,
    hasBuy: !!(footer && footer.querySelector('[data-call="buySelectedMarket"]')),
    selected: !!el.querySelector('.pw-market-row.selected'),
    qty: footer ? footer.querySelector('.pw-shop-qty')?.value : null,
  };
});
assert.ok(market.nCards >= 1, 'S27 — market lists species');
assert.ok(market.selected && market.hasFooter && market.hasBuy, 'S28 — click selects a Pokémon and shows the bottom buy bar');
assert.equal(market.qty, '1', 'S29 — market qty starts at 1');
// Indicateur de balle (vide / normale / dorée) sur chaque carte.
const marketBalls = await page.evaluate(() => {
  const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
  return [...el.querySelectorAll('.pw-market-ball')].map((b) => b.getAttribute('src'));
});
assert.ok(marketBalls.length >= 1, 'S30 — market cards carry a ball status indicator');
assert.ok(marketBalls.some((src) => src.includes('Pokeball.svg')) || marketBalls.some((src) => src.includes('None.svg')), 'S31 — ball indicator uses empty/normal ball sprites');

assert.deepEqual(errors, [], 'Z — no page errors');
console.log('smoke-p0c: OK — shop + market (select/buy bar) PokéClicker-style, clamped qty, Master Ball per currency, staff Acheté, 0 error.');
await browser.close();

