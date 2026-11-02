/**
 * @file TalentPools.mjs
 * @brief Real Chromium verification of the talent pools (1.16.4): the Pokédex sheet of a species
 *        that only had its signature ability upstream lists at least ten distinct talents, and its
 *        level-up tab still lists the fifteen moves of the original rule.
 *
 * Run: npm start (in another terminal) then `node tests/browser/TalentPools.mjs`.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-talents');
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
page.setDefaultTimeout(20000);

const results = [];
const issues = [];
page.on('pageerror', (e) => issues.push(e.stack));
page.on('console', (m) => {
  if (['warning', 'error'].includes(m.type())) issues.push(`${m.type()}: ${m.text()}`);
});

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail });
    console.log('PASS ' + name);
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  }
}

await page.addInitScript(() =>
  addEventListener('DOMContentLoaded', () => {
    for (const name of ['BattleSystem', 'TrainingSystem', 'HatcherySystem', 'MineSystem', 'RelaunchSystem', 'DungeonAutoSystem']) {
      import(`/src/systems/${name}.js`).then((m) => m[name].getInstance().setEnabled(false));
    }
  })
);

/** Opens the Pokédex sheet of a species and reads the talent cards and the level-up rows. */
const sheetOf = (speciesId) => page.evaluate(async (id) => {
  const { EventBus } = await import('/src/core/EventBus.js');
  const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
  const { ModalIds } = await import('/src/config/ModalIds.js');
  const { ModalCloseRequestedEvent } = await import('/src/core/events/ModalCloseRequestedEvent.js');
  EventBus.getInstance().dispatch(new ModalCloseRequestedEvent(ModalIds.POKEDEX_DETAIL));
  await new Promise((resolve) => setTimeout(resolve, 120));
  EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.POKEDEX_DETAIL, { speciesId: id }));
  await new Promise((resolve) => setTimeout(resolve, 250));
  const overlay = document.querySelector('#pw-pokedex-detail-modal');
  if (!overlay) return null;
  const cards = [...overlay.querySelectorAll('.pw-pokedex-talent-card')];
  const talents = cards.filter((card) => !card.classList.contains('pw-pokedex-talent-card--hidden'))
    .map((card) => (card.querySelector('strong')?.textContent || '').trim());
  const hidden = cards.filter((card) => card.classList.contains('pw-pokedex-talent-card--hidden'))
    .map((card) => (card.querySelector('strong')?.textContent || '').trim());
  const levelRows = [...overlay.querySelectorAll('.pw-dex-move-row:not(.pw-dex-move-row--header)')].length;
  const list = overlay.querySelector('.pw-pokedex-talents-list');
  if (list) list.scrollIntoView({ block: 'center' });
  return { talents, hidden, levelRows, text: overlay.innerText };
}, speciesId);

try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', { waitUntil: 'networkidle' });

  await check('game page ready with a seeded save', async () => {
    await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { Engine } = await import('/src/core/Engine.js');
      const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
      LocalizationManager.getInstance().setLanguage('fr');
      const save = SaveSystem.getInstance().createNewSave('Talents 1.16.4', 'treecko');
      save.tutorial.enabled = false;
      save.player.location = 'route101';
      Engine.getInstance().getPageManager().openPage('game');
    });
    await page.waitForSelector('#win-shortcuts', { state: 'visible' });
    return 'game page open';
  });

  await check('a Hoenn species that only had one talent lists a full pool', async () => {
    const sheet = await sheetOf('treecko');
    assert.ok(sheet, 'the Pokédex sheet did not open');
    assert.ok(sheet.talents.length >= 10, `only ${sheet.talents.length} talent cards`);
    assert.equal(new Set(sheet.talents).size, sheet.talents.length, 'duplicate talent card');
    const overlap = sheet.talents.filter((label) => sheet.hidden.includes(label));
    assert.deepEqual(overlap, [], 'the hidden talent is listed twice');
    await page.screenshot({ path: path.join(output, 'treecko-talents.png') });
    return `${sheet.talents.length} talents, ${sheet.hidden.length} hidden`;
  });

  await check('the attack list of that species keeps the fifteen level-up moves', async () => {
    const sheet = await sheetOf('torchic');
    assert.ok(sheet, 'the Pokédex sheet did not open');
    assert.equal(sheet.levelRows, 15, `${sheet.levelRows} level-up moves`);
    assert.ok(sheet.talents.length >= 10, `only ${sheet.talents.length} talent cards`);
    return `${sheet.levelRows} level-up moves, ${sheet.talents.length} talents`;
  });

  await check('a Kanto species is unchanged (28 talents for Bulbasaur)', async () => {
    const sheet = await sheetOf('bulbasaur');
    assert.equal(sheet.talents.length, 28, `${sheet.talents.length} talents`);
    assert.equal(sheet.hidden.length, 1, 'one hidden talent card');
    assert.equal(sheet.levelRows, 15, `${sheet.levelRows} level-up moves`);
    return `${sheet.talents.length} talents, ${sheet.levelRows} moves`;
  });

  await check('no raw localization key or console error leaked', async () => {
    const sheet = await sheetOf('mudkip');
    assert.ok(!/\btalent\.[a-z_]+\.name\b/.test(sheet.text), 'raw talent key on screen');
    assert.ok(!/\bmove\.[a-z_]+\b/.test(sheet.text), 'raw move key on screen');
    assert.deepEqual(issues, []);
    return 'clean';
  });

  console.log(`\n${results.filter((r) => r.passed).length}/${results.length} browser checks passed`);
} finally {
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ results, issues }, null, 2));
  await browser.close();
}
