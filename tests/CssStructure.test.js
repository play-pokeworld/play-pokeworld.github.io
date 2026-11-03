/**
 * @file CssStructure.test.js
 * @brief Guards the 1.16.14 stylesheet tree: one file, one object, English-only comments.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, assert } from './TestRunner.js';
import { readManifest, stylesheetOrder, sheetPath } from './CssBundle.js';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CSS_ROOT = path.join(PROJECT_ROOT, 'assets/css');

/** Folder roles: a sheet may only live in the folder matching its role. */
const FOLDER_ROLES = Object.freeze({
  core: 'Tokens, themes, variables and cross-cutting primitives (no widget styles).',
  layout: 'Page skeleton, dashboard columns, responsive grids and chrome.',
  components: 'Reusable widgets, one file per widget family.',
  panels: 'One file per game window or panel.'
});

// One sheet = one object. The largest single object (the Pokémon information sheet) keeps its whole
// state machine in one place on purpose: splitting it further would scatter one component again.
const MAX_SHEET_LINES = 1700;

function walkSheets(dir = CSS_ROOT, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSheets(full, out);
    else if (entry.name.endsWith('.css')) out.push(path.relative(CSS_ROOT, full).split(path.sep).join('/'));
  }
  return out;
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('Stylesheet tree (1.16.14 split)', (test) => {
  test('style.css is a pure manifest: imports only, no qualified rule', () => {
    const manifest = stripComments(readManifest());
    const imports = manifest.match(/@import/g) || [];
    assert.ok(imports.length > 50, `the manifest imports every sheet (found ${imports.length})`);
    assert.equal(manifest.includes('{'), false, 'style.css declares no rule of its own');
    for (const line of manifest.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      assert.ok(/^@import url\("\.\/[a-z-]+\/[a-z0-9-]+\.css"\);$/.test(trimmed),
        `manifest line is a plain import: ${trimmed}`);
    }
  });

  test('the manifest lists every sheet once, in cascade order', () => {
    const order = stylesheetOrder();
    assert.equal(new Set(order).size, order.length, 'no sheet is imported twice');
    const declared = [...stripComments(readManifest()).matchAll(/@import url\("\.\/([^"]+)"\)/g)].map((m) => `assets/css/${m[1]}`);
    assert.deepEqual(order, declared, 'readBundle and the manifest describe the same order');
  });

  test('no sheet outside the manifest and no orphan file', () => {
    const onDisk = walkSheets().filter((name) => name !== 'style.css');
    const imported = stylesheetOrder().map((entry) => entry.replace('assets/css/', '')).sort();
    assert.deepEqual([...onDisk].sort(), [...imported].sort(), 'every sheet on disk is loaded by style.css');
  });

  test('the tree has exactly the four documented folders, no sheet at the root', () => {
    const folders = fs.readdirSync(CSS_ROOT, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    assert.deepEqual(folders, Object.keys(FOLDER_ROLES).sort(), 'folder set matches the documented roles');
    const rootSheets = fs.readdirSync(CSS_ROOT, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.css')).map((e) => e.name);
    assert.deepEqual(rootSheets, ['style.css'], 'style.css is the only sheet at the root');
  });

  test('no sheet becomes a new catch-all', () => {
    const oversized = walkSheets()
      .map((name) => ({ name, lines: fs.readFileSync(path.join(CSS_ROOT, name), 'utf8').split('\n').length }))
      .filter((entry) => entry.lines > MAX_SHEET_LINES);
    assert.deepEqual(oversized, [], `no sheet exceeds ${MAX_SHEET_LINES} lines`);
  });

  test('every sheet opens with a header comment stating its role', () => {
    const headerless = walkSheets().filter((name) => !fs.readFileSync(path.join(CSS_ROOT, name), 'utf8').trimStart().startsWith('/*'));
    assert.deepEqual(headerless, [], 'every sheet is documented');
  });

  test('the cascade is declared in one place: no @import inside a sheet', () => {
    const nested = stylesheetOrder()
      .filter((entry) => entry !== 'assets/css/style.css')
      .filter((entry) => /@import\s+url/.test(stripComments(fs.readFileSync(path.join(PROJECT_ROOT, entry), 'utf8'))));
    assert.deepEqual(nested, [], 'only style.css imports');
  });

  test('sheets moved into a subfolder keep their assets reachable', () => {
    // A sheet one level deep must use ../ and two levels deep ../../; a deeper path is a broken move.
    const broken = [];
    for (const name of walkSheets()) {
      const depth = name.split('/').length - 1;
      const expected = '../'.repeat(depth + 1);
      for (const [, url] of fs.readFileSync(path.join(CSS_ROOT, name), 'utf8').matchAll(/url\('([^']+)'\)/g)) {
        if (!url.startsWith('.')) continue; // data URIs and absolute font stacks are out of scope
        if (!url.startsWith(expected)) broken.push(`${name}: ${url}`);
        const target = path.resolve(path.dirname(path.join(CSS_ROOT, name)), url);
        if (!fs.existsSync(target)) broken.push(`${name}: missing ${url}`);
      }
    }
    assert.deepEqual(broken, [], 'every relative url() resolves from the new location');
  });

  test('the dated design-system passes are gone, not kept as a second tree', () => {
    assert.equal(fs.existsSync(path.join(CSS_ROOT, 'design-system')), false,
      'the pass-*.css sheets were redistributed into the per-object sheets');
  });

  test('no sheet name is a chronological or generic catch-all', () => {
    const forbidden = /(^|\/)(pass-|panels-|extracted|misc|common|shared|utils|helpers|other)\d*[.]css$/;
    const caught = walkSheets().filter((name) => forbidden.test(name));
    assert.deepEqual(caught, [], 'a sheet is named after the object it styles, never after the date it was written');
  });

  test('every comment is written in English', () => {
    const accents = /[\u00e0\u00e2\u00e4\u00e7\u00e9\u00e8\u00ea\u00eb\u00ee\u00ef\u00f4\u00f6\u00f9\u00fb\u00fc\u00ff\u0153\u00e6]/i;
    const french = /\b(les|des|une|dans|pour|avec|sont|cette|\u00eatre|doit|doivent|jamais|toujours|selon|donc|ainsi|afin|lors|entre|sans|chaque|aucun)\b/gi;
    const offenders = [];
    for (const name of walkSheets()) {
      for (const [, comment] of fs.readFileSync(path.join(CSS_ROOT, name), 'utf8').matchAll(/\/\*([\s\S]*?)\*\//g)) {
        if (comment.includes('PokéWorld')) continue; // product name, not prose
        if (accents.test(comment) || (comment.match(french) || []).length >= 2) offenders.push(`${name}: ${comment.trim().slice(0, 60)}`);
      }
    }
    assert.deepEqual(offenders.slice(0, 5), [], 'the stylesheets carry no French comment any more');
  });

  test('index.html loads style.css and nothing else', () => {
    const html = fs.readFileSync(path.join(PROJECT_ROOT, 'index.html'), 'utf8');
    const sheets = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map((m) => m[1]);
    assert.deepEqual(sheets, ['assets/css/style.css'], 'a single stylesheet entry point');
  });

  test('a centred cell is centred by a layout that can centre it, over the same columns as its header', () => {
    // Regressions this guards, both reported from play:
    //   - `.pw-ball-row-ball` asked for `justify-content: center` while being `display: block`, so the
    //     ball hugged the left edge of its 44px column;
    //   - `.pw-ball-row-qty` did the same with `flex-end`, so the count sat left of the "Qty" caption;
    //   - `.pw-ball-head` had no column gap while `.pw-ball-row` had 8px, which pushed the two
    //     captions 8px right of the columns they label.
    const sheet = stripComments(fs.readFileSync(path.join(CSS_ROOT, 'components/pokeball-filters.css'), 'utf8'));
    const rule = (selector) => {
      const pattern = new RegExp('\\.' + selector + '\\s*\\{([^}]*)\\}', 'g');
      const found = [...sheet.matchAll(pattern)];
      assert.ok(found.length > 0, selector + ' still has its own rule');
      // The last declaration wins in the cascade when a sheet repeats a rule.
      return found[found.length - 1][1];
    };
    for (const cell of ['pw-ball-row-ball', 'pw-ball-row-qty']) {
      const body = rule(cell);
      assert.ok(/display:\s*(flex|grid|inline-flex)/.test(body), `${cell} lays out its content`);
      assert.ok(/justify-content:\s*center/.test(body), `${cell} centres it horizontally`);
      assert.ok(/align-items:\s*center/.test(body), `${cell} centres it vertically`);
    }
    const gapOf = (body) => (body.match(/(?:column-)?gap:\s*([^;]+);/) || [])[1]?.trim() ?? 'normal';
    assert.equal(gapOf(rule('pw-ball-head')), gapOf(rule('pw-ball-row')),
      'the caption row shares the body row column gap, so the captions sit above their column');
  });

  test('sheetPath resolves any sheet whatever its folder', () => {
    assert.equal(sheetPath('ui-button.css'), path.join(PROJECT_ROOT, 'assets/css/components/ui-button.css'));
    assert.throws(() => sheetPath('design-system.css'), /unknown stylesheet/, 'the deleted catch-all stays deleted');
  });
});
