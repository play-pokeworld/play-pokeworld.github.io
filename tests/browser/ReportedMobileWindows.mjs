/**
 * @file ReportedMobileWindows.mjs
 * @brief Regression sweep for responsive defects reported in dialogs, Pokédex details, Settings,
 *        and the Achievements filter. Tests actual layout and scroll bounds at compact and tablet sizes.
 *
 * Run: npm start (in another terminal) then
 *   PW_URL=http://127.0.0.1:3000/ node tests/browser/ReportedMobileWindows.mjs
 */
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.PW_URL || 'http://127.0.0.1:3000/';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.setDefaultTimeout(15000);
const failures = [];
page.on('pageerror', (error) => failures.push(error.message));
await page.goto(BASE, { waitUntil: 'networkidle' });
const touch = await page.context().newCDPSession(page);
await page.evaluate(async () => {
  const { SaveSystem } = await import('/src/systems/SaveSystem.js');
  const { Engine } = await import('/src/core/Engine.js');
  SaveSystem.getInstance().createNewSave('Responsive audit', 'charmander');
  Engine.getInstance().getPageManager().openPage('game');
});
await page.waitForTimeout(450);
const sizes = [[320, 568], [390, 844], [844, 390], [768, 1024], [1024, 768]];
const windows = [
  { id: 'settings-window', kind: 'modal', params: {}, panel: '#settings-window', scroller: '#settings-window > .pw-settings-root' },
  { id: 'pw-npc-talk', kind: 'modal', params: null, panel: '#pw-npc-talk', scroller: '#pw-npc-talk > .win-body' },
  { id: 'pw-pokedex-detail-modal', kind: 'modal', params: { speciesId: 'bulbasaur' }, panel: '#pw-pokedex-detail-modal .pw-pokedex-species-window', scroller: '#pw-pokedex-detail-modal .pw-pokedex-species-body' },
  { id: 'fs-achievements', kind: 'fullscreen', params: {}, panel: '#fs-achievements > .pw-modal-container', scroller: '#fs-achievements .pw-modal-body' }
];
const report = [];
for (const [width, height] of sizes) {
  await page.setViewportSize({ width, height });
  for (const entry of windows) {
    let params = entry.params;
    if (entry.id === 'pw-npc-talk') {
      params = await page.evaluate(async () => {
        const { NpcDirectory } = await import('/src/data/world/NpcDirectory.js');
        return { locationId: 'pallet', npcId: NpcDirectory.getByLocation('pallet')[0]?.id };
      });
    }
    await page.evaluate(async ({ id, params }) => {
      const { EventBus } = await import('/src/core/EventBus.js');
      const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
      EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(id, params || {}));
    }, { id: entry.id, params });
    await page.waitForTimeout(80);
    const result = await page.evaluate(({ entry, width, height }) => {
      const panel = document.querySelector(entry.panel);
      const scroll = document.querySelector(entry.scroller);
      if (!panel || !scroll) return { missing: true };
      const rect = panel.getBoundingClientRect();
      const filter = panel.querySelector('.pw-ach-filterbar');
      let filterFits = true;
      let chipsWhole = true;
      if (filter) {
        const fr = filter.getBoundingClientRect();
        const pr = filter.parentElement.getBoundingClientRect();
        filterFits = fr.left >= pr.left - 1 && fr.right <= pr.right + 1;
        const row = filter.querySelector('.pw-chip-row');
        if (row) {
          const rr = row.getBoundingClientRect();
          chipsWhole = [...row.children].every((chip) => {
            const cr = chip.getBoundingClientRect();
            return cr.left >= rr.left - 1 && cr.right <= rr.right + 1 && cr.top >= rr.top - 1 && cr.bottom <= rr.bottom + 1;
          });
        }
      }
      const overflowing = scroll.scrollHeight > scroll.clientHeight + 1;
      scroll.scrollTop = 0;
      const sr = scroll.getBoundingClientRect();
      return {
        withinViewport: rect.left >= -1 && rect.top >= -1 && rect.right <= width + 1 && rect.bottom <= height + 1,
        noHorizontalScroll: document.documentElement.scrollWidth <= width + 1,
        overflowing,
        contentWidth: scroll.scrollWidth,
        viewportWidth: scroll.clientWidth,
        overflowers: [...scroll.querySelectorAll('*')].map((node) => ({
          selector: `${node.tagName.toLowerCase()}.${String(node.className).trim().split(/\\s+/).slice(0, 2).join('.')}`,
          right: Math.round(node.getBoundingClientRect().right),
          width: Math.round(node.getBoundingClientRect().width)
        })).filter((node) => node.width > 0 && node.right > sr.right + 2).slice(0, 8),
        scrollBox: { x: sr.left + sr.width / 2, y: sr.top + sr.height / 2 },
        filterFits,
        chipsWhole,
        box: [Math.round(rect.width), Math.round(rect.height)]
      };
    }, { entry, width, height });
    assert.ok(!result.missing, `${entry.id} is mounted at ${width}x${height}`);
    assert.ok(result.withinViewport, `${entry.id} frame fits at ${width}x${height}: ${result.box}`);
    assert.ok(result.noHorizontalScroll, `${entry.id} does not cause page overflow at ${width}x${height}`);
    assert.ok(result.contentWidth <= result.viewportWidth + 1, `${entry.id} content fits its scroll viewport at ${width}x${height}: ${result.contentWidth}/${result.viewportWidth}; ${JSON.stringify(result.overflowers)}`);
    assert.ok(result.filterFits && result.chipsWhole, `${entry.id} filter header remains inside its panel at ${width}x${height}`);
    let touchScrolled = true;
    if (result.overflowing && result.scrollBox.y > 35 && result.scrollBox.y < height - 35) {
      const { x, y } = result.scrollBox;
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 12; step += 1) {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - (150 * step) / 12 }] });
        await page.waitForTimeout(16);
      }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(120);
      touchScrolled = await page.evaluate((selector) => document.querySelector(selector)?.scrollTop > 0, entry.scroller);
      assert.ok(touchScrolled, `${entry.id} scrolls under a real emulated finger gesture at ${width}x${height}`);
      const reachesEnd = await page.evaluate((selector) => {
        const scroll = document.querySelector(selector);
        scroll.scrollTop = scroll.scrollHeight;
        return scroll.scrollTop >= scroll.scrollHeight - scroll.clientHeight - 1;
      }, entry.scroller);
      assert.ok(reachesEnd, `${entry.id} can reach its final content at ${width}x${height}`);
    }
    report.push(`${entry.id}@${width}x${height}${result.overflowing ? ' touch-scroll' : ''}`);
    await page.evaluate(async (id) => {
      const { EventBus } = await import('/src/core/EventBus.js');
      const { ModalCloseRequestedEvent } = await import('/src/core/events/ModalCloseRequestedEvent.js');
      EventBus.getInstance().dispatch(new ModalCloseRequestedEvent(id));
    }, entry.id);
    await page.waitForTimeout(50);
  }
}
assert.deepEqual(failures, [], 'the browser console has no page errors');
await browser.close();
console.log(`PASS ${report.length} window/viewport checks (${sizes.length} sizes × ${windows.length} windows)`);
console.log(report.join('\n'));
