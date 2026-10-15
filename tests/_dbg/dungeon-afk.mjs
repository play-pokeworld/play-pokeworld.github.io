import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(500);
const scenario = process.argv[2] || 'pilot';
const r1 = await page.evaluate(async (scenario) => {
  const lvl = scenario === 'pilot' ? 90 : 45; while (G.team.length < 3) G.team.push(createPoke(6, lvl)); G.team.forEach((p) => { p.level = lvl; recalcPokeStats && recalcPokeStats(p); p.currentHP = p.maxHP; });
  ensureWallet().dungeonTokens = 100000;
  G.dungeonClears = { mtmoon: 10 };
  G.unlockedLocs = Object.assign({}, G.unlockedLocs || {}, { mtmoon: true, route3: true, route4: true });
  G.badges = ['brock'];
  clickLocation('mtmoon');
  await new Promise((r) => setTimeout(r, 300));
  const run = startDungeonRun('mtmoon');
  if (!run) return { err: 'no run' };
  if (scenario === 'pilot') { dungeonSetAuto('farm'); _dgAutoStep(); await new Promise((r) => setTimeout(r, 1500)); }
  else { // manual: engage one tile then stop (simulate leaving mid-fight)
    const near = Object.values(run.map.tiles).find((t) => t.revealed && (t.type === 'combat' || t.type === 'elite') && !t.done);
    if (near) dungeonMoveTo(near.id); else dungeonFight();
    await new Promise((r) => setTimeout(r, 800));
  }
  saveGame(false);
  const rr = currentDungeonRun();
  return { depth: rr.depth, floor: rr.floor, auto: rr.auto, active: battle.active, pending: rr.pendingNode, wins: rr.wins, loc: G.location };
}, scenario);
console.log('before', JSON.stringify(r1));
if (scenario === 'reload') {
  // emulate a 3 h absence: push the "seen" stamp back, then boot the save from the menu
  await page.evaluate(() => { offlinePersistSeen(Date.now() - 3 * 3600 * 1000); saveGame(false); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
  const saves = await page.evaluate(() => window.getSaveSummaries().map((s) => s.id));
  await page.evaluate((id) => window.startSaveById(id), saves[0]);
  await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 15000 });
  await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
  await page.waitForFunction(() => { const m = document.getElementById('afk-result-modal'); return !!(m && m.classList.contains('open')); }, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const st = await page.evaluate(() => { const rr = currentDungeonRun(); const res = OfflineEngine._lastResult; const modal = document.getElementById('afk-result-modal'); return { run: rr ? { floor: rr.floor, active: battle.active, pending: rr.pendingNode, auto: rr.auto, done: Object.values(rr.map.tiles).filter((t) => t.done).length } : null, html: document.documentElement.getAttribute('data-dungeon-run'), dungeon: res && res.dungeon, wins: res && res.wins, modalText: modal ? modal.innerText.replace(/\s+/g, ' ').slice(0, 500) : '' }; });
  console.log('after reload+boot catch-up', JSON.stringify(st, null, 1));
  await page.screenshot({ path: 'tests/_dbg/shots/afk-dungeon-reload-boot.png' });
  await page.evaluate(() => closeAfkResultPanel());
}
const r2 = await page.evaluate(async () => {
  const t0 = Date.now();
  const res = await offlineSimulate(3 * 3600 * 1000, 'debug');
  const rr = currentDungeonRun();
  const modal = document.getElementById('afk-result-modal');
  return { ms: Date.now() - t0, dungeon: res && res.dungeon, wins: res && res.wins, lost: res && res.lost, money: res && res.money, fainted: res && res.fainted,
    run: rr ? { floor: rr.floor, depth: rr.depth, auto: rr.auto, pos: rr.pos, wins: rr.wins, bag: rr.bag, done: Object.values(rr.map.tiles).filter((t) => t.done).length, total: Object.values(rr.map.tiles).length } : null,
    battleActive: battle.active, wallet: ensureWallet().dungeonTokens, clears: G.dungeonClears, modalOpen: !!(modal && modal.classList.contains('open')), modalText: modal ? modal.innerText.replace(/\s+/g, ' ').slice(0, 600) : '' };
});
console.log('result', JSON.stringify(r2, null, 1));
await page.waitForTimeout(1500);
const r3 = await page.evaluate(() => { const rr = currentDungeonRun(); return { run: !!rr, active: battle.active, auto: rr && rr.auto, html: document.documentElement.getAttribute('data-dungeon-run'), bar: !!document.getElementById('battle-dungeon-bar') }; });
console.log('after', JSON.stringify(r3));
await page.screenshot({ path: 'tests/_dbg/shots/afk-dungeon-' + scenario + '.png' });
console.log('errors', errors.slice(0, 5));
await browser.close();
