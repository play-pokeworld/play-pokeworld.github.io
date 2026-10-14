import { chromium } from 'playwright';
const BASE_URL = process.env.PWK_BASE_URL || 'http://localhost:4173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.PokeWorldGameStarted !== undefined, null, { timeout: 15000 });
await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 }).catch(()=>{});
const picked = await page.evaluate(() => { const b = document.querySelector('#starter-modal button, #starter-modal .starter-card'); if (b) { b.click(); return true; } return false; });
if (!picked) {
  await page.evaluate(() => { window.G.starter = true; const p = window.createPoke(4, 5, false); window.G.team.push(p); window.saveGame(); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
} else await page.waitForFunction(() => window.PokeWorldGameStarted === true, null, { timeout: 8000 });
await page.evaluate(() => { G.pokedex[16] = { seen: true }; const e = window.createPoke(16, 5, false); e._isEnemy = true; window.startBattle(e, false); });
await page.waitForTimeout(900);
const r = await page.evaluate(() => {
  const out = {};
  // grip dots gone?
  out.gripCount = document.querySelectorAll('.pw-win-hdr-grip').length;
  out.gripVisible = document.querySelectorAll('#win-team .pw-win-hdr-grip').length;
  // battle bg
  const bp = document.getElementById('battle-center-panel');
  const bg = bp ? getComputedStyle(bp).backgroundImage : '';
  out.battleBg = bg.slice(0, 70);
  // enemy card: big sprite?
  const enemy = document.querySelector('#battle-team-row .poke-card:first-child');
  const sprite = enemy ? enemy.querySelector('.pw-poke-circle-img') : null;
  const info = enemy ? enemy.querySelector('.poke-info') : null;
  out.enemySpriteSize = sprite ? sprite.getBoundingClientRect().width : null;
  out.enemyInfoBg = info ? getComputedStyle(info).backgroundColor : null;
  out.enemyCardBg = enemy ? getComputedStyle(enemy).backgroundColor : null;
  // team cards (player)
  const player = document.querySelector('#battle-team-row .poke-card:not(:first-child)');
  out.playerCardBorder = player ? getComputedStyle(player).borderTopWidth + ' ' + getComputedStyle(player).borderTopColor : null;
  // pokeball rows: full width straight no hover
  const row = document.querySelector('#pokeballs-window-body .pw-ball-row');
  const rcs = row ? getComputedStyle(row) : null;
  const panel = document.getElementById('pokeballs-window-body');
  out.ballRow = rcs ? { radius: rcs.borderRadius, borderBottom: rcs.borderBottomWidth, bg: rcs.backgroundColor } : null;
  out.ballRowWidth = row ? row.getBoundingClientRect().width : null;
  out.ballPanelWidth = panel ? panel.getBoundingClientRect().width : null;
  // team window cards
  const tc = document.querySelector('#team-window-body .poke-card');
  out.teamCard = tc ? { bg: getComputedStyle(tc).backgroundColor, border: getComputedStyle(tc).borderTopWidth } : null;
  return out;
});
console.log(JSON.stringify(r, null, 1));
console.log('ERRORS:', JSON.stringify(errors));
await browser.close();

