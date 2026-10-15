import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(500);
function dump(label) {
  return page.evaluate((label) => {
    const row = document.getElementById('battle-team-row');
    const enemy = row.querySelector('.poke-card.enemy, [data-enemy="1"], .enemy-card') || row.firstElementChild;
    const cards = [...row.children].map((c) => ({ cls: c.className.slice(0, 80), h: c.getBoundingClientRect().height | 0, w: c.getBoundingClientRect().width | 0, moves: c.querySelectorAll('.move-bar, .pw-move-bar, [class*="move"]').length, text: c.textContent.replace(/\s+/g, ' ').slice(0, 140) }));
    return { label, isChamp: battle.isChamp, enemyMoves: battle.enemyPoke && battle.enemyPoke.moves, enemyKeys: battle.enemyPoke && Object.keys(battle.enemyPoke).slice(0, 40), cards };
  }, label);
}
// wild battle
await page.evaluate(async () => { window.clickLocation('route1'); await new Promise((r) => setTimeout(r, 200)); window.exploreArea(); });
await page.waitForFunction(() => battle.active && battle.enemyPoke, null, { timeout: 8000 });
await page.waitForTimeout(600);
const wild = await dump('wild');
console.log(JSON.stringify(wild, null, 1));
await page.screenshot({ path: 'tests/_dbg/shots/wild-battle.png' });
await page.evaluate(() => { battle.paused = true; window.endBattle && window.endBattle(); });
await page.waitForTimeout(400);
// gym battle (Brock) : need badges? badgeReq 0 for brock
await page.evaluate(async () => { G.team.forEach((p) => { p.level = 30; p.maxHP = 120; p.currentHP = 120; }); window.clickLocation('pewter'); await new Promise((r) => setTimeout(r, 200)); window.startChampBattle('brock'); });
await page.waitForFunction(() => battle.active && battle.isChamp && battle.enemyPoke, null, { timeout: 8000 });
await page.waitForTimeout(600);
const champ = await dump('champ');
console.log(JSON.stringify(champ, null, 1));
await page.screenshot({ path: 'tests/_dbg/shots/champ-battle.png' });
console.log('errors', errors);
await browser.close();
