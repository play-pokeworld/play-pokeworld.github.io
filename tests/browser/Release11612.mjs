/**
 * @file Release11612.mjs
 * @brief Real Chromium verification of 1.16.12: the tutorial halo lands on the right control
 *        (including the two steps reported broken), it survives a window re-render, and the
 *        dungeon arrows always move the trainer without scrolling the page.
 *
 * Run: npm start (in another terminal) then
 *   PW_URL=http://127.0.0.1:3000/ node tests/browser/Release11612.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.PW_BROWSER_OUTPUT || path.resolve('artifacts/browser-11612');
await fs.mkdir(output, { recursive: true });
const BASE = process.env.PW_URL || 'http://127.0.0.1:3000/';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(20000);

const issues = [];
const results = [];
page.on('pageerror', (error) => issues.push(error.stack));
page.on('console', (message) => {
  if (['warning', 'error'].includes(message.type())) {
    const where = message.location?.()?.url ?? '';
    issues.push(`${message.type()}: ${message.text()} @ ${where}`);
  }
});
page.on('response', (response) => {
  if (response.status() >= 400) issues.push(`http ${response.status()}: ${new URL(response.url()).pathname}`);
});

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail });
    console.log('PASS ' + name + (detail ? ` — ${detail}` : ''));
    return detail;
  } catch (error) {
    results.push({ name, passed: false, error: error.stack });
    await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    console.log('FAIL ' + name);
    console.log(error.stack);
    throw error;
  }
}

await page.goto(BASE, { waitUntil: 'networkidle' });

await check('a save is created with the tutorial enabled', async () => {
  const fact = await page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const { Engine } = await import('/src/core/Engine.js');
    const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
    LocalizationManager.getInstance().setLanguage('fr');
    const save = SaveSystem.getInstance().createNewSave('Halo', 'charmander');
    save.tutorial.enabled = true;
    save.player.region = 'kanto';
    save.player.location = 'route1';
    // Unlock Viridian City (10 wins on Route 1) so the later re-render check travels legally.
    for (let win = 0; win < 10; win += 1) save.statistics.recordWildWin('route1');
    Engine.getInstance().getPageManager().openPage('game');
    return { id: save.id, step: null };
  });
  await page.waitForSelector('#win-shortcuts', { state: 'visible' });
  return `save ${fact.id}`;
});

await check('the first step highlights the battle tile of the location window', async () => {
  const fact = await page.evaluate(async () => {
    const { applyTutorialHighlight } = await import('/src/ui/TutorialHighlight.js');
    applyTutorialHighlight();
    const nodes = [...document.querySelectorAll('.pw-tuto-target')];
    return {
      count: nodes.length,
      ids: nodes.map((node) => node.id || node.className),
      onBattleTile: nodes.every((node) => node.dataset.tutorial === 'battle' || node.id === 'win-tabs' || node.id === 'win-map'),
    };
  });
  assert.equal(fact.count, 1, `exactly one halo (${fact.count}: ${fact.ids.join(' / ')})`);
  assert.ok(fact.onBattleTile, `halo is on the battle tile or its window (${fact.ids.join(' / ')})`);
  return fact.ids.join(' / ');
});

await check('the Poké Balls step highlights the ball of the "New" row, not the settings gear', async () => {
  const fact = await page.evaluate(async () => {
    const { applyTutorialHighlight } = await import('/src/ui/TutorialHighlight.js');
    const highlighted = applyTutorialHighlight({ id: 'set_pokeball_filter', title: 'x', description: 'y' });
    const node = document.querySelector('.pw-tuto-target');
    const rect = node ? node.getBoundingClientRect() : null;
    return {
      highlighted,
      hook: node ? node.dataset.tutorial : null,
      row: node?.closest('.pw-ball-row')?.dataset.filter ?? null,
      hasBallArt: !!node?.querySelector('img, svg, .pw-ball-slot-icon, [class*="ball-icon"]'),
      visible: !!rect && rect.width > 0,
      gearLit: [...document.querySelectorAll('.pw-tuto-target')].some((el) => el.dataset.tutorial === 'ball-filters'),
    };
  });
  assert.equal(fact.highlighted, 1, 'one halo');
  assert.equal(fact.hook, 'ball-slot', `halo is on a ball cell (${fact.hook})`);
  assert.equal(fact.row, 'new', `and on the "New" row (${fact.row})`);
  assert.ok(fact.visible, 'the ball cell is on screen');
  assert.ok(fact.hasBallArt, 'the cell really draws a ball');
  assert.ok(!fact.gearLit, 'the settings gear is never highlighted');
  await page.screenshot({ path: path.join(output, 'halo-pokeballs.png') }).catch(() => {});
  return `${fact.hook} @ ${fact.row}`;
});

await check('the Poké Balls columns line up: captions, sprites and counts are centred over them', async () => {
  const fact = await page.evaluate(() => {
    const range = (el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect();
    };
    const offsets = (cell, inner) => [Math.round(inner.left - cell.left), Math.round(cell.right - inner.right)];
    const head = [...document.querySelectorAll('#win-pokeballs .pw-ball-head > *')].map((el) => ({
      label: el.textContent.trim(),
      box: el.getBoundingClientRect(),
      off: offsets(el.getBoundingClientRect(), range(el)),
    }));
    const rows = [...document.querySelectorAll('#win-pokeballs .pw-ball-row')].map((row) => {
      const ballCell = row.querySelector('.pw-ball-row-ball');
      const qtyCell = row.querySelector('.pw-ball-row-qty');
      const icon = ballCell?.querySelector('img, svg');
      return {
        ball: ballCell && icon ? offsets(ballCell.getBoundingClientRect(), icon.getBoundingClientRect()) : null,
        qty: qtyCell ? offsets(qtyCell.getBoundingClientRect(), range(qtyCell)) : null,
        ballLeft: ballCell ? Math.round(ballCell.getBoundingClientRect().left) : null,
        qtyLeft: qtyCell ? Math.round(qtyCell.getBoundingClientRect().left) : null,
      };
    });
    return {
      head: head.map((h) => ({ label: h.label, off: h.off, left: Math.round(h.box.left) })),
      rows,
    };
  });
  assert.ok(fact.rows.length > 0, 'the Poké Balls window shows its rows');
  // Captions sit above the column they name.
  const ballHead = fact.head.find((h) => /ball/i.test(h.label));
  const qtyHead = fact.head.find((h) => /qt|qty/i.test(h.label));
  assert.equal(ballHead.left, fact.rows[0].ballLeft, 'the "Ball" caption starts above the ball column');
  assert.equal(qtyHead.left, fact.rows[0].qtyLeft, 'the "Qty" caption starts above the count column');
  for (const cell of fact.head.filter((h) => /ball|qt|qty/i.test(h.label))) {
    assert.ok(Math.abs(cell.off[0] - cell.off[1]) <= 2, `caption "${cell.label}" is centred (${cell.off.join('/')})`);
  }
  for (const row of fact.rows) {
    assert.ok(Math.abs(row.ball[0] - row.ball[1]) <= 1, `the sprite is centred (${row.ball.join('/')})`);
    assert.ok(Math.abs(row.qty[0] - row.qty[1]) <= 2, `the count is centred (${row.qty.join('/')})`);
  }
  await page.screenshot({ path: path.join(output, 'pokeballs-centred.png') }).catch(() => {});
  return `${fact.rows.length} rows, captions ${ballHead.off.join('/')} and ${qtyHead.off.join('/')}, counts ${fact.rows.map((r) => r.qty.join('/')).join(' ')}`;
});

await check('the Pokémon-sheet step highlights the first team card (its info button is hidden on desktop)', async () => {
  const fact = await page.evaluate(async () => {
    const { applyTutorialHighlight } = await import('/src/ui/TutorialHighlight.js');
    const highlighted = applyTutorialHighlight({ id: 'open_poke_sheet', title: 'x', description: 'y' });
    const node = document.querySelector('.pw-tuto-target');
    const rect = node ? node.getBoundingClientRect() : null;
    return {
      highlighted,
      className: node ? node.className : null,
      isCard: node ? node.classList.contains('pw-poke-card') : false,
      insideFirstCard: !!node?.closest('.pw-poke-card[data-index="0"]'),
      visible: !!rect && rect.width > 0,
    };
  });
  assert.equal(fact.highlighted, 1, 'one halo');
  assert.ok(
    fact.className.includes('poke-card-info-btn') || fact.isCard,
    `halo is on the info button (mobile) or the card itself (desktop) (${fact.className})`
  );
  assert.ok(fact.insideFirstCard, 'it is the first team card');
  assert.ok(fact.visible, 'the button is on screen');
  await page.screenshot({ path: path.join(output, 'halo-sheet.png') }).catch(() => {});
  return fact.className;
});

await check('the halo follows the current step across a window re-render', async () => {
  const fact = await page.evaluate(async () => {
    const { EventBus } = await import('/src/core/EventBus.js');
    const { LocationSystem } = await import('/src/systems/LocationSystem.js');
    const { LocationChangedEvent } = await import('/src/core/events/LocationChangedEvent.js');
    const { TutorialSystem } = await import('/src/systems/TutorialSystem.js');
    const { resolveTutorialTargets } = await import('/src/ui/TutorialHighlight.js');
    const stepId = TutorialSystem.getInstance().getCardStatus()?.id ?? null;
    LocationSystem.getInstance().travelTo('route2');
    EventBus.getInstance().dispatch(new LocationChangedEvent('kanto', 'route2'));
    await new Promise((resolve) => setTimeout(resolve, 300));
    const nodes = [...document.querySelectorAll('.pw-tuto-target')];
    // Re-resolve after the rebuild: the halo must sit on the *new* node of the same step.
    const expected = resolveTutorialTargets(stepId)[0] ?? null;
    return {
      stepId,
      count: nodes.length,
      same: nodes.length === 1 && nodes[0] === expected,
      rebuilt: !!expected && expected !== null,
      className: nodes[0]?.className ?? null,
    };
  });
  assert.equal(fact.count, 1, `exactly one halo after the re-render (${fact.count})`);
  assert.ok(fact.same, `the halo is on the control of step ${fact.stepId} (${fact.className})`);
  return `step ${fact.stepId} kept its halo after a location change`;
});

await check('a finished tutorial leaves no halo behind', async () => {
  const fact = await page.evaluate(async () => {
    const { applyTutorialHighlight } = await import('/src/ui/TutorialHighlight.js');
    applyTutorialHighlight(null);
    await new Promise((resolve) => setTimeout(resolve, 120));
    return document.querySelectorAll('.pw-tuto-target').length;
  });
  assert.equal(fact, 0, 'no halo when the tutorial is over');
  return 'clean';
});

await check('the arrow keys move the dungeon trainer and never scroll the page', async () => {
  const fact = await page.evaluate(async () => {
    const { SaveSystem } = await import('/src/systems/SaveSystem.js');
    const { LocationSystem } = await import('/src/systems/LocationSystem.js');
    const { DungeonSystem } = await import('/src/systems/DungeonSystem.js');
    const save = SaveSystem.getInstance().getCurrentSave();
    save.currencies.add('dungeonToken', 500);
    // Route 1 gates Viridian City behind 10 wins: clear it, then follow the real road.
    for (let win = 0; win < 10; win += 1) save.statistics.recordWildWin('route1');
    // Viridian Forest is gated behind 10 wins on Route 2.
    for (let win = 0; win < 10; win += 1) save.statistics.recordWildWin('route2');
    // pallet > route1 > viridian > route2 > viridianforest.
    const path = ['route1', 'viridian', 'route2', 'viridianforest'];
    for (const id of path) {
      if (LocationSystem.getInstance().getCurrentLocationId() === id) continue;
      LocationSystem.getInstance().travelTo(id);
    }
    const entered = DungeonSystem.getInstance().enter('viridianforest');
    await new Promise((resolve) => setTimeout(resolve, 200));
    const run = DungeonSystem.getInstance().getRun();
    return { entered, active: !!run?.active, pos: run?.pos ?? null };
  });
  assert.ok(fact.entered && fact.active, 'a dungeon run started');

  const outcome = await page.evaluate(async () => {
    const { DungeonSystem } = await import('/src/systems/DungeonSystem.js');
    const press = (key) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      document.body.dispatchEvent(event);
      return event.defaultPrevented;
    };
    const scrollBefore = document.scrollingElement.scrollTop;
    const positions = [];
    const consumed = [];
    for (const key of ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown']) {
      consumed.push(press(key));
      await new Promise((resolve) => setTimeout(resolve, 120));
      positions.push(DungeonSystem.getInstance().getRun()?.pos ?? null);
    }
    const scrollAfter = document.scrollingElement.scrollTop;
    return { consumed, positions, scrollBefore, scrollAfter, active: DungeonSystem.getInstance().isActive() };
  });
  assert.ok(outcome.consumed.every(Boolean), `every arrow was consumed (${outcome.consumed.join(',')})`);
  assert.equal(outcome.scrollAfter, outcome.scrollBefore, 'the page never scrolled');
  assert.ok(outcome.active, 'the run is still active');
  const distinct = new Set(outcome.positions.filter(Boolean));
  assert.ok(
    distinct.size >= 2,
    `the trainer moved between tiles (${outcome.positions.join(' → ')})`
  );
  await page.screenshot({ path: path.join(output, 'dungeon-arrows.png') }).catch(() => {});
  return `${fact.pos} → ${outcome.positions.join(' → ')}`;
  return `entered at ${fact.pos}, now ${moved.pos}`;
});

await check('outside a dungeon the arrows keep scrolling normally', async () => {
  const fact = await page.evaluate(async () => {
    const { DungeonSystem } = await import('/src/systems/DungeonSystem.js');
    DungeonSystem.getInstance().abandon();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    return { consumed: event.defaultPrevented, active: DungeonSystem.getInstance().isActive() };
  });
  assert.ok(!fact.active, 'no run left');
  assert.ok(!fact.consumed, 'the arrow is not intercepted outside a run');
  return 'native behaviour restored';
});

await check('the console stayed clean', async () => {
  assert.deepEqual(issues, [], `console issues: ${issues.slice(0, 4).join('\n')}`);
  return 'no warning, no error';
});

await browser.close();
const failed = results.filter((entry) => !entry.passed).length;
await fs.writeFile(
  path.join(output, 'report.json'),
  JSON.stringify({ version: '1.16.12', checks: results.length, failed, results }, null, 2)
);
console.log(`\n${results.length - failed}/${results.length} checks passed`);
if (failed) process.exit(1);
