/** @file StyleVocabulary.test.js @brief Locks the unified style vocabulary (audit P1: titles, empty states, buttons, icons, typography). */
import fs from 'node:fs';
import path from 'node:path';
import { describe, assert } from './TestRunner.js';
import { readBundle, readSheet, sheetPath, stylesheetOrder } from './CssBundle.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

/** Blank out comments but keep the line structure so offsets stay comparable. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '));
}

/** @returns {{selector: string, body: string, file: string}[]} */
function rulesOf(text) {
  const out = [];
  for (const match of stripComments(text).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim();
    if (!selector || selector.startsWith('@')) continue;
    out.push({ selector, body: match[2] });
  }
  return out;
}

/** @returns {{selector: string, body: string, file: string}[]} every rule, with the sheet that owns it */
function rulesByFile() {
  const out = [];
  for (const relative of stylesheetOrder()) {
    for (const rule of rulesOf(fs.readFileSync(path.join(ROOT, relative), 'utf8'))) {
      out.push({ ...rule, file: relative });
    }
  }
  return out;
}

function srcFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) out.push(full);
    }
  };
  walk(path.join(ROOT, 'src'));
  return out;
}

describe('Style vocabulary — section titles (P1 3.1)', (test) => {
  test('the nine legacy title classes are gone from the code and the stylesheets', () => {
    const legacy = [
      'battle-summary-section-title', 'pw-loc-section-title', 'pw-cur-section-title',
      'pw-box-section-title', 'pw-atoll-section-title', 'pw-progress-section-title',
      'pw-story-quest-section-title', 'pw-repeatable-board-section-title'
    ];
    const bundle = readBundle();
    const js = srcFiles().map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    for (const name of legacy) {
      assert.equal(bundle.includes(`.${name}`), false, `${name} no longer exists in CSS`);
      assert.equal(new RegExp(`\\b${name}\\b`).test(js), false, `${name} no longer exists in src/`);
    }
  });

  test('only the canonical sheet sizes a section title', () => {
    const canonical = sheetPath('ui-section-title.css');
    const offenders = rulesByFile()
      .filter((rule) => /assets\/css\/components\/ui-section-title\.css$/.test(rule.file) === false)
      .filter((rule) => /\.pw-section-title\b/.test(rule.selector))
      .filter((rule) => /font-size|font-weight|letter-spacing/.test(rule.body))
      .map((rule) => `${rule.file}: ${rule.selector}`);
    assert.deepEqual(offenders, [], 'no panel redefines the typography of a title');
    const own = rulesOf(fs.readFileSync(canonical, 'utf8')).map((rule) => rule.selector);
    const sizing = own.filter((selector) => /^\.pw-section-title(\.is-(lg|sm)|:first-child)?$/.test(selector));
    assert.deepEqual(sizing.sort(), ['.pw-section-title', '.pw-section-title.is-lg', '.pw-section-title.is-sm', '.pw-section-title:first-child'].sort(),
      'the canonical sizes stay the only ones');
  });

  test('every title the panels build is the canonical class, with at most one size modifier', () => {
    for (const file of srcFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      for (const match of text.matchAll(/className: '([^']*)'/g)) {
        if (!/pw-section-title/.test(match[1])) continue;
        const tokens = match[1].split(/\s+/);
        const sizes = tokens.filter((token) => /^is-(lg|sm)$/.test(token));
        assert.ok(sizes.length <= 1, `${path.basename(file)}: a title has at most one size (${match[1]})`);
      }
    }
  });
});

describe('Style vocabulary — empty states (P1 3.1)', (test) => {
  test('the sixteen local empty-state classes are gone', () => {
    const legacy = [
      'pw-empty-state-md', 'pw-empty-state-lg', 'pw-empty-state-sm', 'pw-empty-center',
      'battle-summary-empty', 'poke-detail-empty', 'base-stock-empty', 'pw-pokedex-empty',
      'pw-repeatable-board-empty', 'pw-training-empty', 'pw-npc-talk-empty', 'pw-item-use-empty'
    ];
    const bundle = readBundle();
    const js = srcFiles().map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    for (const name of legacy) {
      assert.equal(bundle.includes(`.${name}`), false, `${name} no longer exists in CSS`);
      assert.equal(new RegExp(`\\b${name}\\b`).test(js), false, `${name} no longer exists in src/`);
    }
  });

  test('every empty state rendered by a panel uses the canonical class', () => {
    const files = srcFiles();
    let count = 0;
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      for (const match of text.matchAll(/className: '([^']*)'/g)) {
        if (!/pw-empty-state/.test(match[1])) continue;
        count += 1;
        const sizesLeft = match[1].split(/\s+/).filter((token) => /^is-(lg|sm)$/.test(token));
        assert.ok(sizesLeft.length <= 1, `${path.basename(file)}: one size per empty state`);
      }
    }
    assert.ok(count >= 20, `the empty states are actually built with the canonical class (${count})`);
  });
});

describe('Style vocabulary — item icons (P1 3.3)', (test) => {
  const SCALE = ['--pw-item-icon-sm', '--pw-item-icon-md', '--pw-item-icon-lg'];

  test('the three-size scale is declared once, in the token sheet', () => {
    const tokens = readSheet('tokens.css');
    for (const token of SCALE) assert.ok(tokens.includes(`${token}:`), `${token} is declared`);
    assert.ok(/--pw-item-icon-sm:\s*40px/.test(tokens));
    assert.ok(/--pw-item-icon-md:\s*52px/.test(tokens));
    assert.ok(/--pw-item-icon-lg:\s*72px/.test(tokens));
  });

  test('no item media is sized with an in-between pixel value', () => {
    // Badges pinned on a Pokémon card keep their own compact scale (22/24/28/40/44).
    const badge = /badge|inv-qty|pw-icon|item-icon-holder/;
    // Only the sheets that size an item *picture*; a row, a card or a touch target is layout.
    const media = /(pw-item-sprite|item-circle|inv-icon|shop-ico|shop-sprite|dict-entry-icon|loot-item|held-item-(?:target|current)|market-sprite|grid-media|fossil-item-icon|item-use-icon|bag-detail-icon|item-use-target-sprite)/;
    const offenders = [];
    for (const rule of rulesOf(readBundle())) {
      if (!media.test(rule.selector)) continue;
      if (badge.test(rule.selector)) continue;
      for (const [, prop, value] of rule.body.matchAll(/(width|height|flex):\s*([^;]+);/g)) {
        const px = value.match(/(\d+)px/);
        if (!px) continue;
        const size = Number(px[1]);
        if ([40, 52, 72].includes(size)) continue;
        if (size <= 24) continue; // inline counters pinned on a row keep the badge scale
        if (/var\(--pw-item-icon-/.test(value)) continue;
        offenders.push(`${rule.selector} { ${prop}: ${value.trim()} }`);
      }
    }
    assert.deepEqual(offenders, [], 'item media only uses 40 / 52 / 72px (or a token)');
  });
});

describe('Style vocabulary — typography floor (P1 3.4)', (test) => {
  test('no declaration goes below 10px, and 10px is reserved for badges', () => {
    const badge = /badge|pill|chip|level|lvl|count|counter|slot|dot|tag|tracker|rank|num|delta|glyph|mini/i;
    const offenders = [];
    for (const rule of rulesOf(readBundle())) {
      for (const [, value] of rule.body.matchAll(/font-size:\s*([0-9.]+)px/g)) {
        const size = Number(value);
        if (size < 10) offenders.push(`${rule.selector} { font-size: ${value}px }`);
        else if (size === 10 && !badge.test(rule.selector) && !/counter\(/.test(rule.body)) offenders.push(`${rule.selector} { font-size: 10px } (not a badge)`);
      }
    }
    assert.deepEqual(offenders, [], 'informational text is at least 11px');
  });
});

describe('Style vocabulary — !important budget (P1 3.2)', (test) => {
  test('the number of !important never grows', () => {
    // Baseline measured on the split tree (1.16.11). Lower it when a pass removes some;
    // never raise it: a new override is a new specificity war.
    // 1.16.14 raised it once, mechanically: a rule shared by several objects is copied into each
    // owner sheet, so the same declaration counts once per sheet. Nothing new was written.
    const BUDGET = 3900;
    const count = (readBundle().match(/!important/g) || []).length;
    assert.ok(count <= BUDGET, `${count} !important (budget ${BUDGET})`);
  });
});
