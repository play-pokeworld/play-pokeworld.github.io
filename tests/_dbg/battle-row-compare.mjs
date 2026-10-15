import { chromium } from 'playwright';
const targets = [['p1', 'http://localhost:4176/'], ['p2', 'http://localhost:4174/']];
const browser = await chromium.launch();
for (const [tag, base] of targets) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.PokeWorldGameStarted === false || window.PokeWorldGameStarted === true, null, { timeout: 15000 });
  await page.evaluate(() => window.createNewSaveFromMenu && window.createNewSaveFromMenu());
  await page.waitForSelector('#starter-modal', { state: 'visible', timeout: 8000 });
  await page.evaluate(() => { const b = document.querySelector('#starter-modal [data-call*="pickStarter"], #starter-modal .starter-card, #starter-modal button'); if (b) b.click(); });
  await page.waitForFunction(() => window.__pwScreensReady === true, null, { timeout: 20000 });
  await page.evaluate(() => {
    // deterministic team: 3 Pokémon, one fainted, one with a status, so the row shows every visual state
    const a = window.createPoke(25, 40); const b = window.createPoke(1, 30); const c = window.createPoke(4, 30);
    b.currentHP = 0; c.status = 'psn'; c.currentHP = Math.floor(c.maxHP / 3);
    window.G.team = [a, b, c]; window.G.location = 'route1';
    window.startWildBattle();
  });
  await page.waitForTimeout(1500);
  const row = await page.$('#battle-team-row');
  const box = await row.boundingBox();
  const styles = await page.evaluate(() => {
    const pick = (el) => { const cs = getComputedStyle(el); return { display: cs.display, flexDirection: cs.flexDirection, gap: cs.gap, padding: cs.padding, margin: cs.margin, width: cs.width, height: cs.height, justifyContent: cs.justifyContent, alignItems: cs.alignItems, overflow: cs.overflow, background: cs.backgroundColor, border: cs.border, borderRadius: cs.borderRadius, fontSize: cs.fontSize }; };
    const row = document.getElementById('battle-team-row');
    const kids = Array.from(row.querySelectorAll('*')).slice(0, 60);
    return { row: pick(row), kids: kids.map((k) => ({ tag: k.tagName, cls: k.className && String(k.className).slice(0, 60), ...pick(k) })) };
  });
  await page.screenshot({ path: `tests/_dbg/battle-row-${tag}.png`, clip: { x: Math.max(0, box.x - 10), y: Math.max(0, box.y - 10), width: Math.min(1280, box.width + 20), height: Math.min(900, box.height + 20) } });
  const fs = await import('node:fs');
  fs.writeFileSync(`tests/_dbg/battle-row-${tag}.json`, JSON.stringify(styles, null, 1));
  console.log(tag, JSON.stringify(box));
  await page.close();
}
await browser.close();
