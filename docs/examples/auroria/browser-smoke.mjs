/** @file browser-smoke.mjs @brief Optional real-browser check of the installed tutorial, with explicit progression fixtures. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const output =
  process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/auroria-browser');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1560, height: 1120 } });
const issues = [],
  results = [];
page.setDefaultTimeout(15000);
page.on('pageerror', (e) => issues.push(e.stack));
page.on('console', (m) => {
  if (['warning', 'error'].includes(m.type()))
    issues.push(m.type() + ': ' + m.text());
});
page.on('response', (r) => {
  if (r.status() >= 400) issues.push('HTTP ' + r.status() + ' ' + r.url());
});
async function check(name, action) {
  await action();
  results.push({ name, passed: true });
  console.log('PASS ' + name);
}
async function state() {
  return page.evaluate(async () => {
    const p = new URL('src/', document.baseURI).pathname;
    const m = await import(p + 'systems/SaveSystem.js');
    return m.SaveSystem.getInstance().getCurrentSave().serialize();
  });
}
const journal = () => page.locator('#win-field-journal');
try {
  await page.goto(process.env.PW_AURORIA_URL || 'http://127.0.0.1:3000/', {
    waitUntil: 'networkidle',
  });
  await check(
    'installed sample boots with its own schema and real gated travel, not unlocked-location flags',
    async () => {
      const id = await page.evaluate(async () => {
        const p = new URL('src/', document.baseURI).pathname;
        const load = async (file, name) => (await import(p + file))[name];
        const SaveSystem = await load('systems/SaveSystem.js', 'SaveSystem'),
          Engine = await load('core/Engine.js', 'Engine'),
          LocationSystem = await load(
            'systems/LocationSystem.js',
            'LocationSystem',
          ),
          PokemonDB = await load('data/pokemon/PokemonDB.js', 'PokemonDB'),
          BattleSystem = await load('systems/BattleSystem.js', 'BattleSystem');
        (
          await load(
            'localization/LocalizationManager.js',
            'LocalizationManager',
          )
        )
          .getInstance()
          .setLanguage('fr');
        for (const name of [
          'BattleSystem',
          'TrainingSystem',
          'MineSystem',
          'HatcherySystem',
          'DungeonAutoSystem',
        ]) {
          const C = await load('systems/' + name + '.js', name);
          C.getInstance().setEnabled(false);
        }
        const s = SaveSystem.getInstance().createNewSave(
          'Auroria browser',
          'charmander',
        );
        s.tutorial.enabled = false;
        const locations = LocationSystem.getInstance();
        if (locations.travelToRegion('auroria'))
          throw Error('Region should be locked');
        s.statistics.recordLeague('hoenn');
        for (const x of PokemonDB.getInstance().getByRegion('hoenn'))
          s.pokedex.markCaught(x.id, false, { deferSave: true });
        if (!locations.travelToRegion('auroria'))
          throw Error('Legal travel failed');
        const chosen = (
          await load(
            'systems/RegionalStarterSystem.js',
            'RegionalStarterSystem',
          )
        )
          .getInstance()
          .chooseStarter('auroria', 'mossling');
        if (!chosen.success) throw Error('Starter choice failed');
        locations.talkToNpc('auroria_guide');
        if (!locations.travelTo('auroria_path'))
          throw Error('Route unavailable');
        const strong = (
            await load('data/pokemon/PokemonFactory.js', 'PokemonFactory')
          ).create('mewtwo', 100),
          team = (
            await load('systems/TeamSystem.js', 'TeamSystem')
          ).getInstance();
        team.addPokemon(strong);
        team.setLead(s.team.findIndex((x) => x.uid === strong.uid));
        BattleSystem.getInstance().setRandom(
          new (await load('core/SeededRandom.js', 'SeededRandom'))(1234),
        );
        SaveSystem.getInstance().saveCurrent();
        Engine.getInstance().getPageManager().openPage('game');
        return s.id;
      });
      assert.ok(id);
      await journal().waitFor({ state: 'visible' });
      assert.equal(
        await journal()
          .locator('.pw-field-journal')
          .evaluate((e) => getComputedStyle(e).display),
        'grid',
      );
      assert.match(await journal().innerText(), /Carnet de terrain/);
      assert.equal((await state()).version, 21);
    },
  );
  await check(
    'real wild engine unlocks a stable survey button and exactly one UI reward',
    async () => {
      const node = await journal().elementHandle();
      await page.evaluate(async () => {
        const p = new URL('src/', document.baseURI).pathname;
        const b = (
            await import(p + 'systems/BattleSystem.js')
          ).BattleSystem.getInstance(),
          s = (
            await import(p + 'systems/SaveSystem.js')
          ).SaveSystem.getInstance().getCurrentSave();
        if (!b.startBattle('auroria_path')) throw Error('No battle');
        for (
          let i = 0;
          i < 40000 && (s.statistics.wildWins.auroria_path || 0) < 3;
          i++
        )
          b.update(0.1);
        if ((s.statistics.wildWins.auroria_path || 0) < 3)
          throw Error('No real wins');
        b.endBattle(false);
      });
      assert.ok(
        await node.evaluate(
          (e) => e === document.querySelector('#win-field-journal'),
        ),
      );
      const summary = page.locator('#battle-summary-inner');
      if (await summary.isVisible())
        await summary
          .locator(':scope > .pw-win-hdr .pw-modal-close-btn')
          .click();
      const before = (await state()).currencies.money;
      await journal()
        .getByRole('button', { name: 'Étudier ce site', exact: true })
        .click();
      const after = await state();
      assert.equal(after.currencies.money, before + 250);
      assert.deepEqual(after.fieldJournal, { sites: ['auroria_path'] });
      assert.equal(
        await journal()
          .getByRole('button', { name: 'Étudier ce site', exact: true })
          .isVisible(),
        false,
      );
      await page.evaluate(async () => {
        const p = new URL('src/', document.baseURI).pathname;
        const q = (
          await import(p + 'systems/QuestSystem.js')
        ).QuestSystem.getInstance();
        if (!q.claim('main.auroria_road')) throw Error('Claim failed');
      });
      await page.waitForTimeout(2500);
      await journal().evaluate((element) =>
        window.scrollTo(
          0,
          window.scrollY + element.getBoundingClientRect().top - 210,
        ),
      );
      await journal().screenshot({
        path: path.join(output, 'journal-fr.png'),
        animations: 'disabled',
      });
      await page.locator('#win-map').screenshot({
        path: path.join(output, 'auroria-map.png'),
        animations: 'disabled',
      });
    },
  );
  await check(
    'English UI and mobile Shortcuts expose the new panel without overflow',
    async () => {
      await page.evaluate(async () => {
        const p = new URL('src/', document.baseURI).pathname;
        (
          await import(p + 'localization/LocalizationManager.js')
        ).LocalizationManager.getInstance().setLanguage('en');
        (await import(p + 'core/Engine.js')).Engine.getInstance()
          .getPageManager()
          .openPage('game');
      });
      await page.setViewportSize({ width: 390, height: 844 });
      const label = await page.evaluate(async () => {
        const p = new URL('src/', document.baseURI).pathname;
        return (await import(p + 'localization/LocalizationManager.js')).t(
          'shortcuts_tab',
        );
      });
      await page
        .locator('.mobile-nav-bar')
        .getByRole('button', { name: label, exact: true })
        .click();
      await journal().waitFor({ state: 'visible' });
      assert.match(await journal().innerText(), /Field journal/i);
      const metrics = await journal().evaluate((e) => {
        const r = e.getBoundingClientRect();
        return {
          left: r.left,
          right: r.right,
          width: e.clientWidth,
          scroll: e.scrollWidth,
        };
      });
      assert.ok(
        metrics.left >= 0 &&
          metrics.right <= 391 &&
          metrics.scroll <= metrics.width + 1,
        JSON.stringify(metrics),
      );
      await page.waitForTimeout(2500);
      await journal().evaluate((element) =>
        window.scrollTo(
          0,
          window.scrollY + element.getBoundingClientRect().top - 210,
        ),
      );
      await journal().screenshot({
        path: path.join(output, 'journal-mobile-en.png'),
        animations: 'disabled',
      });
    },
  );
  await check(
    'real reload retains surveyed site and does not reward twice',
    async () => {
      const saved = await state();
      await page.reload({ waitUntil: 'networkidle' });
      await page.evaluate(async (id) => {
        const p = new URL('src/', document.baseURI).pathname;
        const saves = (
          await import(p + 'systems/SaveSystem.js')
        ).SaveSystem.getInstance();
        if (!saves.loadSlot(id)) throw Error('Reload failed');
        (await import(p + 'core/Engine.js')).Engine.getInstance()
          .getPageManager()
          .openPage('game');
      }, saved.id);
      const reloaded = await state();
      assert.deepEqual(reloaded.fieldJournal, saved.fieldJournal);
      assert.equal(reloaded.currencies.money, saved.currencies.money);
      assert.equal(
        await page.evaluate(async () => {
          const p = new URL('src/', document.baseURI).pathname;
          return (
            await import(p + 'systems/FieldJournalSystem.js')
          ).FieldJournalSystem.getInstance().survey();
        }),
        false,
      );
      assert.equal((await state()).currencies.money, saved.currencies.money);
    },
  );
  assert.deepEqual(issues, []);
} catch (error) {
  await page
    .screenshot({ path: path.join(output, 'failure.png'), fullPage: true })
    .catch(() => {});
  results.push({ passed: false, error: error.stack });
  throw error;
} finally {
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      {
        scope:
          'Installed Auroria sample; seeded previous-region facts and overlevelled combat team; not a natural campaign',
        results,
        issues,
      },
      null,
      2,
    ),
  );
  await browser.close();
}
