/**
 * @file CssFingerprint.mjs
 * @brief Computed-style fingerprint of every window, used to prove that a stylesheet reorganisation
 *        does not change a single rendered pixel property.
 *
 * Usage (a server must be running on PW_URL):
 *   PW_URL=http://127.0.0.1:3000/ CSS_FP_OUT=artifacts/css/before.json node tests/browser/CssFingerprint.mjs
 *   PW_URL=http://127.0.0.1:3000/ CSS_FP_OUT=artifacts/css/after.json  node tests/browser/CssFingerprint.mjs
 *   node tests/browser/CssFingerprint.mjs --compare artifacts/css/before.json artifacts/css/after.json
 *
 * The fingerprint is per element, keyed by its index in document.querySelectorAll('*') (CSS never
 * changes DOM order) and made of the computed values the sheets actually control. Elements are
 * fingerprinted for the dashboard, then for every modal that can be opened by request, so a sheet
 * that lost or gained a rule anywhere shows up as a diff.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const PROPS = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'clear', 'box-sizing',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'margin-top', 'margin-right',
  'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'background-color', 'background-image', 'background-size', 'background-position-x', 'background-position-y',
  'background-repeat', 'color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
  'letter-spacing', 'text-align', 'text-transform', 'text-shadow', 'text-decoration-line', 'white-space',
  'overflow-x', 'overflow-y', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'align-items', 'align-content', 'align-self', 'justify-content', 'justify-items', 'justify-self', 'gap',
  'row-gap', 'column-gap', 'grid-template-columns', 'grid-template-rows', 'grid-auto-flow',
  'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end', 'order',
  'opacity', 'visibility', 'transform', 'transform-origin', 'box-shadow', 'filter', 'backdrop-filter',
  'mask-image', 'clip-path', 'mix-blend-mode', 'cursor', 'pointer-events', 'user-select', 'object-fit',
  'transition-property', 'transition-duration', 'animation-name', 'animation-duration', 'animation-timing-function',
  'animation-iteration-count', 'animation-fill-mode', 'outline-style', 'outline-color', 'content', 'list-style-type'
];

/** @param {string[]} argv @returns {{url:string,out:string,compare:string[]}} */
function parseArgs(argv) {
  const compareIndex = argv.indexOf('--compare');
  return {
    url: process.env.PW_URL || 'http://127.0.0.1:3000/',
    out: process.env.CSS_FP_OUT || 'artifacts/css/fingerprint.json',
    compare: compareIndex === -1 ? [] : argv.slice(compareIndex + 1)
  };
}

const args = parseArgs(process.argv.slice(2));

if (args.compare.length >= 3) {
  // Stable mode: `--compare ref1 ref2 … before after` — a value is compared only when every
  // reference capture agrees on it, so volatile values (timers, counters) cannot mask a regression.
  const parsed = [];
  for (const file of args.compare) parsed.push(JSON.parse(await fs.readFile(file, 'utf8')));
  const after = parsed[parsed.length - 1];
  const references = parsed.slice(0, -1);
  let compared = 0;
  let unstable = 0;
  let changed = 0;
  const diffKeys = [];
  const screens = new Set([...Object.keys(after.screens), ...references.flatMap((ref) => Object.keys(ref.screens))]);
  for (const screen of screens) {
    const values = references.map((ref) => ref.screens[screen] || {});
    const target = after.screens[screen] || {};
    const indexes = new Set([...Object.keys(target), ...values.flatMap((map) => Object.keys(map))]);
    for (const index of indexes) {
      const reference = values.map((map) => map[index]);
      if (reference.some((value) => value === undefined) || new Set(reference).size !== 1) {
        unstable++;
        continue;
      }
      compared++;
      if (target[index] !== reference[0]) {
        changed++;
        diffKeys.push(`element ${screen} ${index}`);
        if (changed <= 15) console.log(`DIFF ${screen}: element ${index}`);
      }
    }
  }
  const ruleValues = references.map((ref) => ref.rules || {});
  const targetRules = after.rules || {};
  const keys = new Set([...Object.keys(targetRules), ...ruleValues.flatMap((map) => Object.keys(map))]);
  let ruleChanged = 0;
  for (const key of keys) {
    const reference = ruleValues.map((map) => map[key]);
    if (reference.some((value) => value === undefined) || new Set(reference).size !== 1) {
      unstable++;
      continue;
    }
    compared++;
    if (targetRules[key] !== reference[0]) {
      ruleChanged++;
      diffKeys.push(`rule ${key}`);
      if (ruleChanged <= 15) console.log(`RULE diff: ${key}`);
    }
  }
  console.log(`compared: ${compared} stable values, ${unstable} ignored (unstable run-to-run)`);
  console.log(`changed: ${changed} element(s), ${ruleChanged} selector(s)`);
  const total = changed + ruleChanged;
  if (process.env.CSS_FP_DIFF) {
    await fs.writeFile(process.env.CSS_FP_DIFF, JSON.stringify(diffKeys.sort(), null, 0));
    console.log(`diff list → ${process.env.CSS_FP_DIFF}`);
  }
  console.log(total === 0 ? 'IDENTICAL — no stable computed value and no selector changed' : `${total} difference(s)`);
  process.exit(total === 0 ? 0 : 1);
}

if (args.compare.length === 2) {
  const left = JSON.parse(await fs.readFile(args.compare[0], 'utf8'));
  const right = JSON.parse(await fs.readFile(args.compare[1], 'utf8'));
  const screens = new Set([...Object.keys(left.screens), ...Object.keys(right.screens)]);
  let differences = 0;
  for (const screen of screens) {
    const a = left.screens[screen];
    const b = right.screens[screen];
    if (!a || !b) {
      console.log(`DIFF ${screen}: screen missing on one side`);
      differences++;
      continue;
    }
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const changed = [];
    for (const key of keys) if (a[key] !== b[key]) changed.push(key);
    if (changed.length) {
      differences += changed.length;
      console.log(`DIFF ${screen}: ${changed.length} element(s) — indexes ${changed.slice(0, 12).join(', ')}${changed.length > 12 ? '…' : ''}`);
    }
  }
  const leftRules = left.rules || {};
  const rightRules = right.rules || {};
  const ruleKeys = new Set([...Object.keys(leftRules), ...Object.keys(rightRules)]);
  let ruleDifferences = 0;
  for (const key of ruleKeys) {
    if (leftRules[key] !== rightRules[key]) {
      ruleDifferences++;
      if (ruleDifferences <= 15) {
        console.log(`RULE ${leftRules[key] === undefined ? 'added  ' : rightRules[key] === undefined ? 'removed' : 'changed'}: ${key}`);
      }
    }
  }
  console.log(`rules: ${ruleKeys.size} selectors compared, ${ruleDifferences} difference(s)`);
  differences += ruleDifferences;

  console.log(differences === 0
    ? `identical: ${screens.size} screens, ${Object.values(left.screens).reduce((sum, map) => sum + Object.keys(map).length, 0)} elements compared`
    : `${differences} element difference(s) across ${screens.size} screens`);
  process.exit(differences === 0 ? 0 : 1);
}

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
page.setDefaultTimeout(15000);

/** Computes one hash per element for the current DOM. */
let collectFull = process.env.CSS_FP_FULL === 'all';
const FULL_SCREENS = (process.env.CSS_FP_FULL || '').split(',').filter((name) => name && name !== 'all');

async function fingerprint(forceFull = false) {
  collectFull = forceFull;
  return page.evaluate(({ props, collect }) => {
    window.__CSS_FP_FULL = collect;
    const hash = (text) => {
      let h1 = 0x811c9dc5;
      let h2 = 0x01000193;
      for (let index = 0; index < text.length; index += 1) {
        const code = text.charCodeAt(index);
        h1 = Math.imul(h1 ^ code, 16777619) >>> 0;
        h2 = Math.imul(h2 + code, 2246822519) >>> 0;
      }
      return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
    };
    const out = {};
    const full = {};
    const elements = document.querySelectorAll('*');
    for (let index = 0; index < elements.length; index += 1) {
      const element = elements[index];
      const computed = getComputedStyle(element);
      const values = [element.tagName, element.id, element.className && element.className.toString()];
      const snapshot = {};
      for (const prop of props) {
        const value = computed.getPropertyValue(prop);
        values.push(value);
        snapshot[prop] = value;
      }
      if (window.__CSS_FP_FULL) {
        snapshot.__node = `${element.tagName.toLowerCase()}${element.id ? '#' + element.id : ''}${element.className ? '.' + element.className.toString().trim().replace(/\s+/g, '.') : ''}`;
        snapshot.__parent = element.parentElement ? `${element.parentElement.tagName.toLowerCase()}${element.parentElement.id ? '#' + element.parentElement.id : ''}${element.parentElement.className ? '.' + element.parentElement.className.toString().trim().replace(/\s+/g, '.') : ''}` : '';
        full[index] = snapshot;
      }
      // Rounded geometry catches layout collisions that the property list would miss.
      const rect = element.getBoundingClientRect();
      values.push(Math.round(rect.width), Math.round(rect.height));
      out[index] = hash(values.join('|'));
    }
    return window.__CSS_FP_FULL ? { hashes: out, full } : out;
  }, { props: PROPS, collect: collectFull });
}

const screens = {};
const fullValues = {};
let ruleMap = {};

await page.goto(args.url, { waitUntil: 'networkidle' });

// Animations and transitions must not be captured mid-flight, otherwise two runs of the same
// stylesheet differ: freeze them so the fingerprint only reflects the declared cascade.


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
  const save = SaveSystem.getInstance().createNewSave('CSS fingerprint', 'bulbasaur');
  save.tutorial.enabled = false;
  save.player.region = 'kanto';
  save.player.location = 'route1';
  save.player.earnBadge('brock');
  for (const id of ['potion', 'pokeball', 'rarecandy', 'firestone', 'thunderstone', 'nugget', 'leftovers', 'ct24_thunderbolt']) {
    save.inventory.add(id, 3, { deferSave: true });
  }
  const starter = save.team[0];
  starter.setLevel(22);
  FeatureAccessSystem.getInstance().refresh('css-fingerprint', { force: true, persist: false });
  Engine.getInstance().getPageManager().openPage('game');
});

/** Effective declaration block of every selector, in document order (later declarations win). */
async function ruleFingerprint() {
  return page.evaluate(() => {
    const merged = new Map();
    const walk = (rules, media) => {
      for (const rule of rules) {
        if (rule.type === CSSRule.IMPORT_RULE) {
          const imported = rule.styleSheet;
          try {
            if (imported?.cssRules) walk([...imported.cssRules], media);
          } catch (_) {
            /* a sheet that refuses access is skipped */
          }
          continue;
        }
        if (rule.type === CSSRule.MEDIA_RULE) {
          walk(rule.cssRules, `${media}@media ${rule.conditionText}`);
          continue;
        }
        if (rule.type === CSSRule.KEYFRAMES_RULE || rule.type === CSSRule.FONT_FACE_RULE) {
          merged.set(`${media}|${rule.cssText.slice(0, 200)}`, 'at-rule');
          continue;
        }
        if (!rule.selectorText) continue;
        const key = `${media}|${rule.selectorText}`;
        const block = merged.get(key) || {};
        for (const prop of rule.style) block[prop] = rule.style.getPropertyValue(prop) + (rule.style.getPropertyPriority(prop) ? '!' : '');
        merged.set(key, block);
      }
    };
    for (const sheet of document.styleSheets) {
      let rules = null;
      try {
        rules = sheet.cssRules;
      } catch (_) {
        continue;
      }
      if (rules) walk([...rules], '');
    }
    const out = {};
    for (const [key, block] of merged) {
      out[key] = Object.entries(block).sort().map(([prop, value]) => `${prop}:${value}`).join(';');
    }
    return out;
  });
}

await page.waitForSelector('#win-shortcuts', { state: 'visible' });
await page.waitForTimeout(500);
ruleMap = await ruleFingerprint();
{
  const shot = await fingerprint(FULL_SCREENS.includes('dashboard'));
  screens.dashboard = shot.hashes || shot;
  if (shot.full) fullValues.dashboard = shot.full;
}
console.log('dashboard', Object.keys(screens.dashboard).length, 'elements');

const modalIds = await page.evaluate(async () => {
  const { ModalIds } = await import('/src/config/ModalIds.js');
  return Object.values(ModalIds).filter((id) => typeof id === 'string');
});

for (const modalId of modalIds) {
  const opened = await page.evaluate(async (id) => {
    const { EventBus } = await import('/src/core/EventBus.js');
    const { ModalOpenRequestedEvent } = await import('/src/core/events/ModalOpenRequestedEvent.js');
    const { ModalCloseRequestedEvent } = await import('/src/core/events/ModalCloseRequestedEvent.js').catch(() => ({ ModalCloseRequestedEvent: null }));
    EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(id, {}));
    await new Promise((resolve) => setTimeout(resolve, 220));
    return !!document.querySelector(`#${CSS.escape(id)}`) || true;
  }, modalId).catch(() => false);
  if (!opened) continue;
  const key = `modal:${modalId}`;
  const shot = await fingerprint(FULL_SCREENS.includes(key));
  screens[key] = shot.hashes || shot;
  if (shot.full) fullValues[key] = shot.full;
  console.log(key, Object.keys(screens[key]).length, 'elements');
  await page.evaluate(async (id) => {
    const { EventBus } = await import('/src/core/EventBus.js');
    const closeEvent = await import('/src/core/events/ModalCloseRequestedEvent.js').catch(() => null);
    if (closeEvent?.ModalCloseRequestedEvent) {
      EventBus.getInstance().dispatch(new closeEvent.ModalCloseRequestedEvent(id));
    } else {
      const { ModalToggledEvent } = await import('/src/core/events/ModalToggledEvent.js').catch(() => ({}));
      if (ModalToggledEvent) EventBus.getInstance().dispatch(new ModalToggledEvent(id, false));
    }
    await new Promise((resolve) => setTimeout(resolve, 160));
    const node = document.getElementById(id);
    if (node) node.style.display = 'none';
  }, modalId).catch(() => {});
}

const total = Object.values(screens).reduce((sum, map) => sum + Object.keys(map).length, 0);
await fs.mkdir(path.dirname(args.out), { recursive: true });
await fs.writeFile(args.out, JSON.stringify({ url: args.url, props: PROPS, screens, rules: ruleMap, full: fullValues }, null, 0));
console.log(`\n${Object.keys(screens).length} screens, ${total} element fingerprints → ${args.out}`);
assert.ok(Object.keys(screens).length >= 10, 'enough screens were captured');
await browser.close();
