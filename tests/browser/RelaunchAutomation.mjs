/** @file RelaunchAutomation.mjs @brief Real Chromium controls/geometry; seeded progression, real battle engine (not a campaign). */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const output =
  process.env.PW_BROWSER_OUTPUT ||
  path.resolve('artifacts/relaunch-automation');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1560, height: 1120 } });
page.setDefaultTimeout(12000);
const results = [],
  issues = [];
page.on('pageerror', (e) => issues.push(e.stack));
page.on('console', (m) => {
  if (['warning', 'error'].includes(m.type()))
    issues.push(`${m.type()}: ${m.text()}`);
});
page.on('response', (r) => {
  if (r.status() >= 400) issues.push(`HTTP ${r.status()} ${r.url()}`);
});
await page.clock.install();
async function check(name, action) {
  try {
    const detail = await action();
    results.push({ name, passed: true, detail });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    await fs.writeFile(path.join(output, 'failure.html'), await page.content());
    await page
      .screenshot({
        path: path.join(output, 'failure.png'),
        fullPage: true,
        animations: 'disabled',
      })
      .catch(() => {});
    throw error;
  }
}
async function label(key) {
  return page.evaluate(
    async (key) =>
      (await import('/src/localization/LocalizationManager.js')).t(key),
    key,
  );
}
async function clickKey(root, key) {
  await root
    .getByRole('button', { name: await label(key), exact: true })
    .click();
}
async function snap() {
  return page.evaluate(async () =>
    (await import('/src/systems/SaveSystem.js')).SaveSystem.getInstance()
      .getCurrentSave()
      .serialize(),
  );
}
async function shot(root, name) {
  await root.screenshot({
    path: path.join(output, `${name}.png`),
    animations: 'disabled',
  });
}
async function settle(root) {
  await root.waitFor({ state: 'visible' });
  await root.evaluate(async (e) => {
    await new Promise(requestAnimationFrame);
    await Promise.all(
      e
        .getAnimations()
        .filter((a) => a.effect.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    );
  });
  return root;
}
async function fixture({
  location = 'route1',
  strong = false,
  points = 0,
  language = 'fr',
  clears = 0,
} = {}) {
  return page.evaluate(
    async (options) => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { BattleSystem } = await import('/src/systems/BattleSystem.js');
      const { DungeonSystem } = await import('/src/systems/DungeonSystem.js');
      const { RelaunchSystem } = await import('/src/systems/RelaunchSystem.js');
      const { DungeonAutoSystem } = await import(
        '/src/systems/DungeonAutoSystem.js'
      );
      const { Engine } = await import('/src/core/Engine.js');
      const { PokemonFactory } = await import(
        '/src/data/pokemon/PokemonFactory.js'
      );
      const { LocationDB } = await import('/src/data/world/LocationDB.js');
      const { LocalizationManager } = await import(
        '/src/localization/LocalizationManager.js'
      );
      const { SeededRandom } = await import('/src/core/SeededRandom.js');
      for (const id of ['TrainingSystem', 'HatcherySystem', 'MineSystem']) {
        const m = await import(`/src/systems/${id}.js`);
        m[id].getInstance().setEnabled(false);
      }
      const battle = BattleSystem.getInstance();
      if (battle.isActive()) battle.endBattle(false);
      battle.setEnabled(false);
      battle.setRandom(new SeededRandom(1234));
      DungeonAutoSystem.getInstance().setEnabled(false);
      RelaunchSystem.getInstance().setEnabled(true);
      LocalizationManager.getInstance().setLanguage(options.language);
      const save = SaveSystem.getInstance().createNewSave(
        'Browser automation',
        'charmander',
      );
      save.tutorial.enabled = false;
      for (const id of ['mine', 'training', 'hatchery'])
        save.access.unlockFeature(id);
      for (const loc of LocationDB.getInstance().getAll())
        save.access.unlockLocation(loc.id);
      for (const id of [
        'brock',
        'misty',
        'surge',
        'erika',
        'koga',
        'sabrina',
        'blaine',
        'giovanni',
      ])
        save.player.earnBadge(id);
      save.player.location = options.location;
      save.player.region = LocationDB.getInstance().getById(
        options.location,
      ).region;
      for (const id of ['money', 'questPoint', 'diamond'])
        save.currencies.add(id, -save.currencies.get(id));
      save.currencies.add('questPoint', options.points);
      save.currencies.add('dungeonToken', 10000);
      if (options.strong) {
        save.teamMembers.setUids([]);
        for (let i = 0; i < 3; i++) {
          const p = PokemonFactory.create('mewtwo', 100);
          save.collection.add(p);
          save.teamMembers.setUids([...save.teamMembers.getUids(), p.uid]);
        }
      } else {
        save.team[0].setLevel(1);
        save.team[0].moves = ['splash'];
        save.team[0].hp = 1;
      }
      if (options.clears)
        save.dungeons.clears[options.location] = options.clears;
      DungeonSystem.getInstance().setRandom(new SeededRandom(1234));
      SaveSystem.getInstance().saveCurrent();
      Engine.getInstance().getPageManager().openPage('game');
      return save.id;
    },
    { location, strong, points, language, clears },
  );
}
async function openManagement(feature) {
  if (page.viewportSize().width <= 850) {
    await page
      .locator('.mobile-nav-bar')
      .getByRole('button', { name: 'Gestion', exact: true })
      .click();
    await page
      .locator('.mobile-subnav-bar')
      .getByRole('button', {
        name: {
          mine: 'Grand Souterrain',
          training: 'Entraînement',
          hatchery: 'Pension',
        }[feature],
        exact: true,
      })
      .click();
  }
  await page.locator(`#win-${feature} .pw-facility-manage`).last().click();
  return settle(page.locator(`#pw-${feature}-management`));
}
async function closeManagement(feature) {
  await page.locator(`#pw-${feature}-management .pw-modal-close-btn`).click();
}
async function buyPoints() {
  await page.evaluate(async () => {
    const s = (
      await import('/src/systems/SaveSystem.js')
    ).SaveSystem.getInstance().getCurrentSave();
    for (const id of ['money', 'questPoint', 'diamond'])
      s.currencies.add(id, 100000);
  });
}
async function startAndLose() {
  await page.evaluate(async () => {
    const b = (
      await import('/src/systems/BattleSystem.js')
    ).BattleSystem.getInstance();
    if (!b.startBattle('route1')) throw Error('wild start rejected');
    for (let i = 0; i < 30000 && b.isActive(); i++) b.update(0.1);
    if (b.isActive() || b.getBattleSummary().victory)
      throw Error('expected a real natural defeat');
  });
}
async function finishDungeonManually() {
  return page.evaluate(async () => {
    const { DungeonSystem } = await import('/src/systems/DungeonSystem.js');
    const { BattleSystem } = await import('/src/systems/BattleSystem.js');
    const { DungeonPilotRules } = await import(
      '/src/systems/dungeon/DungeonPilotRules.js'
    );
    const d = DungeonSystem.getInstance(),
      b = BattleSystem.getInstance();
    let steps = 0;
    while ((d.isActive() || b.isActive()) && steps++ < 30000) {
      if (b.isActive()) b.update(0.1);
      else {
        const run = d.getRun(),
          target = DungeonPilotRules.destination(run, 'boss');
        if (!target || !d.moveTo(target))
          throw Error('canonical move rejected');
      }
    }
    if (d.isActive() || b.isActive()) throw Error('dungeon did not terminate');
    return d.getLastRun();
  });
}
const wild = () =>
  page.locator('[data-relaunch-kind="wild"][data-relaunch-scope="battle"]');
const summaryWild = () =>
  page.locator('[data-relaunch-kind="wild"][data-relaunch-scope="summary"]');
try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', {
    waitUntil: 'networkidle',
  });
  await check(
    'facility upgrades: every unpaid cost remains rendered with an empty wallet and no insufficient-balance prose',
    async () => {
      await fixture();
      const geometry = {};
      for (const feature of ['mine', 'training', 'hatchery']) {
        const root = await openManagement(feature);
        await root.locator('.management-tabs button').nth(0).click();
        const rows = await root
          .locator('.pw-facility-upgrade')
          .evaluateAll((nodes) =>
            nodes
              .filter((n) => !n.classList.contains('is-owned'))
              .map((n) => {
                const p = n.querySelector('.pw-price-tag');
                const r = p.getBoundingClientRect();
                return {
                  id: n.dataset.upgradeId,
                  text: p.innerText,
                  width: r.width,
                  height: r.height,
                  parent: p.parentElement.className,
                };
              }),
          );
        assert.ok(rows.length > 0);
        for (const r of rows) {
          assert.ok(r.width > 0 && r.height > 0, JSON.stringify(r));
          assert.ok(r.parent.includes('pw-facility-price-quote'));
        }
        assert.doesNotMatch(
          await root.innerText(),
          /solde insuffisant|fonds insuffisants|not enough/i,
        );
        geometry[feature] = rows;
        await shot(root, `${feature}-zero-wallet-upgrades`);
        await closeManagement(feature);
      }
      return geometry;
    },
  );
  await check(
    'helpers desktop: all fifteen prices and all-row equal heights, including a deliberately taller owned card',
    async () => {
      const result = {};
      for (const feature of ['mine', 'training', 'hatchery']) {
        const root = await openManagement(feature);
        await root.locator('.management-tabs button').nth(2).click();
        const stats = await root
          .locator('.pw-facility-staff-card')
          .evaluateAll((nodes) =>
            nodes.map((n) => {
              const r = n.getBoundingClientRect(),
                p = n.querySelector('.pw-price-tag'),
                q = p.getBoundingClientRect();
              return {
                id: n.dataset.staffId,
                height: r.height,
                top: r.top,
                price: q.width > 0 && q.height > 0,
                text: p.innerText,
              };
            }),
          );
        assert.equal(stats.length, 5);
        assert.ok(stats.every((s) => s.price));
        assert.ok(
          Math.max(...stats.map((s) => s.height)) -
            Math.min(...stats.map((s) => s.height)) <
            1.1,
          JSON.stringify(stats),
        );
        assert.doesNotMatch(
          await root.innerText(),
          /solde insuffisant|fonds insuffisants|not enough/i,
        );
        await shot(root, `${feature}-equal-helpers`);
        result[feature] = stats;
        await closeManagement(feature);
      }
      await buyPoints();
      const root = await openManagement('mine');
      await root.locator('.management-tabs button').nth(2).click();
      await root
        .locator('.pw-facility-staff-card .pw-staff-card-footer button:visible')
        .first()
        .click();
      const heights = await root
        .locator('.pw-facility-staff-card')
        .evaluateAll((ns) => ns.map((n) => n.getBoundingClientRect().height));
      assert.ok(
        Math.max(...heights) - Math.min(...heights) < 1.1,
        JSON.stringify(heights),
      );
      await shot(root, 'mine-mixed-ownership-equal-helpers');
      await closeManagement('mine');
      return result;
    },
  );
  await check(
    'helpers mobile: five separate rows still match the tallest and stay inside the viewport',
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      const data = {};
      for (const feature of ['mine', 'training', 'hatchery']) {
        const root = await openManagement(feature);
        await root.locator('.management-tabs button').nth(2).click();
        const sizes = await root
          .locator('.pw-facility-staff-card')
          .evaluateAll((ns) =>
            ns.map((n) => {
              const r = n.getBoundingClientRect();
              return { height: r.height, width: r.width, right: r.right };
            }),
          );
        assert.ok(
          Math.max(...sizes.map((n) => n.height)) -
            Math.min(...sizes.map((n) => n.height)) <
            1.1,
          JSON.stringify(sizes),
        );
        assert.ok(sizes.every((n) => n.right <= 391));
        data[feature] = sizes;
        if (feature === 'mine') await shot(root, 'mobile-equal-helpers');
        await closeManagement(feature);
      }
      await page.setViewportSize({ width: 1560, height: 1120 });
      return data;
    },
  );
  await check(
    'shop: native upgrade cards, one-time quantity and real quest-point payment; owned stock disappears without inventory artifacts',
    async () => {
      await fixture({ location: 'pewter', points: 7500 });
      await page
        .getByRole('button', { name: await label('tab_shop'), exact: true })
        .click();
      const root = await settle(page.locator('#fs-shop'));
      const before = await snap();
      for (const key of ['autoRelaunch', 'autoDungeonRelaunch']) {
        await root.locator(`[data-offer-key="${key}"]`).click();
        assert.equal(await root.locator('.pw-shop-qty').count(), 0);
        await shot(root, `shop-${key}`);
        await clickKey(root, 'buy_btn');
        assert.equal(
          await root.locator(`[data-offer-key="${key}"]`).count(),
          0,
        );
      }
      const after = await snap();
      assert.equal(after.currencies.questPoint, 0);
      assert.ok(
        after.relaunch.wild.purchased && after.relaunch.dungeon.enabled,
      );
      assert.deepEqual(after.inventory, before.inventory);
      await root.locator('.modal-close').click();
      return after.relaunch;
    },
  );
  await check(
    'combat stays free of purchase cards: shop ownership exposes one compact Auto switch',
    async () => {
      await fixture({ points: 2500 });
      assert.equal(await wild().isVisible(), false);
      await page.evaluate(async () => {
        const { ShopSystem } = await import('/src/systems/ShopSystem.js');
        ShopSystem.getInstance().buyRelaunch('wild');
      });
      assert.equal((await snap()).currencies.questPoint, 0);
      assert.equal(
        await wild().getByRole('switch').getAttribute('aria-checked'),
        'true',
      );
      assert.equal(await wild().locator('button').count(), 1);
      assert.equal(await wild().locator('.pw-relaunch-offer').count(), 0);
      await shot(wild(), 'wild-owned-toggle');
    },
  );
  await check(
    'natural wild defeat: real engine arms the timer; the same nodes remain focused across countdown ticks',
    async () => {
      await startAndLose();
      await wild().waitFor({ state: 'visible' });
      await wild().locator('.pw-switch').focus();
      const node = await wild().getByRole('switch').elementHandle();
      await page.clock.runFor(1000);
      assert.equal(
        await node.evaluate(
          (e) =>
            e ===
            document.querySelector(
              '[data-relaunch-kind="wild"][data-relaunch-scope="battle"] .pw-switch',
            ),
        ),
        true,
      );
      assert.equal(
        await node.evaluate((e) => document.activeElement === e),
        true,
      );
      assert.equal(await wild().locator('button').count(), 1);
      await shot(wild(), 'wild-countdown');
      await wild().getByRole('switch').click();
      await page.clock.runFor(6000);
      assert.equal(
        await page.evaluate(async () =>
          (
            await import('/src/systems/BattleSystem.js')
          ).BattleSystem.getInstance().isActive(),
        ),
        false,
      );
      assert.equal((await snap()).relaunch.wild.enabled, false);
    },
  );
  await check(
    'summary: stable shared control and typed automatic close at the genuine next wild start',
    async () => {
      await wild().getByRole('switch').click();
      assert.equal((await snap()).relaunch.wild.enabled, true);
      await page.evaluate(async () => {
        if (
          !(
            await import('/src/systems/BattleSystem.js')
          ).BattleSystem.getInstance().startBattle('route1')
        )
          throw Error('battle start');
      });
      await page.locator('#loot-open-btn').click();
      const root = await settle(page.locator('#battle-summary-inner'));
      await page.evaluate(async () => {
        const b = (
          await import('/src/systems/BattleSystem.js')
        ).BattleSystem.getInstance();
        for (let i = 0; i < 30000 && b.isActive(); i++) b.update(0.1);
        if (b.isActive() || b.getBattleSummary().victory)
          throw Error('natural defeat required');
      });
      await summaryWild().waitFor({ state: 'visible' });
      const node = await summaryWild().getByRole('switch').elementHandle();
      await page.clock.runFor(1000);
      assert.equal(
        await node.evaluate(
          (e) =>
            e ===
            document.querySelector(
              '[data-relaunch-kind="wild"][data-relaunch-scope="summary"] .pw-switch',
            ),
        ),
        true,
      );
      await shot(root, 'wild-summary-countdown');
      await page.clock.runFor(4200);
      assert.equal(await root.isVisible(), false);
      assert.equal(
        await page.evaluate(async () =>
          (
            await import('/src/systems/BattleSystem.js')
          ).BattleSystem.getInstance().isActive(),
        ),
        true,
      );
      await page.locator('#leave-btn').click();
      await page.clock.runFor(6000);
      assert.equal(
        await page.evaluate(async () =>
          (
            await import('/src/systems/BattleSystem.js')
          ).BattleSystem.getInstance().isActive(),
        ),
        false,
      );
    },
  );
  await check(
    'save switch: no hidden countdown survives in another save or when reloading the purchased source save',
    async () => {
      await startAndLose();
      const id = (await snap()).id;
      await page.evaluate(async () => {
        const s = (
          await import('/src/systems/SaveSystem.js')
        ).SaveSystem.getInstance();
        s.saveCurrent();
        s.createNewSave('Browser other deadline', 'squirtle');
      });
      await page.clock.runFor(6000);
      assert.equal((await snap()).relaunch.wild.purchased, false);
      await page.evaluate(
        async (id) =>
          (
            await import('/src/systems/SaveSystem.js')
          ).SaveSystem.getInstance().loadSlot(id),
        id,
      );
      await page.clock.runFor(6000);
      assert.equal(
        await page.evaluate(async () =>
          (
            await import('/src/systems/BattleSystem.js')
          ).BattleSystem.getInstance().isActive(),
        ),
        false,
      );
      assert.ok((await snap()).relaunch.wild.enabled);
    },
  );
  await check(
    'dungeon: third genuine clear unlocks the pilot; relaunch pays one toll and enters with the free farm pilot',
    async () => {
      await fixture({
        location: 'viridianforest',
        strong: true,
        points: 5000,
        clears: 2,
      });
      await page.evaluate(async () =>
        (
          await import('/src/systems/ShopSystem.js')
        ).ShopSystem.getInstance().buyRelaunch('dungeon'),
      );
      await page.locator('.pw-loc-dungeon-btn').click();
      assert.equal(
        await page
          .locator('.pw-dungeon-pilot [data-pilot-mode="boss"]')
          .isVisible(),
        false,
      );
      assert.match(
        await page.locator('.pw-dungeon-pilot-locked').innerText(),
        /2\/3/,
      );
      const final = await finishDungeonManually();
      assert.equal(final.outcome, 'cleared');
      assert.equal((await snap()).dungeons.clears.viridianforest, 3);
      const tokens = (await snap()).currencies.dungeonToken;
      await page.clock.runFor(5200);
      const after = await snap();
      assert.equal(after.dungeons.run.auto, 'farm');
      assert.equal(after.currencies.dungeonToken, tokens - 100);
      const pilotRoot = page.locator('.pw-dungeon-pilot');
      await pilotRoot.waitFor({ state: 'visible' });
      assert.equal(
        await pilotRoot
          .locator('[data-pilot-mode="farm"]')
          .getAttribute('aria-pressed'),
        'true',
      );
      await shot(page.locator('#win-battle'), 'dungeon-pilot-unlocked');
    },
  );
  await check(
    'pilot choices: all three real mode commands, stable button nodes, and remembered non-off mode',
    async () => {
      const root = page.locator('.pw-dungeon-pilot'),
        node = await root.locator('[data-pilot-mode="boss"]').elementHandle();
      for (const mode of ['boss', 'chest', 'farm', 'chest', 'off']) {
        await root.locator(`[data-pilot-mode="${mode}"]`).click();
        assert.equal(
          (await snap()).dungeons.run.auto,
          mode === 'off' ? false : mode,
        );
        assert.equal(
          await node.evaluate(
            (e) =>
              e ===
              document.querySelector(
                '.pw-dungeon-pilot [data-pilot-mode="boss"]',
              ),
          ),
          true,
        );
      }
      assert.equal((await snap()).relaunch.dungeon.mode, 'chest');
      await shot(root, 'pilot-manual-and-remembered');
      await page.evaluate(async () =>
        (
          await import('/src/systems/DungeonSystem.js')
        ).DungeonSystem.getInstance().abandon(),
      );
      await page.clock.runFor(6000);
      assert.equal((await snap()).dungeons.run, null);
    },
  );
  await check(
    'dungeon full live chain: real pilot steps/fights finish and a second paid expedition starts automatically',
    async () => {
      await page.evaluate(async () => {
        const { DungeonSystem } = await import('/src/systems/DungeonSystem.js');
        DungeonSystem.getInstance().enter('viridianforest', {
          autoMode: 'boss',
        });
      });
      await page.evaluate(async () => {
        const { DungeonAutoSystem } = await import(
          '/src/systems/DungeonAutoSystem.js'
        );
        const { BattleSystem } = await import('/src/systems/BattleSystem.js');
        DungeonAutoSystem.getInstance().setEnabled(true);
        BattleSystem.getInstance().setEnabled(true);
      });
      await page.clock.runFor(45000);
      const after = await snap();
      assert.ok(
        after.dungeons.clears.viridianforest >= 4,
        'at least one additional actual clear',
      );
      assert.ok(
        after.dungeons.exploredTotal >= 3,
        'at least one actual relaunch after the clear',
      );
      await page.evaluate(async () => {
        (
          await import('/src/systems/DungeonAutoSystem.js')
        ).DungeonAutoSystem.getInstance().setEnabled(false);
        (
          await import('/src/systems/BattleSystem.js')
        ).BattleSystem.getInstance().setEnabled(false);
      });
      return {
        clears: after.dungeons.clears.viridianforest,
        entered: after.dungeons.exploredTotal,
      };
    },
  );
  await check(
    'dungeon empty tokens: a natural clear then exhausted entry balance stops without a late retry spin',
    async () => {
      if ((await snap()).dungeons.run) await finishDungeonManually();
      await page.evaluate(async () => {
        const s = (
          await import('/src/systems/SaveSystem.js')
        ).SaveSystem.getInstance().getCurrentSave();
        s.currencies.add('dungeonToken', -s.currencies.get('dungeonToken'));
      });
      await page.clock.runFor(6000);
      assert.equal((await snap()).dungeons.run, null);
      const bar = page.locator(
        '[data-relaunch-kind="dungeon"][data-relaunch-scope="battle"]',
      );
      await bar.waitFor({ state: 'visible' });
      assert.equal(await bar.locator('button').count(), 1);
      assert.equal(
        await page.evaluate(
          async () =>
            (
              await import('/src/systems/RelaunchSystem.js')
            ).RelaunchSystem.getInstance().getSnapshot('dungeon').blocked,
        ),
        'tokens',
      );
      await shot(bar, 'dungeon-insufficient-next-toll');
      await page.evaluate(async () => {
        const s = (
          await import('/src/systems/SaveSystem.js')
        ).SaveSystem.getInstance().getCurrentSave();
        s.currencies.add('dungeonToken', 1000);
      });
      await page.clock.runFor(12000);
      assert.equal((await snap()).dungeons.run, null);
    },
  );
  await check(
    'English and mobile: the owned Auto switch has no extra prose, overflow or duplicate modal IDs',
    async () => {
      await fixture({ language: 'en', points: 2500 });
      await page.evaluate(async () =>
        (
          await import('/src/systems/ShopSystem.js')
        ).ShopSystem.getInstance().buyRelaunch('wild'),
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .locator('.mobile-nav-bar')
        .getByRole('button', { name: await label('tab_combat'), exact: true })
        .click();
      await wild().scrollIntoViewIfNeeded();
      assert.equal(await wild().innerText(), (await label('relaunch_wild_toggle')).toUpperCase());
      assert.equal(
        await wild().getByRole('switch').getAttribute('aria-label'),
        await label('relaunch_wild_title'),
      );
      assert.equal(await wild().locator('button').count(), 1);
      const metrics = await wild().evaluate((e) => {
        const r = e.getBoundingClientRect();
        return {
          left: r.left,
          right: r.right,
          content: e.scrollWidth,
          width: e.clientWidth,
        };
      });
      assert.ok(
        metrics.left >= 0 &&
          metrics.right <= 391 &&
          metrics.content <= metrics.width + 1,
        JSON.stringify(metrics),
      );
      const duplicates = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id]')]
          .map((n) => n.id)
          .filter(Boolean);
        return ids.filter((id, i) => ids.indexOf(id) !== i);
      });
      assert.deepEqual(duplicates, []);
      await shot(page.locator('#win-battle'), 'mobile-english-relaunch');
      return metrics;
    },
  );
  assert.deepEqual(issues, []);
} finally {
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify({ results, issues }, null, 2),
  );
  await browser.close();
}
