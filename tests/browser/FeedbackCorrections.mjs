/** @file FeedbackCorrections.mjs @brief Real Chromium checks for 1.14.20; explicit fixtures, normal clicks and real pointer drags. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const output =
  process.env.PW_BROWSER_OUTPUT ||
  path.resolve('artifacts/feedback-corrections');
await fs.mkdir(output, { recursive: true });
for (const name of ['failure.png', 'failure.html'])
  await fs.rm(path.join(output, name), { force: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1560, height: 1120 } });
page.setDefaultTimeout(10000);
const issues = [],
  results = [],
  geometry = {};
page.on('pageerror', (e) => issues.push(e.stack));
page.on('console', (m) => {
  if (['warning', 'error'].includes(m.type()))
    issues.push(`${m.type()}: ${m.text()}`);
});
page.on('response', (r) => {
  if (r.status() >= 400) issues.push(`HTTP ${r.status()} ${r.url()}`);
});
await page.clock.install();
await page.addInitScript(() =>
  addEventListener('DOMContentLoaded', () => {
    for (const name of ['TrainingSystem', 'HatcherySystem', 'MineSystem'])
      import(`/src/systems/${name}.js`).then((module) =>
        module[name].getInstance().setEnabled(false),
      );
  }),
);
async function check(name, run) {
  try {
    const detail = await run();
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
async function state() {
  return page.evaluate(async () =>
    (await import('/src/systems/SaveSystem.js')).SaveSystem.getInstance()
      .getCurrentSave()
      .serialize(),
  );
}
async function draft() {
  return page.evaluate(
    async () =>
      (
        await import('/src/systems/TeamPresetEditSystem.js')
      ).TeamPresetEditSystem.getInstance().getSnapshot()?.members,
  );
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
async function settled(root) {
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
async function screenshot(root, name) {
  await root.screenshot({
    path: path.join(output, name + '.png'),
    animations: 'disabled',
  });
}
async function openEditor(index = 0) {
  if (!(await page.locator('#team-presets-modal').isVisible()))
    await page.locator('.team-presets-open-btn').click();
  const row = page.locator('#team-presets-modal .preset-row').nth(index);
  await clickKey(row, 'preset_edit_btn');
  return settled(page.locator('#pw-team-preset-editor'));
}
async function closeEditor() {
  await page.locator('#pw-team-preset-editor .pw-modal-close-btn').click();
}
async function closeManager() {
  if (await page.locator('#team-presets-modal').isVisible())
    await page.locator('#team-presets-modal .modal-close').click();
}
async function boxPick(uid) {
  const root = page.locator('#fs-box');
  await root.waitFor({ state: 'visible' });
  await root
    .locator(
      `.pw-box-grid-entry[data-pokemon-uid="${uid}"] .pw-box-pokemon-tile`,
    )
    .click();
  await root.waitFor({ state: 'hidden' });
}
async function dragCard(source, target) {
  await source.scrollIntoViewIfNeeded();
  const from = await source.locator('.poke-name').boundingBox(),
    to = await target.locator('.poke-name').boundingBox();
  assert.ok(from && to);
  await page.mouse.move(from.x + 8, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 17, from.y + from.height / 2 + 5);
  assert.ok(
    await source.evaluate((e) => e.classList.contains('is-dragging')),
    'actual ordinary movement must enter pointer dragging',
  );
  await page.mouse.move(to.x + 8, to.y + to.height / 2, { steps: 12 });
  assert.ok(
    await target.evaluate((e) => e.classList.contains('is-drop-target')),
    'actual target must have drop feedback',
  );
  await page.mouse.up();
}
let fixture;
try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', {
    waitUntil: 'networkidle',
  });
  fixture = await page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js'),
      { PokemonFactory } = await import('/src/data/pokemon/PokemonFactory.js'),
      { TeamSystem } = await import('/src/systems/TeamSystem.js'),
      { BoxSystem } = await import('/src/systems/BoxSystem.js'),
      { TeamPresetSystem } = await import('/src/systems/TeamPresetSystem.js'),
      { Engine } = await import('/src/core/Engine.js'),
      { SeededRandom } = await import('/src/core/SeededRandom.js'),
      { LocalizationManager } = await import(
        '/src/localization/LocalizationManager.js'
      );
    LocalizationManager.getInstance().setLanguage('fr');
    const saves = SaveSystem.getInstance(),
      save = saves.createNewSave('Feedback acceptance', 'charmander');
    save.tutorial.enabled = false;
    save.player.location = 'diglettscave';
    save.team[0].setLevel(30);
    const owned = { charmander: save.team[0].uid };
    for (const [id, level] of [
      ['pikachu', 25],
      ['pidgey', 20],
    ]) {
      const p = PokemonFactory.create(id, level);
      TeamSystem.getInstance().addPokemon(p, { deferSave: true });
      owned[id] = p.uid;
    }
    for (const [id, level] of [
      ['eevee', 18],
      ['magikarp', 15],
      ['chikorita', 22],
    ]) {
      const p = PokemonFactory.create(id, level);
      if (id === 'eevee') p.hp = 0;
      BoxSystem.getInstance().addPokemon(p, { deferSave: true });
      owned[id] = p.uid;
    }
    for (const feature of ['hatchery', 'training', 'mine'])
      save.access.unlockFeature(feature);
    for (const id of [
      'route1',
      'diglettscave',
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
      'route101',
      'route102',
      'littleroot',
    ])
      save.access.unlockLocation(id);
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
    for (const [id, n] of [
      ['money', 1000000],
      ['questPoint', 100000],
      ['diamond', 10000],
    ])
      save.currencies.add(id, n);
    save.inventory.add('leftovers', 1, { deferSave: true });
    TeamPresetSystem.getInstance().rename('preset1', 'Équipe validation');
    TeamPresetSystem.getInstance().saveCurrentToPreset('preset1');
    for (const name of ['TrainingSystem', 'HatcherySystem', 'MineSystem']) {
      const m = await import(`/src/systems/${name}.js`);
      m[name].getInstance().setEnabled(false);
    }
    const { MineSystem } = await import('/src/systems/MineSystem.js');
    MineSystem.getInstance().setRandom(new SeededRandom(333));
    MineSystem.getInstance().ensureLayer();
    saves.saveCurrent();
    Engine.getInstance().getPageManager().openPage('game');
    return { id: save.id, owned, team: save.teamMembers.getUids() };
  });
  await check(
    'Team: standalone centered manager button without a surrounding frame',
    async () => {
      const root = page.locator('#win-team'),
        button = root.locator('.team-presets-open-btn');
      await root.scrollIntoViewIfNeeded();
      assert.equal(
        await root.locator('.pw-team-toolbar,.ui-control-toolbar').count(),
        0,
      );
      assert.equal(
        await button.evaluate((e) =>
          e.parentElement.classList.contains('win-body'),
        ),
        true,
      );
      const [b, p] = await Promise.all([
        button.boundingBox(),
        root.boundingBox(),
      ]);
      assert.ok(Math.abs(b.x + b.width / 2 - p.x - p.width / 2) < 2);
      await screenshot(root, 'team-desktop');
    },
  );
  await check(
    'Team: real immediate whole-card mouse drag swaps the two canonical UIDs without a phantom PC selector',
    async () => {
      const before = await state(),
        root = page.locator('#win-team'),
        source = root.locator('.poke-card').nth(0),
        target = root.locator('.poke-card').nth(1),
        node = await source.elementHandle();
      await dragCard(source, target);
      const after = await state();
      assert.deepEqual(after.team, [
        before.team[1],
        before.team[0],
        ...before.team.slice(2),
      ]);
      assert.equal(after.collection.length, before.collection.length);
      assert.equal(await page.locator('#fs-box').isVisible(), false);
      assert.equal(
        await node.evaluate(
          (e, uid) =>
            e ===
            document.querySelector(`#win-team [data-pokemon-uid="${uid}"]`),
          before.team[0],
        ),
        true,
      );
    },
  );
  await check(
    'Presets: all twenty cards, original full-screen geometry and stable native name editing',
    async () => {
      await page.locator('.team-presets-open-btn').click();
      const root = await settled(page.locator('#team-presets-modal'));
      assert.equal(await root.locator('.preset-row').count(), 20);
      const input = root.locator('.preset-name-input').first(),
        node = await input.elementHandle();
      await input.fill('Nom en cours');
      await page.evaluate(async () => {
        const { EventBus } = await import('/src/core/EventBus.js');
        const { TeamChangedEvent } = await import(
          '/src/core/events/TeamChangedEvent.js'
        );
        EventBus.getInstance().dispatch(new TeamChangedEvent(3));
      });
      assert.equal(await input.inputValue(), 'Nom en cours');
      assert.equal(
        await node.evaluate((e) => e === document.activeElement),
        true,
      );
      await input.fill('Équipe validation');
      await input.press('Tab');
      assert.equal(
        (await state()).teamPresets.slots[0].name,
        'Équipe validation',
      );
      const rect = await root.locator('.pw-modal-container').boundingBox();
      assert.ok(Math.abs(rect.width - 960) < 2);
      geometry.manager = rect;
      await screenshot(root.locator('.pw-modal-container'), 'presets-desktop');
    },
  );
  await check(
    'Preset editor: full shared cards, genuine sprites and two-axis drag change only the transient draft',
    async () => {
      const root = await openEditor(),
        before = await state();
      assert.equal(await root.locator('.pw-preset-member-card').count(), 3);
      assert.equal(await root.locator('.poke-moves').count(), 3);
      const rect = await root.boundingBox();
      assert.ok(Math.abs(rect.width - 980) < 2);
      geometry.editor = rect;
      for (const image of await root
        .locator('.pw-poke-circle-img:visible')
        .evaluateAll((images) =>
          images.map((e) => ({
            natural: e.naturalWidth,
            w: e.getBoundingClientRect().width,
          })),
        ))
        assert.ok(image.natural > 0 && image.w >= 40);
      const cards = root.locator('.pw-preset-member-card');
      await dragCard(cards.nth(0), cards.nth(1));
      assert.deepEqual(await draft(), [
        before.teamPresets.slots[0].members[1],
        before.teamPresets.slots[0].members[0],
        before.teamPresets.slots[0].members[2],
      ]);
      assert.deepEqual((await state()).team, before.team);
      assert.deepEqual((await state()).teamPresets, before.teamPresets);
      await screenshot(root, 'preset-editor-desktop');
    },
  );
  await check(
    'Preset picker: normal PC cancellation and replacement keep ownership unique; boxed KO previews remain resting',
    async () => {
      const root = page.locator('#pw-team-preset-editor'),
        before = await draft();
      await root
        .locator('.pw-preset-member-card .poke-sprite-container')
        .first()
        .click();
      await page.locator('#fs-box .pw-box-selection-cancel').click();
      assert.deepEqual(await draft(), before);
      await root
        .locator('.pw-preset-member-card .poke-sprite-container')
        .first()
        .click();
      await boxPick(fixture.owned.eevee);
      assert.equal((await draft())[0], fixture.owned.eevee);
      const saved = await state();
      assert.equal(saved.collection.length, 6);
      assert.equal(
        saved.collection.find((p) => p.uid === fixture.owned.eevee).hp,
        0,
      );
      assert.equal(
        await root
          .locator('.pw-preset-member-card')
          .first()
          .evaluate((e) => e.classList.contains('fainted')),
        false,
      );
    },
  );
  await check(
    'Preset subwindows: real Pokémon sheet and active-team held-item bag open above the editor and cancel cleanly',
    async () => {
      const root = page.locator('#pw-team-preset-editor');
      await root
        .locator('.pw-preset-member-card .poke-sprite-container')
        .first()
        .click({ button: 'right' });
      await page.locator('#poke-modal-inner').waitFor({ state: 'visible' });
      await page.locator('#poke-modal-inner .modal-close').click();
      await root
        .locator('.pw-preset-member-card')
        .nth(1)
        .locator('.poke-item-badge')
        .click();
      await page
        .locator('#fs-inventory.pw-bag-held-item-mode')
        .waitFor({ state: 'visible' });
      await page.locator('#fs-inventory .pw-held-item-cancel').click();
      assert.equal(await root.isVisible(), true);
    },
  );
  await check(
    'Preset save and apply: commit the edited UID composition, then load it through the canonical party system',
    async () => {
      const root = page.locator('#pw-team-preset-editor'),
        members = await draft();
      await clickKey(root, 'preset_save_editor_btn');
      assert.deepEqual((await state()).teamPresets.slots[0].members, members);
      await clickKey(root, 'preset_apply_btn');
      assert.deepEqual((await state()).team, members);
      assert.equal((await state()).collection.length, 6);
      await closeEditor();
    },
  );
  await check(
    'Preset creation: six genuine PC picks, capacity hiding and removal preserve the reusable empty-slot control',
    async () => {
      const root = await openEditor(1),
        empty = root.locator('.preset-slot-empty'),
        node = await empty.elementHandle();
      assert.equal(await root.locator('.pw-preset-member-card').count(), 0);
      for (const uid of Object.values(fixture.owned)) {
        await empty.click();
        await boxPick(uid);
      }
      assert.equal(await root.locator('.pw-preset-member-card').count(), 6);
      assert.equal(await empty.isVisible(), false);
      await root.locator('.pw-preset-remove').first().click();
      assert.equal(await empty.isVisible(), true);
      assert.equal(
        await node.evaluate(
          (e) =>
            e ===
            document.querySelector('#pw-team-preset-editor .preset-slot-empty'),
        ),
        true,
      );
      await empty.click();
      await page.locator('#fs-box .pw-box-selection-cancel').click();
      await closeEditor();
      assert.deepEqual((await state()).teamPresets.slots[1].members, []);
      await closeManager();
    },
  );
  await check(
    'Helpers: all fifteen recruitment prices and currency sprites remain visible with no funds, including gated staff',
    async () => {
      await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const s = SaveSystem.getInstance().getCurrentSave();
        for (const id of ['money', 'questPoint', 'diamond'])
          s.currencies.add(id, -s.currencies.get(id));
      });
      let quotes = 0;
      for (const feature of ['hatchery', 'training', 'mine']) {
        await page.locator(`#win-${feature} .pw-facility-manage`).click();
        const root = await settled(page.locator(`#pw-${feature}-management`));
        await root.locator('.management-tabs button').nth(2).click();
        assert.equal(
          await root.locator('.pw-staff-price-quote:visible').count(),
          5,
        );
        for (const quote of await root
          .locator('.pw-staff-price-quote')
          .evaluateAll((nodes) =>
            nodes.map((e) => ({
              text: e.textContent,
              image: e.querySelector('img')?.naturalWidth,
              visible: e.checkVisibility(),
            })),
          )) {
          assert.ok(quote.visible && /\d/.test(quote.text) && quote.image > 0);
          quotes++;
        }
        await screenshot(root, `${feature}-staff-no-funds`);
        await root.locator('.pw-modal-close-btn').click();
      }
      assert.equal(quotes, 15);
      assert.equal(
        await page
          .locator('#win-training')
          .getByText('Chaque slot lance son propre', { exact: false })
          .count(),
        0,
      );
      return { visibleQuotes: quotes };
    },
  );
  await check(
    'Mine: original board composition, framed tools, 80 real tiles and depth labels replace the old generic layout',
    async () => {
      const root = page.locator('#win-mine');
      assert.equal(await root.locator('.pw-mine-window-root').count(), 1);
      assert.equal(await root.locator('.pw-mine-grid .mine-tile').count(), 80);
      assert.equal(
        await root
          .locator('.pw-chip-group .mine-tool-btn.hbtn:visible')
          .count(),
        2,
      );
      const detail = await root.locator('.mine-grid').evaluate((e) => ({
        background: getComputedStyle(e).backgroundColor,
        border: getComputedStyle(e).borderTopWidth,
        columns: getComputedStyle(e).gridTemplateColumns.split(' ').length,
        labelFont: getComputedStyle(e.querySelector('.pw-slot-label')).fontSize,
      }));
      assert.equal(detail.columns, 10);
      assert.equal(detail.border, '2px');
      assert.equal(detail.labelFont, '13px');
      geometry.mine = await root.boundingBox();
      await screenshot(root, 'mine-desktop');
      return detail;
    },
  );
  await check(
    'Mine manual survey: cancelling is lossless; confirming starts a visible disabled 10-minute countdown on the same button',
    async () => {
      const next = page.locator('#pw-mine-new-layer'),
        before = await state(),
        node = await next.elementHandle();
      await next.click();
      await clickKey(page.locator('#pw-mine-survey-confirm'), 'btn_cancel');
      assert.deepEqual((await state()).mine, before.mine);
      await next.click();
      await page.locator('#pw-mine-survey-confirm .pw-btn-danger').click();
      const saved = await state();
      assert.ok(saved.mine.manualSurveyReadyAt > Date.now());
      assert.ok(await next.isVisible());
      assert.ok(await next.isDisabled());
      assert.match(await next.innerText(), /(10:00|9:59)/);
      const refused = await page.evaluate(async () => {
        const { MineSystem } = await import('/src/systems/MineSystem.js');
        return MineSystem.getInstance().startNextLayer({
          discardCurrent: true,
        });
      });
      assert.equal(refused.result, 'survey-cooldown');
      assert.deepEqual((await state()).mine, saved.mine);
      await page.clock.fastForward(1000);
      assert.equal(
        await node.evaluate(
          (e) => e === document.querySelector('#pw-mine-new-layer'),
        ),
        true,
      );
      assert.ok(await next.isVisible());
      await screenshot(page.locator('#win-mine'), 'mine-countdown');
    },
  );
  await check(
    'Mine clock: persisted reload and save switching neither reset the 600-second deadline nor leak it to another save',
    async () => {
      const before = await state(),
        deadline = before.mine.manualSurveyReadyAt;
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator(`[id="save-card-${fixture.id}"]`).click();
      assert.equal((await state()).mine.manualSurveyReadyAt, deadline);
      assert.ok(await page.locator('#pw-mine-new-layer').isDisabled());
      await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const { MineSystem } = await import('/src/systems/MineSystem.js');
        const { Engine } = await import('/src/core/Engine.js');
        const s = SaveSystem.getInstance().createNewSave(
          'Clock isolation',
          'squirtle',
        );
        s.tutorial.enabled = false;
        s.access.unlockFeature('mine');
        MineSystem.getInstance().ensureLayer();
        SaveSystem.getInstance().saveCurrent();
        Engine.getInstance().getPageManager().openPage('game');
      });
      assert.equal((await state()).mine.manualSurveyReadyAt, 0);
      assert.equal(
        await page.locator('#pw-mine-new-layer').isDisabled(),
        false,
      );
      await page.evaluate(async (id) => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const { Engine } = await import('/src/core/Engine.js');
        SaveSystem.getInstance().loadSlot(id);
        Engine.getInstance().getPageManager().openPage('game');
      }, fixture.id);
      assert.equal((await state()).mine.manualSurveyReadyAt, deadline);
    },
  );
  await check(
    'Mine clock: the button becomes usable at expiry and a second confirmed manual survey starts a fresh full interval',
    async () => {
      const wait = await page.evaluate(async () => {
        const { MineSystem } = await import('/src/systems/MineSystem.js');
        return (
          MineSystem.getInstance().getManualSurveySnapshot().readyAt -
          Date.now()
        );
      });
      await page.clock.fastForward(Math.max(0, wait - 2000));
      assert.equal(await page.locator('#pw-mine-new-layer').isDisabled(), true);
      await page.clock.fastForward(2100);
      await page.waitForFunction(
        () => !document.getElementById('pw-mine-new-layer').disabled,
      );
      await page.locator('#pw-mine-new-layer').click();
      await page.locator('#pw-mine-survey-confirm .pw-btn-danger').click();
      const remaining = await page.evaluate(async () => {
        const { MineSystem } = await import('/src/systems/MineSystem.js');
        return MineSystem.getInstance().getManualSurveySnapshot()
          .remainingSeconds;
      });
      assert.ok(remaining >= 599 && remaining <= 600);
    },
  );
  await check(
    'Location bases: bottom alcove section, genuine temporary visit, first installation and direct own-base entry',
    async () => {
      await page.evaluate(async () => {
        const { SaveSystem } = await import('/src/systems/SaveSystem.js');
        const { QuestDB } = await import('/src/data/quests/QuestDB.js');
        const { EventBus } = await import('/src/core/EventBus.js');
        const { LocationChangedEvent } = await import(
          '/src/core/events/LocationChangedEvent.js'
        );
        const s = SaveSystem.getInstance().getCurrentSave();
        s.player.region = 'hoenn';
        s.player.location = 'route101';
        s.quests.setMainStep(
          'hoenn',
          QuestDB.getInstance()
            .getMainChain('hoenn')
            .findIndex((q) => q.key === 'main.216') + 1,
        );
        EventBus.getInstance().dispatch(
          new LocationChangedEvent('hoenn', 'route101'),
        );
      });
      const root = page.locator('#win-tabs'),
        rows = root.locator('.pw-loc-alcove-row');
      assert.equal(await rows.count(), 2);
      assert.equal(
        await root
          .locator('.pw-loc-action-grid [data-secret-base-layout]')
          .count(),
        0,
      );
      assert.equal(await rows.first().locator('button').count(), 2);
      await screenshot(root, 'location-alcoves');
      await clickKey(rows.first(), 'location_alcoves_visit');
      await page.locator('#pw-secret-base-visit').waitFor({ state: 'visible' });
      assert.equal((await state()).secretBase.layoutId, null);
      await page
        .locator('#pw-secret-base-visit .pw-secret-base-toolbar-stop')
        .click();
      await clickKey(rows.first(), 'location_alcoves_establish');
      assert.equal((await state()).secretBase.layoutId, 'tree_1');
      await clickKey(rows.first(), 'location_alcoves_enter');
      await page.locator('#pw-secret-base-visit').waitFor({ state: 'visible' });
      await page
        .locator('#pw-secret-base-visit .pw-secret-base-toolbar-stop')
        .click();
    },
  );
  await check(
    'Location relocation: refreshes retain the actual confirmation; cancel is lossless and confirm uses the real relocation command',
    async () => {
      const rows = page.locator('#win-tabs .pw-loc-alcove-row'),
        before = (await state()).secretBase;
      await clickKey(rows.nth(1), 'location_alcoves_establish');
      const confirm = page.locator('#pw-location-base-confirm');
      await confirm.waitFor({ state: 'visible' });
      const node = await confirm.elementHandle();
      await page.evaluate(async () => {
        const { EventBus } = await import('/src/core/EventBus.js');
        const { PokemonDefeatedEvent } = await import(
          '/src/core/events/PokemonDefeatedEvent.js'
        );
        EventBus.getInstance().dispatch(
          new PokemonDefeatedEvent('rattata', 5, 'route101', false, {
            deferSave: true,
          }),
        );
      });
      assert.equal(await confirm.isVisible(), true);
      assert.equal(
        await node.evaluate(
          (e) => e === document.getElementById('pw-location-base-confirm'),
        ),
        true,
      );
      await clickKey(confirm, 'btn_cancel');
      assert.deepEqual((await state()).secretBase, before);
      await clickKey(rows.nth(1), 'location_alcoves_establish');
      await confirm.locator('.pw-btn-danger').click();
      assert.equal((await state()).secretBase.layoutId, 'bush_1');
      await screenshot(page.locator('#win-tabs'), 'location-own-base');
    },
  );
  for (const width of [768, 375])
    await check(
      `Responsive ${width}px: team manager, full-card editor, Mine clock and alcoves fit their actual windows`,
      async () => {
        await page.setViewportSize({ width, height: 900 });
        await page
          .locator('.mobile-nav-bar')
          .getByRole('button', { name: await label('team_btn'), exact: true })
          .click();
        await page.locator('.team-presets-open-btn').click();
        const manager = page.locator('#team-presets-modal .pw-modal-container');
        await screenshot(manager, `presets-${width}`);
        await clickKey(
          page.locator('#team-presets-modal .preset-row').first(),
          'preset_edit_btn',
        );
        const editor = await settled(page.locator('#pw-team-preset-editor'));
        await screenshot(editor, `preset-editor-${width}`);
        for (const root of [manager, editor]) {
          const box = await root.boundingBox();
          assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
          const content =
            root === manager
              ? root.locator('.pw-modal-body')
              : root.locator('.pw-preset-editor-body');
          assert.ok(
            await content.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
          );
        }
        await closeEditor();
        await closeManager();
        await page
          .locator('.mobile-nav-bar')
          .getByRole('button', { name: await label('manage_tab'), exact: true })
          .click();
        await page
          .locator('.mobile-subnav-bar')
          .getByRole('button', { name: await label('mine_title'), exact: true })
          .click();
        await screenshot(page.locator('#win-mine'), `mine-${width}`);
        assert.ok(await page.locator('#pw-mine-new-layer').isVisible());
        await page
          .locator('.mobile-nav-bar')
          .getByRole('button', {
            name: await label('adventure_tab'),
            exact: true,
          })
          .click();
        await screenshot(page.locator('#win-tabs'), `location-${width}`);
        assert.ok(
          await page
            .locator('#win-tabs .pw-loc-alcove-list')
            .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
        );
      },
    );
  assert.deepEqual(issues, []);
} finally {
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      {
        environment: {
          browser: browser.version(),
          release: JSON.parse(
            await fs.readFile(
              new URL('../../package.json', import.meta.url),
              'utf8',
            ),
          ).version,
          saveSchema: 19,
        },
        fixture,
        results,
        geometry,
        issues,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
