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

  test('mobile page-flow overflow rules do not disable modal-body scrolling', () => {
    const mobileRules = rules('core/base.css').filter((rule) => rule.selector.includes('mobile-mode')
      && rule.selector.includes('.win-body') && /overflow\s*:\s*visible/.test(rule.body));
    assert.ok(mobileRules.length > 0, 'dashboard bodies retain natural page flow');
    assert.ok(mobileRules.every((rule) => rule.selector.includes('#main-dashboard')),
      'the page-flow override is scoped to dashboard panels, not modal content');
  });

  test('dense mobile windows and filter headers stay inside their shared panel', () => {
    const staticModal = rules('components/modal-sizes.css');
    assert.ok(staticModal.some((rule) => rule.selector.includes('pw-static-modal--sm') && /70dvh/.test(rule.body)),
      'small static dialogs use the visible viewport');
    const npc = rules('panels/npc.css');
    assert.ok(npc.some((rule) => rule.selector === '.pw-npc-talk' && /70dvh/.test(rule.body)),
      'long NPC conversations have a dynamic-height scrolling body');
    const settings = rules('panels/settings.css');
    assert.ok(settings.some((rule) => rule.selector.includes('pw-settings-modal-window') && /85dvh/.test(rule.body)),
      'settings use the visible viewport on narrow touch layouts');
    const pokedex = rules('components/ui-panel.css');
    assert.ok(pokedex.some((rule) => rule.selector.includes('pw-pokedex-species-window') && /88dvh/.test(rule.body)),
      'the species information sheet has a dynamic-height frame');
    const achievements = rules('panels/achievements.css');
    assert.ok(achievements.some((rule) => rule.selector === '.pw-ach-filterbar' && /min-width:\s*0/.test(rule.body)),
      'the achievement filter can shrink inside its modal header');
    assert.ok(achievements.some((rule) => rule.selector === '.pw-ach-grid'
      && /min\(320px, 100%\)/.test(rule.body)), 'achievement cards cannot impose a desktop minimum width');
  });

  test('compact settings and Pokédex data grids can shrink without clipping', () => {
    const settings = rules('panels/settings.css');
    assert.ok(settings.some((rule) => rule.selector.includes('.pw-settings-row') && /flex-wrap:\s*wrap/.test(rule.body)),
      'settings action rows wrap instead of widening the modal');
    assert.ok(settings.some((rule) => rule.selector.includes('.pw-settings-code-row') && /flex-wrap:\s*wrap/.test(rule.body)),
      'the debug code row can fit a narrow screen');
    const pokemon = rules('panels/pokemon-sheet.css');
    assert.ok(pokemon.some((rule) => rule.selector.includes('.poke-detail-section-grid')
      && /minmax\(0, 1fr\)/.test(rule.body)), 'the Pokédex details use a zero-minimum track on narrow screens');
    const dex = rules('panels/pokedex.css');
    assert.ok(dex.some((rule) => rule.selector === '.pw-pokedex-talents-list'
      && /min\(280px, 100%\)/.test(rule.body)), 'talent cards never enforce a wider-than-panel minimum');
    const moves = rules('panels/team-moves.css');
    assert.ok(moves.some((rule) => rule.selector === '.pw-dex-move-row'
      && /minmax\(0, 1fr\)/.test(rule.body)), 'the move table reflows into the mobile viewport');
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
      .filter((rule) => /min-width\s*:\s*44px/.test(rule.body));
    assert.ok(toolButtons.length > 0, 'the 26px header tool buttons grow to 44px on a touch screen');

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

describe('Mobile shell (1.16.32)', (test) => {
  const readSrc = (relative) => fs.readFileSync(path.join(PROJECT_ROOT, relative), 'utf8');

  test('one predicate decides the presentation, for CSS and for script', () => {
    // Before this pass, the stylesheets matched `(max-width: 850px), (pointer: coarse)` while the
    // dashboard compared `innerWidth <= 850`: on a wide touch screen the CSS showed the mobile layout
    // and the script kept the desktop one, so tab switching and window visibility disagreed.
    const layout = readSrc('src/config/DashboardLayout.js');
    assert.ok(/export const MOBILE_MEDIA_QUERY/.test(layout), 'the media query is declared once, in config');
    assert.ok(/pointer:\s*coarse/.test(layout), 'a coarse pointer is part of the presentation');

    const shell = readSrc('src/ui/AppShell.js');
    assert.ok(/isMobileLayout\(\)/.test(shell), 'AppShell answers "which presentation"');
    assert.ok(/MOBILE_MEDIA_QUERY/.test(shell), 'AppShell reads the shared query');

    const offenders = ['src/ui/ScrollLock.js', 'src/ui/dashboard/MobileDashboardNav.js']
      .filter((file) => /\(max-width:\s*850px\)|pointer:\s*coarse/.test(readSrc(file)));
    assert.deepEqual(offenders, [], 'no module carries its own copy of the media query');

    const widthOnly = ['src/ui/ScrollLock.js', 'src/ui/dashboard/MobileDashboardNav.js']
      .filter((file) => /MOBILE_BREAKPOINT_PX/.test(readSrc(file)));
    assert.deepEqual(widthOnly, [], 'no module decides the layout from a width alone');
  });

  test('the navigation is anchored in the thumb zone and the page reserves its height', () => {
    const nav = rulesFor('layout/mobile.css', '.mobile-nav-bar')
      .filter((rule) => /position\s*:\s*fixed/.test(rule.body));
    assert.ok(nav.length > 0, 'the bar is an overlay');
    assert.ok(nav.some((rule) => /bottom\s*:\s*0/.test(rule.body)), 'the bar sits at the bottom of the screen');
    assert.ok(nav.some((rule) => /env\(safe-area-inset-bottom/.test(rule.body)), 'the home bar never covers the tabs');

    const reservation = rulesFor('layout/mobile.css', '#main-dashboard')
      .filter((rule) => /padding-bottom/.test(rule.body) && /--pw-mobile-nav-h/.test(rule.body));
    assert.ok(reservation.length > 0, 'the page flow keeps clear of the bar');

    const tabs = rulesFor('layout/mobile.css', '.mob-btn')
      .filter((rule) => /min-height\s*:\s*44px/.test(rule.body));
    assert.ok(tabs.length > 0, 'a tab is 44px high');

    const token = read('core/base.css');
    assert.ok(/--pw-mobile-nav-h:\s*56px/.test(token), 'the reserved height matches the bar that exists');
  });

  test('no sheet squeezes a panel with a transform', () => {
    // `transform: scale(0.92)` on a panel did not make it responsive: it shrank the text and the touch
    // targets, and turned the scaled node into the containing block of every fixed child inside it.
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.name.endsWith('.css') ? [full] : [];
    });
    const offenders = [];
    for (const file of walk(CSS_ROOT)) {
      for (const rule of [...stripComments(fs.readFileSync(file, 'utf8')).matchAll(/([^{}]+)\{([^{}]*)\}/g)]) {
        // Keyframe steps animate a scale; a panel is never *sized* by one.
        if (/^(\d+%|from|to)$/i.test(rule[1].trim())) continue;
        if (/transform\s*:\s*scale\(\s*0?\.\d+\s*\)/.test(rule[2])) {
          offenders.push(`${path.relative(CSS_ROOT, file)} → ${rule[1].trim().replace(/\s+/g, ' ').slice(0, 40)}`);
        }
      }
    }
    assert.deepEqual(offenders, [], 'a panel is sized by its layout, never shrunk');
  });

  test('a filter toolbar folds into one scrolling band on touch', () => {
    const strip = rulesFor('components/chips.css', '.pw-chip-row')
      .filter((rule) => /flex-wrap\s*:\s*nowrap/.test(rule.body) && /overflow-x\s*:\s*auto/.test(rule.body));
    assert.ok(strip.length > 0, 'the chip strip is one row that scrolls sideways');

    const toggle = rulesFor('components/ui-input.css', '.pw-drawer-toggle')
      .filter((rule) => /position\s*:\s*static/.test(rule.body));
    assert.ok(toggle.length > 0, 'the drawer toggle is a row sibling, not a button floating over the chips');
    assert.ok(toggle.some((rule) => /min-height\s*:\s*44px/.test(rule.body) || /height\s*:\s*44px/.test(rule.body)),
      'the toggle is 44px high');
  });
});
