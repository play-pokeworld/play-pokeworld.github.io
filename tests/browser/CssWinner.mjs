/**
 * Winner inspector (diagnostic tool).
 *
 * For each element matched by the given selectors and each of its properties, asks Chrome which
 * rule actually paints the value (CSS.getMatchedStylesForNode, cascade order included) and where
 * that rule lives. Run it once on the reference tree and once on the new tree: every property whose
 * winning rule changed names the sheet that has to move.
 *
 *   CSS_WIN_NODES=/tmp/nodes.json CSS_WIN_OUT=/tmp/win.json PW_URL=http://127.0.0.1:3000/ node tests/browser/CssWinner.mjs
 *
 * nodes.json: [{ "node": "span.pw-text.type-badge", "props": ["color", "text-shadow"] }, …]
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const args = { url: process.env.PW_URL || 'http://127.0.0.1:3000/' };
const nodesFile = process.env.CSS_WIN_NODES || '/tmp/nodes.json';
const outFile = process.env.CSS_WIN_OUT || '/tmp/win.json';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(args.url, { waitUntil: 'networkidle' });

await page.evaluate(async () => {
  const { SaveSystem } = await import('/src/systems/SaveSystem.js');
  const { Engine } = await import('/src/core/Engine.js');
  const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
  const { FeatureAccessSystem } = await import('/src/systems/FeatureAccessSystem.js');
  LocalizationManager.getInstance().setLanguage('fr');
  const save = SaveSystem.getInstance().createNewSave('CSS winner', 'bulbasaur');
  save.tutorial.enabled = false;
  save.player.region = 'kanto';
  save.player.location = 'route1';
  save.player.earnBadge('brock');
  for (const id of ['potion', 'pokeball', 'rarecandy', 'firestone', 'thunderstone', 'nugget', 'leftovers', 'ct24_thunderbolt']) {
    save.inventory.add(id, 3, { deferSave: true });
  }
  save.team[0].setLevel(22);
  FeatureAccessSystem.getInstance().refresh('css-winner', { force: true, persist: false });
  Engine.getInstance().getPageManager().openPage('game');
});
await page.waitForSelector('#win-shortcuts', { state: 'visible' });
await page.waitForTimeout(400);

const wanted = JSON.parse(await fs.readFile(nodesFile, 'utf8'));
const client = await page.context().newCDPSession(page);
await client.send('DOM.enable');
const sheets = {};
client.on('CSS.styleSheetAdded', (event) => {
  sheets[event.header.styleSheetId] = event.header.sourceURL || 'inline';
});
await client.send('CSS.enable');
const { root } = await client.send('DOM.getDocument', { depth: -1 });
await page.waitForTimeout(300);

const report = {};
for (const entry of wanted) {
  const matches = await page.evaluate((selector) => {
    const found = [...document.querySelectorAll(selector)].slice(0, 1);
    return found.length;
  }, entry.node);
  if (!matches) continue;

  const { nodeIds } = await client.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: entry.node });
  if (!nodeIds.length) continue;
  const nodeId = nodeIds[0];
  const matched = await client.send('CSS.getMatchedStylesForNode', { nodeId });

  const rules = [];
  for (const entryRule of matched.matchedCSSRules || []) {
    const rule = entryRule.rule;
    if (!rule.origin || rule.origin !== 'regular') continue;
    const source = sheets[rule.styleSheetId] || 'inline';
    const sheet = source.includes('/assets/css/')
      ? source.split('/assets/css/')[1].split('?')[0]
      : source;
    const declarations = {};
    for (const prop of rule.style.cssProperties || []) {
      if (prop.disabled) continue;
      declarations[prop.name] = { value: prop.value, important: !!prop.important };
    }
    rules.push({ sheet, selector: rule.selectorList.text, declarations });
  }

  const winners = {};
  for (const prop of entry.props) {
    // last rule (highest priority) that declares the property; an !important declaration wins outright
    let winner = null;
    let runnerUp = null;
    let importantSeen = false;
    for (const rule of rules) {
      const declared = rule.declarations[prop];
      if (!declared) continue;
      if (winner && importantSeen && !declared.important) continue;
      runnerUp = winner;
      winner = { sheet: rule.sheet, selector: rule.selector, value: declared.value };
      importantSeen = declared.important;
    }
    winners[prop] = { winner, runnerUp };
  }
  report[entry.node] = winners;
}

await fs.writeFile(outFile, JSON.stringify(report, null, 2));
await browser.close();
console.log('→', outFile, Object.keys(report).length, 'node(s)');
