import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4174/';
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); b && b.click(); });
await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
await page.waitForTimeout(500);
async function inspect(label) {
  return page.evaluate((label) => {
    const card = document.querySelector('#battle-team-row .pw-enemy-card');
    const out = { label, cardCls: card.className, cardHtmlLen: card.innerHTML.length };
    const parts = [...card.children].map((c) => ({ cls: c.className.slice(0, 60), display: getComputedStyle(c).display, h: c.getBoundingClientRect().height | 0 }));
    out.parts = parts;
    const movesHost = card.querySelector('.moves, .poke-moves, .pw-moves, [class*="moves"]');
    out.movesHost = movesHost ? { cls: movesHost.className, display: getComputedStyle(movesHost).display, h: movesHost.getBoundingClientRect().height | 0, visibility: getComputedStyle(movesHost).visibility, children: movesHost.children.length } : null;
    const first = card.querySelector('[class*="move"]');
    out.firstMove = first ? { cls: first.className, display: getComputedStyle(first).display, rect: first.getBoundingClientRect().toJSON() } : null;
    out.html = card.outerHTML.slice(0, 2500);
    return out;
  }, label);
}
await page.evaluate(async () => { G.team.forEach((p) => { p.level = 30; p.maxHP = 120; p.currentHP = 120; }); window.clickLocation('pewter'); await new Promise((r) => setTimeout(r, 200)); window.startChampBattle('brock'); });
await page.waitForFunction(() => battle.active && battle.isChamp && battle.enemyPoke, null, { timeout: 8000 });
await page.waitForTimeout(600);
const c = await inspect('champ');
console.log(JSON.stringify({ ...c, html: undefined }, null, 1));
console.log(c.html);
await browser.close();
