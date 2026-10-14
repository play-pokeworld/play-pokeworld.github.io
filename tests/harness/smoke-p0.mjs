// smoke-p0.mjs — end-to-end verification of the P0 monetary system v2
// (dashboard windows, poké balls + filters, capture economy, diamonds, PQ).
// Requires the built app served over HTTP (vite preview) + a real Chromium.
//
//   npx vite build && npx vite preview --host 0.0.0.0 --port 4173 &
//   node tests/harness/smoke-p0.mjs

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

// Start a real game (same flow as smoke-boot).
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

// ── 1. Dashboard windows exist ─────────────────────────────────────────────
assert.equal(await page.evaluate(() => !!document.getElementById('win-currency')), true, 'P0-1 — win-currency window present');
assert.equal(await page.evaluate(() => !!document.getElementById('win-pokeballs')), true, 'P0-2 — win-pokeballs window present');
await page.waitForTimeout(400);
const curHtml = await page.evaluate(() => document.getElementById('currency-window-body')?.innerHTML || '');
assert.ok(curHtml.includes('Pokédollars') && curHtml.includes('₽') === false || curHtml.includes('Pokédollars'), 'P0-3 — currency window lists money');
assert.ok(!curHtml.includes('Jetons de donjon'), 'P0-4 — JD hidden until first earned (progressive reveal)');

// ── 2. Poké Balls window with filters ──────────────────────────────────────
const ballHtml = await page.evaluate(() => document.getElementById('pokeballs-window-body')?.innerHTML || '');
assert.ok(/Nom/.test(ballHtml) && ballHtml.includes('openBallPicker'), 'P0-5 — filter list renders (PokéClicker style, "Nom" header)');
assert.ok((await page.evaluate(() => document.getElementById('win-pokeballs')?.innerHTML || '')).includes('openBallFilterEditor'), 'P0-6 — filter editor gear wired in the window header');
assert.ok(!ballHtml.includes('ball_honor_progress'), 'P0-6b — no honor hint in the window');
const starterBalls = await page.evaluate(() => window.ensurePokeballs().pokeball);
assert.equal(starterBalls, 10, 'P0-7 — starter gives 10 Poké Balls');

// ── 3. Balls bought in the SHOP (not in the window) ────────────────────────
await page.evaluate(() => { G.money = 5000; window.buyPokeballs('pokeball', 10); });
const after = await page.evaluate(() => ({ pb: G.pokeballs.pokeball, honor: G.pokeballs.honorball, money: G.money }));
assert.equal(after.pb, 20, 'P0-8 — +10 balls');
assert.equal(after.honor, 1, 'P0-9 — Honor Ball granted per 10 Poké Balls');
assert.equal(after.money, 4000, 'P0-10 — money deducted (10 × 100 ₽)');

// ── 4. Wild victory awards ₽ ───────────────────────────────────────────────
const moneyBefore = await page.evaluate(() => G.money);
await page.evaluate(() => { if (typeof window.awardWildVictoryMoney === 'function') window.awardWildVictoryMoney(); });
const moneyAfter = await page.evaluate(() => G.money);
assert.ok(moneyAfter > moneyBefore && (moneyAfter - moneyBefore) >= 10, 'P0-11 — wild victory pays ≥ 10 ₽');

// ── 5. ballForEnemy : nouveau → pokeball, possédé → pokeball (défaut) ──────
const attempt = await page.evaluate(() => {
  const starterId = (G.team && G.team[0]) ? Number(G.team[0].id) : 999;
  const newBall = window.ballForEnemy({ id: 999, name: 'X', shinyActive: false });
  const ownedBall = window.ballForEnemy({ id: starterId, name: 'Y', shinyActive: false });
  return { newBall, ownedBall };
});
assert.equal(attempt.newBall, null, 'P0-12 — default filters on « none » → no ball thrown yet');
assert.equal(attempt.ownedBall, null, 'P0-13 — default filters on « none » (tutorial asks to set the ball)');

// ── 6. JD from captures (real attemptAutoCatch path) ───────────────────────
await page.evaluate(() => {
  G.pokeballs.pokeball = 10;
  G.pokeballs.greatball = 0;
  G.pokeballs.filters = [
    { id: 'new_shiny', options: { caught: false, caughtShiny: false, shiny: true }, ball: 'pokeball', enabled: true },
    { id: 'new', options: { caught: false }, ball: 'pokeball', enabled: true },
    { id: 'caught_shiny', options: { caught: true, caughtShiny: true }, ball: 'ultraball', enabled: true },
    { id: 'caught', options: { caught: true }, ball: 'greatball', enabled: false },
  ];
  G.wallet.dungeonTokens = 0;
  G.wallet.revealed = G.wallet.revealed || {};
});
const jdBefore = await page.evaluate(() => window.ensureWallet().dungeonTokens);
// Force a success capture of a never-owned species (id 147 Dratini) with balls.
await page.evaluate(() => {
  const origChance = window.chance;
  window.chance = () => true; // force capture success
  try { window.attemptAutoCatch({ id: 147, name: 'Minidraco', shinyActive: false, emoji: '🐉' }); } catch (e) { window.__p0Err = String(e); }
  window.chance = origChance;
});
const jdAfter = await page.evaluate(() => window.ensureWallet().dungeonTokens);
assert.ok((jdAfter - jdBefore) > 0, 'P0-14 — capture awards dungeon tokens');
assert.equal(await page.evaluate(() => window.__p0Err || ''), '', 'P0-15 — no error during capture');

// ── 7. Treasure sale → diamonds ────────────────────────────────────────────
await page.evaluate(() => { if (!G.inventory) G.inventory = {}; G.inventory.nugget = 1; window.sellTreasure('nugget', 1); });
assert.equal(await page.evaluate(() => window.ensureWallet().diamonds), 100, 'P0-16 — nugget sells for 100 💎');

// ── 8. Repeatable quest → PQ ───────────────────────────────────────────────
await page.evaluate(() => {
  if (!G.repeatables) G.repeatables = [];
  G.repeatableQuestsUnlocked = true;
  const q = window.REPEATABLE_QUESTS[0];
  const inst = { qid: q.id, cat: 'repeatable', def: q, progress: 999, done: false };
  G.repeatables.push(inst);
  window.claimQuest(q.id, 'repeatable');
});
const pq = await page.evaluate(() => window.ensureWallet().questPoints);
assert.ok(pq > 0, 'P0-17 — repeatable quest awards quest points (got ' + pq + ')');

// ── 9. Capture animation toggle ────────────────────────────────────────────
await page.evaluate(() => window.toggleCaptureAnimations());
assert.equal(await page.evaluate(() => window.captureAnimationsEnabled()), false, 'P0-18 — capture animation disabled');
await page.evaluate(() => window.toggleCaptureAnimations());
assert.equal(await page.evaluate(() => window.captureAnimationsEnabled()), true, 'P0-19 — re-enabled');

// ── 10. No header currency strip (currencies live in the window) ───────────
assert.equal(await page.evaluate(() => !!document.getElementById('h-currencies')), false, 'P0-20 — no currency strip in the header');

assert.deepEqual(errors, [], 'P0 — no page errors during the whole flow');
console.log('smoke-p0: OK — dashboard windows, filters, shop balls, Honor Ball, wild ₽, JD on capture, 💎 sale, PQ quest, animation toggle, 0 error.');
await browser.close();

