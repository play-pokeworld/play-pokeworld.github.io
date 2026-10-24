/**
 * @file FacilityVisualParity.mjs
 * @brief Real Chromium visual contracts and interactions, with explicitly seeded progression.
 * Screenshots are real UI output, not mocks. This is not a campaign playthrough or a pixel-diff oracle.
 * PW_URL=http://127.0.0.1:3000 PLAYWRIGHT_MODULE=playwright node tests/browser/FacilityVisualParity.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const output =
  process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/facility-visual');
await fs.mkdir(output, { recursive: true });
for (const name of ['failure.html', 'failure.png'])
  await fs.rm(path.join(output, name), { force: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1560, height: 1120 } });
page.setDefaultTimeout(10000);
const issues = [],
  results = [],
  geometry = {},
  assets = [];
page.on('pageerror', (error) => issues.push(error.stack));
page.on('console', (message) => {
  if (['warning', 'error'].includes(message.type()))
    issues.push(`${message.type()}: ${message.text()}`);
});
page.on('response', (response) => {
  if (response.status() >= 400)
    issues.push(`HTTP ${response.status()} ${response.url()}`);
});
await page.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    import('/src/systems/TrainingSystem.js').then(({ TrainingSystem }) =>
      TrainingSystem.getInstance().setEnabled(false),
    );
    import('/src/systems/HatcherySystem.js').then(({ HatcherySystem }) =>
      HatcherySystem.getInstance().setEnabled(false),
    );
  });
});
async function check(name, run) {
  try {
    const detail = await run();
    results.push({ name, passed: true, detail });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    await fs.writeFile(path.join(output, 'failure.html'), await page.content());
    await page
      .screenshot({ path: path.join(output, 'failure.png'), fullPage: true })
      .catch(() => {});
    throw error;
  }
}
async function open(feature) {
  await page.locator(`#win-${feature} .pw-facility-manage`).click();
  const modal = page.locator(`#pw-${feature}-management`);
  await modal.waitFor({ state: 'visible' });
  // Measure the settled window, never a transient scale from the real opening animation.
  await modal.evaluate(async (element) => {
    await new Promise(requestAnimationFrame);
    await Promise.all(element.getAnimations().filter((animation) =>
      animation.effect.getComputedTiming().iterations !== Infinity
    ).map((animation) => animation.finished.catch(() => {})));
  });
  return modal;
}
async function close(feature) {
  await page.locator(`#pw-${feature}-management .pw-modal-close-btn`).click();
}
async function tab(modal, index) {
  await modal.locator('.management-tabs button').nth(index).click();
}
async function state() {
  return page.evaluate(async () =>
    (await import('/src/systems/SaveSystem.js')).SaveSystem.getInstance()
      .getCurrentSave()
      .serialize(),
  );
}
async function mediaAudit(root, selector) {
  await root.scrollIntoViewIfNeeded();
  const report = await root.locator(selector).evaluateAll(async (images) => {
    const visible = images.filter(
      (image) => image.checkVisibility() && image.getAttribute('src'),
    );
    await Promise.race([
      Promise.all(visible.map((image) => image.decode().catch(() => {}))),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    return visible.map((image) => {
      const r = image.getBoundingClientRect(),
        parent = image.closest('.pw-poke-circle-wrap')?.getBoundingClientRect();
      return {
        src: image.getAttribute('src'),
        alt: image.alt,
        width: r.width,
        height: r.height,
        natural: image.naturalWidth,
        opacity: getComputedStyle(image).opacity,
        inside:
          !parent ||
          (r.left >= parent.left - 1 &&
            r.right <= parent.right + 1 &&
            r.top >= parent.top - 1 &&
            r.bottom <= parent.bottom + 1),
      };
    });
  });
  assert.ok(report.length > 0, 'a real visible sprite is required');
  for (const image of report) {
    assert.ok(
      image.natural > 0 && image.width >= 12 && image.height >= 12,
      image.src,
    );
    assert.notEqual(image.opacity, '0');
    assert.equal(image.inside, true, image.src);
  }
  assets.push(...report);
  return report;
}
let fixture;
try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', {
    waitUntil: 'networkidle',
  });
  fixture = await page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const { PokemonFactory } = await import(
      '/src/data/pokemon/PokemonFactory.js'
    );
    const { BoxSystem } = await import('/src/systems/BoxSystem.js');
    const { HatcherySystem } = await import('/src/systems/HatcherySystem.js');
    const { TrainingSystem } = await import('/src/systems/TrainingSystem.js');
    const { MineSystem } = await import('/src/systems/MineSystem.js');
    const { SeededRandom } = await import('/src/core/SeededRandom.js');
    const { QuestDB } = await import('/src/data/quests/QuestDB.js');
    const { LeagueDB } = await import('/src/data/trainers/LeagueDB.js');
    const { Engine } = await import('/src/core/Engine.js');
    const saves = SaveSystem.getInstance(),
      save = saves.createNewSave('Facility visual fixture', 'charmander');
    save.tutorial.enabled = false;
    save.player.location = 'route1';
    for (const feature of ['hatchery', 'training', 'mine'])
      save.access.unlockFeature(feature);
    for (const id of [
      'pewter',
      'cerulean',
      'vermilion',
      'celadon',
      'saffron',
      'cinnabar',
      'fuchsia',
      'indigo',
      'goldenrod',
      'mahogany',
      'blackthorn',
    ])
      save.access.unlockLocation(id);
    for (const badge of [
      'brock',
      'misty',
      'surge',
      'erika',
      'koga',
      'sabrina',
      'blaine',
      'giovanni',
    ])
      save.player.earnBadge(badge);
    for (const league of LeagueDB.getInstance()
      .getAll()
      .filter((entry) => entry.region === 'kanto'))
      save.player.earnBadge(league.badge);
    save.quests.setMainStep('kanto', 25);
    save.quests.setMainStep(
      'johto',
      QuestDB.getInstance()
        .getMainChain('johto')
        .findIndex((q) => q.key === 'main.111'),
    );
    for (const [id, amount] of [
      ['questPoint', 100000],
      ['diamond', 10000],
      ['money', 1000000],
    ])
      save.currencies.add(id, amount);
    save.inventory.add('helix_fossil', 3, { deferSave: true });
    const owned = {};
    for (const [id, level] of [
      ['pidgey', 12],
      ['pikachu', 30],
      ['eevee', 20],
      ['magikarp', 35],
      ['chikorita', 100],
    ]) {
      const pokemon = PokemonFactory.create(id, level);
      BoxSystem.getInstance().addPokemon(pokemon, { deferSave: true });
      owned[id] = pokemon.uid;
    }
    const hatchery = HatcherySystem.getInstance(),
      training = TrainingSystem.getInstance(),
      mine = MineSystem.getInstance();
    hatchery.setEnabled(false);
    training.setEnabled(false);
    hatchery.upgradeSlot();
    hatchery.depositPokemon(owned.pidgey, 0);
    save.hatchery.slots[0].knockouts = 3;
    hatchery.toggleMode(1);
    training.upgradeSlot();
    training.assignPokemon(0, owned.pikachu);
    mine.setRandom(new SeededRandom(333));
    mine.ensureLayer();
    saves.saveCurrent();
    Engine.getInstance().getPageManager().openPage('game');
    return { id: save.id, owned };
  });
  await check(
    'three authentic body management rows, compact slots and visible Pokémon sprites',
    async () => {
      for (const feature of ['hatchery', 'training', 'mine']) {
        const panel = page.locator(`#win-${feature}`);
        assert.equal(
          await panel.locator('.win-body .pw-facility-manage').count(),
          1,
        );
        assert.equal(
          await panel.locator('.pw-win-hdr .pw-facility-manage').count(),
          0,
        );
        await panel.screenshot({
          path: path.join(output, `rework-${feature}-panel.png`),
        });
        geometry[`${feature}-panel`] = await panel.boundingBox();
      }
      assert.equal(
        await page.locator('#win-hatchery .is-empty .pw-icon--lg').count(),
        0,
      );
      assert.equal(
        await page.locator('#win-training .training-mode-row:visible').count(),
        5,
      );
      await mediaAudit(page.locator('#win-hatchery'), 'img.pw-poke-circle-img');
      await mediaAudit(page.locator('#win-training'), 'img.pw-poke-circle-img');
    },
  );
  await check(
    'all nine management views use the original 980 by 760 shell, icon tabs and real assets',
    async () => {
      const found = [];
      for (const feature of ['hatchery', 'training', 'mine']) {
        const modal = await open(feature);
        for (const [index, name] of [
          'upgrades',
          'automation',
          'staff',
        ].entries()) {
          await tab(modal, index);
          const rect = await modal.boundingBox();
          assert.ok(Math.abs(rect.width - 980) < 1, JSON.stringify(rect));
          assert.ok(Math.abs(rect.height - 760) < 1, JSON.stringify(rect));
          assert.equal(
            await modal.locator('.management-tabs .pw-icon svg').count(),
            3,
          );
          assert.ok((await modal.locator('button:visible').count()) > 3);
          geometry[`${feature}-${name}`] = rect;
          if (index === 0) {
            const cards = await modal
              .locator('.pw-facility-upgrade')
              .evaluateAll((nodes) =>
                nodes.map((n) => {
                  const r = n.getBoundingClientRect();
                  return { x: r.x, y: r.y, width: r.width };
                }),
              );
            assert.ok(
              cards[1].x > cards[0].x,
              'reference purchase grid must have horizontal cards in multiple columns',
            );
            await mediaAudit(modal, '.pw-price-tag-ico');
          }
          if (feature === 'training' && index === 1) {
            const cards = await modal
              .locator('.pw-training-queue-card')
              .evaluateAll((nodes) =>
                nodes.map((node) => node.getBoundingClientRect().height),
              );
            assert.ok(
              cards.every((height) => height <= 80),
              'unowned module offers stay compact',
            );
          }
          if (index === 2) {
            const portraits = await mediaAudit(modal, '.staff-portrait');
            assert.equal(portraits.length, 5);
            assert.ok(
              portraits.every(
                (image) => image.width === 48 && image.height === 48,
              ),
            );
            const cards = await modal
              .locator('.staff-card')
              .evaluateAll((nodes) =>
                nodes.map((n) => {
                  const r = n.getBoundingClientRect();
                  return { x: r.x, y: r.y, width: r.width };
                }),
              );
            assert.ok(
              cards[2].x > cards[1].x && cards[3].y > cards[0].y,
              'original staff layout is three columns, then two',
            );
            found.push(...portraits.map((image) => image.src));
          }
          await modal.screenshot({
            path: path.join(output, `rework-${feature}-${name}.png`),
          });
        }
        await close(feature);
      }
      return { portraits: found.length };
    },
  );
  await check(
    'hatchery per-slot controls persist and keep native focus / option identity during KO refreshes',
    async () => {
      const modal = await open('hatchery');
      await tab(modal, 1);
      const cards = modal.locator('.pw-facility-queue-card'),
        first = cards.nth(0);
      assert.equal(await first.locator('select').count(), 7);
      await first
        .locator('[data-filter-field=filterType] select')
        .selectOption('water');
      await first
        .locator('[data-filter-field=filterRegion] select')
        .selectOption('kanto');
      await first
        .locator('[data-filter-field=sort] select')
        .selectOption('level_desc');
      await first.locator('[data-filter-field=filterType] select').focus();
      const retained = await first
        .locator('[data-filter-field=filterType] select')
        .evaluate(async (select) => {
          const option = select.options[0];
          const { EventBus } = await import('/src/core/EventBus.js');
          const { HatcheryChangedEvent } = await import(
            '/src/core/events/HatcheryChangedEvent.js'
          );
          for (let i = 0; i < 20; i++)
            EventBus.getInstance().dispatch(new HatcheryChangedEvent());
          return {
            focus: document.activeElement === select,
            same: option === select.options[0],
            value: select.value,
          };
        });
      assert.deepEqual(retained, { focus: true, same: true, value: 'water' });
      const saved = await state();
      assert.equal(saved.hatchery.filters[0].filterType, 'water');
      assert.equal(saved.hatchery.filters[1].filterType, 'all');
      assert.equal(saved.hatchery.slots[0].pokemonUid, fixture.owned.pidgey);
      await close('hatchery');
    },
  );
  await check(
    'training purchased filters have four desktop columns and all-mode priority survives persisted reload',
    async () => {
      let modal = await open('training');
      await tab(modal, 0);
      for (const id of ['auto-0', 'auto-1'])
        await modal.locator(`[data-upgrade-id=${id}] button`).click();
      await tab(modal, 1);
      const first = modal.locator('.pw-training-queue-card').first();
      assert.equal(await first.locator('select').count(), 8);
      await first
        .locator('[data-filter-field=mode] select')
        .selectOption('all');
      const positions = await first.locator('select').evaluateAll((nodes) =>
        nodes.map((n) => ({
          x: n.getBoundingClientRect().x,
          y: n.getBoundingClientRect().y,
        })),
      );
      assert.ok(
        positions[3].x > positions[2].x &&
          Math.abs(positions[0].y - positions[3].y) < 2,
      );
      const skin = await modal
        .locator('select')
        .first()
        .evaluate((select) => ({
          native: select.classList.contains('pw-dropdown-select--native'),
          font: getComputedStyle(select).fontSize,
          background: getComputedStyle(select).backgroundColor,
        }));
      assert.equal(skin.native, true);
      assert.equal(skin.font, '14px');
      const header = await modal
        .locator('.pw-training-queue-header')
        .first()
        .boundingBox();
      assert.ok(header.height <= 60, 'owned slot header stays compact');
      geometry['training-owned-header'] = header;
      geometry['native-filter-skin'] = skin;
      await modal.screenshot({
        path: path.join(output, 'rework-training-automation-owned.png'),
      });
      const saved = await state();
      assert.deepEqual(saved.training.slots[0].autoOptions, [
        'talent',
        'hidden',
        'move',
        'ev',
        'level',
      ]);
      await close('training');
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator(`[id="save-card-${fixture.id}"]`).click();
      const restored = await state();
      assert.equal(restored.version, 20);
      assert.deepEqual(
        restored.training.slots[0].autoOptions,
        saved.training.slots[0].autoOptions,
      );
      assert.equal(
        restored.training.slots[0].pokemonUid,
        fixture.owned.pikachu,
      );
      assert.deepEqual(restored.hatchery.filters, saved.hatchery.filters);
    },
  );
  await check(
    'change-Pokémon chooser cancellation keeps the reservation; choosing a replacement is atomic',
    async () => {
      const card = page.locator('#win-training [data-slot-index="0"]');
      await card
        .getByRole('button', { name: 'Changer le Pokémon', exact: true })
        .click();
      assert.equal(
        (await state()).training.slots[0].pokemonUid,
        fixture.owned.pikachu,
      );
      await page.locator('#fs-box .modal-close').click();
      assert.equal(
        (await state()).training.slots[0].pokemonUid,
        fixture.owned.pikachu,
      );
      await card
        .getByRole('button', { name: 'Changer le Pokémon', exact: true })
        .click();
      await page
        .locator('#fs-box .pw-pokemon-grid-entry[data-species-id="eevee"]')
        .click();
      assert.equal(
        (await state()).training.slots[0].pokemonUid,
        fixture.owned.eevee,
      );
      const before = await state();
      assert.equal(
        before.collection.length,
        new Set(before.collection.map((p) => p.uid)).size,
      );
    },
  );
  await check(
    'all five purchased tools display distinct glyphs, exact energy costs and genuine buried-item sprites after digging',
    async () => {
      const modal = await open('mine');
      await tab(modal, 0);
      for (const id of ['tool-pickaxe', 'tool-drill', 'tool-dynamite'])
        await modal.locator(`[data-upgrade-id=${id}] button`).click();
      for (let i = 0; i < 4; i++)
        await modal.locator('[data-upgrade-id=energy] button').click();
      await close('mine');
      const tools = await page
        .locator('#win-mine .mine-tool-btn:visible')
        .evaluateAll((nodes) =>
          nodes.map((n) => ({
            id: n.dataset.tool,
            cost: n.querySelector('.mine-tool-cost').textContent,
            svg: n.querySelector('.pw-button-icon svg').innerHTML,
            pressed: n.getAttribute('aria-pressed'),
          })),
        );
      assert.equal(tools.length, 5);
      assert.equal(new Set(tools.map((tool) => tool.svg)).size, 5);
      assert.deepEqual(
        tools.map((tool) => Number(tool.cost)),
        [5, 12, 12, 20, 35],
      );
      await page.locator('#win-mine [data-tool=dynamite]').click();
      const target = (await state()).mine.items[0];
      for (let y = 0; y < target.shape.length; y++)
        for (let x = 0; x < target.shape[y].length; x++)
          if (target.shape[y][x]) {
            const tile = page.locator(
              `#win-mine [data-mine-x="${target.x + x}"][data-mine-y="${target.y + y}"]`,
            );
            const depth = Number(
              await tile.locator('.pw-mine-tile-depth').textContent(),
            );
            if (depth > 0) await tile.click();
          }
      assert.ok(
        (await page
          .locator('#win-mine .pw-mine-treasure.is-collected')
          .count()) > 0,
      );
      await mediaAudit(
        page.locator('#win-mine'),
        '.pw-mine-treasure.is-collected img',
      );
      await page.locator('#win-mine').screenshot({
        path: path.join(output, 'rework-mine-owned-tools-and-loot.png'),
      });
      return tools;
    },
  );
  await check(
    'new-layer control is real, cancellation is lossless and only confirmation discards the old board',
    async () => {
      const before = await state();
      await page
        .locator('#win-mine')
        .locator('#pw-mine-new-layer')
        .click();
      await page
        .locator('#pw-mine-survey-confirm')
        .getByRole('button', { name: 'Annuler', exact: true })
        .click();
      assert.deepEqual((await state()).mine, before.mine);
      await page
        .locator('#win-mine')
        .locator('#pw-mine-new-layer')
        .click();
      await page.locator('#pw-mine-survey-confirm .pw-btn-danger').click();
      const after = await state();
      assert.notDeepEqual(after.mine.grid, before.mine.grid);
      assert.deepEqual(after.inventory, before.inventory);
    },
  );
  for (const width of [768, 375])
    await check(
      `responsive ${width}px: the three panels, all nine tabs and purchased native filters stay inside their windows`,
      async () => {
        await page.setViewportSize({ width, height: 900 });
        await page
          .locator('.mobile-nav-bar')
          .getByRole('button', { name: 'Gestion', exact: true })
          .click();
        for (const [feature, label] of [
          ['hatchery', 'Pension'],
          ['training', 'Entraînement'],
          ['mine', 'Grand Souterrain'],
        ]) {
          await page
            .locator('.mobile-subnav-bar')
            .getByRole('button', { name: label, exact: true })
            .click();
          const panel = page.locator(`#win-${feature}`);
          await panel.screenshot({
            path: path.join(output, `rework-${feature}-panel-${width}.png`),
          });
          const modal = await open(feature);
          for (const [index, name] of [
            'upgrades',
            'automation',
            'staff',
          ].entries()) {
            await tab(modal, index);
            const bounds = await modal.evaluate((e) => {
              const c = e.querySelector('.management-content');
              return {
                x: e.getBoundingClientRect().x,
                w: e.getBoundingClientRect().width,
                scroll: c.scrollWidth,
                width: c.clientWidth,
                overflow: c.scrollHeight > c.clientHeight,
              };
            });
            assert.ok(bounds.x >= 0 && bounds.x + bounds.w <= width + 1);
            assert.ok(
              bounds.scroll <= bounds.width + 1,
              JSON.stringify(bounds),
            );
            assert.ok((await modal.locator('button:visible').count()) > 3);
            if (index === 1)
              await modal.screenshot({
                path: path.join(
                  output,
                  `rework-${feature}-automation-${width}.png`,
                ),
              });
          }
          await close(feature);
        }
      },
    );
  assert.deepEqual(issues, []);
} finally {
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      {
        environment: {
          release: JSON.parse(
            await fs.readFile(
              new URL('../../package.json', import.meta.url),
              'utf8',
            ),
          ).version,
          browser: browser.version(),
          viewport: { width: 1560, height: 1120 },
          reference: 'origin/main 64d8f794',
          saveSchema: 19,
        },
        fixture,
        results,
        geometry,
        assets,
        issues,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
