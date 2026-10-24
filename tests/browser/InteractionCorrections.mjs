/** @file InteractionCorrections.mjs @brief Real immediate card gestures, old-main file import and live battle sizing. Fixtures, not a campaign. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const output =
  process.env.PW_BROWSER_OUTPUT ||
  path.resolve('artifacts/interaction-corrections');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1560, height: 2200 } });
page.setDefaultTimeout(12000);
const results = [],
  issues = [];
page.on('pageerror', (e) => issues.push(e.stack));
page.on('console', (m) => {
  if (['warning', 'error'].includes(m.type()))
    issues.push(m.type() + ': ' + m.text());
});
page.on('response', (r) => {
  if (r.status() >= 400) issues.push(`HTTP ${r.status()} ${r.url()}`);
});
await page.addInitScript(() =>
  addEventListener('DOMContentLoaded', () => {
    for (const name of [
      'BattleSystem',
      'TrainingSystem',
      'SaveSystem',
      'RelaunchSystem',
      'DungeonAutoSystem',
    ])
      import('/src/systems/' + name + '.js').then((m) =>
        m[name].getInstance().setEnabled(false),
      );
  }),
);
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail });
    console.log('PASS ' + name);
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    await page
      .screenshot({ path: path.join(output, 'failure.png'), fullPage: true })
      .catch(() => {});
    await fs.writeFile(path.join(output, 'failure.html'), await page.content());
    throw error;
  }
}
async function snap() {
  return page.evaluate(async () =>
    (await import('/src/systems/SaveSystem.js')).SaveSystem.getInstance()
      .getCurrentSave()
      .serialize(),
  );
}
async function order() {
  return (await snap()).team;
}
const row = (uid) =>
  page.locator(`#team-window-body .poke-card[data-pokemon-uid="${uid}"]`);
async function drag(from, to, { cancel = false, shot = false } = {}) {
  const source = row(from),
    target = row(to);
  await source.scrollIntoViewIfNeeded();
  const a = await source.locator('.poke-moves').boundingBox(),
    b = await target.boundingBox();
  assert.ok(a && b);
  const x = a.x + Math.min(40, a.width / 2),
    y = a.y + 12;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 12, y + 12);
  await page.waitForTimeout(35);
  const moving = await source.boundingBox();
  assert.ok(
    await source.evaluate((e) => e.classList.contains('pw-sortable-floating')),
  );
  const translatedX = await source.evaluate((e) =>
    Number.parseFloat(e.style.getPropertyValue('--pw-sortable-x')),
  );
  assert.ok(
    Math.abs(moving.x - translatedX) < 2,
    'floating card follows pointer, not the old hover transform',
  );
  await page.mouse.move(x, b.y + b.height * 0.65, { steps: 8 });
  await page.waitForTimeout(40);
  if (shot)
    await page
      .locator('#win-team')
      .screenshot({ path: path.join(output, 'team-real-pointer-drag.png') });
  if (cancel) await page.keyboard.press('Escape');
  await page.mouse.up();
  await page.waitForTimeout(30);
}
async function closeSummary() {
  const root = page.locator('#battle-summary-inner');
  if (await root.isVisible())
    await root.locator(':scope > .pw-win-hdr .pw-modal-close-btn').click();
}
async function geometry() {
  return page.locator('#win-battle').evaluate((panel) => {
    const b = panel.getBoundingClientRect(),
      body = panel.querySelector('#battle-center-panel');
    return {
      viewport: innerWidth,
      panel: { width: b.width, height: b.height, bottom: b.bottom },
      bodyOverflow: getComputedStyle(body).overflow,
      clippedText: [...body.querySelectorAll('.pw-text')]
        .filter(
          (e) =>
            e.getClientRects().length &&
            e.clientWidth > 0 &&
            e.clientHeight > 0 &&
            (e.scrollWidth > e.clientWidth + 2 ||
              e.scrollHeight > e.clientHeight + 2),
        )
        .map((e) => ({ cls: e.className, text: e.textContent })),
      wrong: [...panel.querySelectorAll('*')]
        .filter(
          (e) =>
            e instanceof HTMLElement &&
            e.getClientRects().length &&
            getComputedStyle(e).display !== 'contents' &&
            !e.closest('.pw-capture-overlay') &&
            !e.closest('.pw-dgn-grid'),
        )
        .flatMap((e) => {
          const r = e.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) return [];
          return r.left < b.left - 1 ||
            r.right > b.right + 1 ||
            r.bottom > b.bottom + 1
            ? [
                {
                  cls: e.className,
                  tag: e.tagName,
                  right: r.right,
                  bottom: r.bottom,
                },
              ]
            : [];
        }),
    };
  });
}
async function captureBattle(name) {
  const root = page.locator('#win-battle'),
    v = page.viewportSize(),
    b = await root.boundingBox();
  if (b.height + 240 > v.height)
    await page.setViewportSize({
      width: v.width,
      height: Math.ceil(b.height) + 240,
    });
  await root.evaluate((e) =>
    scrollTo(0, scrollY + e.getBoundingClientRect().top - 210),
  );
  await root.screenshot({ path: path.join(output, name) });
  await page.setViewportSize(v);
}
const raw = {
  version: 4,
  G: {
    saveMeta: { id: 'PW-MAIN-AUTO-23', name: 'Old main auto' },
    region: 'kanto',
    location: 'route1',
    money: 50000,
    wallet: { questPoints: 12345, dungeonTokens: 100 },
    badges: ['brock'],
    tutorial: { enabled: false },
    team: [4, 16, 133].map((id) => ({ id, level: 10, moves: ['tackle'] })),
    automationUpgrades: { autoRelaunch: true, autoDungeonRelaunch: true },
    automation: {
      autoRelaunch: true,
      autoDungeonRelaunch: false,
      autoDungeonMode: 'boss',
    },
  },
};
try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', {
    waitUntil: 'networkidle',
  });
  await check(
    'native JSON file import retains original-main paid modules, disabled preference and remembered dungeon mode',
    async () => {
      await page.locator('#save-menu-import-file').setInputFiles({
        name: 'old-main-auto.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(raw)),
      });
      await page
        .locator('#save-card-PW-MAIN-AUTO-23')
        .waitFor({ state: 'visible' });
      await page.locator('#save-card-PW-MAIN-AUTO-23').click();
      const s = await snap();
      assert.deepEqual(s.relaunch, {
        wild: { purchased: true, enabled: true },
        dungeon: { purchased: true, enabled: false, mode: 'boss' },
      });
      assert.equal(s.currencies.questPoint, 12345);
      assert.equal(s.collection.length, 3);
      return { relaunch: s.relaunch, points: s.currencies.questPoint };
    },
  );
  await check(
    'legacy ownership removes both offers from real shop stock without another debit',
    async () => {
      const facts = await page.evaluate(async () => {
        const { ShopSystem } = await import('/src/systems/ShopSystem.js');
        return ShopSystem.getInstance()
          .getOffers('pewter')
          .filter((x) => x.upgradeId)
          .map((x) => x.key);
      });
      assert.deepEqual(facts, []);
      assert.equal((await snap()).currencies.questPoint, 12345);
      const constrained=await page.addStyleTag({content:'#win-battle{width:210px!important;max-width:210px!important;}'});
      const idle=await geometry();assert.deepEqual(idle.wrong,[]);assert.deepEqual(idle.clippedText,[]);
      await constrained.evaluate(e=>e.remove());
    },
  );
  await check(
    'ordinary immediate mouse drag from move bars visibly follows the pointer and commits one UID swap',
    async () => {
      const before = await order(),
        node = await row(before[0]).elementHandle();
      await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const s = SaveSystem.getInstance(),
          old = s.saveCurrent.bind(s);
        globalThis.__dragWrites = 0;
        s.saveCurrent = (...args) => {
          globalThis.__dragWrites++;
          return old(...args);
        };
      });
      await drag(before[0], before[2], { shot: true });
      assert.deepEqual(await order(), [before[2], before[1], before[0]]);
      assert.equal(await page.evaluate(() => globalThis.__dragWrites), 1);
      assert.equal(await node.evaluate((e) => e.isConnected), true);
      assert.equal(await page.locator('#fs-box').isVisible(), false);
      assert.equal(await page.locator('.pw-sortable-floating').count(), 0);
      return { before, after: await order() };
    },
  );
  await check(
    'Escape restores the same party and removes the floating card without saving',
    async () => {
      const before = await order();
      await page.evaluate(() => (globalThis.__dragWrites = 0));
      await drag(before[0], before[1], { cancel: true });
      assert.deepEqual(await order(), before);
      assert.equal(await page.evaluate(() => globalThis.__dragWrites), 0);
      assert.equal(await page.locator('.pw-sortable-placeholder').count(), 0);
      assert.equal(await page.locator('#fs-box').isVisible(), false);
    },
  );
  await check(
    'an ordinary short card click still opens PC replacement and never reorders',
    async () => {
      const before = await order();
      await row(before[0])
        .locator('.poke-moves')
        .click({ position: { x: 30, y: 12 } });
      await page.locator('#fs-box').waitFor({ state: 'visible' });
      assert.deepEqual(await order(), before);
      await page.locator('#fs-box .modal-close').click();
    },
  );
  await check(
    'the native right-click information action remains distinct from left-button dragging',
    async () => {
      const before = await order();
      await row(before[0])
        .locator('.poke-moves')
        .click({ button: 'right', position: { x: 30, y: 12 } });
      await page.locator('#poke-modal-inner').waitFor({ state: 'visible' });
      assert.deepEqual(await order(), before);
      assert.equal(await page.locator('.pw-sortable-floating').count(), 0);
      await page.locator('#poke-modal-inner .modal-close').click();
    },
  );
  await check(
    'document edge scrolling keeps a held card draggable to a row initially outside the viewport',
    async () => {
      await page.setViewportSize({ width: 1560, height: 1000 });
      const ids = await order(),
        source = row(ids[0]);
      await source.scrollIntoViewIfNeeded();
      const a = await source.locator('.poke-moves').boundingBox(),
        x = a.x + 30,
        y = a.y + 12;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 12, y + 12);
      const start = await page.evaluate(() => scrollY);
      await page.mouse.move(x, 980);
      await page.waitForFunction((start) => scrollY > start + 60, start);
      const target = row(ids[2]);
      await page.waitForFunction((uid) => {
        const e = document.querySelector(
            `#team-window-body [data-pokemon-uid="${uid}"]`,
          ),
          b = e.getBoundingClientRect();
        return b.bottom < innerHeight - 80;
      }, ids[2]);
      const b = await target.boundingBox();
      await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.5);
      await page.waitForTimeout(35);
      await page.mouse.up();
      assert.deepEqual(await order(), [ids[2], ids[1], ids[0]]);
      return { scrolled: true };
    },
  );
  await check(
    'live party refresh during dragging retains the floating node rather than pulling it back into its slot',
    async () => {
      await page.setViewportSize({ width: 1560, height: 2200 });
      const ids = await order(),
        source = row(ids[0]);
      await source.scrollIntoViewIfNeeded();
      const a = await source.locator('.poke-moves').boundingBox();
      await page.mouse.move(a.x + 30, a.y + 12);
      await page.mouse.down();
      await page.mouse.move(a.x + 42, a.y + 24);
      await page.evaluate(async (uid) => {
        const { BoxSystem } = await import('/src/systems/BoxSystem.js');
        BoxSystem.getInstance().dispatchPokemonChanged(uid);
      }, ids[0]);
      assert.ok(
        await source.evaluate((e) =>
          e.classList.contains('pw-sortable-floating'),
        ),
      );
      await page.keyboard.press('Escape');
      await page.mouse.up();
      assert.deepEqual(await order(), ids);
      assert.equal(await page.locator('#fs-box').isVisible(), false);
    },
  );
  await check(
    'the purchased Auto switch remains visible during a real active wild battle, outside the hidden idle scene',
    async () => {
      await page.evaluate(async () => {
        const { BattleSystem } = await import('/src/systems/BattleSystem.js');
        if (!BattleSystem.getInstance().startBattle('route1'))
          throw Error('start failed');
      });
      const root = page.locator(
        '[data-relaunch-kind="wild"][data-relaunch-scope="battle"]',
      );
      assert.ok(await root.isVisible());
      assert.equal(await root.locator('button').count(), 1);
      assert.equal(
        await root
          .locator('small,.pw-relaunch-status,.pw-relaunch-offer')
          .count(),
        0,
      );
      assert.equal(await root.innerText(), 'AUTO COMBAT');
      assert.equal(
        await root.getByRole('switch').getAttribute('aria-checked'),
        'true',
      );
    },
  );
  await check(
    'drag during a paused live battle keeps active combatant identity, HP, RNG and clocks intact',
    async () => {
      const before = await page.evaluate(async () => {
          const { BattleSystem } = await import('/src/systems/BattleSystem.js');
          return BattleSystem.getInstance()._session.captureState();
        }),
        ids = await order();
      await drag(ids[0], ids[1]);
      const after = await page.evaluate(async () =>
        (
          await import('/src/systems/BattleSystem.js')
        ).BattleSystem.getInstance()._session.captureState(),
      );
      assert.deepEqual(after, before);
      assert.deepEqual(await order(), [ids[1], ids[0], ids[2]]);
    },
  );
  await check(
    'clicking a bench Pokémon after reordering switches to that UID, not its obsolete combatant index',
    async () => {
      const facts = await page.evaluate(async () => {
        const { TeamSystem } = await import('/src/systems/TeamSystem.js');
        const { BattleSystem } = await import('/src/systems/BattleSystem.js');
        const active = BattleSystem.getInstance().getPlayerPokemon().uid;
        return {
          active,
          target: TeamSystem.getInstance()
            .getMemberUids()
            .find((id) => id !== active),
        };
      });
      const card = page
        .locator('#battle-team-row .battle-team-member')
        .filter({ has: page.locator(`[data-unused="none"]`) });
      const index = (await order()).indexOf(facts.target);
      await page
        .locator('#battle-team-row .battle-team-member')
        .nth(index)
        .click();
      assert.equal(
        await page.evaluate(
          async () =>
            (
              await import('/src/systems/BattleSystem.js')
            ).BattleSystem.getInstance().getPlayerPokemon().uid,
        ),
        facts.target,
      );
    },
  );
  await check(
    'only the Auto switch changes the preference during battle: no payment and no ownership loss',
    async () => {
      const root = page.locator(
        '[data-relaunch-kind="wild"][data-relaunch-scope="battle"]',
      );
      const before = await snap();
      await root.getByRole('switch').click();
      let s = await snap();
      assert.equal(s.relaunch.wild.enabled, false);
      assert.equal(s.relaunch.wild.purchased, true);
      assert.equal(s.currencies.questPoint, before.currencies.questPoint);
      await root.getByRole('switch').click();
      assert.equal((await snap()).relaunch.wild.enabled, true);
    },
  );
  await check(
    'live battle information and every visible button stay inside a 210px panel, at short and tall desktop viewports',
    async () => {
      const style = await page.addStyleTag({
        content:
          '#win-battle{width:210px!important;max-width:210px!important;}',
      });
      const data = [];
      for (const [width, height] of [
        [1560, 700],
        [960, 900],
        [860, 1000],
      ]) {
        await page.setViewportSize({ width, height });
        const g = await geometry();
        assert.deepEqual(g.wrong, []);
        assert.deepEqual(g.clippedText, []);
        assert.equal(g.bodyOverflow, 'visible');
        data.push(g);
      }
      await captureBattle('battle-live-210.png');
      await style.evaluate((e) => e.remove());
      return data;
    },
  );
  await check(
    'mobile combat also grows with its information instead of pushing actions below the panel',
    async () => {
      const data = [];
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await page
          .locator('.mobile-nav-bar')
          .getByRole('button', { name: 'Combat', exact: true })
          .click();
        const g = await geometry();
        assert.deepEqual(g.wrong, []);
        assert.deepEqual(g.clippedText, []);
        data.push(g);
      }
      await captureBattle('battle-live-320.png');
      return data;
    },
  );
  await check(
    'a real dungeon run exposes the imported dungeon module, remembering its disabled preference and mode',
    async () => {
      await page.setViewportSize({ width: 1560, height: 1200 });
      await page.evaluate(async () => {
        const { BattleSystem } = await import('/src/systems/BattleSystem.js');
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const { DungeonSystem } = await import('/src/systems/DungeonSystem.js');
        const { EventBus } = await import('/src/core/EventBus.js');
        const { LocationChangedEvent } = await import(
          '/src/core/events/LocationChangedEvent.js'
        );
        BattleSystem.getInstance().endBattle(false);
        const s = SaveSystem.getInstance().getCurrentSave();
        s.player.location = 'viridianforest';
        s.access.unlockLocation('viridianforest');
        s.dungeons.clears.viridianforest = 3;
        EventBus.getInstance().dispatch(
          new LocationChangedEvent('kanto', 'viridianforest'),
        );
        if (!DungeonSystem.getInstance().enter('viridianforest'))
          throw Error('Dungeon entry failed');
      });
      await closeSummary();
      assert.equal(
        await page.locator('#battle-idle-screen').isVisible(),
        false,
      );
      const root = page.locator(
        '[data-relaunch-kind="dungeon"][data-relaunch-scope="battle"]',
      );
      assert.ok(await root.isVisible());
      assert.equal(await root.locator('button').count(), 1);
      assert.equal(
        await root.getByRole('switch').getAttribute('aria-checked'),
        'false',
      );
      await root.getByRole('switch').click();
      assert.equal((await snap()).relaunch.dungeon.enabled, true);
      assert.equal((await snap()).relaunch.dungeon.mode, 'boss');
    },
  );
  await check(
    'dungeon controls, pilot choices and exit buttons fit a narrow growing panel too',
    async () => {
      const style = await page.addStyleTag({
        content:
          '#win-battle{width:230px!important;max-width:230px!important;}',
      });
      const g = await geometry();
      assert.deepEqual(g.wrong, []);
      assert.deepEqual(g.clippedText, []);
      const map = await page
        .locator('#win-battle .pw-dungeon-map')
        .evaluate((e) => ({
          width: e.clientWidth,
          scrollWidth: e.scrollWidth,
          overflow: getComputedStyle(e).overflowX,
        }));
      assert.equal(map.overflow, 'auto');
      assert.ok(map.scrollWidth > map.width);
      await captureBattle('dungeon-live-230.png');
      await style.evaluate((e) => e.remove());
      return g;
    },
  );
  await check(
    'actual storage reload retains both imported purchases without another payment',
    async () => {
      const before = await snap();
      await page.evaluate(async () => {
        (
          await import('/src/systems/SaveSystem.js')
        ).SaveSystem.getInstance().saveCurrent();
      });
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator('#save-card-PW-MAIN-AUTO-23').click();
      const after = await snap();
      assert.deepEqual(after.relaunch, before.relaunch);
      assert.equal(after.currencies.questPoint, before.currencies.questPoint);
      assert.deepEqual(after.team, before.team);
      assert.deepEqual(after.collection, before.collection);
    },
  );
  await check(
    'no unexpected console diagnostic or failed asset occurred',
    async () => {
      assert.deepEqual(issues, []);
    },
  );
} finally {
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      {
        browserVersion: browser.version(),
        fixture:
          'Main-shaped JSON file; no user save supplied. Scheduled battle/training/checkpoint/relaunch/pilot ticks disabled for deterministic geometry and state comparisons. Explicit commands, UI, real file reader, saves and combat engine retained.',
        results,
        issues,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
