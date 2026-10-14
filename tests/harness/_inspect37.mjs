import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.getByText(/nouvelle partie/i).first().click();
await page.waitForTimeout(1000);
await page.getByText(/choisir/i).nth(1).click();
await page.waitForTimeout(2000);
await page.evaluate(() => {
  window.gainDungeonTokens(5000);
  G.location = 'mtmoon';
  window.showTab && window.showTab('battle');
  window.startDungeonRun('mtmoon');
});
await page.waitForTimeout(600);
await page.evaluate(() => {
  const r = G.dungeonRun;
  Object.values(r.map.tiles).forEach((t) => { t.revealed = true; });
  window.refreshDungeonPanel();
});
await page.waitForTimeout(300);
const info = await page.evaluate(() => {
  const tiles = [...document.querySelectorAll('#battle-dungeon-bar .pw-dgn-tile')];
  const chest = tiles.find((t) => t.className.includes('t-chest'));
  const here = tiles.find((t) => t.className.includes('is-here'));
  const cs = chest ? getComputedStyle(chest) : null;
  return {
    chestClass: chest && chest.className,
    chestHtml: chest && chest.innerHTML.slice(0, 220),
    chestBg: cs && cs.backgroundColor,
    chestColor: cs && cs.color,
    hereClass: here && here.className,
    hereBg: here && getComputedStyle(here).backgroundColor,
  };
});
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: '/home/user/shots/p37-revealed.png' });
await browser.close();
