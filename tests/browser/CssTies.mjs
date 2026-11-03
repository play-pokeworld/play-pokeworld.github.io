/**
 * CSS cascade tie detector (diagnostic tool, not a test).
 *
 * Splitting one stylesheet into 80 per-object sheets is only neutral when no element receives two
 * declarations of the same property, with the same importance and the same specificity, from two
 * different sheets: in that case the sheet order alone decides, and a reordered sheet silently
 * changes the rendering. This script walks the live pages and reports every such tie, so the
 * template order can be fixed from evidence instead of guesswork.
 *
 *   PW_URL=http://127.0.0.1:3000/ node tests/browser/CssTies.mjs
 *   CSS_TIES_OUT=/tmp/ties.json PW_URL=… node tests/browser/CssTies.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const args = { url: process.env.PW_URL || 'http://127.0.0.1:3000/' };
const out = process.env.CSS_TIES_OUT || '/tmp/ties.json';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(args.url, { waitUntil: 'networkidle' });
await page.addStyleTag({
  content: '*{animation-duration:0s !important;animation-delay:0s !important;'
    + 'animation-iteration-count:1 !important;transition-duration:0s !important;'
    + 'transition-delay:0s !important;}'
});

await page.evaluate(async () => {
  const { SaveSystem } = await import('/src/systems/SaveSystem.js');
  const { Engine } = await import('/src/core/Engine.js');
  const { LocalizationManager } = await import('/src/localization/LocalizationManager.js');
  const { FeatureAccessSystem } = await import('/src/systems/FeatureAccessSystem.js');
  LocalizationManager.getInstance().setLanguage('fr');
  const save = SaveSystem.getInstance().createNewSave('CSS ties', 'bulbasaur');
  save.tutorial.enabled = false;
  save.player.region = 'kanto';
  save.player.location = 'route1';
  save.player.earnBadge('brock');
  for (const id of ['potion', 'pokeball', 'rarecandy', 'firestone', 'thunderstone', 'nugget', 'leftovers', 'ct24_thunderbolt']) {
    save.inventory.add(id, 3, { deferSave: true });
  }
  save.team[0].setLevel(22);
  FeatureAccessSystem.getInstance().refresh('css-ties', { force: true, persist: false });
  Engine.getInstance().getPageManager().openPage('game');
});

await page.waitForSelector('#win-shortcuts', { state: 'visible' });
await page.waitForTimeout(400);

/** Collect every rule with the sheet it lives in, its specificity and the classes of its subject. */
async function collectRules() {
  return page.evaluate(() => {
    const specificity = (selector) => {
      let text = selector
        .replace(/::?(?:before|after|placeholder|selection|first-line|marker|backdrop)\b/g, '')
        .replace(/:where\([^()]*\)/g, '')
        .replace(/\[[^\]]*\]/g, ' [attr]')
        .replace(/:(?:not|is|has)\(([^()]*)\)/g, ' :$1')
        .replace(/:[a-z-]+(\([^()]*\))?/g, '');
      const ids = (text.match(/#[\w-]+/g) || []).length;
      const classes = (text.match(/\.[\w-]+/g) || []).length + (text.match(/\[attr\]/g) || []).length;
      const tags = (text.match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length;
      return ids * 100 + classes * 10 + tags;
    };
    const rules = [];
    let order = 0;
    const walk = (list, media, sheet) => {
      for (const rule of list) {
        if (rule.type === CSSRule.IMPORT_RULE) {
          try {
            if (rule.styleSheet?.cssRules) walk([...rule.styleSheet.cssRules], media, rule.styleSheet.href);
          } catch (_) { /* skip */ }
          continue;
        }
        if (rule.type === CSSRule.MEDIA_RULE) {
          walk([...rule.cssRules], `${media}@media ${rule.conditionText}`, sheet);
          continue;
        }
        if (!rule.selectorText) continue;
        const subject = rule.selectorText.split(',').pop().trim();
        const classes = (subject.match(/\.[\w-]+/g) || []).map((name) => name.slice(1));
        const decls = [];
        for (const prop of rule.style) decls.push([prop, rule.style.getPropertyValue(prop), rule.style.getPropertyPriority(prop)]);
        rules.push({
          index: order++,
          sheet: (sheet || location.href).split('/').slice(-2).join('/'),
          selector: rule.selectorText,
          media,
          classes,
          spec: specificity(rule.selectorText),
          decls,
        });
      }
    };
    for (const sheet of document.styleSheets) {
      try { walk([...sheet.cssRules], '', sheet.href); } catch (_) { /* skip */ }
    }
    return rules;
  });
}

/** For every element, find declarations of the same property, importance and specificity. */
async function findTies() {
  return page.evaluate((rules) => {
    const byClass = new Map();
    const universal = [];
    for (const rule of rules) {
      if (!rule.classes.length) { universal.push(rule); continue; }
      for (const name of rule.classes) {
        if (!byClass.has(name)) byClass.set(name, []);
        byClass.get(name).push(rule);
      }
    }

    const ties = [];
    for (const element of document.querySelectorAll('*')) {
      if (!element.matches) continue;
      const classes = [...element.classList];
      const candidates = new Set(universal);
      for (const name of classes) for (const rule of byClass.get(name) || []) candidates.add(rule);
      const matched = [];
      for (const rule of candidates) {
        try { if (element.matches(rule.selector)) matched.push(rule); } catch (_) { /* skip */ }
      }
      if (matched.length < 2) continue;
      const perProperty = new Map();
      for (const rule of matched) {
        for (const [prop, value, important] of rule.decls) {
          if (prop.startsWith('--')) continue;
          // The media context is deliberately NOT part of the key: a base rule and a media rule that
          // both apply to the element tie on the same property, and only the order decides.
          const key = `${prop}|${important}`;
          if (!perProperty.has(key)) perProperty.set(key, []);
          perProperty.get(key).push({ rule, value });
        }
      }
      for (const [key, list] of perProperty) {
        const values = new Set(list.map((entry) => entry.value));
        if (values.size < 2) continue;
        const specs = new Set(list.map((entry) => entry.rule.spec));
        if (specs.size !== 1) continue; // the cascade is decided by specificity, not by order
        list.sort((a, b) => a.rule.index - b.rule.index);
        const winner = list[list.length - 1];
        const losers = list.slice(0, -1);
        for (const loser of losers) {
          if (loser.rule.sheet === winner.rule.sheet) continue;
          ties.push({
            node: `${element.tagName.toLowerCase()}${element.id ? '#' + element.id : ''}${classes.length ? '.' + classes.join('.') : ''}`,
            key,
            winner: { sheet: winner.rule.sheet, selector: winner.rule.selector, value: winner.value },
            loser: { sheet: loser.rule.sheet, selector: loser.rule.selector, value: loser.value },
          });
        }
      }
    }
    return ties;
  }, await collectRules());
}

const report = { dashboard: await findTies() };
console.log('dashboard', report.dashboard.length, 'tie(s)');

const modalIds = await page.evaluate(async () => {
  const { ModalIds } = await import('/src/config/ModalIds.js');
  return Object.values(ModalIds).filter((id) => typeof id === 'string');
});

for (const modalId of modalIds) {
  await page.evaluate(async (id) => {
    const { EventBus } = await import('/src/core/EventBus.js');
    const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(id, {}));
    await new Promise((resolve) => setTimeout(resolve, 220));
  }, modalId).catch(() => {});
  report[`modal:${modalId}`] = await findTies();
  console.log(`modal:${modalId}`, report[`modal:${modalId}`].length, 'tie(s)');
  await page.evaluate(async (id) => {
    const { EventBus } = await import('/src/core/EventBus.js');
    const closeEvent = await import('/src/core/events/ModalCloseRequestedEvent.js').catch(() => null);
    if (closeEvent?.ModalCloseRequestedEvent) {
      EventBus.getInstance().dispatch(new closeEvent.ModalCloseRequestedEvent(id));
    }
    await new Promise((resolve) => setTimeout(resolve, 160));
    const node = document.getElementById(id);
    if (node) node.style.display = 'none';
  }, modalId).catch(() => {});
}

await fs.writeFile(out, JSON.stringify(report, null, 2));
await browser.close();
console.log('→', out);
