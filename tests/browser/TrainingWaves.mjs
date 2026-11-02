/**
 * @file TrainingWaves.mjs
 * @brief Real Chromium verification of 1.16.5: the training centre uses the sparring-wave system
 *        (30 waves drawn from the rank of the trainee) and the league-gated modes are open on a save
 *        that really won the league.
 *
 * Run: npm start (in another terminal) then `node tests/browser/TrainingWaves.mjs`.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-training-waves');
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

const panelText = () => page.locator('#win-battle .pw-training-live').innerText();

try {
  await page.goto(process.env.PW_URL || 'http://127.0.0.1:3000/', { waitUntil: 'networkidle' });

  await check('a save that won the league opens every training mode', async () => {
    const state = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { Engine } = await import('/src/core/Engine.js');
      const { TrainingProgression } = await import('/src/systems/facilities/TrainingProgression.js');
      const save = SaveSystem.getInstance().createNewSave('Browser waves', 'charmander');
      save.tutorial.enabled = false;
      Engine.getInstance().getPageManager().openPage('game');
      for (const badge of ['brock', 'misty', 'surge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni']) save.player.earnBadge(badge);
      save.statistics.recordLeague('kanto');
      for (const id of ['training', 'hatchery', 'mine']) save.access.unlockFeature(id);
      save.player.location = (await import('/src/config/TrainingRules.js')).TrainingRules.LOCATION_ID;
      SaveSystem.getInstance().saveCurrent();
      const modes = TrainingProgression.modes(save, null).map((mode) => ({ id: mode.id, unlocked: mode.unlocked }));
      return { modes, location: save.player.location };
    });
    assert.equal(state.modes.filter((mode) => !mode.unlocked).length, 0, JSON.stringify(state.modes));
    await page.waitForTimeout(500);
    await page.locator('#win-training').scrollIntoViewIfNeeded();
    return JSON.stringify(state.modes.map((mode) => `${mode.id}=${mode.unlocked}`));
  });

  await check('the started session announces 30 waves drawn from the rank of the trainee', async () => {
    const state = await page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const { TrainingSystem } = await import('/src/systems/TrainingSystem.js');
      const { PokemonFactory } = await import('/src/data/pokemon/PokemonFactory.js');
      const { BoxSystem } = await import('/src/systems/BoxSystem.js');
      const { PokemonRankRules } = await import('/src/systems/box/PokemonRankRules.js');
      const { TrainingRules } = await import('/src/config/TrainingRules.js');
      const save = SaveSystem.getInstance().getCurrentSave();
      const training = TrainingSystem.getInstance();
      training.init();
      const trainee = PokemonFactory.create('pikachu', 32);
      BoxSystem.getInstance().addPokemon(trainee, { deferSave: true });
      const started = training.startSession(trainee.uid, 'move', 0);
      const snapshot = training.getSnapshot(0);
      const session = training._sessions.get(0);
      const reserves = session._reserves || session.reserves || [];
      const waves = [session.foe.pokemon, ...reserves.map((reserve) => reserve.pokemon || reserve)];
      const rank = PokemonRankRules.getRank(trainee);
      return {
        result: started.result,
        opponentCount: started.opponentCount,
        rules: TrainingRules.OPPONENT_COUNT,
        snapshotTotal: snapshot.opponentCount,
        rank,
        foes: waves.map((foe) => ({ id: foe.species, level: foe.level, rank: PokemonRankRules.getRank(foe.species) })),
        location: save.player.location,
      };
    });
    assert.equal(state.result, 'ready', state.result);
    assert.equal(state.opponentCount, state.rules);
    assert.equal(state.snapshotTotal, state.rules);
    assert.equal(state.foes.length, state.rules);
    assert.equal(new Set(state.foes.map((foe) => foe.id)).size, state.rules, 'no duplicate sparring partner');
    for (const foe of state.foes) assert.ok(Math.abs(['E', 'D', 'C', 'B', 'A', 'S'].indexOf(foe.rank) - ['E', 'D', 'C', 'B', 'A', 'S'].indexOf(state.rank)) <= 1, `${foe.id} ${foe.rank}`);
    return `${state.rank} trainee, ${state.foes.length} waves, ${state.foes[0].id} L${state.foes[0].level} → ${state.foes.at(-1).id} L${state.foes.at(-1).level}`;
  });

  await check('the live training window shows the real wave counter in both languages', async () => {
    const readings = [];
    for (const lang of ['fr', 'en']) {
      await page.evaluate(async (lang) => {
        const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
        LocalizationManager.getInstance().setLanguage(lang);
      }, lang);
      await page.waitForTimeout(300);
      const text = await panelText();
      const match = text.match(/Round\s+(\d+)\s*\/\s*(\d+)/);
      assert.ok(match, `no wave counter in ${lang}: ${text.slice(0, 200)}`);
      assert.equal(Number(match[2]), 30, `total waves shown in ${lang}`);
      readings.push(`${lang}:${match[0]}`);
    }
    return readings.join(' | ');
  });

  await check('face-to-face card names a sparring partner of the trainee rank, not a type-pool foe', async () => {
    const card = await page.locator('#win-battle .pw-training-live .pw-training-live-fighters').innerText();
    const foes = await page.evaluate(async () => {
      const { TrainingSystem } = await import('/src/systems/TrainingSystem.js');
      const state = TrainingSystem.getInstance().getSnapshot(0);
      return { id: state.foeSpecies, level: state.foeLevel };
    });
    assert.ok(card.length > 0);
    return `${foes.id} L${foes.level}`;
  });

  await check('the debug speed button really accelerates the running training session', async () => {
    // The real debug drawer, not an injected value: enable developer mode, open it, click the button.
    await page.evaluate(async () => {
      const { PreferencesSystem } = await import('/src/systems/PreferencesSystem.js');
      PreferencesSystem.getInstance().setDebugMode(true);
    });
    await page.locator('#debug-widget-toggle').waitFor({ state: 'visible' });
    await page.locator('#debug-widget-toggle').click();
    await page.locator('#debug-btn-speed-x10').waitFor({ state: 'visible' });
    const elapsed = () => page.evaluate(async () => {
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      return SaveSystem.getInstance().getCurrentSave().training.slots[0].elapsed || 0;
    });
    const measure = async (ms) => {
      const before = await elapsed();
      await page.waitForTimeout(ms);
      return (await elapsed()) - before;
    };
    const normal = await measure(700);
    await page.locator('#debug-btn-speed-x10').click();
    const onState = await page.locator('#debug-x10-state').innerText();
    const fast = await measure(700);
    await page.locator('#debug-btn-speed-x10').click();
    const offState = await page.locator('#debug-x10-state').innerText();
    await page.evaluate(async () => {
      const { PreferencesSystem } = await import('/src/systems/PreferencesSystem.js');
      PreferencesSystem.getInstance().setDebugMode(false);
    });
    assert.equal(onState.trim(), 'ON', `the button reports ${onState}`);
    assert.equal(offState.trim(), 'OFF', 'the button can be switched back');
    assert.ok(normal > 0.2, `the session advanced in real time: ${normal.toFixed(2)} s`);
    assert.ok(fast > normal * 4, `x10 advanced ${fast.toFixed(2)} s against ${normal.toFixed(2)} s in the same 700 ms`);
    return `700 ms -> ${normal.toFixed(2)} s at 1x, ${fast.toFixed(2)} s at x10`;
  });

  await check('forfeiting the session releases the trainee and leaves the collection intact', async () => {
    const state = await page.evaluate(async () => {
      const { TrainingSystem } = await import('/src/systems/TrainingSystem.js');
      const { SaveSystem } = await import('/src/systems/SaveSystem.js');
      const training = TrainingSystem.getInstance();
      const save = SaveSystem.getInstance().getCurrentSave();
      const snapshot = training.getSnapshot(0);
      const cancelled = training.cancelSession(0);
      return { cancelled, active: training.isActive(), uid: snapshot.pokemonUid,
        battle: !!save.training.slots[0].battle, size: save.collection.size,
        sessions: training._sessions.size, result: save.training.slots[0].result };
    });
    assert.equal(state.cancelled, true, JSON.stringify(state));
    assert.equal(state.active, false, JSON.stringify(state));
    return `${state.uid} released, ${state.size} owned`;
  });

  await page.screenshot({ path: path.join(output, 'training-waves.png'), fullPage: true });
  assert.deepEqual(issues, [], issues.join('\n'));
} finally {
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ results }, null, 2));
  await browser.close();
}

const failed = results.filter((entry) => !entry.passed).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
