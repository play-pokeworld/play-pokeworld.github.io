/**
 * @file MobileTouchCss.test.js
 * @brief Static guards for the touch-screen pass (v1.16.19). Every case is a defect that was seen on
 *        a phone; the browser suite `tests/browser/MobileTouch.mjs` measures the same things for real.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, assert } from './TestRunner.js';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CSS_ROOT = path.join(PROJECT_ROOT, 'assets/css');

const read = (relative) => fs.readFileSync(path.join(CSS_ROOT, relative), 'utf8');
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '');
/** Rules of a sheet, as `selector { body }` strings, comments removed. */
const rules = (relative) => [...stripComments(read(relative)).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map((match) => ({ selector: match[1].trim().replace(/\s+/g, ' '), body: match[2] }));
/** Rules whose selector ends the sheet segment, i.e. every rule mentioning `selector`. */
const rulesFor = (relative, selector) => rules(relative).filter((rule) => rule.selector.includes(selector));

describe('Touch-screen stylesheet (1.16.20)', (test) => {
  test('every sheet is balanced and its media queries close where they should', () => {
    // An unclosed block silently swallows the rules that follow it: during this pass, three panel
    // sheets lost one `}` while their toolbar rule was rewritten, and desktop panels started wearing
    // the mobile rules. A sheet must open exactly as many blocks as it closes.
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.name.endsWith('.css') ? [full] : [];
    });
    const offenders = [];
    for (const file of walk(CSS_ROOT)) {
      const text = stripComments(fs.readFileSync(file, 'utf8'));
      const depth = text.split('').reduce((level, char) => (char === '{' ? level + 1 : char === '}' ? level - 1 : level), 0);
      if (depth !== 0) offenders.push(`${path.relative(CSS_ROOT, file)} (${depth > 0 ? '+' : ''}${depth})`);
    }
    assert.deepEqual(offenders, [], 'a sheet never opens more blocks than it closes');
  });

  test('no filter toolbar clamps its own height', () => {
    // The bag, PC box and dictionary toolbars were capped at `max-height: 52px; overflow: hidden`,
    // which sliced the second row of chips in half on every phone.
    const sheets = ['panels/bag.css', 'panels/box.css', 'panels/dictionary.css', 'layout/mobile.css', 'components/ui-toolbar.css'];
    const offenders = [];
    for (const sheet of sheets) {
      for (const rule of rules(sheet)) {
        if (!/(inv-toolbar|box-filter-panel|dict-toolbar|pw-filterbar)/.test(rule.selector)) continue;
        if (/max-height\s*:\s*\d+px/.test(rule.body) && /overflow\s*:\s*hidden/.test(rule.body)) {
          offenders.push(`${sheet} → ${rule.selector}`);
        }
      }
    }
    assert.deepEqual(offenders, [], 'a toolbar may scroll or wrap, never slice its own chips');
  });

  test('the mobile filter drawer folds the filters and keeps the chips whole', () => {
    const drawer = rulesFor('components/ui-input.css', '.pw-filterbar').filter((rule) => /mobile-drawer-open/.test(rule.selector));
    assert.ok(drawer.length > 0, 'the expanded state of the drawer is described');
    const collapsed = rulesFor('components/ui-input.css', '.pw-filterbar').filter((rule) => !/mobile-drawer-open/.test(rule.selector) && rule.selector.includes('.pw-filter-end'));
    assert.ok(collapsed.some((rule) => /display\s*:\s*none/.test(rule.body)), 'the search field folds away by default');
    const hidesChips = rulesFor('components/ui-input.css', '.pw-filterbar').some((rule) => /inv-tabs|pw-chip/.test(rule.selector) && /display\s*:\s*none/.test(rule.body));
    assert.equal(hidesChips, false, 'the chips are the navigation of the panel: they are never folded');
  });

  test('mobile panels are sized on the visible viewport, not on the tallest one', () => {
    // `100vh` is the viewport WITHOUT the URL bar: with it shown, the bottom of a panel sat under it.
    for (const sheet of ['components/ui-modal.css', 'panels/pokemon-sheet-generated.css']) {
      const text = stripComments(read(sheet));
      const blocks = [...text.matchAll(/height:\s*calc\(100vh[^;]*\)[^}]*?(?=\})/g)];
      for (const block of blocks) {
        assert.ok(/100dvh/.test(block[0]), `${sheet}: every 100vh height is paired with a 100dvh fallback`);
      }
    }
  });

  test('a panel body contains its own scrolling', () => {
    const body = rulesFor('components/ui-modal.css', '.pw-modal-body');
    assert.ok(body.some((rule) => /overscroll-behavior\s*:\s*contain/.test(rule.body)),
      'reaching the end of a list must not chain the swipe to the page behind');
  });

  test('touch modals track the visible viewport and keep their body shrinkable', () => {
    const sheet = rules('components/ui-panel.css');
    const panel = sheet.find((rule) => rule.selector === '.pw-panel--modal-window'
      && /100dvh/.test(rule.body));
    assert.ok(panel, 'the shared modal frame caps itself to the visible touch viewport');
    const body = sheet.find((rule) => rule.selector === '.pw-panel--modal-window > .win-body'
      && /min-height\s*:\s*0/.test(rule.body)
      && /overscroll-behavior\s*:\s*contain/.test(rule.body));
    assert.ok(body, 'the common modal body can shrink and contains nested scroll gestures');
    const sheetRules = sheet.filter((rule) => rule.selector.includes('pw-pokemon-info-window'));
    assert.ok(sheetRules.some((rule) => /height\s*:\s*min\(85dvh/.test(rule.body)
      && /max-height\s*:\s*min\(85dvh/.test(rule.body)),
    'the Pokémon information sheet uses the visible viewport on narrow touch screens');
  });

  test('the page is frozen while a layer covers it', () => {
    const lock = rules('layout/page-shell.css').filter((rule) => rule.selector.includes('pw-scroll-locked'));
    assert.ok(lock.length > 0, 'the scroll lock has its rule');
    assert.ok(lock.some((rule) => /overflow\s*:\s*hidden/.test(rule.body)), 'the page cannot scroll under a modal');
    const lockModule = fs.readFileSync(path.join(PROJECT_ROOT, 'src/ui/ScrollLock.js'), 'utf8');
    assert.ok(/lockPageScroll/.test(lockModule) && /unlockPageScroll/.test(lockModule), 'the lock is reference counted');
  });

  test('fingers get finger-sized controls', () => {
    const toolButtons = rulesFor('layout/window-chrome.css', '.pw-win-tool-btn')
      .filter((rule) => /min-width\s*:\s*34px/.test(rule.body));
    assert.ok(toolButtons.length > 0, 'the 26px header tool buttons grow to 34px on a touch screen');

    const selects = rulesFor('components/ui-dropdown.css', '.pw-dropdown-select')
      .filter((rule) => /font-size\s*:\s*16px/.test(rule.body));
    assert.ok(selects.length > 0, 'a select is 16px: below that, iOS zooms the whole page on focus');

    const inputs = rulesFor('components/ui-input.css', '.pw-input')
      .filter((rule) => /min-height\s*:\s*40px/.test(rule.body));
    assert.ok(inputs.length > 0, 'a text field is 40px high under a finger');
  });

  test('a long-press surface never selects its own text', () => {
    const sheet = rules('components/long-press.css').filter((rule) => rule.selector.includes('pw-long-press'));
    assert.ok(sheet.length > 0, 'the gesture has its own sheet');
    assert.ok(sheet.some((rule) => /-webkit-touch-callout\s*:\s*none/.test(rule.body)), 'no native callout on hold');
    assert.ok(sheet.some((rule) => /user-select\s*:\s*none/.test(rule.body)), 'no text selection on hold');

    const helper = fs.readFileSync(path.join(PROJECT_ROOT, 'src/ui/LongPress.js'), 'utf8');
    assert.ok(/pw-long-press/.test(helper), 'the helper marks the surface it binds');
    const element = fs.readFileSync(path.join(PROJECT_ROOT, 'src/ui/UIElement.js'), 'utf8');
    assert.ok(/addLongPress/.test(element), 'every widget can bind the gesture');
  });

  test('no component re-implements its own touch timer', () => {
    // Six components copied the same 25-line `touchstart` block, each with the same three defects.
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.name.endsWith('.js') ? [full] : [];
    });
    const offenders = walk(path.join(PROJECT_ROOT, 'src'))
      .filter((file) => !/LongPress\.js$/.test(file))
      .filter((file) => /setTimeout\([^)]*,\s*500\)/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(PROJECT_ROOT, file));
    assert.deepEqual(offenders, [], 'the press-and-hold gesture lives in one place');
  });
});
